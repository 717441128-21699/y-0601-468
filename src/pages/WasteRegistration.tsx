import React, { useState, useEffect, useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardFooter
} from '@/components/ui/Card'
import { Input, TextArea, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Table } from '@/components/ui/Table'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { useWasteStore } from '@/store/useWasteStore'
import { generateBarcodeSVG, QRCodeSVG, printBarcode } from '@/services/barcodeService'
import {
  WasteCategoryLabel,
  type WasteCategoryType,
  type WasteRegistrationForm,
  type WasteRecord,
  type Barcode as BarcodeType
} from '@/types'
import { formatDateTime, formatWeight } from '@/utils/format'
import { Printer, RotateCcw, CheckCircle, FileText, Barcode as BarcodeIcon } from 'lucide-react'

interface FormData {
  institutionId: string
  categoryId: string
  weight: string
  storageRoomId: string
  department: string
  operator: string
  remarks: string
}

interface FormErrors {
  institutionId?: string
  categoryId?: string
  weight?: string
  storageRoomId?: string
  department?: string
  operator?: string
}

export const WasteRegistration: React.FC = () => {
  const {
    institutions,
    categories,
    wasteRecords,
    loading,
    loadAllData,
    registerWaste,
    getPackageByCategory
  } = useWasteStore()

  const [activeTab, setActiveTab] = useState('register')
  const [formData, setFormData] = useState<FormData>({
    institutionId: '',
    categoryId: '',
    weight: '',
    storageRoomId: '',
    department: '',
    operator: '',
    remarks: ''
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [previewTraceCode, setPreviewTraceCode] = useState('')
  const [previewBarcodeDataUrl, setPreviewBarcodeDataUrl] = useState('')
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [registeredRecord, setRegisteredRecord] = useState<WasteRecord | null>(null)
  const [registeredBarcode, setRegisteredBarcode] = useState<BarcodeType | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  const selectedInstitution = useMemo(
    () => institutions.find((i) => i.id === formData.institutionId),
    [institutions, formData.institutionId]
  )

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === formData.categoryId),
    [categories, formData.categoryId]
  )

  const selectedPackage = useMemo(
    () => getPackageByCategory(formData.categoryId),
    [getPackageByCategory, formData.categoryId]
  )

  const storageRoomOptions = useMemo(() => {
    if (!selectedInstitution?.storageRooms) return [{ value: '', label: '请先选择医疗机构' }]
    return [
      { value: '', label: '请选择贮存间' },
      ...selectedInstitution.storageRooms.map((room) => ({
        value: room.id,
        label: room.name
      }))
    ]
  }, [selectedInstitution])

  useEffect(() => {
    if (selectedInstitution && selectedCategory) {
      const institutionCode = selectedInstitution.code
      const categoryCode = selectedCategory.code
      const sequence = wasteRecords.filter(
        (r) => r.institutionId === formData.institutionId
      ).length + 1
      const traceCode = `${institutionCode}-${categoryCode}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(sequence).padStart(10, '0')}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`
      setPreviewTraceCode(traceCode)
      setPreviewBarcodeDataUrl(generateBarcodeSVG(traceCode.slice(-12)))
    } else {
      setPreviewTraceCode('')
      setPreviewBarcodeDataUrl('')
    }
  }, [selectedInstitution, selectedCategory, wasteRecords, formData.institutionId])

  const validateForm = (): boolean => {
    const errors: FormErrors = {}

    if (!formData.institutionId) {
      errors.institutionId = '请选择医疗机构'
    }
    if (!formData.categoryId) {
      errors.categoryId = '请选择废物类别'
    }
    if (!formData.weight) {
      errors.weight = '请输入重量'
    } else if (parseFloat(formData.weight) <= 0) {
      errors.weight = '重量必须大于0'
    }
    if (!formData.storageRoomId) {
      errors.storageRoomId = '请选择贮存间'
    }
    if (!formData.department.trim()) {
      errors.department = '请输入产生科室'
    }
    if (!formData.operator.trim()) {
      errors.operator = '请输入产生人员'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const form: WasteRegistrationForm = {
        institutionId: formData.institutionId,
        categoryId: formData.categoryId,
        weight: parseFloat(formData.weight),
        storageRoomId: formData.storageRoomId,
        generatedAt: new Date().toISOString(),
        department: formData.department,
        operator: formData.operator,
        remarks: formData.remarks || undefined
      }

      const { record, barcode } = await registerWaste(form)
      setRegisteredRecord(record)
      setRegisteredBarcode(barcode)
      setSuccessModalOpen(true)
    } catch (error) {
      console.error('登记失败:', error)
      alert('登记失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setFormData({
      institutionId: '',
      categoryId: '',
      weight: '',
      storageRoomId: '',
      department: '',
      operator: '',
      remarks: ''
    })
    setFormErrors({})
  }

  const handlePrint = () => {
    if (registeredBarcode && registeredRecord) {
      printBarcode(registeredBarcode.code, registeredRecord.traceCode)
    }
  }

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize
    return wasteRecords.slice(start, start + pageSize)
  }, [wasteRecords, page])

  const getCategoryBadge = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    if (!category) return null
    return (
      <Badge
        className="border-0"
        style={{
          backgroundColor: `${category.color}20`,
          color: category.color,
          borderColor: `${category.color}40`
        }}
      >
        {category.name}
      </Badge>
    )
  }

  const columns = [
    {
      key: 'traceCode',
      title: '追溯码',
      width: 200,
      render: (row: WasteRecord) => (
        <span className="font-mono text-xs text-app-text-secondary">{row.traceCode}</span>
      )
    },
    {
      key: 'institutionId',
      title: '医疗机构',
      width: 180,
      render: (row: WasteRecord) => {
        const inst = institutions.find((i) => i.id === row.institutionId)
        return inst?.name || '-'
      }
    },
    {
      key: 'categoryId',
      title: '废物类别',
      width: 120,
      render: (row: WasteRecord) => getCategoryBadge(row.categoryId)
    },
    {
      key: 'weight',
      title: '重量',
      width: 100,
      render: (row: WasteRecord) => formatWeight(row.weight)
    },
    {
      key: 'department',
      title: '产生科室',
      width: 120,
      render: (row: WasteRecord) => {
        const record = wasteRecords.find((r) => r.id === row.id)
        return '-'
      }
    },
    {
      key: 'registeredBy',
      title: '登记人员',
      width: 100
    },
    {
      key: 'status',
      title: '状态',
      width: 100,
      render: (row: WasteRecord) => {
        const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'default' | 'primary' }> = {
          REGISTERED: { label: '已登记', variant: 'info' },
          IN_STORAGE: { label: '入库中', variant: 'warning' },
          IN_TRANSIT: { label: '转运中', variant: 'primary' },
          DISPOSED: { label: '已处置', variant: 'success' }
        }
        const status = statusMap[row.status] || { label: row.status, variant: 'default' as const }
        return <Badge variant={status.variant}>{status.label}</Badge>
      }
    },
    {
      key: 'createdAt',
      title: '登记时间',
      width: 160,
      render: (row: WasteRecord) => formatDateTime(row.createdAt)
    }
  ]

  const institutionOptions = [
    { value: '', label: '请选择医疗机构' },
    ...institutions.map((inst) => ({
      value: inst.id,
      label: inst.name
    }))
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-text">废物登记</h1>
          <p className="text-app-text-secondary mt-1">登记医疗废物信息并生成追溯条码</p>
        </div>
      </div>

      <Tabs
        tabs={[
          { key: 'register', label: '废物登记' },
          { key: 'history', label: '历史记录' }
        ]}
        defaultTab="register"
        onChange={setActiveTab}
      >
        <TabPanel tabKey="register">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-500" />
                    废物登记表单
                  </div>
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="医疗机构"
                    value={formData.institutionId}
                    onChange={(e) => {
                      handleInputChange('institutionId', e.target.value)
                      handleInputChange('storageRoomId', '')
                    }}
                    options={institutionOptions}
                    error={formErrors.institutionId}
                  />

                  <div>
                    <label className="block text-sm font-medium text-app-text-secondary mb-1.5">
                      废物类别
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleInputChange('categoryId', cat.id)}
                          className={`p-2 rounded-lg border-2 transition-all text-center ${
                            formData.categoryId === cat.id
                              ? 'border-current shadow-md'
                              : 'border-app-border hover:border-app-text-muted'
                          }`}
                          style={{
                            borderColor: formData.categoryId === cat.id ? cat.color : undefined,
                            backgroundColor: formData.categoryId === cat.id ? `${cat.color}10` : undefined
                          }}
                        >
                          <div
                            className="w-6 h-6 rounded-full mx-auto mb-1"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-xs font-medium" style={{ color: cat.color }}>
                            {WasteCategoryLabel[cat.type as WasteCategoryType]}
                          </span>
                        </button>
                      ))}
                    </div>
                    {formErrors.categoryId && (
                      <p className="mt-1 text-sm text-danger-500">{formErrors.categoryId}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-app-text-secondary mb-1.5">
                      包装规格
                    </label>
                    <div className="flex items-center gap-3 p-3 bg-app-bg rounded-lg border border-app-border">
                      {selectedPackage ? (
                        <>
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: selectedPackage.color }}
                          >
                            {selectedPackage.type.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium text-app-text">
                              {selectedPackage.name} - {selectedPackage.capacity}
                            </div>
                            <div className="text-xs text-app-text-muted">
                              容量: {selectedPackage.capacityValue} {selectedPackage.unit}
                            </div>
                          </div>
                        </>
                      ) : (
                        <span className="text-app-text-muted">请先选择废物类别</span>
                      )}
                    </div>
                  </div>

                  <Input
                    label="重量 (kg)"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="请输入重量"
                    value={formData.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                    error={formErrors.weight}
                  />

                  <Select
                    label="贮存间"
                    value={formData.storageRoomId}
                    onChange={(e) => handleInputChange('storageRoomId', e.target.value)}
                    options={storageRoomOptions}
                    error={formErrors.storageRoomId}
                  />

                  <Input
                    label="产生科室"
                    placeholder="请输入产生科室"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    error={formErrors.department}
                  />

                  <Input
                    label="产生人员"
                    placeholder="请输入产生人员姓名"
                    value={formData.operator}
                    onChange={(e) => handleInputChange('operator', e.target.value)}
                    error={formErrors.operator}
                  />

                  <TextArea
                    label="备注"
                    placeholder="请输入备注信息（选填）"
                    value={formData.remarks}
                    onChange={(e) => handleInputChange('remarks', e.target.value)}
                    className="md:col-span-2"
                  />
                </div>
              </CardBody>
              <CardFooter className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={handleReset}
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                >
                  重置表单
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  loading={isSubmitting}
                  leftIcon={<Printer className="w-4 h-4" />}
                >
                  登记并打印条码
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <BarcodeIcon className="w-5 h-5 text-primary-500" />
                    实时预览
                  </div>
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="text-center">
                  <label className="block text-sm font-medium text-app-text-secondary mb-2">
                    追溯码
                  </label>
                  <div className="p-3 bg-app-bg rounded-lg border border-app-border font-mono text-sm text-app-text break-all">
                    {previewTraceCode || '填写表单后自动生成'}
                  </div>
                </div>

                <div className="text-center">
                  <label className="block text-sm font-medium text-app-text-secondary mb-2">
                    条码预览
                  </label>
                  <div className="p-4 bg-white rounded-lg border border-app-border flex items-center justify-center min-h-[120px]">
                    {previewBarcodeDataUrl ? (
                      <img
                        src={previewBarcodeDataUrl}
                        alt="条码预览"
                        className="max-w-full"
                      />
                    ) : (
                      <span className="text-app-text-muted">条码预览区</span>
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <label className="block text-sm font-medium text-app-text-secondary mb-2">
                    二维码预览
                  </label>
                  <div className="p-4 bg-white rounded-lg border border-app-border flex items-center justify-center min-h-[150px]">
                    {previewTraceCode ? (
                      <QRCodeSVG
                        value={previewTraceCode}
                        size={120}
                        level="M"
                        includeMargin
                      />
                    ) : (
                      <span className="text-app-text-muted">二维码预览区</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-app-text-secondary mb-2">
                    包装规格信息
                  </label>
                  {selectedPackage && selectedCategory ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-app-bg rounded">
                        <span className="text-app-text-secondary text-sm">包装类型</span>
                        <Badge
                          className="border-0"
                          style={{
                            backgroundColor: `${selectedCategory.color}20`,
                            color: selectedCategory.color
                          }}
                        >
                          {selectedPackage.name}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-app-bg rounded">
                        <span className="text-app-text-secondary text-sm">容量规格</span>
                        <span className="text-app-text font-medium">
                          {selectedPackage.capacity}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-app-bg rounded">
                        <span className="text-app-text-secondary text-sm">废物类别</span>
                        <Badge
                          className="border-0"
                          style={{
                            backgroundColor: `${selectedCategory.color}20`,
                            color: selectedCategory.color
                          }}
                        >
                          {selectedCategory.name}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-app-bg rounded-lg border border-dashed border-app-border text-center text-app-text-muted">
                      请选择废物类别查看包装信息
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        </TabPanel>

        <TabPanel tabKey="history">
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-500" />
                  历史登记记录
                </div>
              </CardTitle>
            </CardHeader>
            <CardBody>
              <Table
                columns={columns}
                data={paginatedRecords}
                loading={loading}
                rowKey={(row) => row.id}
                pagination={{
                  page,
                  pageSize,
                  total: wasteRecords.length,
                  onPageChange: setPage
                }}
              />
            </CardBody>
          </Card>
        </TabPanel>
      </Tabs>

      <Modal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        title="登记成功"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setSuccessModalOpen(false)}
            >
              关闭
            </Button>
            <Button
              variant="primary"
              onClick={handlePrint}
              leftIcon={<Printer className="w-4 h-4" />}
            >
              打印条码
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-success-500/10 rounded-lg border border-success-500/30">
            <CheckCircle className="w-8 h-8 text-success-500" />
            <div>
              <h3 className="font-semibold text-success-500">登记成功</h3>
              <p className="text-sm text-app-text-secondary">
                废物信息已成功登记，以下是追溯码和条码信息
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-app-text-secondary mb-2">
                追溯码
              </label>
              <div className="p-3 bg-app-bg rounded-lg border border-app-border font-mono text-sm text-app-text break-all">
                {registeredRecord?.traceCode}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <label className="block text-sm font-medium text-app-text-secondary mb-2">
                  条码
                </label>
                <div className="p-4 bg-white rounded-lg border border-app-border">
                  {registeredBarcode && (
                    <img
                      src={generateBarcodeSVG(registeredBarcode.code, { width: 2, height: 60, fontSize: 12 })}
                      alt="条码"
                      className="max-w-full mx-auto"
                    />
                  )}
                </div>
              </div>

              <div className="text-center">
                <label className="block text-sm font-medium text-app-text-secondary mb-2">
                  二维码
                </label>
                <div className="p-4 bg-white rounded-lg border border-app-border flex items-center justify-center">
                  {registeredRecord && (
                    <QRCodeSVG
                      value={registeredRecord.traceCode}
                      size={80}
                      level="M"
                      includeMargin
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-app-bg rounded-lg">
                <div className="text-xs text-app-text-muted mb-1">医疗机构</div>
                <div className="text-sm font-medium text-app-text">
                  {institutions.find((i) => i.id === registeredRecord?.institutionId)?.name}
                </div>
              </div>
              <div className="p-3 bg-app-bg rounded-lg">
                <div className="text-xs text-app-text-muted mb-1">废物类别</div>
                <div className="text-sm font-medium">
                  {getCategoryBadge(registeredRecord?.categoryId || '')}
                </div>
              </div>
              <div className="p-3 bg-app-bg rounded-lg">
                <div className="text-xs text-app-text-muted mb-1">重量</div>
                <div className="text-sm font-medium text-app-text">
                  {registeredRecord && formatWeight(registeredRecord.weight)}
                </div>
              </div>
              <div className="p-3 bg-app-bg rounded-lg">
                <div className="text-xs text-app-text-muted mb-1">登记时间</div>
                <div className="text-sm font-medium text-app-text">
                  {registeredRecord && formatDateTime(registeredRecord.createdAt)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
