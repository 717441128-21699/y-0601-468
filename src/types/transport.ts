import { BaseEntity, VehicleStatusType, TransferOrderStatusType, GeoLocation } from './common'
import { WasteRecord } from './waste'

export interface Vehicle extends BaseEntity {
  plateNo: string
  model: string
  capacity: number
  status: VehicleStatusType
  driverId?: string
  currentLat: number
  currentLng: number
  lastMaintenanceDate?: string
  nextMaintenanceDate?: string
  temperature: number
  currentWeight: number
  gpsDeviceId: string
}

export interface Driver extends BaseEntity {
  name: string
  phone: string
  licenseNo: string
  licenseType: string
  licenseExpiryDate: string
  status: 'ON_DUTY' | 'OFF_DUTY' | 'REST'
  currentVehicleId?: string
}

export interface TransportRoute extends BaseEntity {
  orderId: string
  waypoints: GeoLocation[]
  distance: number
  estimatedTime: number
  polyline: string
  trafficCondition: 'GOOD' | 'NORMAL' | 'BAD'
}

export interface TransferOrderItem {
  wasteRecordId: string
  wasteRecord?: WasteRecord
  weight: number
  categoryId: string
}

export interface TransferOrder extends BaseEntity {
  orderNo: string
  institutionId: string
  vehicleId: string
  driverId: string
  factoryId: string
  routeId?: string
  status: TransferOrderStatusType
  items: TransferOrderItem[]
  totalWeight: number
  estimatedWeight: number
  applyTime: string
  applyBy: string
  auditTime?: string
  auditBy?: string
  auditOpinion?: string
  departureTime?: string
  arrivalTime?: string
  disposalTime?: string
  remarks?: string
  route?: RouteInfo
  timeline: TimelineEvent[]
}

export interface TransferOrderApplication {
  institutionId: string
  wasteRecordIds: string[]
  factoryId: string
  estimatedWeight: number
  urgency: 'NORMAL' | 'URGENT'
  applyBy: string
  remarks?: string
}

export interface RouteInfo {
  vehicleToInstitution: { distance: number; estimatedTime: number }
  institutionToFactory: { distance: number; estimatedTime: number }
  totalDistance: number
  totalEstimatedTime: number
  waypoints: {
    vehicleStart: { lat: number; lng: number }
    institution: { lat: number; lng: number; name: string }
    factory: { lat: number; lng: number; name: string }
  }
}

export interface DispatchSuggestion {
  vehicleId: string
  vehiclePlateNo: string
  driverId: string
  driverName: string
  estimatedTime: number
  distance: number
  priorityScore: number
  reason: string
  route: RouteInfo
}

export interface TimelineEvent {
  status: TransferOrderStatusType | string
  title: string
  time: string
  operator?: string
  description?: string
}

export interface TransportStatistics {
  totalOrders: number
  totalWeight: number
  totalDistance: number
  onTimeRate: number
  byStatus: { status: TransferOrderStatusType; count: number }[]
  byVehicle: { vehicleId: string; plateNo: string; orders: number; distance: number }[]
}
