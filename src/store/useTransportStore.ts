import { create } from 'zustand'
import {
  Vehicle,
  Driver,
  TransferOrder,
  TransferOrderApplication,
  DispatchSuggestion,
  TransportRoute,
  TransportStatistics,
  TransferOrderStatusType,
  TimelineEvent,
  RouteInfo
} from '@/types'
import { db } from '@/db'
import { generateId, generateOrderNo, smartDispatch, calculateDistance } from '@/utils/algorithm'

interface TransportState {
  vehicles: Vehicle[]
  drivers: Driver[]
  orders: TransferOrder[]
  routes: TransportRoute[]
  loading: boolean
  dispatchSuggestions: DispatchSuggestion[]
  statistics: TransportStatistics | null

  loadVehicles: () => Promise<void>
  loadDrivers: () => Promise<void>
  loadOrders: (filters?: any) => Promise<void>
  loadAllData: () => Promise<void>

  getDispatchSuggestions: (application: TransferOrderApplication) => Promise<DispatchSuggestion[]>
  createTransferOrder: (application: TransferOrderApplication, suggestion: DispatchSuggestion) => Promise<TransferOrder>
  approveOrder: (orderId: string, auditorId: string, opinion?: string) => Promise<void>
  rejectOrder: (orderId: string, auditorId: string, opinion: string) => Promise<void>
  startTransport: (orderId: string) => Promise<void>
  getTimelineForOrder: (orderId: string) => Promise<TimelineEvent[]>
  completeTransport: (orderId: string) => Promise<void>
  completeDisposal: (orderId: string) => Promise<void>

  updateVehicleStatus: (vehicleId: string, status: Vehicle['status']) => Promise<void>
  updateVehiclePosition: (vehicleId: string, lat: number, lng: number) => Promise<void>

  loadStatistics: () => Promise<void>

  getOrderById: (id: string) => TransferOrder | undefined
  getVehicleById: (id: string) => Vehicle | undefined
  reassignVehicle: (orderId: string, newVehicleId: string, newDriverId: string, operatorId?: string) => Promise<void>
}

export const useTransportStore = create<TransportState>()((set, get) => ({
  vehicles: [],
  drivers: [],
  orders: [],
  routes: [],
  loading: false,
  dispatchSuggestions: [],
  statistics: null,

  loadVehicles: async () => {
    const vehicles = await db.vehicles.orderBy('plateNo').toArray()
    set({ vehicles })
  },

  loadDrivers: async () => {
    const drivers = await db.drivers.orderBy('name').toArray()
    set({ drivers })
  },

  loadOrders: async (filters) => {
    set({ loading: true })
    try {
      let orders = await db.transferOrders.orderBy('applyTime').reverse().toArray()
      if (filters?.status) {
        orders = orders.filter(o => o.status === filters.status)
      }
      if (filters?.institutionId) {
        orders = orders.filter(o => o.institutionId === filters.institutionId)
      }
      if (filters?.vehicleId) {
        orders = orders.filter(o => o.vehicleId === filters.vehicleId)
      }
      set({ orders })
    } finally {
      set({ loading: false })
    }
  },

  loadAllData: async () => {
    await Promise.all([get().loadVehicles(), get().loadDrivers(), get().loadOrders()])
  },

  getDispatchSuggestions: async (application) => {
    const { vehicles, drivers } = get()
    const institutions = await db.medicalInstitutions.toArray()
    const factories = await db.disposalFactories.toArray()

    const suggestions = smartDispatch(application, vehicles, drivers, institutions, factories)
    set({ dispatchSuggestions: suggestions })
    return suggestions
  },

  createTransferOrder: async (application, suggestion) => {
    const now = new Date().toISOString()
    const wasteRecords = await db.wasteRecords
      .where('id')
      .anyOf(application.wasteRecordIds)
      .toArray()

    const totalWeight = wasteRecords.reduce((sum, r) => sum + r.weight, 0)

    const items = wasteRecords.map((r) => ({
      wasteRecordId: r.id,
      weight: r.weight,
      categoryId: r.categoryId
    }))

    const users = await db.users.toArray()
    const applyUser = users.find(u => u.id === application.applyBy)

    const order: TransferOrder = {
      id: generateId(),
      orderNo: generateOrderNo(),
      institutionId: application.institutionId,
      vehicleId: suggestion.vehicleId,
      driverId: suggestion.driverId,
      factoryId: application.factoryId,
      status: 'PENDING_AUDIT',
      items,
      totalWeight,
      estimatedWeight: application.estimatedWeight,
      applyTime: now,
      applyBy: application.applyBy,
      remarks: application.remarks,
      route: suggestion.route,
      timeline: [
        {
          status: 'PENDING_AUDIT',
          title: '提交转运申请',
          time: now,
          operator: applyUser?.name || '未知用户',
          description: `申请转运 ${wasteRecords.length} 条废物记录，预计重量 ${totalWeight.toFixed(2)} kg`
        }
      ],
      createdAt: now,
      updatedAt: now
    }

    await db.transferOrders.add(order)

    await get().loadOrders()
    await get().loadVehicles()

    return order
  },

  approveOrder: async (orderId, auditorId, opinion) => {
    const now = new Date().toISOString()
    const order = await db.transferOrders.get(orderId)
    const users = await db.users.toArray()
    const auditUser = users.find(u => u.id === auditorId)
    const auditOpinion = opinion || '同意转运'

    if (order) {
      const newTimeline = [
        ...order.timeline,
        {
          status: 'APPROVED',
          title: '审批通过',
          time: now,
          operator: auditUser?.name || '未知审批员',
          description: auditOpinion
        }
      ]

      await db.transferOrders.update(orderId, {
        status: 'APPROVED',
        auditTime: now,
        auditBy: auditorId,
        auditOpinion,
        timeline: newTimeline,
        updatedAt: now
      })
    }
    await get().loadOrders()
  },

  rejectOrder: async (orderId, auditorId, opinion) => {
    const now = new Date().toISOString()
    const order = await db.transferOrders.get(orderId)
    const users = await db.users.toArray()
    const auditUser = users.find(u => u.id === auditorId)

    if (order) {
      const newTimeline = [
        ...order.timeline,
        {
          status: 'REJECTED',
          title: '审批拒绝',
          time: now,
          operator: auditUser?.name || '未知审批员',
          description: opinion
        }
      ]

      await db.transferOrders.update(orderId, {
        status: 'REJECTED',
        auditTime: now,
        auditBy: auditorId,
        auditOpinion: opinion,
        timeline: newTimeline,
        updatedAt: now
      })
    }

    await get().loadOrders()
    await get().loadVehicles()
  },

  startTransport: async (orderId) => {
    const now = new Date().toISOString()
    const order = await db.transferOrders.get(orderId)

    if (order) {
      const users = await db.users.toArray()
      const vehicles = await db.vehicles.toArray()
      const vehicle = vehicles.find(v => v.id === order.vehicleId)
      const driver = users.find(u => u.id === order.driverId)

      const newTimeline = [
        ...order.timeline,
        {
          status: 'IN_TRANSIT',
          title: '开始运输',
          time: now,
          operator: driver?.name || order.driverId,
          description: `车辆 ${vehicle?.plateNo || order.vehicleId} 已出发`
        }
      ]

      await db.transaction('rw', db.transferOrders, db.wasteRecords, db.vehicles, async () => {
        await db.transferOrders.update(orderId, {
          status: 'IN_TRANSIT',
          departureTime: now,
          timeline: newTimeline,
          updatedAt: now
        })

        for (const item of order.items) {
          await db.wasteRecords.update(item.wasteRecordId, {
            status: 'IN_TRANSIT',
            transferOrderId: order.id,
            updatedAt: now
          })
        }

        await db.vehicles.update(order.vehicleId, {
          status: 'IN_TRANSIT',
          driverId: order.driverId,
          currentWeight: order.totalWeight,
          updatedAt: now
        })
      })
    }
    await get().loadOrders()
    await get().loadVehicles()
  },

  getTimelineForOrder: async (orderId) => {
    const order = await db.transferOrders.get(orderId)
    return order?.timeline || []
  },

  completeTransport: async (orderId) => {
    const now = new Date().toISOString()
    const order = await db.transferOrders.get(orderId)

    if (order) {
      const users = await db.users.toArray()
      const factoryStaff = users.find(u => u.role === 'DISPOSAL' || u.role === 'DISPOSAL_OPERATOR')
      
      const newTimeline = [
        ...order.timeline,
        {
          status: 'ARRIVED',
          title: '到达处置厂',
          time: now,
          operator: factoryStaff?.name || '处置厂接收',
          description: `订单 ${order.orderNo} 已安全抵达处置厂，等待交接`
        }
      ]

      await db.transaction('rw', db.transferOrders, db.vehicles, async () => {
        await db.transferOrders.update(orderId, {
          status: 'ARRIVED',
          arrivalTime: now,
          timeline: newTimeline,
          updatedAt: now
        })

        await db.vehicles.update(order.vehicleId, {
          status: 'IDLE',
          driverId: undefined,
          currentWeight: 0,
          updatedAt: now
        })
      })
    }

    await get().loadOrders()
    await get().loadVehicles()
  },

  completeDisposal: async (orderId) => {
    const now = new Date().toISOString()
    const order = await db.transferOrders.get(orderId)

    if (order) {
      const users = await db.users.toArray()
      const factoryStaff = users.find(u => u.role === 'DISPOSAL' || u.role === 'DISPOSAL_OPERATOR')
      
      const newTimeline = [
        ...order.timeline,
        {
          status: 'COMPLETED',
          title: '处置完成',
          time: now,
          operator: factoryStaff?.name || '处置厂操作员',
          description: `订单 ${order.orderNo} 所有废物已完成无害化处置，联单已生成`
        }
      ]

      await db.transaction('rw', db.transferOrders, db.wasteRecords, async () => {
        await db.transferOrders.update(orderId, {
          status: 'COMPLETED',
          disposalTime: now,
          timeline: newTimeline,
          updatedAt: now
        })

        for (const item of order.items) {
          await db.wasteRecords.update(item.wasteRecordId, {
            status: 'DISPOSED',
            disposalTime: now,
            updatedAt: now
          })
        }
      })
    }

    await get().loadOrders()
  },

  reassignVehicle: async (orderId, newVehicleId, newDriverId, operatorId) => {
    const now = new Date().toISOString()
    const order = await db.transferOrders.get(orderId)
    if (!order) throw new Error('订单不存在')

    if (!['PENDING_AUDIT', 'APPROVED'].includes(order.status)) {
      throw new Error('当前订单状态不允许改派')
    }

    const newVehicle = await db.vehicles.get(newVehicleId)
    const oldVehicle = order.vehicleId ? await db.vehicles.get(order.vehicleId) : undefined
    const newDriver = await db.drivers.get(newDriverId)
    const users = await db.users.toArray()
    const operator = users.find(u => u.id === operatorId)
    const institutions = await db.medicalInstitutions.toArray()
    const factories = await db.disposalFactories.toArray()

    const institution = institutions.find(i => i.id === order.institutionId)
    const factory = factories.find(f => f.id === order.factoryId)

    let newRoute: RouteInfo | undefined = order.route
    if (newVehicle && institution && factory) {
      const vehicleStart = { lat: newVehicle.currentLat || 0, lng: newVehicle.currentLng || 0 }
      const institutionPoint = { lat: institution.lat || 0, lng: institution.lng || 0 }
      const factoryPoint = { lat: factory.lat || 0, lng: factory.lng || 0 }

      const avgSpeed = 45 * 1000 / 60
      const loadingTime = 20
      const unloadingTime = 15

      const distanceV2I = calculateDistance(vehicleStart, institutionPoint)
      const distanceI2F = calculateDistance(institutionPoint, factoryPoint)
      const timeV2I = Math.max(1, Math.floor(distanceV2I / avgSpeed))
      const timeI2F = Math.max(1, Math.floor(distanceI2F / avgSpeed))

      newRoute = {
        vehicleToInstitution: { distance: distanceV2I, estimatedTime: timeV2I },
        institutionToFactory: { distance: distanceI2F, estimatedTime: timeI2F },
        totalDistance: distanceV2I + distanceI2F,
        totalEstimatedTime: timeV2I + loadingTime + timeI2F + unloadingTime,
        waypoints: {
          vehicleStart,
          institution: { ...institutionPoint, name: institution.name },
          factory: { ...factoryPoint, name: factory.name }
        }
      }
    }

    const oldPlate = oldVehicle?.plateNo || '未指定'
    const newPlate = newVehicle?.plateNo || '未指定'
    const newDriverName = newDriver?.name || '未指定'

    const newTimeline = [
      ...order.timeline,
      {
        status: order.status,
        title: '改派车辆和司机',
        time: now,
        operator: operator?.name || '调度员',
        description: `车辆由 ${oldPlate} 改派为 ${newPlate}，司机调整为 ${newDriverName}`
      }
    ]

    await db.transaction('rw', db.transferOrders, db.vehicles, async () => {
      await db.transferOrders.update(orderId, {
        vehicleId: newVehicleId,
        driverId: newDriverId,
        route: newRoute,
        timeline: newTimeline,
        updatedAt: now
      })
    })

    await get().loadOrders()
    await get().loadVehicles()
  },

  updateVehicleStatus: async (vehicleId, status) => {
    const now = new Date().toISOString()
    await db.vehicles.update(vehicleId, { status, updatedAt: now })
    await get().loadVehicles()
  },

  updateVehiclePosition: async (vehicleId, lat, lng) => {
    const now = new Date().toISOString()
    await db.vehicles.update(vehicleId, {
      currentLat: lat,
      currentLng: lng,
      updatedAt: now
    })
  },

  loadStatistics: async () => {
    const orders = await db.transferOrders.toArray()
    const vehicles = get().vehicles

    const totalOrders = orders.length
    const totalWeight = orders.reduce((sum, o) => sum + (o.totalWeight || 0), 0)
    const totalDistance = orders.reduce((sum, o) => sum + (o.totalWeight || 0) * 0.01, 0)
    const completedOrders = orders.filter((o) => o.status === 'COMPLETED')
    const onTimeRate = completedOrders.length > 0 ? (completedOrders.length / totalOrders) * 100 : 0

    const statusCounts: { status: TransferOrderStatusType; count: number }[] = [
      'DRAFT',
      'PENDING_AUDIT',
      'APPROVED',
      'REJECTED',
      'IN_TRANSIT',
      'ARRIVED',
      'COMPLETED'
    ].map((status) => ({
      status: status as TransferOrderStatusType,
      count: orders.filter((o) => o.status === status).length
    }))

    const byVehicle = vehicles.map((v) => {
      const vehicleOrders = orders.filter((o) => o.vehicleId === v.id)
      return {
        vehicleId: v.id,
        plateNo: v.plateNo,
        orders: vehicleOrders.length,
        distance: vehicleOrders.reduce((sum, o) => sum + (o.totalWeight || 0) * 0.01, 0)
      }
    })

    set({
      statistics: {
        totalOrders,
        totalWeight,
        totalDistance,
        onTimeRate,
        byStatus: statusCounts,
        byVehicle
      }
    })
  },

  getOrderById: (id) => {
    return get().orders.find((o) => o.id === id)
  },

  getVehicleById: (id) => {
    return get().vehicles.find((v) => v.id === id)
  }
}))
