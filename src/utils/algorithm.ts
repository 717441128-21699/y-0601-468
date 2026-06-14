import { v4 as uuidv4 } from 'uuid'
import {
  Vehicle,
  MedicalInstitution,
  DisposalFactory,
  TransferOrderApplication,
  DispatchSuggestion,
  GeoLocation,
  RouteInfo
} from '@/types'

export function calculateDistance(point1: GeoLocation, point2: GeoLocation): number {
  const R = 6371000
  const φ1 = (point1.lat * Math.PI) / 180
  const φ2 = (point2.lat * Math.PI) / 180
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export function generateTraceCode(
  institutionCode: string,
  categoryCode: string,
  sequence: number
): string {
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const sequenceStr = String(sequence).padStart(10, '0')
  const checkDigit = generateCheckDigit(`${institutionCode}${categoryCode}${dateStr}${sequenceStr}`)

  return `${institutionCode}-${categoryCode}-${dateStr}-${sequenceStr}-${checkDigit}`
}

function generateCheckDigit(data: string): string {
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    sum += data.charCodeAt(i) * (i + 1)
  }
  return String(sum % 100000).padStart(5, '0')
}

export function generateBarcode(): string {
  const prefix = 'MW'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

export function generateOrderNo(): string {
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')
  return `ZY${dateStr}${random}`
}

export function generateId(): string {
  return uuidv4()
}

export function smartDispatch(
  application: TransferOrderApplication,
  vehicles: Vehicle[],
  drivers: { id: string; name: string; status: string }[],
  institutions: MedicalInstitution[],
  factories: DisposalFactory[]
): DispatchSuggestion[] {
  const institution = institutions.find((i) => i.id === application.institutionId)
  const factory = factories.find((f) => f.id === application.factoryId)

  if (!institution || !factory) {
    return []
  }

  const availableVehicles = vehicles.filter(
    (v) =>
      v.status === 'IDLE' &&
      v.capacity >= application.estimatedWeight &&
      factory.currentDailyVolume / factory.dailyCapacity < 0.9
  )

  const availableDrivers = drivers.filter((d) => d.status === 'ON_DUTY')

  if (availableVehicles.length === 0 || availableDrivers.length === 0) {
    return []
  }

  const avgSpeed = 45 * 1000 / 60
  const loadingTime = 20
  const unloadingTime = 15

  const suggestions: DispatchSuggestion[] = []

  availableVehicles.forEach((vehicle) => {
    const vehicleStart: GeoLocation = { lat: vehicle.currentLat, lng: vehicle.currentLng }
    const institutionPoint: GeoLocation = { lat: institution.lat, lng: institution.lng }
    const factoryPoint: GeoLocation = { lat: factory.lat, lng: factory.lng }

    const distanceV2I = calculateDistance(vehicleStart, institutionPoint)
    const distanceI2F = calculateDistance(institutionPoint, factoryPoint)
    const totalDistance = distanceV2I + distanceI2F

    const timeV2I = Math.floor(distanceV2I / avgSpeed)
    const timeI2F = Math.floor(distanceI2F / avgSpeed)
    const totalEstimatedTime = timeV2I + loadingTime + timeI2F + unloadingTime

    const storageRooms = institution.storageRooms || []
    const totalCapacity = storageRooms.reduce((sum, room) => sum + room.capacity, 0)
    const currentVolume = storageRooms.reduce((sum, room) => sum + room.currentVolume, 0)
    const storageUtilization = totalCapacity > 0 ? currentVolume / totalCapacity : 0

    const idleTimeFactor = Math.random()
    const distanceNormalized = totalDistance / 100000
    const distanceFactor = 1 - Math.min(distanceNormalized, 1)

    const priorityScore =
      0.4 * (1 - idleTimeFactor) + 0.3 * distanceFactor + 0.3 * storageUtilization

    const route: RouteInfo = {
      vehicleToInstitution: { distance: distanceV2I, estimatedTime: timeV2I },
      institutionToFactory: { distance: distanceI2F, estimatedTime: timeI2F },
      totalDistance,
      totalEstimatedTime,
      waypoints: {
        vehicleStart,
        institution: { ...institutionPoint, name: institution.name },
        factory: { ...factoryPoint, name: factory.name }
      }
    }

    const availableDriver = availableDrivers.find(
      (d) => !vehicles.some((v) => v.driverId === d.id && v.status === 'IN_TRANSIT')
    )

    if (availableDriver) {
      suggestions.push({
        vehicleId: vehicle.id,
        vehiclePlateNo: vehicle.plateNo,
        driverId: availableDriver.id,
        driverName: availableDriver.name,
        estimatedTime: totalEstimatedTime,
        distance: totalDistance,
        priorityScore,
        reason: generateDispatchReason(totalDistance, storageUtilization, vehicle.capacity),
        route
      })
    }
  })

  return suggestions.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 3)
}

function generateDispatchReason(
  distance: number,
  storageUtilization: number,
  capacity: number
): string {
  const reasons: string[] = []

  if (distance < 5000) {
    reasons.push('距离最近')
  } else if (distance < 15000) {
    reasons.push('距离适中')
  }

  if (storageUtilization > 0.7) {
    reasons.push('暂存点容量紧张，需优先处理')
  }

  if (capacity >= 5000) {
    reasons.push('载重能力匹配')
  }

  if (reasons.length === 0) {
    reasons.push('综合调度最优')
  }

  return reasons.join('；')
}

export function checkAlertRule(
  value: number,
  threshold: { warningMin?: number; warningMax?: number; criticalMin?: number; criticalMax?: number }
): 'NORMAL' | 'WARNING' | 'CRITICAL' {
  if (threshold.criticalMax !== undefined && value > threshold.criticalMax) return 'CRITICAL'
  if (threshold.criticalMin !== undefined && value < threshold.criticalMin) return 'CRITICAL'
  if (threshold.warningMax !== undefined && value > threshold.warningMax) return 'WARNING'
  if (threshold.warningMin !== undefined && value < threshold.warningMin) return 'WARNING'
  return 'NORMAL'
}

export function interpolatePoints(
  start: GeoLocation,
  end: GeoLocation,
  steps: number
): GeoLocation[] {
  const points: GeoLocation[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    points.push({
      lat: start.lat + (end.lat - start.lat) * t + (Math.random() - 0.5) * 0.001,
      lng: start.lng + (end.lng - start.lng) * t + (Math.random() - 0.5) * 0.001
    })
  }
  return points
}

export function randomFloat(min: number, max: number, decimals = 2): number {
  const value = Math.random() * (max - min) + min
  return Number(value.toFixed(decimals))
}
