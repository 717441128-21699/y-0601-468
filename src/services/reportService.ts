import { TransferOrder, WasteRecord, WasteStatistics } from '@/types'
import { exportTransferOrderToPDF, exportMonthlyReportToExcel } from '@/utils/export'
import { db } from '@/db'
import { formatDateTime, formatWeight, formatDate } from '@/utils/format'

export interface EWaybillData {
  billNo: string
  order: TransferOrder
  wasteRecords: WasteRecord[]
  institutionName: string
  factoryName: string
  vehiclePlateNo: string
  driverName: string
}

export async function generateEWaybill(orderId: string): Promise<EWaybillData | null> {
  const order = await db.transferOrders.get(orderId)
  if (!order) return null

  const wasteRecords = await db.wasteRecords
    .where('transferOrderId')
    .equals(orderId)
    .toArray()

  const institution = await db.medicalInstitutions.get(order.institutionId)
  const factory = await db.disposalFactories.get(order.factoryId)
  const vehicle = await db.vehicles.get(order.vehicleId)
  const driver = await db.drivers.get(order.driverId)

  return {
    billNo: `EWB${order.orderNo}`,
    order,
    wasteRecords,
    institutionName: institution?.name || '未知机构',
    factoryName: factory?.name || '未知处置厂',
    vehiclePlateNo: vehicle?.plateNo || '未知车辆',
    driverName: driver?.name || '未知驾驶员'
  }
}

export async function exportEWaybillToPDF(orderId: string): Promise<void> {
  const order = await db.transferOrders.get(orderId)
  if (!order) return

  const wasteRecords = await db.wasteRecords
    .where('transferOrderId')
    .equals(orderId)
    .toArray()

  exportTransferOrderToPDF(order, wasteRecords)
}

export async function generateMonthlyReport(month?: string): Promise<WasteStatistics> {
  const now = new Date()
  const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const allRecords = await db.wasteRecords.toArray()
  const categories = await db.wasteCategories.toArray()
  const institutions = await db.medicalInstitutions.toArray()

  const filteredRecords = allRecords.filter((r) => r.createdAt.startsWith(targetMonth))

  const totalWeight = filteredRecords.reduce((sum, r) => sum + r.weight, 0)
  const totalCount = filteredRecords.length

  const byCategory = categories.map((cat) => {
    const catRecords = filteredRecords.filter((r) => r.categoryId === cat.id)
    return {
      categoryId: cat.id,
      categoryName: cat.name,
      weight: catRecords.reduce((sum, r) => sum + r.weight, 0),
      count: catRecords.length
    }
  })

  const byInstitution = institutions.map((inst) => {
    const instRecords = filteredRecords.filter((r) => r.institutionId === inst.id)
    return {
      institutionId: inst.id,
      institutionName: inst.name,
      weight: instRecords.reduce((sum, r) => sum + r.weight, 0),
      count: instRecords.length
    }
  })

  const trendData: { date: string; weight: number }[] = []
  const year = parseInt(targetMonth.split('-')[0])
  const monthNum = parseInt(targetMonth.split('-')[1])
  const daysInMonth = new Date(year, monthNum, 0).getDate()

  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${targetMonth}-${String(i).padStart(2, '0')}`
    const dayRecords = filteredRecords.filter((r) => r.createdAt.startsWith(dateStr))
    trendData.push({
      date: dateStr,
      weight: dayRecords.reduce((sum, r) => sum + r.weight, 0)
    })
  }

  return {
    totalWeight,
    totalCount,
    byCategory,
    byInstitution,
    trendData
  }
}

export async function exportMonthlyReport(month?: string): Promise<void> {
  const statistics = await generateMonthlyReport(month)
  const now = new Date()
  const reportMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  exportMonthlyReportToExcel(statistics, reportMonth)
}

export async function getDashboardStatistics(): Promise<{
  todayRegistrations: number
  todayWeight: number
  pendingTransfers: number
  inTransitVehicles: number
  activeAlerts: number
  completedOrders: number
  categoryDistribution: { name: string; value: number; color: string }[]
  weeklyTrend: { date: string; registrations: number; weight: number }[]
}> {
  const today = formatDate(new Date())
  const wasteRecords = await db.wasteRecords.toArray()
  const orders = await db.transferOrders.toArray()
  const vehicles = await db.vehicles.toArray()
  const allAlerts = await db.alerts.toArray()
  const alerts = allAlerts.filter(a => a.acknowledged === false)
  const categories = await db.wasteCategories.toArray()

  const todayRecords = wasteRecords.filter((r) => r.createdAt.startsWith(today))
  const pendingOrders = orders.filter((o) => o.status === 'PENDING_AUDIT')
  const inTransit = vehicles.filter((v) => v.status === 'IN_TRANSIT')
  const completed = orders.filter((o) => o.status === 'COMPLETED')

  const categoryDistribution = categories.map((cat) => {
    const catRecords = wasteRecords.filter((r) => r.categoryId === cat.id)
    return {
      name: cat.name,
      value: catRecords.reduce((sum, r) => sum + r.weight, 0),
      color: cat.color
    }
  })

  const weeklyTrend: { date: string; registrations: number; weight: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = formatDate(date)
    const dayRecords = wasteRecords.filter((r) => r.createdAt.startsWith(dateStr))
    weeklyTrend.push({
      date: dateStr.slice(5),
      registrations: dayRecords.length,
      weight: dayRecords.reduce((sum, r) => sum + r.weight, 0)
    })
  }

  return {
    todayRegistrations: todayRecords.length,
    todayWeight: todayRecords.reduce((sum, r) => sum + r.weight, 0),
    pendingTransfers: pendingOrders.length,
    inTransitVehicles: inTransit.length,
    activeAlerts: alerts.length,
    completedOrders: completed.length,
    categoryDistribution,
    weeklyTrend
  }
}
