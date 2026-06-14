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
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Table } from '@/components/ui/Table'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { Switch } from '@/components/ui/Switch'
import { useUserStore } from '@/store/useUserStore'
import { useWasteStore } from '@/store/useWasteStore'
import { useTransportStore } from '@/store/useTransportStore'
import { useMonitorStore } from '@/store/useMonitorStore'
import {
  User,
  UserRoleLabel,
  UserRoleType,
  MedicalInstitution,
  DisposalFactory,
  StorageRoom,
  Vehicle,
  Driver,
  VehicleStatusLabel,
  type UserRoleType as UserRoleTypeEnum
} from '@/types'
import { formatDateTime } from '@/utils/format'
import {
  Settings as SettingsIcon,
  Users,
  Building2,
  Truck,
  AlertTriangle,
  Database,
  Plus,
  Edit2,
  Trash2,
  Key,
  Power,
  Upload,
  Palette,
  Save,
  Download,
  FileText
} from 'lucide-react'

interface UserFormData {
  username: string
  password: string
  name: string
  email: string
  phone: string
  role: string
  institutionId: string
  status: string
}

interface InstitutionFormData {
  name: string
  code: string
  address: string
  contactPerson: string
  contactPhone: string
  level: string
  lat: string
  lng: string
  dailyCapacity?: string
  type: 'institution' | 'factory'
}

interface VehicleFormData {
  plateNo: string
  model: string
  capacity: string
  gpsDeviceId: string
  status: string
}

interface ThresholdFormData {
  warningMax: string
  criticalMax: string
  warningMin?: string
  criticalMin?: string
}

interface FormErrors {
  [key: string]: string | undefined
}

const presetColors = [
  '#0066CC',
  '#E53935',
  '#43A047',
  '#FB8C00',
  '#7B1FA2',
  '#00897B',
  '#3949AB',
  '#D81B60'
]

export const Settings: React.FC = () => {
  const { users, currentUser, loading: userLoading, loadUsers, addUser, updateUser, deleteUser } = useUserStore()
  const {
    institutions,
    factories,
    storageRooms,
    loading: wasteLoading,
    loadInstitutions,
    loadFactories,
    loadStorageRooms
  } = useWasteStore()
  const {
    vehicles,
    drivers,
    loading: transportLoading,
    loadVehicles,
    loadDrivers,
    updateVehicleStatus
  } = useTransportStore()
  const { thresholds, loading: monitorLoading, loadThresholds } = useMonitorStore()

  const [activeTab, setActiveTab] = useState('basic')
  const [systemName, setSystemName] = useState('医疗废物智慧管理系统')
  const [themeColor, setThemeColor] = useState('#0066CC')
  const [customColor, setCustomColor] = useState('#0066CC')
  const [language, setLanguage] = useState('zh')
  const [autoLogin, setAutoLogin] = useState(false)
  const [dataRetentionDays, setDataRetentionDays] = useState('180')

  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userFormData, setUserFormData] = useState<UserFormData>({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    role: '',
    institutionId: '',
    status: 'ACTIVE'
  })
  const [userFormErrors, setUserFormErrors] = useState<FormErrors>({})
  const [userModalLoading, setUserModalLoading] = useState(false)
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false)
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [userPage, setUserPage] = useState(1)

  const [institutionTab, setInstitutionTab] = useState('institutions')
  const [institutionModalOpen, setInstitutionModalOpen] = useState(false)
  const [editingInstitution, setEditingInstitution] = useState<MedicalInstitution | DisposalFactory | null>(null)
  const [institutionFormData, setInstitutionFormData] = useState<InstitutionFormData>({
    name: '',
    code: '',
    address: '',
    contactPerson: '',
    contactPhone: '',
    level: '',
    lat: '',
    lng: '',
    type: 'institution'
  })
  const [institutionFormErrors, setInstitutionFormErrors] = useState<FormErrors>({})
  const [institutionModalLoading, setInstitutionModalLoading] = useState(false)
  const [expandedInstitutionId, setExpandedInstitutionId] = useState<string | null>(null)

  const [vehicleTab, setVehicleTab] = useState('vehicles')
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [vehicleFormData, setVehicleFormData] = useState<VehicleFormData>({
    plateNo: '',
    model: '',
    capacity: '',
    gpsDeviceId: '',
    status: 'IDLE'
  })
  const [vehicleFormErrors, setVehicleFormErrors] = useState<FormErrors>({})
  const [vehicleModalLoading, setVehicleModalLoading] = useState(false)
  const [vehiclePage, setVehiclePage] = useState(1)

  const [thresholdFormData, setThresholdFormData] = useState<Record<string, ThresholdFormData>>({})
  const [doorAlarmEnabled, setDoorAlarmEnabled] = useState(true)
  const [lowBatteryThreshold, setLowBatteryThreshold] = useState('20')
  const [notificationMethods, setNotificationMethods] = useState({
    system: true,
    email: false,
    sms: false
  })

  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false)
  const [backupFrequency, setBackupFrequency] = useState('daily')
  const [backupTime, setBackupTime] = useState('02:00')
  const [cleanupStartDate, setCleanupStartDate] = useState('')
  const [cleanupEndDate, setCleanupEndDate] = useState('')
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    loading?: boolean
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  const pageSize = 10

  useEffect(() => {
    loadUsers()
    loadInstitutions()
    loadFactories()
    loadStorageRooms()
    loadVehicles()
    loadDrivers()
    loadThresholds()
  }, [loadUsers, loadInstitutions, loadFactories, loadStorageRooms, loadVehicles, loadDrivers, loadThresholds])

  useEffect(() => {
    const initialThresholds: Record<string, ThresholdFormData> = {}
    thresholds.forEach(t => {
      initialThresholds[t.code] = {
        warningMax: t.warningMax?.toString() || '',
        criticalMax: t.criticalMax?.toString() || '',
        warningMin: t.warningMin?.toString() || '',
        criticalMin: t.criticalMin?.toString() || ''
      }
    })
    setThresholdFormData(initialThresholds)
  }, [thresholds])

  const filteredUsers = useMemo(() => {
    if (!roleFilter) return users
    return users.filter(u => u.role === roleFilter)
  }, [users, roleFilter])

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * pageSize
    return filteredUsers.slice(start, start + pageSize)
  }, [filteredUsers, userPage])

  const paginatedVehicles = useMemo(() => {
    const start = (vehiclePage - 1) * pageSize
    return vehicles.slice(start, start + pageSize)
  }, [vehicles, vehiclePage])

  const roleOptions = [
    { value: '', label: '全部角色' },
    ...Object.entries(UserRoleLabel).map(([value, label]) => ({ value, label }))
  ]

  const statusOptions = [
    { value: 'ACTIVE', label: '启用' },
    { value: 'INACTIVE', label: '禁用' }
  ]

  const institutionOptions = [
    { value: '', label: '请选择机构' },
    ...institutions.map(i => ({ value: i.id, label: i.name }))
  ]

  const validateUserForm = (): boolean => {
    const errors: FormErrors = {}
    if (!userFormData.username.trim()) errors.username = '请输入用户名'
    if (!editingUser && !userFormData.password.trim()) errors.password = '请输入密码'
    if (userFormData.password && userFormData.password.length < 6) errors.password = '密码至少6位'
    if (!userFormData.name.trim()) errors.name = '请输入姓名'
    if (!userFormData.email.trim()) errors.email = '请输入邮箱'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userFormData.email)) errors.email = '邮箱格式不正确'
    if (!userFormData.phone.trim()) errors.phone = '请输入手机号'
    else if (!/^1[3-9]\d{9}$/.test(userFormData.phone)) errors.phone = '手机号格式不正确'
    if (!userFormData.role) errors.role = '请选择角色'
    if (!userFormData.status) errors.status = '请选择状态'
    setUserFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateInstitutionForm = (): boolean => {
    const errors: FormErrors = {}
    if (!institutionFormData.name.trim()) errors.name = '请输入名称'
    if (!institutionFormData.code.trim()) errors.code = '请输入编码'
    if (!institutionFormData.address.trim()) errors.address = '请输入地址'
    if (!institutionFormData.contactPerson.trim()) errors.contactPerson = '请输入联系人'
    if (!institutionFormData.contactPhone.trim()) errors.contactPhone = '请输入联系电话'
    setInstitutionFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateVehicleForm = (): boolean => {
    const errors: FormErrors = {}
    if (!vehicleFormData.plateNo.trim()) errors.plateNo = '请输入车牌号'
    if (!vehicleFormData.model.trim()) errors.model = '请输入车型'
    if (!vehicleFormData.capacity.trim()) errors.capacity = '请输入载重'
    if (!vehicleFormData.gpsDeviceId.trim()) errors.gpsDeviceId = '请输入GPS设备ID'
    setVehicleFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleUserInputChange = (field: keyof UserFormData, value: string) => {
    setUserFormData(prev => ({ ...prev, [field]: value }))
    if (userFormErrors[field]) {
      setUserFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleInstitutionInputChange = (field: keyof InstitutionFormData, value: string) => {
    setInstitutionFormData(prev => ({ ...prev, [field]: value }))
    if (institutionFormErrors[field]) {
      setInstitutionFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleVehicleInputChange = (field: keyof VehicleFormData, value: string) => {
    setVehicleFormData(prev => ({ ...prev, [field]: value }))
    if (vehicleFormErrors[field]) {
      setVehicleFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const openAddUserModal = () => {
    setEditingUser(null)
    setUserFormData({
      username: '',
      password: '',
      name: '',
      email: '',
      phone: '',
      role: '',
      institutionId: '',
      status: 'ACTIVE'
    })
    setUserFormErrors({})
    setUserModalOpen(true)
  }

  const openEditUserModal = (user: User) => {
    setEditingUser(user)
    setUserFormData({
      username: user.username,
      password: '',
      name: user.name,
      email: user.email || '',
      phone: user.phone,
      role: user.role,
      institutionId: user.institutionId || '',
      status: user.status
    })
    setUserFormErrors({})
    setUserModalOpen(true)
  }

  const handleSaveUser = async () => {
    if (!validateUserForm()) return
    setUserModalLoading(true)
    try {
      if (editingUser) {
        const updateData: Partial<User> = {
          username: userFormData.username,
          name: userFormData.name,
          email: userFormData.email,
          phone: userFormData.phone,
          role: userFormData.role as UserRoleTypeEnum,
          institutionId: userFormData.institutionId || undefined,
          status: userFormData.status as 'ACTIVE' | 'INACTIVE'
        }
        if (userFormData.password) {
          updateData.password = userFormData.password
        }
        await updateUser(editingUser.id, updateData)
      } else {
        await addUser({
          username: userFormData.username,
          password: userFormData.password,
          name: userFormData.name,
          email: userFormData.email,
          phone: userFormData.phone,
          role: userFormData.role as UserRoleTypeEnum,
          institutionId: userFormData.institutionId || undefined,
          status: userFormData.status as 'ACTIVE' | 'INACTIVE'
        })
      }
      setUserModalOpen(false)
    } catch (error) {
      console.error('保存用户失败:', error)
      alert('保存失败，请重试')
    } finally {
      setUserModalLoading(false)
    }
  }

  const handleDeleteUser = (user: User) => {
    setConfirmModal({
      isOpen: true,
      title: '确认删除',
      message: `确定要删除用户 "${user.name}" 吗？此操作不可恢复。`,
      onConfirm: async () => {
        try {
          await deleteUser(user.id)
          setConfirmModal(prev => ({ ...prev, isOpen: false }))
        } catch (error) {
          console.error('删除用户失败:', error)
          alert('删除失败，请重试')
        }
      }
    })
  }

  const handleResetPassword = (user: User) => {
    setResetPasswordUser(user)
    setNewPassword('')
    setConfirmPassword('')
    setResetPasswordModalOpen(true)
  }

  const handleToggleUserStatus = async (user: User) => {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    await updateUser(user.id, { status: newStatus })
  }

  const openAddInstitutionModal = (type: 'institution' | 'factory') => {
    setEditingInstitution(null)
    setInstitutionFormData({
      name: '',
      code: '',
      address: '',
      contactPerson: '',
      contactPhone: '',
      level: '',
      lat: '',
      lng: '',
      type
    })
    setInstitutionFormErrors({})
    setInstitutionModalOpen(true)
  }

  const openEditInstitutionModal = (inst: MedicalInstitution | DisposalFactory, type: 'institution' | 'factory') => {
    setEditingInstitution(inst)
    setInstitutionFormData({
      name: inst.name,
      code: inst.code,
      address: inst.address,
      contactPerson: inst.contactPerson,
      contactPhone: inst.contactPhone,
      level: 'level' in inst ? inst.level : '',
      lat: inst.lat.toString(),
      lng: inst.lng.toString(),
      dailyCapacity: 'dailyCapacity' in inst ? inst.dailyCapacity.toString() : undefined,
      type
    })
    setInstitutionFormErrors({})
    setInstitutionModalOpen(true)
  }

  const handleSaveInstitution = async () => {
    if (!validateInstitutionForm()) return
    setInstitutionModalLoading(true)
    try {
      if (editingInstitution) {
        alert('编辑功能需在 useWasteStore 中实现 updateInstitution 方法')
      } else {
        alert('新增功能需在 useWasteStore 中实现 addInstitution 方法')
      }
      setInstitutionModalOpen(false)
    } catch (error) {
      console.error('保存机构失败:', error)
      alert('保存失败，请重试')
    } finally {
      setInstitutionModalLoading(false)
    }
  }

  const openAddVehicleModal = () => {
    setEditingVehicle(null)
    setVehicleFormData({
      plateNo: '',
      model: '',
      capacity: '',
      gpsDeviceId: '',
      status: 'IDLE'
    })
    setVehicleFormErrors({})
    setVehicleModalOpen(true)
  }

  const openEditVehicleModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setVehicleFormData({
      plateNo: vehicle.plateNo,
      model: vehicle.model,
      capacity: vehicle.capacity.toString(),
      gpsDeviceId: vehicle.gpsDeviceId,
      status: vehicle.status
    })
    setVehicleFormErrors({})
    setVehicleModalOpen(true)
  }

  const handleSaveVehicle = async () => {
    if (!validateVehicleForm()) return
    setVehicleModalLoading(true)
    try {
      if (editingVehicle) {
        alert('编辑功能需在 useTransportStore 中实现 updateVehicle 方法')
      } else {
        alert('新增功能需在 useTransportStore 中实现 addVehicle 方法')
      }
      setVehicleModalOpen(false)
    } catch (error) {
      console.error('保存车辆失败:', error)
      alert('保存失败，请重试')
    } finally {
      setVehicleModalLoading(false)
    }
  }

  const handleBackup = () => {
    alert('数据备份功能需实现')
  }

  const handleRestore = () => {
    alert('数据恢复功能需实现')
  }

  const handleCleanup = () => {
    if (!cleanupStartDate || !cleanupEndDate) {
      alert('请选择时间范围')
      return
    }
    setConfirmModal({
      isOpen: true,
      title: '确认数据清理',
      message: `确定要清理 ${cleanupStartDate} 至 ${cleanupEndDate} 的历史数据吗？此操作不可恢复。`,
      onConfirm: () => {
        alert('数据清理功能需实现')
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const getThresholdByCode = (code: string) => thresholds.find(t => t.code === code)

  const userColumns = [
    { key: 'username', title: '用户名', width: 120 },
    { key: 'name', title: '姓名', width: 100 },
    {
      key: 'role',
      title: '角色',
      width: 140,
      render: (row: User) => (
        <Badge variant="primary">{UserRoleLabel[row.role as UserRoleType]}</Badge>
      )
    },
    {
      key: 'institutionId',
      title: '机构',
      width: 180,
      render: (row: User) => {
        const inst = institutions.find(i => i.id === row.institutionId)
        return inst?.name || '-'
      }
    },
    {
      key: 'status',
      title: '状态',
      width: 100,
      render: (row: User) => (
        <Badge variant={row.status === 'ACTIVE' ? 'success' : 'default'} dot>
          {row.status === 'ACTIVE' ? '启用' : '禁用'}
        </Badge>
      )
    },
    {
      key: 'actions',
      title: '操作',
      width: 240,
      align: 'center' as const,
      render: (row: User) => (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEditUserModal(row)} leftIcon={<Edit2 className="w-3.5 h-3.5" />}>
            编辑
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleResetPassword(row)} leftIcon={<Key className="w-3.5 h-3.5" />}>
            重置密码
          </Button>
          <Button
            variant={row.status === 'ACTIVE' ? 'warning' : 'success'}
            size="sm"
            onClick={() => handleToggleUserStatus(row)}
            leftIcon={<Power className="w-3.5 h-3.5" />}
          >
            {row.status === 'ACTIVE' ? '禁用' : '启用'}
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDeleteUser(row)} leftIcon={<Trash2 className="w-3.5 h-3.5" />}>
            删除
          </Button>
        </div>
      )
    }
  ]

  const institutionColumns = [
    { key: 'name', title: '机构名称', width: 200 },
    { key: 'address', title: '地址', width: 250 },
    { key: 'contactPerson', title: '联系人', width: 100 },
    { key: 'contactPhone', title: '联系电话', width: 130 },
    {
      key: 'storageRooms',
      title: '暂存点容量',
      width: 120,
      render: (row: MedicalInstitution) => {
        const total = row.storageRooms?.reduce((sum, r) => sum + r.capacity, 0) || 0
        return `${total} kg`
      }
    },
    {
      key: 'status',
      title: '状态',
      width: 100,
      render: () => <Badge variant="success" dot>正常</Badge>
    },
    {
      key: 'actions',
      title: '操作',
      width: 180,
      align: 'center' as const,
      render: (row: MedicalInstitution) => (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandedInstitutionId(expandedInstitutionId === row.id ? null : row.id)}
          >
            {expandedInstitutionId === row.id ? '收起贮存间' : '查看贮存间'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEditInstitutionModal(row, 'institution')} leftIcon={<Edit2 className="w-3.5 h-3.5" />}>
            编辑
          </Button>
        </div>
      )
    }
  ]

  const factoryColumns = [
    { key: 'name', title: '处置厂名称', width: 200 },
    { key: 'address', title: '地址', width: 250 },
    { key: 'contactPerson', title: '联系人', width: 100 },
    { key: 'contactPhone', title: '联系电话', width: 130 },
    {
      key: 'dailyCapacity',
      title: '日处理能力',
      width: 120,
      render: (row: DisposalFactory) => `${row.dailyCapacity} 吨`
    },
    {
      key: 'status',
      title: '状态',
      width: 100,
      render: () => <Badge variant="success" dot>正常</Badge>
    },
    {
      key: 'actions',
      title: '操作',
      width: 120,
      align: 'center' as const,
      render: (row: DisposalFactory) => (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEditInstitutionModal(row, 'factory')} leftIcon={<Edit2 className="w-3.5 h-3.5" />}>
            编辑
          </Button>
        </div>
      )
    }
  ]

  const storageRoomColumns = [
    { key: 'name', title: '贮存间名称', width: 150 },
    { key: 'capacity', title: '总容量 (kg)', width: 130 },
    { key: 'currentVolume', title: '当前存量 (kg)', width: 130 },
    { key: 'temperatureThreshold', title: '温度阈值 (°C)', width: 140 },
    { key: 'humidityThreshold', title: '湿度阈值 (%)', width: 140 }
  ]

  const vehicleColumns = [
    { key: 'plateNo', title: '车牌号', width: 120 },
    { key: 'model', title: '车型', width: 150 },
    { key: 'capacity', title: '载重 (吨)', width: 100 },
    {
      key: 'enterprise',
      title: '所属企业',
      width: 150,
      render: () => '医废运输有限公司'
    },
    {
      key: 'status',
      title: '状态',
      width: 100,
      render: (row: Vehicle) => (
        <Badge
          variant={row.status === 'IDLE' ? 'success' : row.status === 'IN_TRANSIT' ? 'primary' : row.status === 'MAINTENANCE' ? 'warning' : 'default'}
          dot
          pulse={row.status === 'IN_TRANSIT'}
        >
          {VehicleStatusLabel[row.status]}
        </Badge>
      )
    },
    {
      key: 'position',
      title: '当前位置',
      width: 180,
      render: (row: Vehicle) => `${row.currentLat.toFixed(4)}, ${row.currentLng.toFixed(4)}`
    },
    {
      key: 'actions',
      title: '操作',
      width: 180,
      align: 'center' as const,
      render: (row: Vehicle) => (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEditVehicleModal(row)} leftIcon={<Edit2 className="w-3.5 h-3.5" />}>
            编辑
          </Button>
          <Select
            value={row.status}
            onChange={(e) => updateVehicleStatus(row.id, e.target.value as any)}
            className="w-28"
            options={[
              { value: 'IDLE', label: '设为空闲' },
              { value: 'MAINTENANCE', label: '维护中' },
              { value: 'DISABLED', label: '停用' }
            ]}
          />
        </div>
      )
    }
  ]

  const driverColumns = [
    { key: 'name', title: '姓名', width: 100 },
    { key: 'phone', title: '联系电话', width: 130 },
    { key: 'licenseNo', title: '驾驶证号', width: 180 },
    { key: 'licenseType', title: '准驾车型', width: 100 },
    { key: 'licenseExpiryDate', title: '有效期至', width: 130 },
    {
      key: 'status',
      title: '状态',
      width: 100,
      render: (row: Driver) => (
        <Badge
          variant={row.status === 'ON_DUTY' ? 'success' : row.status === 'OFF_DUTY' ? 'default' : 'warning'}
          dot
          pulse={row.status === 'ON_DUTY'}
        >
          {row.status === 'ON_DUTY' ? '在岗' : row.status === 'OFF_DUTY' ? '离岗' : '休息'}
        </Badge>
      )
    }
  ]

  const operationLogColumns = [
    {
      key: 'user',
      title: '操作人',
      width: 120,
      render: () => currentUser?.name || '系统'
    },
    { key: 'action', title: '操作类型', width: 150, render: () => '数据查询' },
    { key: 'module', title: '操作模块', width: 150, render: () => '废物登记' },
    { key: 'detail', title: '操作详情', width: 300, render: () => '查询废物登记记录列表' },
    {
      key: 'time',
      title: '操作时间',
      width: 180,
      render: () => formatDateTime(new Date().toISOString())
    }
  ]

  const systemLogColumns = [
    { key: 'level', title: '日志级别', width: 100, render: () => <Badge variant="info">INFO</Badge> },
    { key: 'module', title: '模块', width: 150, render: () => '系统' },
    { key: 'message', title: '日志内容', width: 400, render: () => '系统启动成功' },
    {
      key: 'time',
      title: '时间',
      width: 180,
      render: () => formatDateTime(new Date().toISOString())
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-text">系统设置</h1>
          <p className="text-app-text-secondary mt-1">管理系统配置、用户、机构、车辆等信息</p>
        </div>
      </div>

      <Tabs
        tabs={[
          { key: 'basic', label: '基础设置' },
          { key: 'users', label: '用户管理' },
          { key: 'institutions', label: '机构管理' },
          { key: 'vehicles', label: '车辆管理' },
          { key: 'thresholds', label: '报警阈值设置' },
          { key: 'maintenance', label: '数据维护' }
        ]}
        defaultTab="basic"
        onChange={setActiveTab}
      >
        <TabPanel tabKey="basic">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <SettingsIcon className="w-5 h-5 text-primary-500" />
                    系统基础设置
                  </div>
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-6">
                <Input
                  label="系统名称"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  placeholder="请输入系统名称"
                />

                <div>
                  <label className="block text-sm font-medium text-app-text-secondary mb-1.5">
                    Logo 上传
                  </label>
                  <div className="border-2 border-dashed border-app-border rounded-lg p-8 text-center hover:border-primary-500 transition-colors cursor-pointer">
                    <Upload className="w-10 h-10 text-app-text-muted mx-auto mb-2" />
                    <p className="text-sm text-app-text-secondary">点击或拖拽上传 Logo 图片</p>
                    <p className="text-xs text-app-text-muted mt-1">支持 PNG、JPG 格式，建议尺寸 200x200px</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-app-text-secondary mb-3">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      主题色配置
                    </div>
                  </label>
                  <div className="flex flex-wrap gap-3 mb-4">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setThemeColor(color)}
                        className={`w-10 h-10 rounded-full border-4 transition-all hover:scale-110 ${
                          themeColor === color ? 'border-app-text shadow-lg scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <div className="relative">
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => {
                          setCustomColor(e.target.value)
                          setThemeColor(e.target.value)
                        }}
                        className="w-10 h-10 rounded-full cursor-pointer opacity-0 absolute inset-0"
                      />
                      <div
                        className={`w-10 h-10 rounded-full border-4 border-dashed flex items-center justify-center ${
                          themeColor === customColor && !presetColors.includes(themeColor)
                            ? 'border-app-text shadow-lg'
                            : 'border-app-text-muted'
                        }`}
                        style={{ backgroundColor: customColor }}
                      >
                        <span className="text-white text-xs font-bold">+</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded"
                      style={{ backgroundColor: themeColor }}
                    />
                    <span className="text-sm text-app-text font-mono">{themeColor}</span>
                  </div>
                </div>

                <Select
                  label="语言切换"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  options={[
                    { value: 'zh', label: '简体中文' },
                    { value: 'en', label: 'English' }
                  ]}
                />

                <div className="flex items-center justify-between p-4 bg-app-bg rounded-lg border border-app-border">
                  <div>
                    <div className="font-medium text-app-text">自动登录</div>
                    <div className="text-sm text-app-text-muted">下次打开应用时自动登录当前账户</div>
                  </div>
                  <Switch checked={autoLogin} onChange={setAutoLogin} />
                </div>

                <Input
                  label="数据保留天数"
                  type="number"
                  min="1"
                  max="3650"
                  value={dataRetentionDays}
                  onChange={(e) => setDataRetentionDays(e.target.value)}
                  placeholder="请输入数据保留天数"
                />
              </CardBody>
              <CardFooter className="flex justify-end">
                <Button variant="primary" leftIcon={<Save className="w-4 h-4" />}>
                  保存设置
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>设置预览</CardTitle>
              </CardHeader>
              <CardBody>
                <div
                  className="rounded-xl p-6 text-white min-h-[200px] flex flex-col items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}
                >
                  <div className="text-2xl font-bold mb-2">{systemName}</div>
                  <div className="text-white/80">
                    {language === 'zh' ? '系统设置预览' : 'Settings Preview'}
                  </div>
                  <div className="mt-4 text-white/60 text-sm">
                    数据保留: {dataRetentionDays} 天 | 自动登录: {autoLogin ? '开' : '关'}
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </TabPanel>

        <TabPanel tabKey="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary-500" />
                    用户管理
                  </div>
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Select
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value)
                      setUserPage(1)
                    }}
                    options={roleOptions}
                    className="w-40"
                  />
                  <Button variant="primary" onClick={openAddUserModal} leftIcon={<Plus className="w-4 h-4" />}>
                    新增用户
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <Table
                columns={userColumns}
                data={paginatedUsers}
                loading={userLoading}
                rowKey={(row) => row.id}
                pagination={{
                  page: userPage,
                  pageSize,
                  total: filteredUsers.length,
                  onPageChange: setUserPage
                }}
              />
            </CardBody>
          </Card>
        </TabPanel>

        <TabPanel tabKey="institutions">
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary-500" />
                  机构管理
                </div>
              </CardTitle>
            </CardHeader>
            <CardBody>
              <Tabs
                tabs={[
                  { key: 'institutions', label: '医疗机构' },
                  { key: 'factories', label: '处置厂' }
                ]}
                defaultTab="institutions"
                onChange={setInstitutionTab}
              >
                <TabPanel tabKey="institutions">
                  <div className="mb-4 flex justify-end">
                    <Button variant="primary" onClick={() => openAddInstitutionModal('institution')} leftIcon={<Plus className="w-4 h-4" />}>
                      新增医疗机构
                    </Button>
                  </div>
                  <Table
                    columns={institutionColumns}
                    data={institutions}
                    loading={wasteLoading}
                    rowKey={(row) => row.id}
                    onRowClick={(row) => {
                      if (row.storageRooms && row.storageRooms.length > 0) {
                        setExpandedInstitutionId(expandedInstitutionId === row.id ? null : row.id)
                      }
                    }}
                  />
                  {expandedInstitutionId && (
                    <div className="mt-4 ml-8 border-l-4 border-primary-500 pl-4">
                      <h4 className="font-medium text-app-text mb-3">贮存间列表</h4>
                      <Table
                        columns={storageRoomColumns}
                        data={storageRooms.filter(s => s.institutionId === expandedInstitutionId)}
                        rowKey={(row) => row.id}
                      />
                    </div>
                  )}
                </TabPanel>

                <TabPanel tabKey="factories">
                  <div className="mb-4 flex justify-end">
                    <Button variant="primary" onClick={() => openAddInstitutionModal('factory')} leftIcon={<Plus className="w-4 h-4" />}>
                      新增处置厂
                    </Button>
                  </div>
                  <Table
                    columns={factoryColumns}
                    data={factories}
                    loading={wasteLoading}
                    rowKey={(row) => row.id}
                  />
                </TabPanel>
              </Tabs>
            </CardBody>
          </Card>
        </TabPanel>

        <TabPanel tabKey="vehicles">
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary-500" />
                  车辆管理
                </div>
              </CardTitle>
            </CardHeader>
            <CardBody>
              <Tabs
                tabs={[
                  { key: 'vehicles', label: '车辆列表' },
                  { key: 'drivers', label: '驾驶员列表' }
                ]}
                defaultTab="vehicles"
                onChange={setVehicleTab}
              >
                <TabPanel tabKey="vehicles">
                  <div className="mb-4 flex justify-end">
                    <Button variant="primary" onClick={openAddVehicleModal} leftIcon={<Plus className="w-4 h-4" />}>
                      新增车辆
                    </Button>
                  </div>
                  <Table
                    columns={vehicleColumns}
                    data={paginatedVehicles}
                    loading={transportLoading}
                    rowKey={(row) => row.id}
                    pagination={{
                      page: vehiclePage,
                      pageSize,
                      total: vehicles.length,
                      onPageChange: setVehiclePage
                    }}
                  />
                </TabPanel>

                <TabPanel tabKey="drivers">
                  <Table
                    columns={driverColumns}
                    data={drivers}
                    loading={transportLoading}
                    rowKey={(row) => row.id}
                  />
                </TabPanel>
              </Tabs>
            </CardBody>
          </Card>
        </TabPanel>

        <TabPanel tabKey="thresholds">
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-primary-500" />
                  报警阈值设置
                </div>
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { code: 'TRANSPORT_TEMP', label: '运输温度阈值 (°C)' },
                  { code: 'STORAGE_TEMP', label: '贮存温度阈值 (°C)' },
                  { code: 'TRANSPORT_HUMIDITY', label: '运输湿度阈值 (%)' },
                  { code: 'STORAGE_HUMIDITY', label: '贮存湿度阈值 (%)' }
                ].map((item) => {
                  const threshold = getThresholdByCode(item.code)
                  const formData: ThresholdFormData = thresholdFormData[item.code] || { warningMax: '', criticalMax: '' }
                  return (
                    <Card key={item.code} className="border border-app-border">
                      <CardHeader>
                        <CardTitle className="text-base">{item.label}</CardTitle>
                      </CardHeader>
                      <CardBody className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            label="警告阈值"
                            type="number"
                            value={formData.warningMax || ''}
                            onChange={(e) => setThresholdFormData(prev => ({
                              ...prev,
                              [item.code]: { ...prev[item.code], warningMax: e.target.value }
                            }))}
                            placeholder="警告上限"
                          />
                          <Input
                            label="危险阈值"
                            type="number"
                            value={formData.criticalMax || ''}
                            onChange={(e) => setThresholdFormData(prev => ({
                              ...prev,
                              [item.code]: { ...prev[item.code], criticalMax: e.target.value }
                            }))}
                            placeholder="危险上限"
                          />
                        </div>
                        {threshold && (
                          <div className="flex items-center gap-2 text-sm text-app-text-muted">
                            <span>当前单位: {threshold.unit}</span>
                            <span>·</span>
                            <Badge variant={threshold.enabled ? 'success' : 'default'}>
                              {threshold.enabled ? '已启用' : '已禁用'}
                            </Badge>
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  )
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border border-app-border">
                  <CardHeader>
                    <CardTitle className="text-base">重量偏差阈值 (%)</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <Input
                      label="偏差警告阈值"
                      type="number"
                      value={thresholdFormData['WEIGHT_DEVIATION']?.warningMax || ''}
                      onChange={(e) => setThresholdFormData(prev => ({
                        ...prev,
                        WEIGHT_DEVIATION: { ...prev['WEIGHT_DEVIATION'], warningMax: e.target.value }
                      }))}
                      placeholder="请输入重量偏差警告阈值"
                    />
                  </CardBody>
                </Card>

                <Card className="border border-app-border">
                  <CardHeader>
                    <CardTitle className="text-base">速度阈值 (km/h)</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <Input
                      label="速度警告阈值"
                      type="number"
                      value={thresholdFormData['VEHICLE_SPEED']?.warningMax || ''}
                      onChange={(e) => setThresholdFormData(prev => ({
                        ...prev,
                        VEHICLE_SPEED: { ...prev['VEHICLE_SPEED'], warningMax: e.target.value }
                      }))}
                      placeholder="请输入速度警告阈值"
                    />
                  </CardBody>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border border-app-border">
                  <CardHeader>
                    <CardTitle className="text-base">开门报警</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <div className="flex items-center justify-between p-4 bg-app-bg rounded-lg border border-app-border">
                      <div>
                        <div className="font-medium text-app-text">运输途中开门报警</div>
                        <div className="text-sm text-app-text-muted">车辆运输过程中异常开门时触发报警</div>
                      </div>
                      <Switch checked={doorAlarmEnabled} onChange={setDoorAlarmEnabled} />
                    </div>
                  </CardBody>
                </Card>

                <Card className="border border-app-border">
                  <CardHeader>
                    <CardTitle className="text-base">低电量报警阈值 (%)</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <Input
                      label="电量低于此值时报警"
                      type="number"
                      min="0"
                      max="100"
                      value={lowBatteryThreshold}
                      onChange={(e) => setLowBatteryThreshold(e.target.value)}
                      placeholder="请输入低电量报警阈值"
                    />
                  </CardBody>
                </Card>
              </div>

              <Card className="border border-app-border">
                <CardHeader>
                  <CardTitle className="text-base">报警通知方式</CardTitle>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-app-bg rounded-lg border border-app-border">
                    <div>
                      <div className="font-medium text-app-text">系统通知</div>
                      <div className="text-sm text-app-text-muted">在系统内弹出通知提醒</div>
                    </div>
                    <Switch checked={notificationMethods.system} onChange={(v) => setNotificationMethods(prev => ({ ...prev, system: v }))} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-app-bg rounded-lg border border-app-border">
                    <div>
                      <div className="font-medium text-app-text">邮件通知</div>
                      <div className="text-sm text-app-text-muted">发送邮件到用户绑定的邮箱</div>
                    </div>
                    <Switch checked={notificationMethods.email} onChange={(v) => setNotificationMethods(prev => ({ ...prev, email: v }))} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-app-bg rounded-lg border border-app-border">
                    <div>
                      <div className="font-medium text-app-text">短信通知</div>
                      <div className="text-sm text-app-text-muted">发送短信到用户绑定的手机号</div>
                    </div>
                    <Switch checked={notificationMethods.sms} onChange={(v) => setNotificationMethods(prev => ({ ...prev, sms: v }))} />
                  </div>
                </CardBody>
              </Card>
            </CardBody>
            <CardFooter className="flex justify-end">
              <Button variant="primary" leftIcon={<Save className="w-4 h-4" />}>
                保存阈值设置
              </Button>
            </CardFooter>
          </Card>
        </TabPanel>

        <TabPanel tabKey="maintenance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary-500" />
                    数据备份
                  </div>
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="p-4 bg-app-bg rounded-lg border border-app-border">
                  <div className="font-medium text-app-text mb-2">手动备份</div>
                  <p className="text-sm text-app-text-secondary mb-4">立即创建系统数据的完整备份</p>
                  <Button variant="primary" onClick={handleBackup} leftIcon={<Download className="w-4 h-4" />}>
                    立即备份
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-app-text">自动备份</div>
                      <div className="text-sm text-app-text-muted">按计划自动备份系统数据</div>
                    </div>
                    <Switch checked={autoBackupEnabled} onChange={setAutoBackupEnabled} />
                  </div>

                  {autoBackupEnabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        label="备份频率"
                        value={backupFrequency}
                        onChange={(e) => setBackupFrequency(e.target.value)}
                        options={[
                          { value: 'daily', label: '每天' },
                          { value: 'weekly', label: '每周' },
                          { value: 'monthly', label: '每月' }
                        ]}
                      />
                      <Input
                        label="备份时间"
                        type="time"
                        value={backupTime}
                        onChange={(e) => setBackupTime(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="p-4 bg-app-bg rounded-lg border border-app-border">
                  <div className="font-medium text-app-text mb-2">数据恢复</div>
                  <p className="text-sm text-app-text-secondary mb-4">从备份文件恢复系统数据</p>
                  <Button variant="secondary" onClick={handleRestore} leftIcon={<Upload className="w-4 h-4" />}>
                    选择备份文件
                  </Button>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-primary-500" />
                    数据清理
                  </div>
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="开始日期"
                      type="date"
                      value={cleanupStartDate}
                      onChange={(e) => setCleanupStartDate(e.target.value)}
                    />
                    <Input
                      label="结束日期"
                      type="date"
                      value={cleanupEndDate}
                      onChange={(e) => setCleanupEndDate(e.target.value)}
                    />
                  </div>
                  <div className="p-4 bg-warning-500/10 rounded-lg border border-warning-500/30">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-warning-500">警告</div>
                        <p className="text-sm text-app-text-secondary mt-1">
                          数据清理操作不可恢复，请谨慎操作。建议在清理前先进行数据备份。
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button variant="danger" onClick={handleCleanup} leftIcon={<Trash2 className="w-4 h-4" />}>
                    清理此时间范围的数据
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-500" />
                  系统日志
                </div>
              </CardTitle>
            </CardHeader>
            <CardBody>
              <Tabs
                tabs={[
                  { key: 'operation', label: '操作日志' },
                  { key: 'system', label: '系统日志' }
                ]}
                defaultTab="operation"
              >
                <TabPanel tabKey="operation">
                  <Table
                    columns={operationLogColumns}
                    data={[{} as any]}
                    rowKey={() => '1'}
                  />
                </TabPanel>
                <TabPanel tabKey="system">
                  <Table
                    columns={systemLogColumns}
                    data={[{} as any]}
                    rowKey={() => '1'}
                  />
                </TabPanel>
              </Tabs>
            </CardBody>
          </Card>
        </TabPanel>
      </Tabs>

      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={editingUser ? '编辑用户' : '新增用户'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setUserModalOpen(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleSaveUser} loading={userModalLoading} leftIcon={<Save className="w-4 h-4" />}>
              保存
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="用户名"
            value={userFormData.username}
            onChange={(e) => handleUserInputChange('username', e.target.value)}
            placeholder="请输入用户名"
            error={userFormErrors.username}
          />
          <Input
            label="密码"
            type="password"
            value={userFormData.password}
            onChange={(e) => handleUserInputChange('password', e.target.value)}
            placeholder={editingUser ? '不修改请留空' : '请输入密码'}
            error={userFormErrors.password}
          />
          <Input
            label="姓名"
            value={userFormData.name}
            onChange={(e) => handleUserInputChange('name', e.target.value)}
            placeholder="请输入姓名"
            error={userFormErrors.name}
          />
          <Input
            label="邮箱"
            type="email"
            value={userFormData.email}
            onChange={(e) => handleUserInputChange('email', e.target.value)}
            placeholder="请输入邮箱"
            error={userFormErrors.email}
          />
          <Input
            label="手机"
            value={userFormData.phone}
            onChange={(e) => handleUserInputChange('phone', e.target.value)}
            placeholder="请输入手机号"
            error={userFormErrors.phone}
          />
          <Select
            label="角色"
            value={userFormData.role}
            onChange={(e) => handleUserInputChange('role', e.target.value)}
            options={[
              { value: '', label: '请选择角色' },
              ...Object.entries(UserRoleLabel).map(([value, label]) => ({ value, label }))
            ]}
            error={userFormErrors.role}
          />
          <Select
            label="所属机构"
            value={userFormData.institutionId}
            onChange={(e) => handleUserInputChange('institutionId', e.target.value)}
            options={institutionOptions}
          />
          <Select
            label="状态"
            value={userFormData.status}
            onChange={(e) => handleUserInputChange('status', e.target.value)}
            options={statusOptions}
            error={userFormErrors.status}
          />
        </div>
      </Modal>

      <Modal
        isOpen={resetPasswordModalOpen}
        onClose={() => setResetPasswordModalOpen(false)}
        title="重置密码"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetPasswordModalOpen(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                if (newPassword.length < 6) {
                  alert('密码至少6位')
                  return
                }
                if (newPassword !== confirmPassword) {
                  alert('两次输入的密码不一致')
                  return
                }
                if (resetPasswordUser) {
                  await updateUser(resetPasswordUser.id, { password: newPassword })
                  setResetPasswordModalOpen(false)
                  alert('密码重置成功')
                }
              }}
              leftIcon={<Key className="w-4 h-4" />}
            >
              确认重置
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-app-bg rounded-lg">
            <span className="text-app-text-secondary">正在重置用户: </span>
            <span className="font-medium text-app-text">{resetPasswordUser?.name}</span>
          </div>
          <Input
            label="新密码"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="请输入新密码"
          />
          <Input
            label="确认新密码"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="请再次输入新密码"
          />
        </div>
      </Modal>

      <Modal
        isOpen={institutionModalOpen}
        onClose={() => setInstitutionModalOpen(false)}
        title={editingInstitution ? '编辑机构' : `新增${institutionFormData.type === 'institution' ? '医疗机构' : '处置厂'}`}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setInstitutionModalOpen(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleSaveInstitution} loading={institutionModalLoading} leftIcon={<Save className="w-4 h-4" />}>
              保存
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="机构名称"
            value={institutionFormData.name}
            onChange={(e) => handleInstitutionInputChange('name', e.target.value)}
            placeholder="请输入机构名称"
            error={institutionFormErrors.name}
          />
          <Input
            label="机构编码"
            value={institutionFormData.code}
            onChange={(e) => handleInstitutionInputChange('code', e.target.value)}
            placeholder="请输入机构编码"
            error={institutionFormErrors.code}
          />
          <Input
            label="联系人"
            value={institutionFormData.contactPerson}
            onChange={(e) => handleInstitutionInputChange('contactPerson', e.target.value)}
            placeholder="请输入联系人"
            error={institutionFormErrors.contactPerson}
          />
          <Input
            label="联系电话"
            value={institutionFormData.contactPhone}
            onChange={(e) => handleInstitutionInputChange('contactPhone', e.target.value)}
            placeholder="请输入联系电话"
            error={institutionFormErrors.contactPhone}
          />
          <TextArea
            label="地址"
            value={institutionFormData.address}
            onChange={(e) => handleInstitutionInputChange('address', e.target.value)}
            placeholder="请输入地址"
            error={institutionFormErrors.address}
            className="md:col-span-2"
          />
          {institutionFormData.type === 'institution' && (
            <Input
              label="机构等级"
              value={institutionFormData.level}
              onChange={(e) => handleInstitutionInputChange('level', e.target.value)}
              placeholder="如: 三级甲等"
            />
          )}
          {institutionFormData.type === 'factory' && (
            <Input
              label="日处理能力 (吨)"
              type="number"
              value={institutionFormData.dailyCapacity || ''}
              onChange={(e) => handleInstitutionInputChange('dailyCapacity', e.target.value)}
              placeholder="请输入日处理能力"
            />
          )}
          <Input
            label="纬度"
            type="number"
            step="0.0001"
            value={institutionFormData.lat}
            onChange={(e) => handleInstitutionInputChange('lat', e.target.value)}
            placeholder="如: 39.9042"
          />
          <Input
            label="经度"
            type="number"
            step="0.0001"
            value={institutionFormData.lng}
            onChange={(e) => handleInstitutionInputChange('lng', e.target.value)}
            placeholder="如: 116.4074"
          />
        </div>
      </Modal>

      <Modal
        isOpen={vehicleModalOpen}
        onClose={() => setVehicleModalOpen(false)}
        title={editingVehicle ? '编辑车辆' : '新增车辆'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setVehicleModalOpen(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleSaveVehicle} loading={vehicleModalLoading} leftIcon={<Save className="w-4 h-4" />}>
              保存
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="车牌号"
            value={vehicleFormData.plateNo}
            onChange={(e) => handleVehicleInputChange('plateNo', e.target.value)}
            placeholder="请输入车牌号"
            error={vehicleFormErrors.plateNo}
          />
          <Input
            label="车型"
            value={vehicleFormData.model}
            onChange={(e) => handleVehicleInputChange('model', e.target.value)}
            placeholder="请输入车型"
            error={vehicleFormErrors.model}
          />
          <Input
            label="载重 (吨)"
            type="number"
            value={vehicleFormData.capacity}
            onChange={(e) => handleVehicleInputChange('capacity', e.target.value)}
            placeholder="请输入载重"
            error={vehicleFormErrors.capacity}
          />
          <Input
            label="GPS设备ID"
            value={vehicleFormData.gpsDeviceId}
            onChange={(e) => handleVehicleInputChange('gpsDeviceId', e.target.value)}
            placeholder="请输入GPS设备ID"
            error={vehicleFormErrors.gpsDeviceId}
          />
          <Select
            label="状态"
            value={vehicleFormData.status}
            onChange={(e) => handleVehicleInputChange('status', e.target.value)}
            options={[
              { value: 'IDLE', label: '空闲' },
              { value: 'MAINTENANCE', label: '维护中' },
              { value: 'DISABLED', label: '停用' }
            ]}
          />
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmVariant="danger"
        loading={confirmModal.loading}
      />
    </div>
  )
}
