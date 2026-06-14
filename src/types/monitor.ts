import { BaseEntity, GeoLocation, Alert } from './common'

export interface MonitorData extends BaseEntity {
  orderId: string
  vehicleId: string
  timestamp: string
  lat: number
  lng: number
  temperature: number
  weight: number
  speed: number
  humidity?: number
  doorStatus: 'OPEN' | 'CLOSED'
  batteryLevel: number
}

export interface EnvData extends BaseEntity {
  roomId: string
  timestamp: string
  temperature: number
  humidity: number
  temperatureWarning: boolean
  humidityWarning: boolean
}

export interface VentilationDevice extends BaseEntity {
  roomId: string
  name: string
  status: 'RUNNING' | 'STOPPED' | 'FAULT'
  lastStartTime?: string
  lastStopTime?: string
  runHours: number
  autoControlEnabled: boolean
}

export interface MonitorThreshold extends BaseEntity {
  name: string
  code: string
  category: 'TRANSPORT' | 'STORAGE' | 'VEHICLE'
  warningMin?: number
  warningMax?: number
  criticalMin?: number
  criticalMax?: number
  unit: string
  enabled: boolean
}

export interface TransportMonitorState {
  vehicleId: string
  plateNo: string
  status: 'ONLINE' | 'OFFLINE' | 'WARNING' | 'CRITICAL'
  currentLocation: GeoLocation
  temperature: number
  weight: number
  speed: number
  lastUpdateTime: string
  activeAlerts: Alert[]
  temperatureHistory: { time: string; value: number }[]
  weightHistory: { time: string; value: number }[]
  trackPoints: GeoLocation[]
}

export interface StorageMonitorState {
  roomId: string
  roomName: string
  institutionName: string
  currentTemperature: number
  currentHumidity: number
  capacityUsage: number
  ventilationStatus: 'RUNNING' | 'STOPPED' | 'FAULT'
  temperatureStatus: 'NORMAL' | 'WARNING' | 'CRITICAL'
  humidityStatus: 'NORMAL' | 'WARNING' | 'CRITICAL'
  lastUpdateTime: string
  activeAlerts: Alert[]
  temperatureHistory: { time: string; value: number }[]
  humidityHistory: { time: string; value: number }[]
}

export interface HeatMapPoint extends GeoLocation {
  value: number
  institutionName: string
  weight: number
}

export interface VehicleTrackPoint extends GeoLocation {
  timestamp: string
  speed: number
  temperature: number
}
