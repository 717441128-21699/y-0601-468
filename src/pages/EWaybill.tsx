import React, { useState, useEffect, useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody
} from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Table } from '@/components/ui/Table'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { StatCard } from '@/components/ui/StatCard'
import { useTransportStore } from '@/store/useTransportStore'
import { useWasteStore } from '@/store/useWasteStore'
import {
  generateEWaybill,
  exportEWaybillToPDF,
  generateMonthlyReport,
  exportMonthlyReport,
  type EWaybillData
} from '@/services/reportService'
import { exportToExcel, exportTransferOrderToPDF } from '@/utils/export'
import {
  TransferOrderStatusLabel,
  TransferOrderStatusColor,
  type TransferOrder,
  type WasteStatistics,
  type WasteRecord,
  type MedicalInstitution,
  type DisposalFactory,
  type WasteCategory
} from '@/types'
import { formatDateTime, formatWeight, formatDate } from '@/utils/format'
import {
  FileText,
  Search,
  Download,
  FileSpreadsheet,
  Eye,
  Printer,
  Calendar,
  TrendingUp,
  Package,
  Building2,
  Factory,
  CheckSquare,
  Square,
  ChevronDown,
  User,
  Truck,
  MapPin,
  Signature
} from 'lucide-react'

type EWaybillStatus = 'ALL' | 'PENDING_GENERATE' | 'GENERATED' | 'SIGNED' | 'COMPLETED'

interface EWaybillListItem {
  id: string
  billNo: string
  orderNo: string
  orderId: string
  institutionName: string
  factoryName: string
  totalWeight: number
  categoryCount: number
  createdAt: string
  status: EWaybillStatus
  order: TransferOrder
}

const statusOptions = [
  { value: 'ALL', label: '全部' },
  { value: 'PENDING_GENERATE', label: '待生成' },
  { value: 'GENERATED', label: '已生成' },
  { value: 'SIGNED', label: '已签收' },
  { value: 'COMPLETED', label: '已完成' }
]

const statusBadgeVariant: Record<EWaybillStatus, 'default' | 'warning' | 'primary' | 'info' | 'success'> = {
  ALL: 'default',
  PENDING_GENERATE: 'warning',
  GENERATED: 'primary',
  SIGNED: 'info',
  COMPLETED: 'success'
}

const statusLabel: Record<EWaybillStatus, string> = {
  ALL: '全部',
  PENDING_GENERATE: '待生成',
  GENERATED: '已生成',
  SIGNED: '已签收',
  COMPLETED: '已完成'
}

export const EWaybill: React.FC = () => {
  const { orders, loadOrders, vehicles, drivers, loading: transportLoading } = useTransportStore()
  const { wasteRecords, institutions, factories, categories, loadAllData, loading: wasteLoading } = useWasteStore()

  const [activeTab, setActiveTab] = useState('ewaybill')
  const [statusFilter, setStatusFilter] = useState<EWaybillStatus>('ALL')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedWaybill, setSelectedWaybill] = useState<EWaybillData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [monthlyReport, setMonthlyReport] = useState<WasteStatistics | null>(null)
  const [reportMonth, setReportMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [reportLoading, setReportLoading] = useState(false)
  const [generatingBillIds, setGeneratingBillIds] = useState<string[]>([])

  const pageSize = 10

  useEffect(() => {
    loadAllData()
    loadOrders()
  }, [loadAllData, loadOrders])

  const getInstitutionName = (id: string) => {
    return institutions.find((i) => i.id === id)?.name || '未知机构'
  }

  const getFactoryName = (id: string) => {
    return factories.find((f) => f.id === id)?.name || '未知处置厂'
  }

  const getCategoryName = (id: string) => {
    return categories.find((c) => c.id === id)?.name || '未知类别'
  }

  const getVehiclePlateNo = (id: string) => {
    return vehicles.find((v) => v.id === id)?.plateNo || '未知车辆'
  }

  const getDriverName = (id: string) => {
    return drivers.find((d) => d.id === id)?.name || '未知驾驶员'
  }

  const getEWaybillStatus = (order: TransferOrder): EWaybillStatus => {
    if (order.status === 'COMPLETED') return 'COMPLETED'
    if (order.status === 'ARRIVED') return 'SIGNED'
    if (['APPROVED', 'IN_TRANSIT'].includes(order.status)) return 'GENERATED'
    return 'PENDING_GENERATE'
  }

  const ewaybillList = useMemo<EWaybillListItem[]>(() => {
    return orders
      .filter((order) => {
        if (statusFilter !== 'ALL' && getEWaybillStatus(order) !== statusFilter) return false

        if (dateStart && order.createdAt < dateStart) return false
        if (dateEnd && order.createdAt > dateEnd + 'T23:59:59') return false

        if (searchKeyword) {
          const keyword = searchKeyword.toLowerCase()
          const billNo = `EWB${order.orderNo}`.toLowerCase()
          const institutionName = getInstitutionName(order.institutionId).toLowerCase()
          const orderNo = order.orderNo.toLowerCase()
          if (
            !billNo.includes(keyword) &&
            !institutionName.includes(keyword) &&
            !orderNo.includes(keyword)
          ) {
            return false
          }
        }

        return true
      })
      .map((order) => {
        const orderWasteRecords = wasteRecords.filter((r) => r.transferOrderId === order.id)
        const uniqueCategoryIds = new Set(orderWasteRecords.map((r) => r.categoryId))

        return {
          id: order.id,
          billNo: `EWB${order.orderNo}`,
          orderNo: order.orderNo,
          orderId: order.id,
          institutionName: getInstitutionName(order.institutionId),
          factoryName: getFactoryName(order.factoryId),
          totalWeight: order.totalWeight,
          categoryCount: uniqueCategoryIds.size,
          createdAt: order.createdAt,
          status: getEWaybillStatus(order),
          order
        }
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [orders, statusFilter, dateStart, dateEnd, searchKeyword, wasteRecords, institutions, factories])

  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize
    return ewaybillList.slice(start, start + pageSize)
  }, [ewaybillList, page])

  const handleGenerateBill = async (orderId: string) => {
    setGeneratingBillIds((prev) => [...prev, orderId])
    try {
      const data = await generateEWaybill(orderId)
      if (data) {
        alert('联单生成成功')
      }
    } catch (error) {
      console.error('生成联单失败:', error)
      alert('生成联单失败，请重试')
    } finally {
      setGeneratingBillIds((prev) => prev.filter((id) => id !== orderId))
    }
  }

  const handleViewDetail = async (orderId: string) => {
    setDetailLoading(true)
    setDetailModalOpen(true)
    try {
      const data = await generateEWaybill(orderId)
      setSelectedWaybill(data)
    } catch (error) {
      console.error('获取联单详情失败:', error)
      alert('获取联单详情失败，请重试')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleDownloadPDF = async (orderId: string) => {
    try {
      await exportEWaybillToPDF(orderId)
    } catch (error) {
      console.error('下载PDF失败:', error)
      alert('下载PDF失败，请重试')
    }
  }

  const handleExportExcel = () => {
    const exportData = ewaybillList.map((item) => ({
      联单号: item.billNo,
      关联订单号: item.orderNo,
      医疗机构: item.institutionName,
      处置厂: item.factoryName,
      总重量: formatWeight(item.totalWeight),
      废物类别数: item.categoryCount,
      生成时间: formatDateTime(item.createdAt),
      状态: statusLabel[item.status]
    }))
    exportToExcel(exportData, `电子联单列表_${formatDate(new Date())}`, '电子联单')
  }

  const handleBatchDownload = async () => {
    if (selectedIds.length === 0) {
      alert('请先选择要下载的联单')
      return
    }
    try {
      for (const orderId of selectedIds) {
        await exportEWaybillToPDF(orderId)
      }
    } catch (error) {
      console.error('批量下载失败:', error)
      alert('批量下载失败，请重试')
    }
  }

  const handleBatchExport = () => {
    if (selectedIds.length === 0) {
      alert('请先选择要导出的联单')
      return
    }
    const selectedData = ewaybillList
      .filter((item) => selectedIds.includes(item.id))
      .map((item) => ({
        联单号: item.billNo,
        关联订单号: item.orderNo,
        医疗机构: item.institutionName,
        处置厂: item.factoryName,
        总重量: formatWeight(item.totalWeight),
        废物类别数: item.categoryCount,
        生成时间: formatDateTime(item.createdAt),
        状态: statusLabel[item.status]
      }))
    exportToExcel(selectedData, `电子联单批量导出_${formatDate(new Date())}`, '电子联单')
  }

  const handleSelectAll = () => {
    if (selectedIds.length === paginatedList.length && paginatedList.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(paginatedList.map((item) => item.id))
    }
  }

  const handleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleGenerateReport = async () => {
    setReportLoading(true)
    try {
      const report = await generateMonthlyReport(reportMonth)
      setMonthlyReport(report)
    } catch (error) {
      console.error('生成月度报告失败:', error)
      alert('生成月度报告失败，请重试')
    } finally {
      setReportLoading(false)
    }
  }

  const handleExportReportExcel = () => {
    exportMonthlyReport(reportMonth)
  }

  const handleExportReportPDF = () => {
    if (monthlyReport) {
      const elementId = 'monthly-report-content'
      import('@/utils/export').then(({ exportPDF }) => {
        exportPDF(elementId, `月度报告_${reportMonth}`, { orientation: 'landscape' })
      })
    }
  }

  const handlePrintDetail = () => {
    window.print()
  }

  const columns = [
    {
      key: 'select',
      title: (
        <button
          onClick={handleSelectAll}
          className="text-app-text-muted hover:text-app-text transition-colors"
        >
          {selectedIds.length === paginatedList.length && paginatedList.length > 0 ? (
            <CheckSquare className="w-4 h-4 text-primary-500" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>
      ),
      width: 40,
      align: 'center' as const,
      render: (row: EWaybillListItem) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleSelectItem(row.id)
          }}
          className="text-app-text-muted hover:text-app-text transition-colors"
        >
          {selectedIds.includes(row.id) ? (
            <CheckSquare className="w-4 h-4 text-primary-500" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>
      )
    },
    {
      key: 'billNo',
      title: '联单号',
      width: 160,
      render: (row: EWaybillListItem) => (
        <span className="font-mono text-sm text-app-text">{row.billNo}</span>
      )
    },
    {
      key: 'orderNo',
      title: '关联订单号',
      width: 140,
      render: (row: EWaybillListItem) => (
        <span className="font-mono text-sm text-app-text-secondary">{row.orderNo}</span>
      )
    },
    {
      key: 'institutionName',
      title: '医疗机构',
      width: 180
    },
    {
      key: 'factoryName',
      title: '处置厂',
      width: 180
    },
    {
      key: 'totalWeight',
      title: '总重量',
      width: 100,
      render: (row: EWaybillListItem) => formatWeight(row.totalWeight)
    },
    {
      key: 'categoryCount',
      title: '废物类别数',
      width: 100,
      align: 'center' as const
    },
    {
      key: 'createdAt',
      title: '生成时间',
      width: 160,
      render: (row: EWaybillListItem) => formatDateTime(row.createdAt)
    },
    {
      key: 'status',
      title: '状态',
      width: 100,
      render: (row: EWaybillListItem) => (
        <Badge variant={statusBadgeVariant[row.status]}>
          {statusLabel[row.status]}
        </Badge>
      )
    },
    {
      key: 'actions',
      title: '操作',
      width: 280,
      render: (row: EWaybillListItem) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Eye className="w-3.5 h-3.5" />}
            onClick={(e) => {
              e.stopPropagation()
              handleViewDetail(row.orderId)
            }}
          >
            详情
          </Button>
          {row.status === 'PENDING_GENERATE' && (
            <Button
              size="sm"
              variant="primary"
              leftIcon={<FileText className="w-3.5 h-3.5" />}
              loading={generatingBillIds.includes(row.orderId)}
              onClick={(e) => {
                e.stopPropagation()
                handleGenerateBill(row.orderId)
              }}
            >
              生成联单
            </Button>
          )}
          {row.status !== 'PENDING_GENERATE' && (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={(e) => {
                e.stopPropagation()
                handleDownloadPDF(row.orderId)
              }}
            >
              下载PDF
            </Button>
          )}
        </div>
      )
    }
  ]

  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = `${date.getFullYear()}年${date.getMonth() + 1}月`
      options.push({ value, label })
    }
    return options
  }, [])

  const getTimelineEvents = (order: TransferOrder) => {
    const events: { time: string; title: string; description: string; status: 'done' | 'current' | 'pending' }[] = []

    if (order.applyTime) {
      events.push({
        time: formatDateTime(order.applyTime),
        title: '申请提交',
        description: '医疗机构提交转运申请',
        status: 'done'
      })
    }
    if (order.auditTime) {
      events.push({
        time: formatDateTime(order.auditTime),
        title: '审批完成',
        description: order.auditOpinion || '审核通过',
        status: 'done'
      })
    }
    if (order.departureTime) {
      events.push({
        time: formatDateTime(order.departureTime),
        title: '开始运输',
        description: `车辆 ${getVehiclePlateNo(order.vehicleId)} 出发`,
        status: 'done'
      })
    }
    if (order.arrivalTime) {
      events.push({
        time: formatDateTime(order.arrivalTime),
        title: '到达处置厂',
        description: '车辆到达处置厂并签收',
        status: 'done'
      })
    }
    if (order.disposalTime) {
      events.push({
        time: formatDateTime(order.disposalTime),
        title: '处置完成',
        description: '废物已完成处置',
        status: 'done'
      })
    }

    return events
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-text">电子联单管理</h1>
          <p className="text-app-text-secondary mt-1">管理医疗废物转移电子联单和月度报告</p>
        </div>
      </div>

      <Tabs
        tabs={[
          { key: 'ewaybill', label: '电子联单' },
          { key: 'monthly', label: '月度报告' }
        ]}
        defaultTab="ewaybill"
        onChange={setActiveTab}
      >
        <TabPanel tabKey="ewaybill">
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-500" />
                  筛选条件
                </div>
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Select
                  label="状态筛选"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as EWaybillStatus)
                    setPage(1)
                  }}
                  options={statusOptions}
                />
                <Input
                  label="开始日期"
                  type="date"
                  value={dateStart}
                  onChange={(e) => {
                    setDateStart(e.target.value)
                    setPage(1)
                  }}
                />
                <Input
                  label="结束日期"
                  type="date"
                  value={dateEnd}
                  onChange={(e) => {
                    setDateEnd(e.target.value)
                    setPage(1)
                  }}
                />
                <Input
                  label="搜索"
                  placeholder="联单号/机构名/订单号"
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
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-500" />
                    电子联单列表
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedIds.length > 0 && (
                      <span className="text-sm text-app-text-muted">
                        已选择 {selectedIds.length} 项
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={<Download className="w-4 h-4" />}
                      onClick={handleBatchDownload}
                      disabled={selectedIds.length === 0}
                    >
                      批量下载
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={<FileSpreadsheet className="w-4 h-4" />}
                      onClick={handleBatchExport}
                      disabled={selectedIds.length === 0}
                    >
                      批量导出
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      leftIcon={<FileSpreadsheet className="w-4 h-4" />}
                      onClick={handleExportExcel}
                    >
                      导出Excel
                    </Button>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardBody>
              <Table
                columns={columns}
                data={paginatedList}
                loading={transportLoading || wasteLoading}
                rowKey={(row) => row.id}
                onRowClick={(row) => handleViewDetail(row.orderId)}
                pagination={{
                  page,
                  pageSize,
                  total: ewaybillList.length,
                  onPageChange: setPage
                }}
              />
            </CardBody>
          </Card>
        </TabPanel>

        <TabPanel tabKey="monthly">
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary-500" />
                  月度报告
                </div>
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="flex items-center gap-4 mb-6">
                <Select
                  label="选择月份"
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  options={monthOptions}
                  className="w-48"
                />
                <div className="flex items-center gap-2 pt-6">
                  <Button
                    variant="primary"
                    leftIcon={<FileText className="w-4 h-4" />}
                    onClick={handleGenerateReport}
                    loading={reportLoading}
                  >
                    生成报告
                  </Button>
                  {monthlyReport && (
                    <>
                      <Button
                        variant="secondary"
                        leftIcon={<FileSpreadsheet className="w-4 h-4" />}
                        onClick={handleExportReportExcel}
                      >
                        导出Excel
                      </Button>
                      <Button
                        variant="secondary"
                        leftIcon={<Download className="w-4 h-4" />}
                        onClick={handleExportReportPDF}
                      >
                        导出PDF
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {monthlyReport ? (
                <div id="monthly-report-content" className="space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-app-text">
                      医疗废物月度运营报告 - {reportMonth.replace('-', '年')}月
                    </h2>
                    <p className="text-app-text-secondary mt-1">
                      生成时间: {formatDateTime(new Date())}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      title="总重量"
                      value={monthlyReport.totalWeight.toFixed(2)}
                      unit="kg"
                      icon={<TrendingUp className="w-6 h-6" />}
                      color="primary"
                    />
                    <StatCard
                      title="总数量"
                      value={monthlyReport.totalCount}
                      unit="袋"
                      icon={<Package className="w-6 h-6" />}
                      color="success"
                    />
                    <StatCard
                      title="涉及机构"
                      value={monthlyReport.byInstitution.filter((i) => i.count > 0).length}
                      unit="家"
                      icon={<Building2 className="w-6 h-6" />}
                      color="info"
                    />
                    <StatCard
                      title="废物类别"
                      value={monthlyReport.byCategory.filter((c) => c.count > 0).length}
                      unit="类"
                      icon={<Factory className="w-6 h-6" />}
                      color="warning"
                    />
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-primary-500" />
                          机构分布统计
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardBody>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-app-border">
                              <th className="px-4 py-3 text-left text-sm font-semibold text-app-text-secondary">医疗机构</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-app-text-secondary">重量(kg)</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-app-text-secondary">数量(袋)</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-app-text-secondary">占比</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthlyReport.byInstitution
                              .filter((item) => item.count > 0)
                              .sort((a, b) => b.weight - a.weight)
                              .map((item, index) => (
                                <tr key={item.institutionId} className="border-b border-app-border/50">
                                  <td className="px-4 py-3 text-sm text-app-text">
                                    <span className="inline-flex items-center gap-2">
                                      <span className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-xs font-medium">
                                        {index + 1}
                                      </span>
                                      {item.institutionName}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-app-text text-right">{item.weight.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-sm text-app-text text-right">{item.count}</td>
                                  <td className="px-4 py-3 text-sm text-app-text text-right">
                                    {monthlyReport.totalWeight > 0
                                      ? ((item.weight / monthlyReport.totalWeight) * 100).toFixed(2)
                                      : '0.00'}%
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>
                        <div className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-primary-500" />
                          类别分布统计
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardBody>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-app-border">
                              <th className="px-4 py-3 text-left text-sm font-semibold text-app-text-secondary">废物类别</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-app-text-secondary">重量(kg)</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-app-text-secondary">数量(袋)</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-app-text-secondary">占比</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthlyReport.byCategory
                              .filter((item) => item.count > 0)
                              .sort((a, b) => b.weight - a.weight)
                              .map((item, index) => {
                                const category = categories.find((c) => c.id === item.categoryId)
                                return (
                                  <tr key={item.categoryId} className="border-b border-app-border/50">
                                    <td className="px-4 py-3 text-sm text-app-text">
                                      <span className="inline-flex items-center gap-2">
                                        <span
                                          className="w-4 h-4 rounded-full"
                                          style={{ backgroundColor: category?.color || '#64748B' }}
                                        />
                                        {item.categoryName}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-app-text text-right">{item.weight.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-sm text-app-text text-right">{item.count}</td>
                                    <td className="px-4 py-3 text-sm text-app-text text-right">
                                      {monthlyReport.totalWeight > 0
                                        ? ((item.weight / monthlyReport.totalWeight) * 100).toFixed(2)
                                        : '0.00'}%
                                    </td>
                                  </tr>
                                )
                              })}
                          </tbody>
                        </table>
                      </div>
                    </CardBody>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-16 text-app-text-muted">
                  <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>请选择月份并点击"生成报告"按钮</p>
                </div>
              )}
            </CardBody>
          </Card>
        </TabPanel>
      </Tabs>

      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="电子联单详情"
        size="xl"
        footer={
          selectedWaybill && (
            <>
              <Button
                variant="secondary"
                onClick={() => setDetailModalOpen(false)}
              >
                关闭
              </Button>
              <Button
                variant="secondary"
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={handlePrintDetail}
              >
                打印
              </Button>
              <Button
                variant="primary"
                leftIcon={<Download className="w-4 h-4" />}
                onClick={() => handleDownloadPDF(selectedWaybill.order.id)}
              >
                下载PDF
              </Button>
            </>
          )
        }
      >
        {detailLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-app-text-secondary">加载中...</p>
          </div>
        ) : selectedWaybill ? (
          <div id="ewaybill-detail" className="space-y-6">
            <div className="text-center border-b border-app-border pb-4">
              <h3 className="text-lg font-bold text-app-text">医疗废物转移电子联单</h3>
              <p className="text-app-text-secondary mt-1">
                联单编号: <span className="font-mono">{selectedWaybill.billNo}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardBody className="space-y-3">
                  <div className="flex items-center gap-2 text-app-text-secondary mb-2">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium">基本信息</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-app-text-muted">联单编号</div>
                    <div className="text-app-text font-mono">{selectedWaybill.billNo}</div>
                    <div className="text-app-text-muted">生成日期</div>
                    <div className="text-app-text">{formatDate(selectedWaybill.order.createdAt)}</div>
                    <div className="text-app-text-muted">关联订单</div>
                    <div className="text-app-text font-mono">{selectedWaybill.order.orderNo}</div>
                    <div className="text-app-text-muted">联单状态</div>
                    <div className="text-app-text">
                      <Badge variant={statusBadgeVariant[getEWaybillStatus(selectedWaybill.order)]}>
                        {statusLabel[getEWaybillStatus(selectedWaybill.order)]}
                      </Badge>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody className="space-y-3">
                  <div className="flex items-center gap-2 text-app-text-secondary mb-2">
                    <Building2 className="w-4 h-4" />
                    <span className="font-medium">转出方（医疗机构）</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-app-text-muted">机构名称</div>
                    <div className="text-app-text">{selectedWaybill.institutionName}</div>
                    <div className="text-app-text-muted">联系人员</div>
                    <div className="text-app-text">-</div>
                    <div className="text-app-text-muted">联系电话</div>
                    <div className="text-app-text">-</div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody className="space-y-3">
                  <div className="flex items-center gap-2 text-app-text-secondary mb-2">
                    <Factory className="w-4 h-4" />
                    <span className="font-medium">接收方（处置厂）</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-app-text-muted">处置厂名称</div>
                    <div className="text-app-text">{selectedWaybill.factoryName}</div>
                    <div className="text-app-text-muted">联系人员</div>
                    <div className="text-app-text">-</div>
                    <div className="text-app-text-muted">联系电话</div>
                    <div className="text-app-text">-</div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody className="space-y-3">
                  <div className="flex items-center gap-2 text-app-text-secondary mb-2">
                    <Truck className="w-4 h-4" />
                    <span className="font-medium">运输方</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-app-text-muted">车辆牌号</div>
                    <div className="text-app-text">{selectedWaybill.vehiclePlateNo}</div>
                    <div className="text-app-text-muted">驾驶员</div>
                    <div className="text-app-text">{selectedWaybill.driverName}</div>
                    <div className="text-app-text-muted">总重量</div>
                    <div className="text-app-text">{formatWeight(selectedWaybill.order.totalWeight)}</div>
                  </div>
                </CardBody>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary-500" />
                    废物明细
                  </div>
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-app-border bg-app-bg-lighter">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-app-text-secondary">序号</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-app-text-secondary">废物类别</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-app-text-secondary">重量(kg)</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-app-text-secondary">包装类型</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-app-text-secondary">条码/追溯码</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedWaybill.wasteRecords.map((record, index) => (
                        <tr key={record.id} className="border-b border-app-border/50">
                          <td className="px-4 py-3 text-sm text-app-text">{index + 1}</td>
                          <td className="px-4 py-3 text-sm text-app-text">
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: categories.find((c) => c.id === record.categoryId)?.color || '#64748B' }}
                              />
                              {getCategoryName(record.categoryId)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-app-text text-right">{record.weight.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-app-text">-</td>
                          <td className="px-4 py-3 text-sm text-app-text font-mono text-xs">{record.traceCode}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-app-bg-lighter">
                        <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-app-text">合计</td>
                        <td className="px-4 py-3 text-sm font-semibold text-app-text text-right">
                          {selectedWaybill.wasteRecords.reduce((sum, r) => sum + r.weight, 0).toFixed(2)}
                        </td>
                        <td colSpan={2} className="px-4 py-3 text-sm text-app-text-muted">
                          共 {selectedWaybill.wasteRecords.length} 袋
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary-500" />
                    交接记录
                  </div>
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="relative">
                  {getTimelineEvents(selectedWaybill.order).map((event, index, events) => (
                    <div key={index} className="flex gap-4">
                      <div className="relative flex flex-col items-center">
                        <div
                          className={`w-4 h-4 rounded-full border-2 ${
                            event.status === 'done'
                              ? 'bg-success-500 border-success-500'
                              : event.status === 'current'
                              ? 'bg-primary-500 border-primary-500'
                              : 'bg-app-bg border-app-border'
                          }`}
                        />
                        {index < events.length - 1 && (
                          <div className="w-0.5 h-full min-h-[60px] bg-app-border" />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-app-text">{event.title}</span>
                          <span className="text-xs text-app-text-muted">{event.time}</span>
                        </div>
                        <p className="text-sm text-app-text-secondary mt-1">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Signature className="w-5 h-5 text-primary-500" />
                    电子签名
                  </div>
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 border border-app-border rounded-lg">
                    <div className="text-sm text-app-text-muted mb-2">移交人签名</div>
                    <div className="h-16 flex items-center justify-center border border-dashed border-app-border rounded">
                      {selectedWaybill.order.applyBy ? (
                        <div className="text-center">
                          <User className="w-6 h-6 mx-auto text-app-text-muted mb-1" />
                          <span className="text-sm text-app-text">{selectedWaybill.order.applyBy}</span>
                        </div>
                      ) : (
                        <span className="text-app-text-muted">未签名</span>
                      )}
                    </div>
                    <div className="text-xs text-app-text-muted mt-2">
                      {selectedWaybill.order.applyTime ? formatDate(selectedWaybill.order.applyTime) : '-'}
                    </div>
                  </div>
                  <div className="text-center p-4 border border-app-border rounded-lg">
                    <div className="text-sm text-app-text-muted mb-2">承运人签名</div>
                    <div className="h-16 flex items-center justify-center border border-dashed border-app-border rounded">
                      {selectedWaybill.driverName ? (
                        <div className="text-center">
                          <User className="w-6 h-6 mx-auto text-app-text-muted mb-1" />
                          <span className="text-sm text-app-text">{selectedWaybill.driverName}</span>
                        </div>
                      ) : (
                        <span className="text-app-text-muted">未签名</span>
                      )}
                    </div>
                    <div className="text-xs text-app-text-muted mt-2">
                      {selectedWaybill.order.departureTime ? formatDate(selectedWaybill.order.departureTime) : '-'}
                    </div>
                  </div>
                  <div className="text-center p-4 border border-app-border rounded-lg">
                    <div className="text-sm text-app-text-muted mb-2">接收人签名</div>
                    <div className="h-16 flex items-center justify-center border border-dashed border-app-border rounded">
                      {selectedWaybill.order.arrivalTime ? (
                        <div className="text-center">
                          <User className="w-6 h-6 mx-auto text-app-text-muted mb-1" />
                          <span className="text-sm text-app-text">已签收</span>
                        </div>
                      ) : (
                        <span className="text-app-text-muted">未签名</span>
                      )}
                    </div>
                    <div className="text-xs text-app-text-muted mt-2">
                      {selectedWaybill.order.arrivalTime ? formatDate(selectedWaybill.order.arrivalTime) : '-'}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12 text-app-text-muted">
            暂无数据
          </div>
        )}
      </Modal>
    </div>
  )
}
