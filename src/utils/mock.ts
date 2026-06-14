import { v4 as uuidv4 } from 'uuid'
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
  TransferOrder,
  TransferOrderItem,
  MonitorData,
  EnvData,
  VentilationDevice,
  MonitorThreshold,
  Alert,
  WasteCategoryType,
  VehicleStatusType,
  TransferOrderStatusType,
  UserRoleType,
  AlertLevelType,
  AlertTypeType
} from '@/types'
import { generateId, generateTraceCode, generateBarcode, generateOrderNo } from './algorithm'

const now = new Date()
const baseTime = now.getTime()

function randomDate(daysBack: number = 30): string {
  const date = new Date(baseTime - Math.random() * daysBack * 24 * 60 * 60 * 1000)
  return date.toISOString()
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateMockUsers(): User[] {
  const users: User[] = [
    {
      id: generateId(),
      username: 'admin',
      password: '123456',
      role: 'INSTITUTION',
      name: '张院长',
      phone: '13800138001',
      email: 'admin@hospital.com',
      status: 'ACTIVE',
      createdAt: randomDate(60),
      updatedAt: randomDate(30),
      lastLoginAt: randomDate(7)
    },
    {
      id: generateId(),
      username: 'transport',
      password: '123456',
      role: 'TRANSPORT',
      name: '李调度',
      phone: '13800138002',
      email: 'transport@logistics.com',
      status: 'ACTIVE',
      createdAt: randomDate(60),
      updatedAt: randomDate(30),
      lastLoginAt: randomDate(7)
    },
    {
      id: generateId(),
      username: 'regulator',
      password: '123456',
      role: 'REGULATOR',
      name: '王监管',
      phone: '13800138003',
      email: 'regulator@env.gov',
      status: 'ACTIVE',
      createdAt: randomDate(60),
      updatedAt: randomDate(30),
      lastLoginAt: randomDate(7)
    },
    {
      id: generateId(),
      username: 'disposal',
      password: '123456',
      role: 'DISPOSAL',
      name: '赵处置',
      phone: '13800138004',
      email: 'disposal@factory.com',
      status: 'ACTIVE',
      createdAt: randomDate(60),
      updatedAt: randomDate(30),
      lastLoginAt: randomDate(7)
    },
    {
      id: generateId(),
      username: 'superadmin',
      password: '123456',
      role: 'SUPER_ADMIN',
      name: '孙管理员',
      phone: '13800138005',
      email: 'superadmin@system.com',
      status: 'ACTIVE',
      createdAt: randomDate(60),
      updatedAt: randomDate(30),
      lastLoginAt: randomDate(7)
    }
  ]

  const extraNames = ['周医生', '吴护士', '郑司机', '王科长', '刘主任']
  const extraRoles: UserRoleType[] = ['INSTITUTION_OPERATOR', 'TRANSPORT_DISPATCHER', 'ENVIRONMENTAL_AUDITOR', 'DISPOSAL_OPERATOR', 'SYSTEM_ADMIN']

  extraNames.forEach((name, index) => {
    users.push({
      id: generateId(),
      username: `user${index + 1}`,
      password: '123456',
      role: extraRoles[index],
      name,
      phone: `138${String(randomInt(10000000, 99999999))}`,
      email: `user${index + 1}@hospital.com`,
      status: 'ACTIVE',
      createdAt: randomDate(60),
      updatedAt: randomDate(30),
      lastLoginAt: randomDate(7)
    })
  })

  return users
}

export function generateMockWasteCategories(): WasteCategory[] {
  const categories: Array<{ type: WasteCategoryType; name: string; code: string; color: string; desc: string }> = [
    { type: 'INFECTIOUS', name: '感染性废物', code: 'INF', color: '#E53935', desc: '携带病原微生物具有引发感染性疾病传播危险' },
    { type: 'INJURY', name: '损伤性废物', code: 'INJ', color: '#FB8C00', desc: '能够刺伤或者割伤人体的废弃的医用锐器' },
    { type: 'PATHOLOGICAL', name: '病理性废物', code: 'PAT', color: '#7B1FA2', desc: '诊疗过程中产生的人体废弃物和医学实验动物尸体' },
    { type: 'CHEMICAL', name: '化学性废物', code: 'CHE', color: '#1976D2', desc: '具有毒性、腐蚀性、易燃易爆性的废弃的化学物品' },
    { type: 'DRUG', name: '药物性废物', code: 'DRU', color: '#388E3C', desc: '过期、淘汰、变质或者被污染的废弃的药品' }
  ]

  return categories.map((cat) => ({
    id: generateId(),
    name: cat.name,
    code: cat.code,
    type: cat.type,
    color: cat.color,
    description: cat.desc,
    createdAt: randomDate(365),
    updatedAt: randomDate(180)
  }))
}

export function generateMockPackageSpecs(categories: WasteCategory[]): PackageSpec[] {
  const specs: PackageSpec[] = []

  categories.forEach((cat) => {
    const packages = [
      { name: '专用包装袋', type: 'BAG', capacity: '25L', value: 25, unit: 'L' },
      { name: '专用包装袋', type: 'BAG', capacity: '50L', value: 50, unit: 'L' },
      { name: '专用包装袋', type: 'BAG', capacity: '100L', value: 100, unit: 'L' },
      { name: '周转箱', type: 'BOX', capacity: '60L', value: 60, unit: 'L' },
      { name: '周转箱', type: 'BOX', capacity: '100L', value: 100, unit: 'L' }
    ]

    if (cat.type === 'INJURY') {
      packages.push(
        { name: '利器盒', type: 'SHARP_BOX', capacity: '1L', value: 1, unit: 'L' },
        { name: '利器盒', type: 'SHARP_BOX', capacity: '3L', value: 3, unit: 'L' },
        { name: '利器盒', type: 'SHARP_BOX', capacity: '5L', value: 5, unit: 'L' },
        { name: '利器盒', type: 'SHARP_BOX', capacity: '10L', value: 10, unit: 'L' }
      )
    }

    if (cat.type === 'CHEMICAL') {
      packages.push(
        { name: '专用密封桶', type: 'SEALED_BARREL', capacity: '20L', value: 20, unit: 'L' },
        { name: '专用密封桶', type: 'SEALED_BARREL', capacity: '50L', value: 50, unit: 'L' }
      )
    }

    packages.slice(0, 3).forEach((pkg) => {
      specs.push({
        id: generateId(),
        name: pkg.name,
        type: pkg.type,
        capacity: pkg.capacity,
        capacityValue: pkg.value,
        unit: pkg.unit,
        wasteCategoryId: cat.id,
        color: cat.color,
        createdAt: randomDate(365),
        updatedAt: randomDate(180)
      })
    })
  })

  return specs
}

export function generateMockMedicalInstitutions(): MedicalInstitution[] {
  const hospitalNames = [
    '市第一人民医院',
    '市第二人民医院',
    '市中心医院',
    '市中医院',
    '市妇幼保健院',
    '市传染病医院',
    '市肿瘤医院',
    '市口腔医院',
    '市眼科医院',
    '市精神卫生中心',
    '区人民医院',
    '区中医院',
    '社区卫生服务中心',
    '街道卫生院',
    '皮肤病专科医院',
    '骨科专科医院',
    '心血管病医院',
    '脑科医院',
    '康复医院',
    '老年病医院'
  ]

  const levels = ['三级甲等', '三级乙等', '二级甲等', '二级乙等', '一级医院']

  return hospitalNames.map((name, index) => {
    const baseLat = 31.23 + randomFloat(-0.1, 0.1, 4)
    const baseLng = 121.47 + randomFloat(-0.15, 0.15, 4)

    const storageRooms: StorageRoom[] = [
      {
        id: generateId(),
        name: '一号贮存间',
        institutionId: '',
        capacity: randomInt(500, 1000),
        currentVolume: randomInt(100, 600),
        temperatureThreshold: 25,
        humidityThreshold: 80,
        createdAt: randomDate(365),
        updatedAt: randomDate(30)
      }
    ]

    if (index < 5) {
      storageRooms.push({
        id: generateId(),
        name: '二号贮存间',
        institutionId: '',
        capacity: randomInt(300, 600),
        currentVolume: randomInt(50, 350),
        temperatureThreshold: 25,
        humidityThreshold: 80,
        createdAt: randomDate(365),
        updatedAt: randomDate(30)
      })
    }

    return {
      id: generateId(),
      name,
      code: `MED${String(index + 1).padStart(3, '0')}`,
      address: `上海市${randomChoice(['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '浦东新区'])}某某路${randomInt(1, 999)}号`,
      lat: baseLat,
      lng: baseLng,
      level: randomChoice(levels),
      contactPerson: randomChoice(['王主任', '李科长', '张护士长', '刘主管', '陈经理']),
      contactPhone: `139${String(randomInt(10000000, 99999999))}`,
      storageRooms,
      createdAt: randomDate(365),
      updatedAt: randomDate(90)
    }
  })
}

export function generateMockDisposalFactories(): DisposalFactory[] {
  const factoryNames = [
    '市固体废物处置中心',
    '新区危险废物处置厂',
    '环境科技处置有限公司',
    '绿色环保处置中心',
    '医疗废物集中处置站'
  ]

  return factoryNames.map((name, index) => ({
    id: generateId(),
    name,
    code: `FAC${String(index + 1).padStart(3, '0')}`,
    address: `上海市${randomChoice(['浦东新区', '奉贤区', '金山区', '崇明区', '青浦区'])}工业园区某某路${randomInt(1, 999)}号`,
    lat: 31.0 + randomFloat(-0.2, 0.2, 4),
    lng: 121.5 + randomFloat(-0.3, 0.3, 4),
    dailyCapacity: randomInt(5000, 15000),
    currentDailyVolume: randomInt(2000, 8000),
    contactPerson: randomChoice(['周厂长', '吴经理', '郑主管', '王主任', '李厂长']),
    contactPhone: `137${String(randomInt(10000000, 99999999))}`,
    createdAt: randomDate(730),
    updatedAt: randomDate(180)
  }))
}

export function generateMockVehicles(): Vehicle[] {
  const platePrefixes = ['沪A', '沪B', '沪C', '沪D', '沪E']
  const models = ['东风天锦', '解放J6', '福田欧曼', '重汽豪沃', '陕汽德龙']
  const statuses: VehicleStatusType[] = ['IDLE', 'IN_TRANSIT', 'MAINTENANCE', 'IDLE', 'IDLE', 'IN_TRANSIT']

  return Array.from({ length: 15 }, (_, i) => {
    const baseLat = 31.23 + randomFloat(-0.08, 0.08, 4)
    const baseLng = 121.47 + randomFloat(-0.1, 0.1, 4)

    return {
      id: generateId(),
      plateNo: `${randomChoice(platePrefixes)}${String(randomInt(10000, 99999))}`,
      model: randomChoice(models),
      capacity: randomChoice([3000, 5000, 8000, 10000, 12000]),
      status: statuses[i % statuses.length],
      currentLat: baseLat,
      currentLng: baseLng,
      lastMaintenanceDate: randomDate(90),
      nextMaintenanceDate: new Date(baseTime + randomInt(7, 60) * 24 * 60 * 60 * 1000).toISOString(),
      temperature: randomFloat(2, 8, 1),
      currentWeight: randomFloat(0, 5000, 1),
      gpsDeviceId: `GPS${String(i + 1).padStart(6, '0')}`,
      createdAt: randomDate(540),
      updatedAt: randomDate(30)
    }
  })
}

export function generateMockDrivers(): Driver[] {
  const names = ['张师傅', '李师傅', '王师傅', '刘师傅', '陈师傅', '赵师傅', '周师傅', '吴师傅', '郑师傅', '孙师傅']

  return names.map((name, index) => ({
    id: generateId(),
    name,
    phone: `136${String(randomInt(10000000, 99999999))}`,
    licenseNo: `沪驾${String(randomInt(100000, 999999))}`,
    licenseType: randomChoice(['A1', 'A2', 'B2']),
    licenseExpiryDate: new Date(baseTime + randomInt(365, 1095) * 24 * 60 * 60 * 1000).toISOString(),
    status: index < 7 ? 'ON_DUTY' : index < 9 ? 'OFF_DUTY' : 'REST',
    createdAt: randomDate(540),
    updatedAt: randomDate(30)
  }))
}

export function generateMockWasteRecords(
  count: number,
  institutions: MedicalInstitution[],
  categories: WasteCategory[],
  packages: PackageSpec[],
  users: User[]
): { records: WasteRecord[]; barcodes: Barcode[] } {
  const records: WasteRecord[] = []
  const barcodes: Barcode[] = []

  for (let i = 0; i < count; i++) {
    const institution = randomChoice(institutions)
    const category = randomChoice(categories)
    const pkg = randomChoice(packages.filter((p) => p.wasteCategoryId === category.id))
    const user = randomChoice(users.filter((u) => u.role === 'INSTITUTION_OPERATOR'))
    const storageRoom = randomChoice(institution.storageRooms)

    const barcodeCode = generateBarcode()
    const traceCode = generateTraceCode(institution.code, category.code, i + 1)

    const barcode: Barcode = {
      id: generateId(),
      code: barcodeCode,
      qrCode: traceCode,
      wasteRecordId: '',
      printedAt: randomDate(30),
      printedBy: user?.id,
      createdAt: randomDate(30),
      updatedAt: randomDate(30)
    }

    const record: WasteRecord = {
      id: generateId(),
      institutionId: institution.id,
      categoryId: category.id,
      packageId: pkg?.id || packages[0].id,
      weight: randomFloat(0.5, 20, 2),
      barcodeId: barcode.id,
      traceCode,
      storageRoomId: storageRoom?.id || institution.storageRooms[0].id,
      registeredBy: user?.id || users[0].id,
      status: randomChoice(['REGISTERED', 'IN_STORAGE', 'IN_TRANSIT', 'DISPOSED']),
      createdAt: randomDate(30),
      updatedAt: randomDate(15)
    }

    barcode.wasteRecordId = record.id
    records.push(record)
    barcodes.push(barcode)
  }

  return { records, barcodes }
}

export function generateMockTransferOrders(
  count: number,
  institutions: MedicalInstitution[],
  vehicles: Vehicle[],
  drivers: Driver[],
  factories: DisposalFactory[],
  wasteRecords: WasteRecord[],
  users: User[]
): TransferOrder[] {
  const orders: TransferOrder[] = []
  const statuses: TransferOrderStatusType[] = [
    'DRAFT',
    'PENDING_AUDIT',
    'APPROVED',
    'IN_TRANSIT',
    'ARRIVED',
    'COMPLETED'
  ]

  const availableRecords = [...wasteRecords].filter((r) => r.status === 'IN_STORAGE')

  for (let i = 0; i < count && availableRecords.length > 0; i++) {
    const institution = randomChoice(institutions)
    const vehicle = randomChoice(vehicles)
    const driver = randomChoice(drivers.filter((d) => d.status === 'ON_DUTY'))
    const factory = randomChoice(factories)
    const applyUser = randomChoice(users.filter((u) => u.role === 'INSTITUTION_OPERATOR'))
    const auditUser = randomChoice(users.filter((u) => u.role === 'ENVIRONMENTAL_AUDITOR'))

    const itemCount = randomInt(1, 5)
    const items: TransferOrderItem[] = []
    let totalWeight = 0

    for (let j = 0; j < itemCount && availableRecords.length > 0; j++) {
      const record = availableRecords.pop()!
      items.push({
        wasteRecordId: record.id,
        weight: record.weight,
        categoryId: record.categoryId
      })
      totalWeight += record.weight
    }

    const status = randomChoice(statuses)
    const applyTime = randomDate(15)
    const auditTime = status !== 'DRAFT' && status !== 'PENDING_AUDIT' ? new Date(new Date(applyTime).getTime() + randomInt(30, 180) * 60 * 1000).toISOString() : undefined
    const departureTime = status === 'IN_TRANSIT' || status === 'ARRIVED' || status === 'COMPLETED' ? new Date(new Date(auditTime || applyTime).getTime() + randomInt(30, 120) * 60 * 1000).toISOString() : undefined
    const arrivalTime = status === 'ARRIVED' || status === 'COMPLETED' ? new Date(new Date(departureTime || applyTime).getTime() + randomInt(60, 240) * 60 * 1000).toISOString() : undefined
    const disposalTime = status === 'COMPLETED' ? new Date(new Date(arrivalTime || applyTime).getTime() + randomInt(60, 180) * 60 * 1000).toISOString() : undefined

    const timeline: any[] = [
      {
        status: status === 'DRAFT' ? 'DRAFT' : 'PENDING_AUDIT',
        title: status === 'DRAFT' ? '创建草稿' : '提交转运申请',
        time: applyTime,
        operator: applyUser?.name || '未知用户',
        description: `申请转运 ${items.length} 条废物记录，总重量 ${totalWeight.toFixed(2)}kg`
      }
    ]
    if (auditTime) {
      if (status === 'REJECTED') {
        timeline.push({
          status: 'REJECTED',
          title: '审批拒绝',
          time: auditTime,
          operator: auditUser?.name || '审核员',
          description: '资料不全，请补充'
        })
      } else {
        timeline.push({
          status: 'APPROVED',
          title: '审批通过',
          time: auditTime,
          operator: auditUser?.name || '审核员',
          description: '同意转运'
        })
      }
    }
    if (departureTime) {
      timeline.push({
        status: 'IN_TRANSIT',
        title: '开始运输',
        time: departureTime,
        operator: driver?.name || '驾驶员',
        description: `车辆 ${vehicle?.plateNo || ''} 已出发前往 ${institution?.name || '医疗机构'}`
      })
    }
    if (arrivalTime) {
      timeline.push({
        status: 'ARRIVED',
        title: '到达处置厂',
        time: arrivalTime,
        operator: driver?.name || '驾驶员',
        description: `已安全到达 ${factory?.name || '处置厂'}`
      })
    }
    if (disposalTime) {
      timeline.push({
        status: 'COMPLETED',
        title: '处置完成',
        time: disposalTime,
        operator: '处置人员',
        description: '废物已完成无害化处置'
      })
    }

    const route = status !== 'DRAFT' ? {
      vehicleToInstitution: { distance: randomInt(5000, 20000), estimatedTime: randomInt(10, 30) },
      institutionToFactory: { distance: randomInt(10000, 40000), estimatedTime: randomInt(20, 60) },
      totalDistance: randomInt(15000, 60000),
      totalEstimatedTime: randomInt(60, 140),
      waypoints: {
        vehicleStart: { lat: vehicle.currentLat || 30.6, lng: vehicle.currentLng || 104.0 },
        institution: { lat: institution.lat || 30.65, lng: institution.lng || 104.05, name: institution.name },
        factory: { lat: factory.lat || 30.7, lng: factory.lng || 104.1, name: factory.name }
      }
    } : undefined

    orders.push({
      id: generateId(),
      orderNo: generateOrderNo(),
      institutionId: institution.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      factoryId: factory.id,
      status,
      items,
      totalWeight: parseFloat(totalWeight.toFixed(2)),
      estimatedWeight: parseFloat((totalWeight * randomFloat(0.9, 1.1, 2)).toFixed(2)),
      applyTime,
      applyBy: applyUser?.id || users[0].id,
      auditTime,
      auditBy: status !== 'DRAFT' && status !== 'PENDING_AUDIT' ? auditUser?.id : undefined,
      auditOpinion: status === 'REJECTED' ? '资料不全，请补充' : status !== 'DRAFT' && status !== 'PENDING_AUDIT' ? '同意转运' : undefined,
      departureTime,
      arrivalTime,
      disposalTime,
      timeline,
      route,
      remarks: randomInt(0, 1) === 1 ? '请注意运输过程中的温度控制' : undefined,
      createdAt: applyTime,
      updatedAt: randomDate(7)
    })
  }

  return orders
}

export function generateMockMonitorData(order: TransferOrder, count: number = 20): MonitorData[] {
  const data: MonitorData[] = []
  const startTime = new Date(order.departureTime || order.applyTime).getTime()
  const endTime = new Date(order.arrivalTime || startTime + 2 * 60 * 60 * 1000).getTime()
  const interval = (endTime - startTime) / count

  const startLat = randomFloat(31.1, 31.3, 6)
  const startLng = randomFloat(121.4, 121.6, 6)
  const endLat = randomFloat(31.0, 31.2, 6)
  const endLng = randomFloat(121.5, 121.7, 6)

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(startTime + i * interval)
    const progress = i / count

    data.push({
      id: generateId(),
      orderId: order.id,
      vehicleId: order.vehicleId,
      timestamp: timestamp.toISOString(),
      lat: startLat + (endLat - startLat) * progress + randomFloat(-0.001, 0.001, 6),
      lng: startLng + (endLng - startLng) * progress + randomFloat(-0.001, 0.001, 6),
      temperature: randomFloat(2, 10, 1),
      weight: order.totalWeight + randomFloat(-50, 50, 1),
      speed: randomFloat(20, 80, 1),
      humidity: randomFloat(40, 70, 1),
      doorStatus: randomChoice(['CLOSED', 'CLOSED', 'CLOSED', 'OPEN']),
      batteryLevel: randomFloat(70, 100, 1),
      createdAt: timestamp.toISOString(),
      updatedAt: timestamp.toISOString()
    })
  }

  return data
}

export function generateMockEnvData(roomId: string, count: number = 48): EnvData[] {
  const data: EnvData[] = []
  const now = Date.now()
  const interval = 30 * 60 * 1000

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now - (count - i) * interval)
    const temperature = randomFloat(18, 28, 1)
    const humidity = randomFloat(50, 85, 1)

    data.push({
      id: generateId(),
      roomId,
      timestamp: timestamp.toISOString(),
      temperature,
      humidity,
      temperatureWarning: temperature > 25,
      humidityWarning: humidity > 80,
      createdAt: timestamp.toISOString(),
      updatedAt: timestamp.toISOString()
    })
  }

  return data
}

export function generateMockVentilationDevices(rooms: StorageRoom[]): VentilationDevice[] {
  return rooms.map((room) => ({
    id: generateId(),
    roomId: room.id,
    name: `${room.name}-排风系统`,
    status: randomChoice(['RUNNING', 'STOPPED', 'STOPPED', 'RUNNING']),
    lastStartTime: randomDate(7),
    lastStopTime: randomDate(7),
    runHours: randomFloat(100, 1000, 1),
    autoControlEnabled: true,
    createdAt: randomDate(365),
    updatedAt: randomDate(30)
  }))
}

export function generateMockThresholds(): MonitorThreshold[] {
  const thresholds: Array<Omit<MonitorThreshold, 'id' | 'createdAt' | 'updatedAt'>> = [
    { name: '运输箱体温度', code: 'TRANSPORT_TEMP', category: 'TRANSPORT', warningMax: 8, criticalMax: 10, unit: '°C', enabled: true },
    { name: '运输箱体温度下限', code: 'TRANSPORT_TEMP_LOW', category: 'TRANSPORT', warningMin: 0, criticalMin: -2, unit: '°C', enabled: true },
    { name: '重量偏差', code: 'WEIGHT_DEVIATION', category: 'TRANSPORT', warningMax: 5, criticalMax: 10, unit: '%', enabled: true },
    { name: '贮存间温度', code: 'STORAGE_TEMP', category: 'STORAGE', warningMax: 25, criticalMax: 30, unit: '°C', enabled: true },
    { name: '贮存间湿度', code: 'STORAGE_HUMIDITY', category: 'STORAGE', warningMax: 80, criticalMax: 90, unit: '%', enabled: true },
    { name: '车辆电池电量', code: 'VEHICLE_BATTERY', category: 'VEHICLE', warningMin: 20, criticalMin: 10, unit: '%', enabled: true }
  ]

  return thresholds.map((t) => ({
    ...t,
    id: generateId(),
    createdAt: randomDate(365),
    updatedAt: randomDate(90)
  }))
}

export function generateMockAlerts(count: number = 20): Alert[] {
  const alertTypes: Array<{ type: AlertTypeType; level: AlertLevelType; title: string; messages: string[] }> = [
    { type: 'TEMPERATURE_HIGH', level: 'CRITICAL', title: '温度超限报警', messages: ['车辆 {0} 箱体温度达到 {1}°C，超过安全阈值', '贮存间 {0} 温度达到 {1}°C，请及时处理'] },
    { type: 'TEMPERATURE_LOW', level: 'WARNING', title: '温度过低提醒', messages: ['车辆 {0} 箱体温度为 {1}°C，接近下限'] },
    { type: 'WEIGHT_DEVIATION', level: 'WARNING', title: '重量偏差警告', messages: ['车辆 {0} 称重偏差超过 {1}%，请核实'] },
    { type: 'HUMIDITY_HIGH', level: 'WARNING', title: '湿度过高提醒', messages: ['贮存间 {0} 湿度达到 {1}%，请检查排风系统'] },
    { type: 'STORAGE_FULL', level: 'WARNING', title: '贮存容量预警', messages: ['机构 {0} 贮存间容量已达 {1}%，请及时转运'] },
    { type: 'VEHICLE_FAULT', level: 'CRITICAL', title: '车辆故障报警', messages: ['车辆 {0} 上报故障，请及时处理'] },
    { type: 'DEVICE_OFFLINE', level: 'WARNING', title: '设备离线提醒', messages: ['传感器 {0} 已离线超过30分钟'] }
  ]

  return Array.from({ length: count }, () => {
    const alert = randomChoice(alertTypes)
    const message = randomChoice(alert.messages).replace('{0}', String(randomInt(1, 20))).replace('{1}', String(randomFloat(5, 30, 1)))

    return {
      id: generateId(),
      type: alert.type,
      level: alert.level,
      title: alert.title,
      message,
      sourceId: uuidv4(),
      sourceType: randomChoice(['VEHICLE', 'STORAGE_ROOM', 'SENSOR']),
      timestamp: randomDate(3),
      acknowledged: randomInt(0, 1) === 1,
      acknowledgedBy: randomInt(0, 1) === 1 ? uuidv4() : undefined,
      acknowledgedAt: randomInt(0, 1) === 1 ? randomDate(2) : undefined
    }
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export async function initializeMockData(force: boolean = false): Promise<void> {
  const { db } = await import('@/db')

  const existingUsers = await db.users.count()
  if (existingUsers > 0 && !force) return

  if (force) {
    await db.delete()
    await db.open()
  }

  const users = generateMockUsers()
  await db.users.bulkAdd(users)

  const categories = generateMockWasteCategories()
  await db.wasteCategories.bulkAdd(categories)

  const packages = generateMockPackageSpecs(categories)
  await db.packageSpecs.bulkAdd(packages)

  const institutions = generateMockMedicalInstitutions()
  await db.medicalInstitutions.bulkAdd(institutions)

  const allStorageRooms = institutions.flatMap((i) =>
    i.storageRooms.map((r) => ({ ...r, institutionId: i.id }))
  )
  await db.storageRooms.bulkAdd(allStorageRooms)

  const factories = generateMockDisposalFactories()
  await db.disposalFactories.bulkAdd(factories)

  const vehicles = generateMockVehicles()
  await db.vehicles.bulkAdd(vehicles)

  const drivers = generateMockDrivers()
  await db.drivers.bulkAdd(drivers)

  const { records, barcodes } = generateMockWasteRecords(100, institutions, categories, packages, users)
  await db.wasteRecords.bulkAdd(records)
  await db.barcodes.bulkAdd(barcodes)

  const orders = generateMockTransferOrders(30, institutions, vehicles, drivers, factories, records, users)
  await db.transferOrders.bulkAdd(orders)

  for (const order of orders.filter((o) => o.status === 'IN_TRANSIT' || o.status === 'COMPLETED')) {
    const monitorData = generateMockMonitorData(order, randomInt(10, 30))
    await db.monitorData.bulkAdd(monitorData)
  }

  for (const room of allStorageRooms.slice(0, 10)) {
    const envData = generateMockEnvData(room.id, 48)
    await db.envData.bulkAdd(envData)
  }

  const devices = generateMockVentilationDevices(allStorageRooms)
  await db.ventilationDevices.bulkAdd(devices)

  const thresholds = generateMockThresholds()
  await db.monitorThresholds.bulkAdd(thresholds)

  const alerts = generateMockAlerts(20)
  await db.alerts.bulkAdd(alerts)

  console.log('Mock data initialized successfully')
}
