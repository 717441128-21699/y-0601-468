import { create } from 'zustand'
import {
  WasteCategory,
  PackageSpec,
  MedicalInstitution,
  StorageRoom,
  WasteRecord,
  Barcode,
  DisposalFactory,
  WasteRegistrationForm,
  WasteStatistics,
  WasteCategoryLabel
} from '@/types'
import { db } from '@/db'
import { generateId, generateTraceCode, generateBarcode } from '@/utils/algorithm'
import { formatDate } from '@/utils/format'

interface WasteState {
  categories: WasteCategory[]
  packages: PackageSpec[]
  institutions: MedicalInstitution[]
  factories: DisposalFactory[]
  storageRooms: StorageRoom[]
  wasteRecords: WasteRecord[]
  barcodes: Barcode[]
  loading: boolean
  stats: WasteStatistics | null

  loadAllData: () => Promise<void>
  loadCategories: () => Promise<void>
  loadPackages: () => Promise<void>
  loadInstitutions: () => Promise<void>
  loadFactories: () => Promise<void>
  loadStorageRooms: () => Promise<void>
  loadWasteRecords: (filters?: any) => Promise<void>
  loadBarcodes: () => Promise<void>

  registerWaste: (form: WasteRegistrationForm) => Promise<{ record: WasteRecord; barcode: Barcode }>
  getPackageByCategory: (categoryId: string) => PackageSpec | undefined
  loadStatistics: (month?: string) => Promise<void>

  updateWasteRecordStatus: (id: string, status: WasteRecord['status'], transferOrderId?: string) => Promise<void>
}

export const useWasteStore = create<WasteState>()((set, get) => ({
  categories: [],
  packages: [],
  institutions: [],
  factories: [],
  storageRooms: [],
  wasteRecords: [],
  barcodes: [],
  loading: false,
  stats: null,

  loadAllData: async () => {
    await Promise.all([
      get().loadCategories(),
      get().loadPackages(),
      get().loadInstitutions(),
      get().loadFactories(),
      get().loadStorageRooms(),
      get().loadWasteRecords(),
      get().loadBarcodes()
    ])
  },

  loadCategories: async () => {
    const categories = await db.wasteCategories.orderBy('name').toArray()
    set({ categories })
  },

  loadPackages: async () => {
    const packages = await db.packageSpecs.orderBy('name').toArray()
    set({ packages })
  },

  loadInstitutions: async () => {
    set({ loading: true })
    try {
      const institutions = await db.medicalInstitutions.orderBy('name').toArray()
      const allStorageRooms = await db.storageRooms.toArray()
      for (const inst of institutions) {
        inst.storageRooms = allStorageRooms.filter(sr => sr.institutionId === inst.id)
      }
      set({ institutions })
    } finally {
      set({ loading: false })
    }
  },

  loadFactories: async () => {
    const factories = await db.disposalFactories.orderBy('name').toArray()
    set({ factories })
  },

  loadStorageRooms: async () => {
    const storageRooms = await db.storageRooms.orderBy('name').toArray()
    set({ storageRooms })
  },

  loadWasteRecords: async (filters) => {
    set({ loading: true })
    try {
      let records = await db.wasteRecords.orderBy('createdAt').reverse().toArray()
      if (filters?.institutionId) {
        records = records.filter(r => r.institutionId === filters.institutionId)
      }
      if (filters?.categoryId) {
        records = records.filter(r => r.categoryId === filters.categoryId)
      }
      if (filters?.status) {
        records = records.filter(r => r.status === filters.status)
      }
      set({ wasteRecords: records })
    } finally {
      set({ loading: false })
    }
  },

  loadBarcodes: async () => {
    const barcodes = await db.barcodes.orderBy('createdAt').reverse().limit(100).toArray()
    set({ barcodes })
  },

  registerWaste: async (form) => {
    const now = new Date().toISOString()
    const institution = await db.medicalInstitutions.get(form.institutionId)
    const category = await db.wasteCategories.get(form.categoryId)

    if (!institution || !category) {
      throw new Error('机构或类别不存在')
    }

    const allRecords = await db.wasteRecords.toArray()
    const existingRecords = allRecords.filter(r => r.institutionId === form.institutionId)
    const sequence = existingRecords.length + 1

    const traceCode = generateTraceCode(institution.code, category.code, sequence)
    const barcodeCode = generateBarcode()

    const barcodeId = generateId()
    const recordId = generateId()

    const pkg = get().getPackageByCategory(form.categoryId)

    const barcode: Barcode = {
      id: barcodeId,
      code: barcodeCode,
      qrCode: traceCode,
      wasteRecordId: recordId,
      createdAt: now,
      updatedAt: now
    }

    const record: WasteRecord = {
      id: recordId,
      institutionId: form.institutionId,
      categoryId: form.categoryId,
      packageId: pkg?.id || '',
      weight: form.weight,
      barcodeId,
      traceCode,
      storageRoomId: form.storageRoomId,
      registeredBy: form.operator,
      status: 'REGISTERED',
      createdAt: form.generatedAt || now,
      updatedAt: now
    }

    await db.transaction('rw', db.wasteRecords, db.barcodes, db.storageRooms, async () => {
      await db.barcodes.add(barcode)
      await db.wasteRecords.add(record)

      const room = await db.storageRooms.get(form.storageRoomId)
      if (room) {
        await db.storageRooms.update(form.storageRoomId, {
          currentVolume: room.currentVolume + form.weight,
          updatedAt: now
        })
      }
    })

    await get().loadWasteRecords()
    await get().loadBarcodes()

    return { record, barcode }
  },

  getPackageByCategory: (categoryId) => {
    return get().packages.find((p) => p.wasteCategoryId === categoryId)
  },

  loadStatistics: async (month) => {
    const allRecords = await db.wasteRecords.toArray()
    const categories = get().categories
    const institutions = get().institutions

    const now = new Date()
    const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

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
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${targetMonth}-${String(i).padStart(2, '0')}`
      const dayRecords = filteredRecords.filter((r) => r.createdAt.startsWith(dateStr))
      trendData.push({
        date: dateStr,
        weight: dayRecords.reduce((sum, r) => sum + r.weight, 0)
      })
    }

    set({
      stats: {
        totalWeight,
        totalCount,
        byCategory,
        byInstitution,
        trendData
      }
    })
  },

  updateWasteRecordStatus: async (id, status, transferOrderId) => {
    const now = new Date().toISOString()
    const updates: Partial<WasteRecord> = { status, updatedAt: now }
    if (transferOrderId) {
      updates.transferOrderId = transferOrderId
    }
    if (status === 'DISPOSED') {
      updates.disposalTime = now
    }
    await db.wasteRecords.update(id, updates)
    await get().loadWasteRecords()
  }
}))
