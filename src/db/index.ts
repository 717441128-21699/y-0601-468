import Dexie, { Table } from 'dexie'
import {
  User,
  WasteCategory,
  PackageSpec,
  MedicalInstitution,
  StorageRoom,
  WasteRecord,
  Barcode,
  DisposalFactory,
  Vehicle,
  Driver,
  TransportRoute,
  TransferOrder,
  MonitorData,
  EnvData,
  VentilationDevice,
  MonitorThreshold,
  Alert
} from '@/types'

export class AppDatabase extends Dexie {
  users!: Table<User>
  wasteCategories!: Table<WasteCategory>
  packageSpecs!: Table<PackageSpec>
  medicalInstitutions!: Table<MedicalInstitution>
  storageRooms!: Table<StorageRoom>
  wasteRecords!: Table<WasteRecord>
  barcodes!: Table<Barcode>
  disposalFactories!: Table<DisposalFactory>
  vehicles!: Table<Vehicle>
  drivers!: Table<Driver>
  transportRoutes!: Table<TransportRoute>
  transferOrders!: Table<TransferOrder>
  monitorData!: Table<MonitorData>
  envData!: Table<EnvData>
  ventilationDevices!: Table<VentilationDevice>
  monitorThresholds!: Table<MonitorThreshold>
  alerts!: Table<Alert>

  constructor() {
    super('MedicalWasteDB')

    this.version(1).stores({
      users: 'id, username, role, status, createdAt',
      wasteCategories: 'id, type, code, createdAt',
      packageSpecs: 'id, wasteCategoryId, createdAt',
      medicalInstitutions: 'id, code, level, createdAt',
      storageRooms: 'id, institutionId, createdAt',
      wasteRecords: 'id, institutionId, categoryId, status, traceCode, createdAt, transferOrderId',
      barcodes: 'id, code, wasteRecordId, createdAt',
      disposalFactories: 'id, code, createdAt',
      vehicles: 'id, plateNo, status, createdAt',
      drivers: 'id, name, status, licenseNo, createdAt',
      transportRoutes: 'id, orderId, createdAt',
      transferOrders: 'id, orderNo, institutionId, status, vehicleId, applyTime, auditTime',
      monitorData: 'id, orderId, vehicleId, timestamp',
      envData: 'id, roomId, timestamp',
      ventilationDevices: 'id, roomId, status, createdAt',
      monitorThresholds: 'id, code, category, createdAt',
      alerts: 'id, type, level, sourceId, timestamp, acknowledged'
    })
  }
}

export const db = new AppDatabase()
