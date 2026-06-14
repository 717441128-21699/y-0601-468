import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Plus,
  Calendar,
  Filter,
  Eye,
  Check,
  X,
  Truck,
  User,
  MapPin,
  Clock,
  Star,
  Package,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Route
} from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import { Table } from '@/components/ui/Table'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select, TextArea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody } from '@/components/ui/Card'
import { useTransportStore } from '@/store/useTransportStore'
import { useWasteStore } from '@/store/useWasteStore'
import { useUserStore } from '@/store/useUserStore'
import { db } from '@/db'
import { getAlertContext, saveAlertContext } from '@/components/Layout/MainLayout'
import {
  TransferOrder,
  TransferOrderStatusType,
  TransferOrderApplication,
  DispatchSuggestion,
  WasteRecord,
  MedicalInstitution,
  DisposalFactory
} from '@/types'
import {
  TransferOrderStatusLabel,
  WasteCategoryLabel,
  WasteCategoryColor,
  VehicleStatusLabel
} from '@/types/common'
import { formatDateTime, formatTime, formatWeight, formatDistance, formatDuration } from '@/utils/format'

const Drawer: React.FC<{
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}> = ({ isOpen, onClose, title, children }) => {
  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="relative w-full max-w-xl bg-app-bg-light border-l border-app-border shadow-2xl flex flex-col h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-app-border">
              <h2 className="text-lg font-semibold text-app-text">{title}</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-app-bg-lighter text-app-text-muted hover:text-app-text transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

const getStatusBadgeVariant = (status: TransferOrderStatusType): 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default' => {
  const variants: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
    PENDING_AUDIT: 'warning',
    APPROVED: 'info',
    IN_TRANSIT: 'primary',
    ARRIVED: 'primary',
    COMPLETED: 'success',
    REJECTED: 'danger',
    DRAFT: 'default'
  }
  return variants[status] || 'default'
}

const statusOptions = [
  { value: '', label: '全部' },
  { value: 'PENDING_AUDIT', label: '待审批' },
  { value: 'APPROVED', label: '已审批' },
  { value: 'IN_TRANSIT', label: '运输中' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'REJECTED', label: '已拒绝' }
]

export function TransportDispatch() {
  const { currentUser } = useUserStore()
  const {
    orders,
    loading,
    dispatchSuggestions,
    vehicles,
    drivers,
    loadAllData,
    loadOrders,
    getDispatchSuggestions,
    createTransferOrder,
    approveOrder,
    rejectOrder,
    startTransport,
    completeTransport,
    completeDisposal,
    reassignVehicle
  } = useTransportStore()

  const {
    institutions,
    factories,
    wasteRecords,
    categories,
    loadAllData: loadWasteData
  } = useWasteStore()

  const [statusFilter, setStatusFilter] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<TransferOrder | null>(null)

  const [selectedInstitution, setSelectedInstitution] = useState<string>('')
  const [selectedWasteRecords, setSelectedWasteRecords] = useState<string[]>([])
  const [selectedFactory, setSelectedFactory] = useState<string>('')
  const [selectedSuggestion, setSelectedSuggestion] = useState<DispatchSuggestion | null>(null)
  const [urgency, setUrgency] = useState<'NORMAL' | 'URGENT'>('NORMAL')
  const [remarks, setRemarks] = useState<string>('')
  const [auditOpinion, setAuditOpinion] = useState<string>('')
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    type: 'approve' | 'reject'
    orderId: string
  }>({ isOpen: false, type: 'approve', orderId: '' })

  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reassignModalOpen, setReassignModalOpen] = useState(false)
  const [reassignVehicleId, setReassignVehicleId] = useState<string>('')
  const [reassignDriverId, setReassignDriverId] = useState<string>('')
  const [restoredFromContext, setRestoredFromContext] = useState(false)

  useEffect(() => {
    loadAllData()
    loadWasteData()
  }, [])

  useEffect(() => {
    const ctx = getAlertContext()
    if (ctx.dispatch?.openOrderId && orders.length > 0 && !restoredFromContext) {
      const order = orders.find(o => o.id === ctx.dispatch?.openOrderId)
      if (order) {
        setSelectedOrder(order)
        setDetailDrawerOpen(true)
        setRestoredFromContext(true)
      }
    }
  }, [orders, restoredFromContext])

  useEffect(() => {
    if (selectedOrder) {
      saveAlertContext({
        dispatch: { openOrderId: selectedOrder.id }
      })
    }
  }, [selectedOrder?.id])

  useEffect(() => {
    const filters: any = {}
    if (statusFilter) filters.status = statusFilter
    loadOrders(filters)
  }, [statusFilter])

  const filteredOrders = useMemo(() => {
    let result = [...orders]

    if (startDate) {
      result = result.filter((o) => o.applyTime >= startDate)
    }
    if (endDate) {
      result = result.filter((o) => o.applyTime <= endDate + 'T23:59:59')
    }
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase()
      result = result.filter((o) => {
        const inst = institutions.find((i) => i.id === o.institutionId)
        return (
          o.orderNo.toLowerCase().includes(keyword) ||
          inst?.name.toLowerCase().includes(keyword)
        )
      })
    }

    return result
  }, [orders, startDate, endDate, searchKeyword, institutions])

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredOrders.slice(start, start + pageSize)
  }, [filteredOrders, page])

  const availableWasteRecords = useMemo(() => {
    if (!selectedInstitution) return []
    return wasteRecords.filter(
      (r) =>
        r.institutionId === selectedInstitution &&
        (r.status === 'REGISTERED' || r.status === 'IN_STORAGE')
    )
  }, [selectedInstitution, wasteRecords])

  const selectedWasteTotalWeight = useMemo(() => {
    return selectedWasteRecords.reduce((sum, id) => {
      const record = wasteRecords.find((r) => r.id === id)
      return sum + (record?.weight || 0)
    }, 0)
  }, [selectedWasteRecords, wasteRecords])

  const selectedInstitutionData = useMemo(() => {
    return institutions.find((i) => i.id === selectedInstitution)
  }, [selectedInstitution, institutions])

  const handleGenerateSuggestions = async () => {
    if (!selectedInstitution || selectedWasteRecords.length === 0 || !selectedFactory) {
      return
    }

    setLoadingSuggestions(true)
    try {
      const application: TransferOrderApplication = {
        institutionId: selectedInstitution,
        wasteRecordIds: selectedWasteRecords,
        factoryId: selectedFactory,
        estimatedWeight: selectedWasteTotalWeight,
        urgency,
        applyBy: currentUser?.id || '',
        remarks
      }
      await getDispatchSuggestions(application)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleCreateOrder = async () => {
    if (!selectedSuggestion) return

    setSubmitting(true)
    try {
      const application: TransferOrderApplication = {
        institutionId: selectedInstitution,
        wasteRecordIds: selectedWasteRecords,
        factoryId: selectedFactory,
        estimatedWeight: selectedWasteTotalWeight,
        urgency,
        applyBy: currentUser?.id || '',
        remarks
      }
      await createTransferOrder(application, selectedSuggestion)
      resetCreateForm()
      setCreateModalOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  const resetCreateForm = () => {
    setSelectedInstitution('')
    setSelectedWasteRecords([])
    setSelectedFactory('')
    setSelectedSuggestion(null)
    setUrgency('NORMAL')
    setRemarks('')
  }

  const handleApprove = async () => {
    if (!confirmModal.orderId) return
    try {
      await approveOrder(confirmModal.orderId, currentUser?.id || '', auditOpinion)
      setConfirmModal({ ...confirmModal, isOpen: false })
      setApproveModalOpen(false)
      setAuditOpinion('')
      await refreshSelectedOrder()
    } finally {
    }
  }

  const handleReject = async () => {
    if (!confirmModal.orderId || !auditOpinion.trim()) return
    try {
      await rejectOrder(confirmModal.orderId, currentUser?.id || '', auditOpinion)
      setConfirmModal({ ...confirmModal, isOpen: false })
      setApproveModalOpen(false)
      setAuditOpinion('')
      await refreshSelectedOrder()
    } finally {
    }
  }

  const openApproveModal = (order: TransferOrder) => {
    setSelectedOrder(order)
    setApproveModalOpen(true)
  }

  const openDetailDrawer = (order: TransferOrder) => {
    setSelectedOrder(order)
    setDetailDrawerOpen(true)
  }

  const refreshSelectedOrder = async () => {
    if (!selectedOrder) return
    const fresh = await db.transferOrders.get(selectedOrder.id)
    if (fresh) setSelectedOrder(fresh)
  }

  const handleStartTransport = async () => {
    if (!selectedOrder) return
    try {
      await startTransport(selectedOrder.id)
      await refreshSelectedOrder()
    } catch (e) {
      console.error('Failed to start transport:', e)
    }
  }

  const handleCompleteTransport = async () => {
    if (!selectedOrder) return
    try {
      await completeTransport(selectedOrder.id)
      await refreshSelectedOrder()
    } catch (e) {
      console.error('Failed to complete transport:', e)
    }
  }

  const handleCompleteDisposal = async () => {
    if (!selectedOrder) return
    try {
      await completeDisposal(selectedOrder.id)
      await refreshSelectedOrder()
    } catch (e) {
      console.error('Failed to complete disposal:', e)
    }
  }

  const openReassignModal = () => {
    if (!selectedOrder) return
    setReassignVehicleId(selectedOrder.vehicleId)
    setReassignDriverId(selectedOrder.driverId)
    setReassignModalOpen(true)
  }

  const handleReassign = async () => {
    if (!selectedOrder || !reassignVehicleId || !reassignDriverId) return
    try {
      await reassignVehicle(selectedOrder.id, reassignVehicleId, reassignDriverId, currentUser?.id)
      setReassignModalOpen(false)
      await refreshSelectedOrder()
    } catch (e) {
      console.error('Reassign failed:', e)
      alert(e instanceof Error ? e.message : '改派失败')
    }
  }

  const toggleWasteRecord = (id: string) => {
    setSelectedWasteRecords((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    )
  }

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || '未知'
  }

  const getInstitutionName = (id: string) => {
    return institutions.find((i) => i.id === id)?.name || '未知'
  }

  const getFactoryName = (id: string) => {
    return factories.find((f) => f.id === id)?.name || '未知'
  }

  const getVehiclePlateNo = (id: string) => {
    return vehicles.find((v) => v.id === id)?.plateNo || '未知'
  }

  const getDriverName = (id: string) => {
    return drivers.find((d) => d.id === id)?.name || '未知'
  }

  const canApprove = ['REGULATOR', 'ENVIRONMENTAL_AUDITOR', 'SYSTEM_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(currentUser?.role || '')
  const canStartTransport = ['TRANSPORT', 'TRANSPORT_DISPATCHER', 'SYSTEM_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(currentUser?.role || '')
  const canCompleteTransport = ['TRANSPORT', 'TRANSPORT_DISPATCHER', 'SYSTEM_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(currentUser?.role || '')
  const canCompleteDisposal = ['DISPOSAL', 'DISPOSAL_OPERATOR', 'SYSTEM_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(currentUser?.role || '')

  const columns = [
    {
      key: 'orderNo',
      title: '订单号',
      width: '180px',
      render: (row: TransferOrder) => (
        <span className="font-mono text-primary-400">{row.orderNo}</span>
      )
    },
    {
      key: 'institution',
      title: '医疗机构',
      render: (row: TransferOrder) => getInstitutionName(row.institutionId)
    },
    {
      key: 'totalWeight',
      title: '总重量',
      align: 'right' as const,
      render: (row: TransferOrder) => formatWeight(row.totalWeight)
    },
    {
      key: 'categories',
      title: '废物类别',
      render: (row: TransferOrder) => {
        const categoryIds = [...new Set(row.items.map((item) => item.categoryId))]
        return (
          <div className="flex flex-wrap gap-1">
            {categoryIds.map((catId) => (
              <span
                key={catId}
                className="px-2 py-0.5 text-xs rounded-full"
                style={{
                  backgroundColor: `${WasteCategoryColor[categories.find((c) => c.id === catId)?.type as keyof typeof WasteCategoryColor] || '#64748B'}20`,
                  color: WasteCategoryColor[categories.find((c) => c.id === catId)?.type as keyof typeof WasteCategoryColor] || '#64748B'
                }}
              >
                {getCategoryName(catId)}
              </span>
            ))}
          </div>
        )
      }
    },
    {
      key: 'applyTime',
      title: '申请时间',
      width: '180px',
      render: (row: TransferOrder) => formatDateTime(row.applyTime)
    },
    {
      key: 'status',
      title: '状态',
      width: '120px',
      render: (row: TransferOrder) => (
        <Badge variant={getStatusBadgeVariant(row.status)} dot>
          {TransferOrderStatusLabel[row.status]}
        </Badge>
      )
    },
    {
      key: 'actions',
      title: '操作',
      width: '200px',
      align: 'center' as const,
      render: (row: TransferOrder) => (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Eye className="w-4 h-4" />}
            onClick={() => openDetailDrawer(row)}
          >
            详情
          </Button>
          {canApprove && row.status === 'PENDING_AUDIT' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Check className="w-4 h-4" />}
              onClick={() => openApproveModal(row)}
            >
              审批
            </Button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-app-text">转运调度</h1>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setCreateModalOpen(true)}
        >
          创建转运单
        </Button>
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-app-text-muted" />
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                options={statusOptions}
                className="w-36"
              />
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-app-text-muted" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setPage(1)
                }}
                className="w-40"
              />
              <span className="text-app-text-muted">至</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setPage(1)
                }}
                className="w-40"
              />
            </div>

            <div className="flex-1 max-w-md">
              <Input
                placeholder="搜索订单号/机构名"
                searchable
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value)
                  setPage(1)
                }}
                onClear={() => {
                  setSearchKeyword('')
                  setPage(1)
                }}
              />
            </div>

            <Button
              variant="ghost"
              onClick={() => {
                setStatusFilter('')
                setStartDate('')
                setEndDate('')
                setSearchKeyword('')
                setPage(1)
              }}
            >
              重置
            </Button>
          </div>
        </CardBody>
      </Card>

      <Table
        columns={columns}
        data={paginatedOrders}
        loading={loading}
        rowKey={(row) => row.id}
        pagination={{
          page,
          pageSize,
          total: filteredOrders.length,
          onPageChange: setPage
        }}
      />

      <Modal
        isOpen={createModalOpen}
        onClose={() => !submitting && setCreateModalOpen(false)}
        title="创建转运单"
        size="xl"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setCreateModalOpen(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateOrder}
              disabled={!selectedSuggestion || submitting}
              loading={submitting}
            >
              提交申请
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Select
                label="选择医疗机构"
                value={selectedInstitution}
                onChange={(e) => {
                  setSelectedInstitution(e.target.value)
                  setSelectedWasteRecords([])
                  setSelectedSuggestion(null)
                }}
                options={[
                  { value: '', label: '请选择医疗机构' },
                  ...institutions.map((inst) => ({
                    value: inst.id,
                    label: inst.name
                  }))
                ]}
              />
              {selectedInstitutionData && selectedInstitutionData.storageRooms && (
                <div className="mt-2 p-3 bg-app-bg rounded-lg border border-app-border">
                  <p className="text-sm text-app-text-secondary">
                    <span className="font-medium">暂存点容量：</span>
                    {formatWeight(
                      selectedInstitutionData.storageRooms.reduce((sum, r) => sum + r.capacity, 0)
                    )}
                    {' / '}
                    {formatWeight(
                      selectedInstitutionData.storageRooms.reduce((sum, r) => sum + r.currentVolume, 0)
                    )}
                    <span className="ml-2 text-xs text-app-text-muted">
                      (已使用 {((selectedInstitutionData.storageRooms.reduce((sum, r) => sum + r.currentVolume, 0) /
                        selectedInstitutionData.storageRooms.reduce((sum, r) => sum + r.capacity, 0)) * 100).toFixed(1)}%)
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div>
              <Select
                label="选择处置厂"
                value={selectedFactory}
                onChange={(e) => {
                  setSelectedFactory(e.target.value)
                  setSelectedSuggestion(null)
                }}
                options={[
                  { value: '', label: '请选择处置厂' },
                  ...factories.map((f) => ({
                    value: f.id,
                    label: f.name
                  }))
                ]}
              />
            </div>
          </div>

          <div>
            <Select
              label="紧急程度"
              value={urgency}
              onChange={(e) => {
                setUrgency(e.target.value as 'NORMAL' | 'URGENT')
                setSelectedSuggestion(null)
              }}
              options={[
                { value: 'NORMAL', label: '普通' },
                { value: 'URGENT', label: '紧急' }
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text-secondary mb-1.5">
              选择待转运废物记录
              {selectedWasteRecords.length > 0 && (
                <span className="ml-2 text-primary-400">
                  已选 {selectedWasteRecords.length} 项，共 {formatWeight(selectedWasteTotalWeight)}
                </span>
              )}
            </label>
            <div className="border border-app-border rounded-lg overflow-hidden max-h-48 overflow-y-auto bg-app-bg">
              {availableWasteRecords.length === 0 ? (
                <div className="p-4 text-center text-app-text-muted">
                  {selectedInstitution ? '暂无待转运废物' : '请先选择医疗机构'}
                </div>
              ) : (
                availableWasteRecords.map((record) => (
                  <div
                    key={record.id}
                    onClick={() => toggleWasteRecord(record.id)}
                    className={twMerge(
                      'flex items-center gap-3 px-4 py-3 border-b border-app-border/50 cursor-pointer transition-colors',
                      selectedWasteRecords.includes(record.id)
                        ? 'bg-primary-500/10'
                        : 'hover:bg-app-bg-lighter',
                      'last:border-b-0'
                    )}
                  >
                    <div
                      className={twMerge(
                        'w-5 h-5 rounded border flex items-center justify-center transition-colors',
                        selectedWasteRecords.includes(record.id)
                          ? 'bg-primary-500 border-primary-500'
                          : 'border-app-border'
                      )}
                    >
                      {selectedWasteRecords.includes(record.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-app-text">{record.traceCode}</span>
                        <span
                          className="px-1.5 py-0.5 text-xs rounded"
                          style={{
                            backgroundColor: `${WasteCategoryColor[categories.find((c) => c.id === record.categoryId)?.type as keyof typeof WasteCategoryColor] || '#64748B'}20`,
                            color: WasteCategoryColor[categories.find((c) => c.id === record.categoryId)?.type as keyof typeof WasteCategoryColor] || '#64748B'
                          }}
                        >
                          {getCategoryName(record.categoryId)}
                        </span>
                      </div>
                      <div className="text-xs text-app-text-muted mt-0.5">
                        {formatDateTime(record.createdAt)}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-app-text">
                      {formatWeight(record.weight)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-app-text-secondary">
                智能调度建议
              </label>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleGenerateSuggestions}
                disabled={
                  !selectedInstitution ||
                  selectedWasteRecords.length === 0 ||
                  !selectedFactory ||
                  loadingSuggestions
                }
                loading={loadingSuggestions}
              >
                生成调度方案
              </Button>
            </div>

            <div className="space-y-3">
              {dispatchSuggestions.length === 0 ? (
                <div className="p-8 text-center text-app-text-muted border border-dashed border-app-border rounded-lg">
                  {loadingSuggestions ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                      <span>正在生成调度方案...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-app-text-muted" />
                      <p>请选择机构、废物记录和处置厂后生成调度方案</p>
                    </div>
                  )}
                </div>
              ) : (
                dispatchSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedSuggestion(suggestion)}
                    className={twMerge(
                      'p-4 border rounded-lg cursor-pointer transition-all',
                      selectedSuggestion?.vehicleId === suggestion.vehicleId &&
                        selectedSuggestion?.driverId === suggestion.driverId
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-app-border hover:border-primary-500/50 hover:bg-app-bg-lighter'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-primary-400" />
                            <span className="font-medium text-app-text">
                              {suggestion.vehiclePlateNo}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-primary-400" />
                            <span className="text-app-text-secondary">{suggestion.driverName}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-app-text-muted">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {formatDistance(suggestion.distance)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDuration(suggestion.estimatedTime)}
                          </span>
                        </div>
                        <p className="text-sm text-app-text-secondary">{suggestion.reason}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-warning-400">
                          <Star className="w-4 h-4 fill-warning-400" />
                          <span className="font-bold text-lg">
                            {(suggestion.priorityScore * 100).toFixed(0)}
                          </span>
                        </div>
                        <p className="text-xs text-app-text-muted mt-1">调度评分</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {selectedSuggestion && (
            <div className="p-4 bg-success-500/10 border border-success-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-success-400" />
                <span className="font-medium text-success-400">调度方案已确认</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-app-text-muted">预计运输时间：</span>
                  <span className="text-app-text">{formatDuration(selectedSuggestion.estimatedTime)}</span>
                </div>
                <div>
                  <span className="text-app-text-muted">预计距离：</span>
                  <span className="text-app-text">{formatDistance(selectedSuggestion.distance)}</span>
                </div>
              </div>
            </div>
          )}

          <TextArea
            label="备注"
            placeholder="请输入备注信息（可选）"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title="审批转运单"
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setApproveModalOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="danger"
              leftIcon={<XCircle className="w-4 h-4" />}
              onClick={() => {
                if (!auditOpinion.trim()) {
                  alert('请输入拒绝理由')
                  return
                }
                setConfirmModal({
                  isOpen: true,
                  type: 'reject',
                  orderId: selectedOrder?.id || ''
                })
              }}
              disabled={!selectedOrder}
            >
              拒绝
            </Button>
            <Button
              variant="success"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              onClick={() =>
                setConfirmModal({
                  isOpen: true,
                  type: 'approve',
                  orderId: selectedOrder?.id || ''
                })
              }
              disabled={!selectedOrder}
            >
              批准
            </Button>
          </>
        }
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-app-bg rounded-lg border border-app-border">
                <p className="text-sm text-app-text-muted mb-1">订单号</p>
                <p className="font-mono text-primary-400">{selectedOrder.orderNo}</p>
              </div>
              <div className="p-4 bg-app-bg rounded-lg border border-app-border">
                <p className="text-sm text-app-text-muted mb-1">申请时间</p>
                <p className="text-app-text">{formatDateTime(selectedOrder.applyTime)}</p>
              </div>
              <div className="p-4 bg-app-bg rounded-lg border border-app-border">
                <p className="text-sm text-app-text-muted mb-1">医疗机构</p>
                <p className="text-app-text">{getInstitutionName(selectedOrder.institutionId)}</p>
              </div>
              <div className="p-4 bg-app-bg rounded-lg border border-app-border">
                <p className="text-sm text-app-text-muted mb-1">处置厂</p>
                <p className="text-app-text">{getFactoryName(selectedOrder.factoryId)}</p>
              </div>
            </div>

            <div className="p-4 bg-app-bg rounded-lg border border-app-border">
              <p className="text-sm text-app-text-muted mb-3">调度方案</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary-400" />
                  <span className="text-app-text-secondary">车辆：</span>
                  <span className="text-app-text font-medium">
                    {getVehiclePlateNo(selectedOrder.vehicleId)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary-400" />
                  <span className="text-app-text-secondary">驾驶员：</span>
                  <span className="text-app-text font-medium">
                    {getDriverName(selectedOrder.driverId)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary-400" />
                  <span className="text-app-text-secondary">总重量：</span>
                  <span className="text-app-text font-medium">
                    {formatWeight(selectedOrder.totalWeight)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary-400" />
                  <span className="text-app-text-secondary">废物数量：</span>
                  <span className="text-app-text font-medium">{selectedOrder.items.length} 项</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-app-text-muted mb-2">废物明细</p>
              <div className="border border-app-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-app-bg-lighter">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-app-text-secondary">
                        类别
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-app-text-secondary">
                        重量
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, index) => (
                      <tr key={index} className="border-t border-app-border/50">
                        <td className="px-4 py-2 text-sm text-app-text">
                          <span
                            className="px-2 py-0.5 text-xs rounded"
                            style={{
                              backgroundColor: `${WasteCategoryColor[categories.find((c) => c.id === item.categoryId)?.type as keyof typeof WasteCategoryColor] || '#64748B'}20`,
                              color: WasteCategoryColor[categories.find((c) => c.id === item.categoryId)?.type as keyof typeof WasteCategoryColor] || '#64748B'
                            }}
                          >
                            {getCategoryName(item.categoryId)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-app-text text-right">
                          {formatWeight(item.weight)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <TextArea
              label="审批意见"
              placeholder={confirmModal.type === 'reject' ? '请输入拒绝理由（必填）' : '请输入审批意见（可选）'}
              value={auditOpinion}
              onChange={(e) => setAuditOpinion(e.target.value)}
            />
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.type === 'approve' ? handleApprove : handleReject}
        title={confirmModal.type === 'approve' ? '确认批准' : '确认拒绝'}
        message={
          confirmModal.type === 'approve'
            ? '确定要批准该转运单吗？批准后将进入运输流程。'
            : '确定要拒绝该转运单吗？拒绝后将退回申请并释放相关资源。'
        }
        confirmText={confirmModal.type === 'approve' ? '确认批准' : '确认拒绝'}
        confirmVariant={confirmModal.type === 'approve' ? 'success' : 'danger'}
      />

      <Drawer
        isOpen={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        title="订单详情"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-app-text-muted">订单号</p>
                <p className="font-mono text-lg text-primary-400">{selectedOrder.orderNo}</p>
              </div>
              <Badge variant={getStatusBadgeVariant(selectedOrder.status)} dot>
                {TransferOrderStatusLabel[selectedOrder.status]}
              </Badge>
            </div>

            {selectedOrder.status === 'PENDING_AUDIT' && canApprove && (
              <div className="p-4 bg-warning-500/10 border border-warning-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-warning-400" />
                  <p className="font-medium text-warning-400">待审批处理</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    leftIcon={<Check className="w-4 h-4" />}
                    onClick={() => {
                      setAuditOpinion('同意转运')
                      openApproveModal(selectedOrder)
                    }}
                  >
                    批准
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    leftIcon={<XCircle className="w-4 h-4" />}
                    onClick={() => {
                      setAuditOpinion('')
                      openApproveModal(selectedOrder)
                    }}
                  >
                    拒绝
                  </Button>
                </div>
              </div>
            )}

            {selectedOrder.status === 'APPROVED' && canStartTransport && (
              <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-5 h-5 text-primary-400" />
                  <p className="font-medium text-primary-400">审批已通过，可开始执行运输</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Truck className="w-4 h-4" />}
                    onClick={handleStartTransport}
                  >
                    开始运输
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Route className="w-4 h-4" />}
                    onClick={openReassignModal}
                  >
                    改派车辆/司机
                  </Button>
                </div>
              </div>
            )}

            {selectedOrder.status === 'PENDING_AUDIT' && canApprove && (
              <div className="flex gap-2 pb-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Route className="w-4 h-4" />}
                  onClick={openReassignModal}
                >
                  改派车辆/司机
                </Button>
              </div>
            )}

            {['IN_TRANSIT', 'ARRIVED', 'COMPLETED'].includes(selectedOrder.status) && (
              <div className="p-4 bg-app-bg-lighter border border-app-border rounded-lg">
                <p className="text-xs text-app-text-muted flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warning-400" />
                  订单已进入执行阶段，车辆和司机已锁定不允许改派
                </p>
              </div>
            )}

            {selectedOrder.status === 'IN_TRANSIT' && canCompleteTransport && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-5 h-5 text-blue-400" />
                  <p className="font-medium text-blue-400">车辆运输中，到达后可确认</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  onClick={handleCompleteTransport}
                >
                  确认到达处置厂
                </Button>
              </div>
            )}

            {selectedOrder.status === 'ARRIVED' && canCompleteDisposal && (
              <div className="p-4 bg-success-500/10 border border-success-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-success-400" />
                  <p className="font-medium text-success-400">已到达处置厂，可完成处置</p>
                </div>
                <Button
                  variant="success"
                  size="sm"
                  leftIcon={<Check className="w-4 h-4" />}
                  onClick={handleCompleteDisposal}
                >
                  完成处置
                </Button>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-app-text flex items-center gap-2">
                <Package className="w-4 h-4 text-primary-400" />
                基本信息
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-app-bg rounded-lg border border-app-border">
                  <p className="text-xs text-app-text-muted mb-1">医疗机构</p>
                  <p className="text-sm text-app-text">{getInstitutionName(selectedOrder.institutionId)}</p>
                </div>
                <div className="p-3 bg-app-bg rounded-lg border border-app-border">
                  <p className="text-xs text-app-text-muted mb-1">处置厂</p>
                  <p className="text-sm text-app-text">{getFactoryName(selectedOrder.factoryId)}</p>
                </div>
                <div className="p-3 bg-app-bg rounded-lg border border-app-border">
                  <p className="text-xs text-app-text-muted mb-1">车辆</p>
                  <p className="text-sm text-app-text">{getVehiclePlateNo(selectedOrder.vehicleId)}</p>
                </div>
                <div className="p-3 bg-app-bg rounded-lg border border-app-border">
                  <p className="text-xs text-app-text-muted mb-1">驾驶员</p>
                  <p className="text-sm text-app-text">{getDriverName(selectedOrder.driverId)}</p>
                </div>
                <div className="p-3 bg-app-bg rounded-lg border border-app-border">
                  <p className="text-xs text-app-text-muted mb-1">总重量</p>
                  <p className="text-sm text-app-text font-medium">{formatWeight(selectedOrder.totalWeight)}</p>
                </div>
                <div className="p-3 bg-app-bg rounded-lg border border-app-border">
                  <p className="text-xs text-app-text-muted mb-1">申请时间</p>
                  <p className="text-sm text-app-text">{formatDateTime(selectedOrder.applyTime)}</p>
                </div>
              </div>
            </div>

            {selectedOrder.route && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-app-text flex items-center gap-2">
                  <Route className="w-4 h-4 text-primary-400" />
                  运输路线规划
                </h3>
                <div className="p-4 bg-app-bg rounded-lg border border-app-border space-y-4">
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div className="p-2 bg-app-bg-lighter rounded">
                      <p className="text-xs text-app-text-muted mb-0.5">总距离</p>
                      <p className="text-sm font-semibold text-primary-400">
                        {formatDistance(selectedOrder.route.totalDistance)}
                      </p>
                    </div>
                    <div className="p-2 bg-app-bg-lighter rounded">
                      <p className="text-xs text-app-text-muted mb-0.5">预计总时长</p>
                      <p className="text-sm font-semibold text-primary-400">
                        {formatDuration(selectedOrder.route.totalEstimatedTime)}
                      </p>
                    </div>
                  </div>
                  <div className="relative pl-8">
                    <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-primary-500/30" />
                    <div className="space-y-4">
                      <div className="relative">
                        <div className="absolute -left-8 w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-xs text-white font-bold">1</div>
                        <div className="p-3 bg-app-bg-lighter rounded border border-app-border">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-app-text">车辆当前位置</p>
                              <p className="text-xs text-app-text-muted mt-0.5">
                                {selectedOrder.route.waypoints.vehicleStart.lat.toFixed(5)}, {selectedOrder.route.waypoints.vehicleStart.lng.toFixed(5)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="pl-2 flex items-center gap-2 text-xs text-app-text-muted">
                        <MapPin className="w-3 h-3" />
                        <span>{formatDistance(selectedOrder.route.vehicleToInstitution.distance)}</span>
                        <span>·</span>
                        <span>约 {formatDuration(selectedOrder.route.vehicleToInstitution.estimatedTime)}</span>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-8 w-6 h-6 rounded-full bg-warning-500 flex items-center justify-center text-xs text-white font-bold">2</div>
                        <div className="p-3 bg-app-bg-lighter rounded border border-app-border">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-app-text">医疗机构（装货）</p>
                              <p className="text-xs text-app-text-muted mt-0.5">
                                {selectedOrder.route.waypoints.institution.name}
                              </p>
                              <p className="text-xs text-primary-400 mt-0.5">
                                预计装货时间约 20 分钟
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="pl-2 flex items-center gap-2 text-xs text-app-text-muted">
                        <MapPin className="w-3 h-3" />
                        <span>{formatDistance(selectedOrder.route.institutionToFactory.distance)}</span>
                        <span>·</span>
                        <span>约 {formatDuration(selectedOrder.route.institutionToFactory.estimatedTime)}</span>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-8 w-6 h-6 rounded-full bg-success-500 flex items-center justify-center text-xs text-white font-bold">3</div>
                        <div className="p-3 bg-app-bg-lighter rounded border border-app-border">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-app-text">处置厂（卸货）</p>
                              <p className="text-xs text-app-text-muted mt-0.5">
                                {selectedOrder.route.waypoints.factory.name}
                              </p>
                              <p className="text-xs text-success-400 mt-0.5">
                                预计卸货时间约 15 分钟
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-app-text flex items-center gap-2">
                <Package className="w-4 h-4 text-primary-400" />
                废物明细
              </h3>
              <div className="border border-app-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-app-bg-lighter">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-app-text-secondary">
                        类别
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-app-text-secondary">
                        重量
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, index) => (
                      <tr key={index} className="border-t border-app-border/50">
                        <td className="px-3 py-2 text-sm text-app-text">
                          <span
                            className="px-2 py-0.5 text-xs rounded"
                            style={{
                              backgroundColor: `${WasteCategoryColor[categories.find((c) => c.id === item.categoryId)?.type as keyof typeof WasteCategoryColor] || '#64748B'}20`,
                              color: WasteCategoryColor[categories.find((c) => c.id === item.categoryId)?.type as keyof typeof WasteCategoryColor] || '#64748B'
                            }}
                          >
                            {getCategoryName(item.categoryId)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-app-text text-right">
                          {formatWeight(item.weight)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-app-text flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-400" />
                状态时间线
              </h3>
              <div className="relative pl-6">
                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-app-border" />
                {(selectedOrder.timeline?.length ? selectedOrder.timeline : [
                  { status: 'PENDING_AUDIT', title: '提交转运申请', time: selectedOrder.applyTime, description: '申请已提交，等待审批' },
                  ...(selectedOrder.auditTime ? [
                    { status: selectedOrder.status === 'REJECTED' ? 'REJECTED' : 'APPROVED',
                      title: selectedOrder.status === 'REJECTED' ? '审批拒绝' : '审批通过',
                      time: selectedOrder.auditTime,
                      description: selectedOrder.auditOpinion }
                  ] : [
                    { status: 'PENDING_AUDIT', title: '等待审批', time: '', description: '环保部门审核中' }
                  ]),
                  ...(selectedOrder.departureTime ? [
                    { status: 'IN_TRANSIT', title: '开始运输', time: selectedOrder.departureTime, description: '车辆已出发' }
                  ] : []),
                  ...(selectedOrder.arrivalTime ? [
                    { status: 'ARRIVED', title: '到达处置厂', time: selectedOrder.arrivalTime, description: '已安全到达' }
                  ] : []),
                  ...(selectedOrder.disposalTime ? [
                    { status: 'COMPLETED', title: '处置完成', time: selectedOrder.disposalTime, description: '废物已无害化处置' }
                  ] : []),
                ] as any[])
                  .map((step, index, arr) => {
                    const isDone = !!step.time
                    const isCurrent = !step.time && index === arr.findIndex(s => !s.time)
                    return (
                      <div key={index} className="relative pb-6 last:pb-0">
                        <div
                          className={twMerge(
                            'absolute -left-6 w-4 h-4 rounded-full border-2 flex items-center justify-center',
                            isDone
                              ? 'bg-success-500 border-success-500'
                              : isCurrent
                                ? 'bg-primary-500 border-primary-500 animate-pulse'
                                : 'bg-app-bg border-app-border'
                          )}
                        />
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className={twMerge(
                              'text-sm font-medium',
                              isDone ? 'text-app-text' : isCurrent ? 'text-primary-400' : 'text-app-text-muted'
                            )}>
                              {step.title}
                              {step.operator && (
                                <span className="ml-2 text-xs text-app-text-muted font-normal">
                                  · {step.operator}
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-app-text-muted">
                              {step.time ? formatDateTime(step.time) : '待处理'}
                            </span>
                          </div>
                          {step.description && (
                            <p className="text-xs text-app-text-muted">{step.description}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            {selectedOrder.status && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-app-text flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-400" />
                  审批信息
                </h3>
                {selectedOrder.auditTime ? (
                  <div className="p-3 bg-app-bg rounded-lg border border-app-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className={twMerge(
                        'text-sm font-medium',
                        selectedOrder.status === 'REJECTED' ? 'text-danger-400' : 'text-success-400'
                      )}>
                        {selectedOrder.status === 'REJECTED' ? '已拒绝' : '审批通过'}
                      </span>
                      <span className="text-xs text-app-text-muted">{formatDateTime(selectedOrder.auditTime)}</span>
                    </div>
                    {selectedOrder.auditOpinion && (
                      <p className="text-sm text-app-text-secondary">
                        <span className="text-app-text-muted font-medium">审批意见：</span>
                        {selectedOrder.auditOpinion}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-warning-500/10 rounded-lg border border-warning-500/30">
                    <p className="text-sm text-warning-400">等待环保部门审批</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        isOpen={reassignModalOpen}
        onClose={() => setReassignModalOpen(false)}
        title="改派车辆和司机"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReassignModalOpen(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleReassign}
              disabled={!reassignVehicleId || !reassignDriverId || submitting}
              leftIcon={<Route className="w-4 h-4" />}
            >
              确认改派
            </Button>
          </div>
        }
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="p-3 bg-app-bg-lighter rounded-lg border border-app-border">
              <p className="text-sm text-app-text">
                订单号：<span className="font-mono text-primary-400 font-medium">{selectedOrder.orderNo}</span>
              </p>
              <p className="text-xs text-app-text-muted mt-1">
                当前状态：{TransferOrderStatusLabel[selectedOrder.status]}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-secondary mb-2">
                当前车辆
              </label>
              <div className="p-3 bg-app-bg rounded-lg border border-app-border">
                <p className="text-app-text">
                  {vehicles.find(v => v.id === selectedOrder.vehicleId)?.plateNo || '未指定'}
                </p>
                <p className="text-xs text-app-text-muted mt-1">
                  当前司机：{drivers.find(d => d.id === selectedOrder.driverId)?.name || '未指定'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-secondary mb-2">
                选择新车辆 <span className="text-danger-400">*</span>
              </label>
              <select
                className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-app-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={reassignVehicleId}
                onChange={(e) => {
                  setReassignVehicleId(e.target.value)
                  const vehicle = vehicles.find(v => v.id === e.target.value)
                  if (vehicle?.driverId) {
                    setReassignDriverId(vehicle.driverId)
                  }
                }}
              >
                <option value="">请选择车辆</option>
                {vehicles
                  .filter(v => ['IDLE', 'AVAILABLE'].includes(v.status) || v.id === selectedOrder.vehicleId)
                  .map((v) => (
                    <option key={v.id} value={v.id} disabled={!['IDLE', 'AVAILABLE'].includes(v.status) && v.id !== selectedOrder.vehicleId}>
                      {v.plateNo} - {VehicleStatusLabel[v.status]}
                      ({v.currentLat ? '定位在线' : '定位离线'})
                      {v.id === selectedOrder.vehicleId ? ' - 当前车辆' : ''}
                    </option>
                  ))
                }
              </select>
              <p className="text-xs text-app-text-muted mt-1">
                仅显示可调用（空闲/可用）的车辆
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-secondary mb-2">
                选择新司机 <span className="text-danger-400">*</span>
              </label>
              <select
                className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-app-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={reassignDriverId}
                onChange={(e) => setReassignDriverId(e.target.value)}
              >
                <option value="">请选择司机</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} - {d.licenseType || '驾照'}
                    {d.id === selectedOrder.driverId ? ' - 当前司机' : ''}
                  </option>
                ))}
              </select>
            </div>

            {(reassignVehicleId || reassignDriverId) && (
              (() => {
                const orderDate = selectedOrder.applyTime.slice(0, 10)
                const sameDayOrders = orders.filter(o =>
                  o.id !== selectedOrder.id &&
                  o.applyTime.slice(0, 10) === orderDate &&
                  ['APPROVED', 'IN_TRANSIT', 'ARRIVED', 'COMPLETED', 'PENDING_AUDIT'].includes(o.status)
                )
                const vehicleConflicts = sameDayOrders.filter(o => o.vehicleId === reassignVehicleId)
                const driverConflicts = sameDayOrders.filter(o => o.driverId === reassignDriverId)
                const hasVehicleConflict = vehicleConflicts.length > 0
                const hasDriverConflict = driverConflicts.length > 0 && reassignDriverId !== selectedOrder.driverId

                const ConflictCard = ({ list, type }: { list: typeof sameDayOrders; type: 'vehicle' | 'driver' }) => {
                  if (list.length === 0) return null
                  return (
                    <div className="space-y-2">
                      {list.map((c) => (
                        <div key={c.id} className="p-2 bg-app-bg rounded border border-app-border flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant={
                                c.status === 'COMPLETED' ? 'success' :
                                c.status === 'IN_TRANSIT' ? 'info' :
                                c.status === 'APPROVED' ? 'primary' :
                                c.status === 'REJECTED' ? 'danger' : 'default'
                              } size="sm">
                                {TransferOrderStatusLabel[c.status as keyof typeof TransferOrderStatusLabel]}
                              </Badge>
                              <span className="text-xs font-mono text-app-text truncate">{c.orderNo}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-app-text-muted mt-1 flex-wrap">
                              <span>📅 {formatTime(c.applyTime)}</span>
                              <span>🏥 {getInstitutionName(c.institutionId)}</span>
                              {type === 'vehicle' && (
                                <span>👤 {getDriverName(c.driverId)}</span>
                              )}
                              {type === 'driver' && (
                                <span>🚚 {vehicles.find(v => v.id === c.vehicleId)?.plateNo || '未指定'}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                }

                const isBlocked = hasVehicleConflict || hasDriverConflict

                return (
                  <div className="space-y-3 pt-2 border-t border-app-border">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-app-text flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-primary-400" />
                        同日占用日历 ({orderDate})
                      </h4>
                      {isBlocked ? (
                        <Badge variant="danger" size="sm">存在冲突</Badge>
                      ) : (
                        <Badge variant="success" size="sm">无冲突</Badge>
                      )}
                    </div>

                    {reassignVehicleId && (
                      <div className="p-3 bg-app-bg-lighter rounded-lg border border-app-border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-app-text-secondary flex items-center gap-1.5">
                            <Truck className="w-3 h-3" />
                            车辆 {vehicles.find(v => v.id === reassignVehicleId)?.plateNo || reassignVehicleId}
                          </span>
                          <span className={twMerge(
                            'text-[11px] font-medium',
                            hasVehicleConflict ? 'text-danger-400' : 'text-success-400'
                          )}>
                            {hasVehicleConflict ? `已有 ${vehicleConflicts.length} 个任务安排` : '当日空闲'}
                          </span>
                        </div>
                        <ConflictCard list={vehicleConflicts} type="vehicle" />
                      </div>
                    )}

                    {reassignDriverId && (
                      <div className="p-3 bg-app-bg-lighter rounded-lg border border-app-border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-app-text-secondary flex items-center gap-1.5">
                            <User className="w-3 h-3" />
                            司机 {drivers.find(d => d.id === reassignDriverId)?.name || reassignDriverId}
                          </span>
                          <span className={twMerge(
                            'text-[11px] font-medium',
                            hasDriverConflict ? 'text-danger-400' : 'text-success-400'
                          )}>
                            {hasDriverConflict ? `已有 ${driverConflicts.length} 个任务安排` : '当日空闲'}
                          </span>
                        </div>
                        <ConflictCard list={driverConflicts} type="driver" />
                      </div>
                    )}

                    {isBlocked && (
                      <div className="p-3 bg-danger-500/10 border border-danger-500/30 rounded-lg">
                        <p className="text-xs text-danger-400 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>
                            存在时间冲突，确认改派后可能导致同一资源并发占用。
                            建议优先考虑空闲车辆/司机，或协调原任务改期。
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )
              })()
            )}

            {(reassignVehicleId && reassignVehicleId !== selectedOrder.vehicleId) && (
              <div className="p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                <p className="text-xs text-primary-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  改派后路线将根据新车辆当前位置重新计算，订单详情、路线信息和运输监控都将同步更新
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
