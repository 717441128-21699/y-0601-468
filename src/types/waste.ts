import { BaseEntity, WasteCategoryType } from './common'

export interface WasteCategory extends BaseEntity {
  name: string
  code: string
  type: WasteCategoryType
  color: string
  description: string
}

export interface PackageSpec extends BaseEntity {
  name: string
  type: string
  capacity: string
  capacityValue: number
  unit: string
  wasteCategoryId: string
  color: string
}

export interface MedicalInstitution extends BaseEntity {
  name: string
  code: string
  address: string
  lat: number
  lng: number
  level: string
  contactPerson: string
  contactPhone: string
  storageRooms: StorageRoom[]
}

export interface StorageRoom extends BaseEntity {
  name: string
  institutionId: string
  capacity: number
  currentVolume: number
  temperatureThreshold: number
  humidityThreshold: number
  ventilationDeviceId?: string
}

export interface WasteRecord extends BaseEntity {
  institutionId: string
  categoryId: string
  packageId: string
  weight: number
  barcodeId: string
  traceCode: string
  storageRoomId: string
  registeredBy: string
  status: 'REGISTERED' | 'IN_STORAGE' | 'IN_TRANSIT' | 'DISPOSED'
  transferOrderId?: string
  disposalTime?: string
}

export interface Barcode extends BaseEntity {
  code: string
  qrCode: string
  wasteRecordId: string
  printedAt?: string
  printedBy?: string
}

export interface DisposalFactory extends BaseEntity {
  name: string
  code: string
  address: string
  lat: number
  lng: number
  dailyCapacity: number
  currentDailyVolume: number
  contactPerson: string
  contactPhone: string
}

export interface WasteRegistrationForm {
  institutionId: string
  categoryId: string
  weight: number
  storageRoomId: string
  generatedAt: string
  department: string
  operator: string
  remarks?: string
}

export interface WasteStatistics {
  totalWeight: number
  totalCount: number
  byCategory: { categoryId: string; categoryName: string; weight: number; count: number }[]
  byInstitution: { institutionId: string; institutionName: string; weight: number; count: number }[]
  trendData: { date: string; weight: number }[]
}
