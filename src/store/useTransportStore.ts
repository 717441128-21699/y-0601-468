import { create } from 'zustand'
import {
  Vehicle,
  Driver,
  TransferOrder,
  TransferOrderApplication,
  DispatchSuggestion,
  TransportRoute,
  TransportStatistics,
  TransferOrderStatusType
} from '@/types'
import { db } from '@/db'
import { generateId, generateOrderNo, smartDispatch } from '@/utils/algorithm'

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
  completeTransport: (orderId: string) => Promise<void>
  completeDisposal: (orderId: string) => Promise<void>

  updateVehicleStatus: (vehicleId: string, status: Vehicle['status']) => Promise<void>
  updateVehiclePosition: (vehicleId: string, lat: number, lng: number) => Promise<void>

  loadStatistics: () => Promise<void>

  getOrderById: (id: string) => TransferOrder | undefined
  getVehicleById: (id: string) => Vehicle | undefined
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
      createdAt: now,
      updatedAt: now
    }

    await db.transaction('rw', db.transferOrders, db.wasteRecords, db.vehicles, async () => {
      await db.transferOrders.add(order)

      for (const recordId of application.wasteRecordIds) {
        await db.wasteRecords.update(recordId, {
          status: 'IN_TRANSIT',
          transferOrderId: order.id,
          updatedAt: now
        })
      }

      await db.vehicles.update(suggestion.vehicleId, {
        status: 'IN_TRANSIT',
        driverId: suggestion.driverId,
        currentWeight: totalWeight,
        updatedAt: now
      })
    })

    await get().loadOrders()
    await get().loadVehicles()

    return order
  },

  approveOrder: async (orderId, auditorId, opinion) => {
    const now = new Date().toISOString()
    await db.transferOrders.update(orderId, {
      status: 'APPROVED',
      auditTime: now,
      auditBy: auditorId,
      auditOpinion: opinion || '同意转运',
      updatedAt: now
    })
    await get().loadOrders()
  },

  rejectOrder: async (orderId, auditorId, opinion) => {
    const now = new Date().toISOString()
    const order = await db.transferOrders.get(orderId)

    if (order) {
      await db.transaction('rw', db.transferOrders, db.wasteRecords, db.vehicles, async () => {
        await db.transferOrders.update(orderId, {
          status: 'REJECTED',
          auditTime: now,
          auditBy: auditorId,
          auditOpinion: opinion,
          updatedAt: now
        })

        for (const item of order.items) {
          await db.wasteRecords.update(item.wasteRecordId, {
            status: 'IN_STORAGE',
            transferOrderId: undefined,
            updatedAt: now
          })
        }

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

  startTransport: async (orderId) => {
    const now = new Date().toISOString()
    await db.transferOrders.update(orderId, {
      status: 'IN_TRANSIT',
      departureTime: now,
      updatedAt: now
    })
    await get().loadOrders()
  },

  completeTransport: async (orderId) => {
    const now = new Date().toISOString()
    const order = await db.transferOrders.get(orderId)

    if (order) {
      await db.transaction('rw', db.transferOrders, db.vehicles, async () => {
        await db.transferOrders.update(orderId, {
          status: 'ARRIVED',
          arrivalTime: now,
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
      await db.transaction('rw', db.transferOrders, db.wasteRecords, async () => {
        await db.transferOrders.update(orderId, {
          status: 'COMPLETED',
          disposalTime: now,
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
