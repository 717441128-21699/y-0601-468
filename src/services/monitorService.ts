import { useMonitorStore, useTransportStore, useWasteStore } from '@/store'
import { db } from '@/db'
import { randomFloat } from '@/utils/algorithm'

let monitorInterval: number | null = null
let envInterval: number | null = null

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

        await useTransportStore.getState().updateVehiclePosition(vehicle.id, newLat, newLng)

        await useMonitorStore.getState().addMonitorData({
          orderId: order.id,
          vehicleId: vehicle.id,
          timestamp: new Date().toISOString(),
          lat: newLat,
          lng: newLng,
          temperature: randomFloat(2, 12, 1),
          weight: order.totalWeight + randomFloat(-20, 20, 1),
          speed: randomFloat(0, 90, 1),
          doorStatus: Math.random() > 0.95 ? 'OPEN' : 'CLOSED',
          batteryLevel: randomFloat(50, 100, 1)
        })

        const monitorData = useMonitorStore.getState().monitorData[order.id] || []
        const recentData = monitorData.slice(-30)

        useMonitorStore.getState().updateTransportMonitorState(vehicle.id, {
          vehicleId: vehicle.id,
          plateNo: vehicle.plateNo,
          status: 'ONLINE',
          currentLocation: { lat: newLat, lng: newLng },
          temperature: randomFloat(2, 10, 1),
          weight: order.totalWeight,
          speed: randomFloat(20, 70, 1),
          lastUpdateTime: new Date().toISOString(),
          activeAlerts: [],
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
