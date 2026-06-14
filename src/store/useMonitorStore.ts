import { create } from 'zustand'
import {
  MonitorData,
  EnvData,
  VentilationDevice,
  MonitorThreshold,
  Alert,
  TransportMonitorState,
  StorageMonitorState,
  HeatMapPoint,
  AlertLevelType
} from '@/types'
import { db } from '@/db'
import { generateId, checkAlertRule } from '@/utils/algorithm'
import { formatTime } from '@/utils/format'

interface MonitorState {
  monitorData: Record<string, MonitorData[]>
  envData: Record<string, EnvData[]>
  ventilationDevices: VentilationDevice[]
  thresholds: MonitorThreshold[]
  alerts: Alert[]
  transportStates: Record<string, TransportMonitorState>
  storageStates: Record<string, StorageMonitorState>
  loading: boolean

  loadThresholds: () => Promise<void>
  loadVentilationDevices: () => Promise<void>
  loadAlerts: (acknowledged?: boolean) => Promise<void>
  loadMonitorData: (orderId: string) => Promise<MonitorData[]>
  loadEnvData: (roomId: string) => Promise<EnvData[]>

  addMonitorData: (data: Omit<MonitorData, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  addEnvData: (data: Omit<EnvData, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>

  acknowledgeAlert: (alertId: string, userId?: string | undefined) => Promise<void>
  acknowledgeAllAlerts: (userId?: string | undefined) => Promise<void>

  toggleVentilation: (deviceId: string, manualOverride?: boolean) => Promise<void>

  updateTransportMonitorState: (vehicleId: string, data: Partial<TransportMonitorState>) => void
  updateStorageMonitorState: (roomId: string, data: Partial<StorageMonitorState>) => void

  getHeatMapData: () => Promise<HeatMapPoint[]>
  checkAndCreateAlert: (
    type: Alert['type'],
    level: AlertLevelType,
    title: string,
    message: string,
    sourceId: string,
    sourceType: string
  ) => Promise<void>

  getThresholdByCode: (code: string) => MonitorThreshold | undefined
}

export const useMonitorStore = create<MonitorState>()((set, get) => ({
  monitorData: {},
  envData: {},
  ventilationDevices: [],
  thresholds: [],
  alerts: [],
  transportStates: {},
  storageStates: {},
  loading: false,

  loadThresholds: async () => {
    const thresholds = await db.monitorThresholds.toArray()
    set({ thresholds })
  },

  loadVentilationDevices: async () => {
    const devices = await db.ventilationDevices.toArray()
    set({ ventilationDevices: devices })
  },

  loadAlerts: async (acknowledged) => {
    set({ loading: true })
    try {
      let query = db.alerts.orderBy('timestamp').reverse() as any
      if (acknowledged !== undefined) {
        query = query.filter((a: Alert) => a.acknowledged === acknowledged)
      }
      const alerts = await query.limit(50).toArray()
      set({ alerts })
    } finally {
      set({ loading: false })
    }
  },

  loadMonitorData: async (orderId) => {
    const allData = await db.monitorData.toArray()
    const data = allData
      .filter(d => d.orderId === orderId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))

    set((state) => ({
      monitorData: { ...state.monitorData, [orderId]: data }
    }))

    return data
  },

  loadEnvData: async (roomId) => {
    const allData = await db.envData.toArray()
    const data = allData
      .filter(d => d.roomId === roomId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .slice(-100)

    set((state) => ({
      envData: { ...state.envData, [roomId]: data }
    }))

    return data
  },

  addMonitorData: async (data) => {
    const now = new Date().toISOString()
    const newData: MonitorData = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    }

    await db.monitorData.add(newData)

    const tempThreshold = get().getThresholdByCode('TRANSPORT_TEMP')
    const weightThreshold = get().getThresholdByCode('WEIGHT_DEVIATION')

    if (tempThreshold) {
      const tempStatus = checkAlertRule(data.temperature, tempThreshold)
      if (tempStatus === 'CRITICAL') {
        await get().checkAndCreateAlert(
          'TEMPERATURE_HIGH',
          'CRITICAL',
          '温度超限报警',
          `车辆箱体温度达到 ${data.temperature.toFixed(1)}°C，超过安全阈值`,
          data.vehicleId,
          'VEHICLE'
        )
      } else if (tempStatus === 'WARNING') {
        await get().checkAndCreateAlert(
          'TEMPERATURE_HIGH',
          'WARNING',
          '温度偏高提醒',
          `车辆箱体温度达到 ${data.temperature.toFixed(1)}°C，请注意`,
          data.vehicleId,
          'VEHICLE'
        )
      }
    }

    set((state) => ({
      monitorData: {
        ...state.monitorData,
        [data.orderId]: [...(state.monitorData[data.orderId] || []), newData]
      }
    }))
  },

  addEnvData: async (data) => {
    const now = new Date().toISOString()
    const newData: EnvData = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    }

    await db.envData.add(newData)

    const tempThreshold = get().getThresholdByCode('STORAGE_TEMP')
    const humidityThreshold = get().getThresholdByCode('STORAGE_HUMIDITY')

    if (tempThreshold) {
      const tempStatus = checkAlertRule(data.temperature, tempThreshold)
      if (tempStatus !== 'NORMAL') {
        await get().checkAndCreateAlert(
          'TEMPERATURE_HIGH',
          tempStatus as AlertLevelType,
          '贮存间温度超限',
          `贮存间温度达到 ${data.temperature.toFixed(1)}°C`,
          data.roomId,
          'STORAGE_ROOM'
        )
      }
    }

    if (humidityThreshold) {
      const humidityStatus = checkAlertRule(data.humidity, humidityThreshold)
      if (humidityStatus !== 'NORMAL') {
        await get().checkAndCreateAlert(
          'HUMIDITY_HIGH',
          humidityStatus as AlertLevelType,
          '贮存间湿度过高',
          `贮存间湿度达到 ${data.humidity.toFixed(1)}%`,
          data.roomId,
          'STORAGE_ROOM'
        )

        const device = get().ventilationDevices.find((d) => d.roomId === data.roomId)
        if (device && device.autoControlEnabled && device.status === 'STOPPED') {
          await get().toggleVentilation(device.id)
        }
      }
    }

    set((state) => ({
      envData: {
        ...state.envData,
        [data.roomId]: [...(state.envData[data.roomId] || []), newData]
      }
    }))
  },

  acknowledgeAlert: async (alertId, userId) => {
    const now = new Date().toISOString()
    const updates: any = {
      acknowledged: true,
      acknowledgedAt: now
    }
    if (userId) {
      updates.acknowledgedBy = userId
    }
    await db.alerts.update(alertId, updates)
    await get().loadAlerts()
  },

  acknowledgeAllAlerts: async (userId) => {
    const now = new Date().toISOString()
    const allAlerts = await db.alerts.toArray()
    const unacknowledged = allAlerts.filter(a => a.acknowledged === false)
    for (const alert of unacknowledged) {
      await db.alerts.update(alert.id, {
        acknowledged: true,
        acknowledgedBy: userId,
        acknowledgedAt: now
      })
    }
    await get().loadAlerts()
  },

  toggleVentilation: async (deviceId, manualOverride = false) => {
    const now = new Date().toISOString()
    const device = await db.ventilationDevices.get(deviceId)
    if (!device) return

    const newStatus = device.status === 'RUNNING' ? 'STOPPED' : 'RUNNING'
    const updates: Partial<VentilationDevice> = {
      status: newStatus,
      updatedAt: now
    }

    if (newStatus === 'RUNNING') {
      updates.lastStartTime = now
    } else {
      updates.lastStopTime = now
      if (device.lastStartTime) {
        const runHours = (Date.now() - new Date(device.lastStartTime).getTime()) / (1000 * 60 * 60)
        updates.runHours = device.runHours + runHours
      }
    }

    if (manualOverride) {
      updates.autoControlEnabled = !device.autoControlEnabled
    }

    await db.ventilationDevices.update(deviceId, updates)
    await get().loadVentilationDevices()
  },

  updateTransportMonitorState: (vehicleId, data) => {
    set((state) => ({
      transportStates: {
        ...state.transportStates,
        [vehicleId]: { ...state.transportStates[vehicleId], ...data }
      }
    }))
  },

  updateStorageMonitorState: (roomId, data) => {
    set((state) => ({
      storageStates: {
        ...state.storageStates,
        [roomId]: { ...state.storageStates[roomId], ...data }
      }
    }))
  },

  getHeatMapData: async () => {
    const institutions = await db.medicalInstitutions.toArray()
    const wasteRecords = await db.wasteRecords.toArray()

    const heatMapData: HeatMapPoint[] = institutions.map((inst) => {
      const instRecords = wasteRecords.filter((r) => r.institutionId === inst.id)
      const totalWeight = instRecords.reduce((sum, r) => sum + r.weight, 0)

      return {
        lat: inst.lat,
        lng: inst.lng,
        value: Math.min(totalWeight / 100, 100),
        institutionName: inst.name,
        weight: totalWeight
      }
    })

    return heatMapData
  },

  checkAndCreateAlert: async (type, level, title, message, sourceId, sourceType) => {
    const allAlerts = await db.alerts.toArray()
    const recentAlerts = allAlerts.filter(
      (a) => a.sourceId === sourceId && a.type === type && !a.acknowledged
    )

    if (recentAlerts.length > 0) return

    const now = new Date().toISOString()
    const alert: Alert = {
      id: generateId(),
      type,
      level,
      title,
      message,
      sourceId,
      sourceType,
      timestamp: now,
      acknowledged: false
    }

    await db.alerts.add(alert)
    await get().loadAlerts()

    if (window.electronAPI && level === 'CRITICAL') {
      window.electronAPI.notify(title, message)
    }
  },

  getThresholdByCode: (code) => {
    return get().thresholds.find((t) => t.code === code)
  }
}))
