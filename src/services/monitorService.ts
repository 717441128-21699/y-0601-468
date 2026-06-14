import { useMonitorStore, useTransportStore, useWasteStore } from '@/store'
import { db } from '@/db'
import { generateId, randomFloat } from '@/utils/algorithm'
import { Alert, AlertLevelType, AlertTypeType } from '@/types'
import { AlertTypeLabel } from '@/types/common'

let monitorInterval: number | null = null
let envInterval: number | null = null

const SPEED_LIMIT = 80
const WEIGHT_DEVIATION_THRESHOLD = 0.1
const TEMPERATURE_MAX = 10
const TEMPERATURE_MIN = 2

const triggeredAlertKeys = new Set<string>()

function generateAlertKey(sourceId: string, type: AlertTypeType): string {
  const dateKey = new Date().toDateString()
  return `${sourceId}-${type}-${dateKey}`
}

async function triggerAlert(
  type: AlertTypeType,
  level: AlertLevelType,
  title: string,
  message: string,
  sourceId: string,
  sourceType: string,
  orderId?: string
): Promise<void> {
  const key = generateAlertKey(sourceId, type)
  if (triggeredAlertKeys.has(key)) return

  const { alerts, loadAlerts } = useMonitorStore.getState()
  const recentAlert = alerts.find(
    (a) => a.sourceId === sourceId && a.type === type && !a.acknowledged
  )
  if (recentAlert) return

  const alert: Alert = {
    id: generateId(),
    type,
    level,
    title,
    message,
    sourceId,
    sourceType,
    orderId,
    timestamp: new Date().toISOString(),
    acknowledged: false
  }

  await db.alerts.add(alert)
  triggeredAlertKeys.add(key)
  await loadAlerts()

  if (window.electronAPI?.notify) {
    try {
      window.electronAPI.notify(
        `${AlertTypeLabel[type]} - ${level === 'CRITICAL' ? '严重' : level === 'WARNING' ? '警告' : '提示'}`,
        message
      )
    } catch {
      // ignore notification errors
    }
  }
}

export function startRealTimeMonitoring(): void {
  if (monitorInterval) return

  monitorInterval = window.setInterval(async () => {
    const { vehicles } = useTransportStore.getState()
    const inTransitVehicles = vehicles.filter((v) => v.status === 'IN_TRANSIT')

    for (const vehicle of inTransitVehicles) {
      const order = await db.transferOrders
        .where('vehicleId')
        .equals(vehicle.id)
        .filter((o) => o.status === 'IN_TRANSIT')
        .first()

      if (order) {
        const latChange = randomFloat(-0.0005, 0.0005, 6)
        const lngChange = randomFloat(-0.0005, 0.0005, 6)

        const newLat = vehicle.currentLat + latChange
        const newLng = vehicle.currentLng + lngChange

        const temperature = randomFloat(2, 12, 1)
        const baseWeight = order.totalWeight
        const abnormalWeightFlag = Math.random() > 0.92
        const currentWeight = abnormalWeightFlag
          ? baseWeight * (1 + randomFloat(0.15, 0.35, 2) * (Math.random() > 0.5 ? 1 : -1))
          : baseWeight + randomFloat(-20, 20, 1)

        const normalSpeed = randomFloat(20, 70, 1)
        const overspeedFlag = Math.random() > 0.9
        const currentSpeed = overspeedFlag ? randomFloat(85, 120, 1) : normalSpeed

        const doorStatus = Math.random() > 0.95 ? 'OPEN' : 'CLOSED'

        await useTransportStore.getState().updateVehiclePosition(vehicle.id, newLat, newLng)

        await useMonitorStore.getState().addMonitorData({
          orderId: order.id,
          vehicleId: vehicle.id,
          timestamp: new Date().toISOString(),
          lat: newLat,
          lng: newLng,
          temperature,
          weight: currentWeight,
          speed: currentSpeed,
          doorStatus,
          batteryLevel: randomFloat(50, 100, 1)
        })

        if (currentSpeed > SPEED_LIMIT) {
          await triggerAlert(
            'SPEED_EXCEED',
            currentSpeed > 100 ? 'CRITICAL' : 'WARNING',
            `${vehicle.plateNo} 超速行驶`,
            `车辆 ${vehicle.plateNo} 当前车速 ${currentSpeed.toFixed(1)} km/h，超过限速 ${SPEED_LIMIT} km/h`,
            vehicle.id,
            'VEHICLE',
            order.id
          )
        }

        if (doorStatus === 'OPEN') {
          await triggerAlert(
            'DOOR_OPEN',
            'CRITICAL',
            `${vehicle.plateNo} 车门异常开启`,
            `运输过程中车辆 ${vehicle.plateNo} 车门被开启，可能存在安全风险`,
            vehicle.id,
            'VEHICLE',
            order.id
          )
        }

        const weightDeviation = Math.abs(currentWeight - baseWeight) / baseWeight
        if (weightDeviation > WEIGHT_DEVIATION_THRESHOLD) {
          await triggerAlert(
            'WEIGHT_ABNORMAL',
            weightDeviation > 0.2 ? 'CRITICAL' : 'WARNING',
            `${vehicle.plateNo} 重量异常`,
            `车辆 ${vehicle.plateNo} 当前重量 ${currentWeight.toFixed(2)} kg，与登记重量偏差 ${(weightDeviation * 100).toFixed(1)}%`,
            vehicle.id,
            'VEHICLE',
            order.id
          )
        }

        if (temperature > TEMPERATURE_MAX) {
          await triggerAlert(
            'TEMPERATURE_HIGH',
            temperature > 12 ? 'CRITICAL' : 'WARNING',
            `${vehicle.plateNo} 箱体温度过高`,
            `车辆 ${vehicle.plateNo} 箱体温度 ${temperature.toFixed(1)}°C，超过建议上限 ${TEMPERATURE_MAX}°C`,
            vehicle.id,
            'VEHICLE',
            order.id
          )
        }
        if (temperature < TEMPERATURE_MIN) {
          await triggerAlert(
            'TEMPERATURE_LOW',
            'WARNING',
            `${vehicle.plateNo} 箱体温度过低`,
            `车辆 ${vehicle.plateNo} 箱体温度 ${temperature.toFixed(1)}°C，低于建议下限 ${TEMPERATURE_MIN}°C`,
            vehicle.id,
            'VEHICLE',
            order.id
          )
        }

        const monitorData = useMonitorStore.getState().monitorData[order.id] || []
        const recentData = monitorData.slice(-30)
        const { alerts: allAlerts } = useMonitorStore.getState()
        const activeAlerts = allAlerts.filter(
          (a) => a.sourceId === vehicle.id && !a.acknowledged
        )

        let monitorStatus: 'ONLINE' | 'OFFLINE' | 'WARNING' | 'CRITICAL' = 'ONLINE'
        if (activeAlerts.some((a) => a.level === 'CRITICAL')) {
          monitorStatus = 'CRITICAL'
        } else if (activeAlerts.some((a) => a.level === 'WARNING')) {
          monitorStatus = 'WARNING'
        }

        useMonitorStore.getState().updateTransportMonitorState(vehicle.id, {
          vehicleId: vehicle.id,
          plateNo: vehicle.plateNo,
          status: monitorStatus,
          currentLocation: { lat: newLat, lng: newLng },
          temperature,
          weight: currentWeight,
          speed: currentSpeed,
          lastUpdateTime: new Date().toISOString(),
          activeAlerts,
          temperatureHistory: recentData.map((d) => ({ time: d.timestamp, value: d.temperature })),
          weightHistory: recentData.map((d) => ({ time: d.timestamp, value: d.weight })),
          trackPoints: recentData.map((d) => ({ lat: d.lat, lng: d.lng }))
        })
      }
    }
  }, 3000)
}

export function startEnvironmentMonitoring(): void {
  if (envInterval) return

  envInterval = window.setInterval(async () => {
    const { institutions } = useWasteStore.getState()
    const { updateStorageMonitorState, addEnvData } = useMonitorStore.getState()

    for (const inst of institutions.slice(0, 5)) {
      for (const room of inst.storageRooms) {
        const temperature = randomFloat(18, 32, 1)
        const humidity = randomFloat(45, 95, 1)

        await addEnvData({
          roomId: room.id,
          timestamp: new Date().toISOString(),
          temperature,
          humidity,
          temperatureWarning: temperature > 25,
          humidityWarning: humidity > 80
        })

        const envData = useMonitorStore.getState().envData[room.id] || []
        const recentData = envData.slice(-24)

        const tempStatus = temperature > 30 ? 'CRITICAL' : temperature > 25 ? 'WARNING' : 'NORMAL'
        const humStatus = humidity > 90 ? 'CRITICAL' : humidity > 80 ? 'WARNING' : 'NORMAL'

        const devices = useMonitorStore.getState().ventilationDevices
        const device = devices.find((d) => d.roomId === room.id)

        updateStorageMonitorState(room.id, {
          roomId: room.id,
          roomName: room.name,
          institutionName: inst.name,
          currentTemperature: temperature,
          currentHumidity: humidity,
          capacityUsage: room.capacity > 0 ? (room.currentVolume / room.capacity) * 100 : 0,
          ventilationStatus: device?.status || 'STOPPED',
          temperatureStatus: tempStatus as 'NORMAL' | 'WARNING' | 'CRITICAL',
          humidityStatus: humStatus as 'NORMAL' | 'WARNING' | 'CRITICAL',
          lastUpdateTime: new Date().toISOString(),
          activeAlerts: [],
          temperatureHistory: recentData.map((d) => ({ time: d.timestamp, value: d.temperature })),
          humidityHistory: recentData.map((d) => ({ time: d.timestamp, value: d.humidity }))
        })
      }
    }
  }, 5000)
}

export function stopRealTimeMonitoring(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval)
    monitorInterval = null
  }
}

export function stopEnvironmentMonitoring(): void {
  if (envInterval) {
    clearInterval(envInterval)
    envInterval = null
  }
}

export function startAllMonitoring(): void {
  startRealTimeMonitoring()
  startEnvironmentMonitoring()
}

export function stopAllMonitoring(): void {
  stopRealTimeMonitoring()
  stopEnvironmentMonitoring()
}
