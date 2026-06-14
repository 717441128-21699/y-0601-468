import React, { useState, useEffect, useMemo } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  FilePlus,
  Truck,
  MapPin,
  Thermometer,
  FileText,
  Globe,
  Settings,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
  AlertTriangle,
  Filter,
  CheckCircle,
  CheckSquare,
  Square,
  Clock,
  Package
} from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import { useUserStore, useMonitorStore, useTransportStore } from '@/store'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/Modal'
import { formatDateTime, formatTime } from '@/utils/format'
import {
  AlertLevelColor,
  AlertLevelLabel,
  AlertTypeLabel,
  TransferOrderStatusLabel
} from '@/types/common'
import { generateId } from '@/utils/algorithm'

type AlertTabType = 'realtime' | 'history'
type AlertFilterType = 'all' | 'unacknowledged' | 'acknowledged'
type AlertLevelFilter = 'all' | 'CRITICAL' | 'WARNING' | 'INFO'

const menuItems = [
  { path: '/dashboard', label: '工作台', icon: LayoutDashboard, roles: ['ALL'] },
  { path: '/waste-registration', label: '废物登记', icon: FilePlus, roles: ['INSTITUTION', 'ADMIN', 'SUPER_ADMIN'] },
  { path: '/transport-dispatch', label: '转运调度', icon: Truck, roles: ['TRANSPORT', 'ADMIN', 'SUPER_ADMIN', 'REGULATOR'] },
  { path: '/transport-monitor', label: '运输监控', icon: MapPin, roles: ['TRANSPORT', 'ADMIN', 'SUPER_ADMIN', 'REGULATOR'] },
  { path: '/storage-monitor', label: '贮存监控', icon: Thermometer, roles: ['INSTITUTION', 'ADMIN', 'SUPER_ADMIN', 'REGULATOR'] },
  { path: '/ewaybill', label: '电子联单', icon: FileText, roles: ['ALL'] },
  { path: '/visual-map', label: '可视化地图', icon: Globe, roles: ['ADMIN', 'SUPER_ADMIN', 'REGULATOR'] },
  { path: '/settings', label: '系统设置', icon: Settings, roles: ['ADMIN', 'SUPER_ADMIN'] }
]

const ALERT_CONTEXT_KEY = 'alert_context_state_v1'

interface PersistedAlertContext {
  monitor?: {
    selectedVehicleId?: string
    expandedVehicleId?: string
    selectedOrderId?: string
    alertTab?: AlertTabType
    alertFilter?: AlertFilterType
    levelFilter?: AlertLevelFilter
    selectedAlertIds?: string[]
    selectedAlertId?: string
  }
  dispatch?: {
    openOrderId?: string
  }
  sourceAlertId?: string
}

function loadAlertContext(): PersistedAlertContext {
  try {
    const raw = localStorage.getItem(ALERT_CONTEXT_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveAlertContext(ctx: Partial<PersistedAlertContext>) {
  try {
    const existing = loadAlertContext()
    const merged = { ...existing, ...ctx }
    localStorage.setItem(ALERT_CONTEXT_KEY, JSON.stringify(merged))
  } catch {
    // ignore
  }
}

export function getAlertContext(): PersistedAlertContext {
  return loadAlertContext()
}

export function clearAlertContext() {
  try {
    localStorage.removeItem(ALERT_CONTEXT_KEY)
  } catch {
    // ignore
  }
}

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [showBatchConfirm, setShowBatchConfirm] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, users, logout } = useUserStore()
  const { alerts, acknowledgeAlert, loadAlerts } = useMonitorStore()
  const { vehicles, orders } = useTransportStore()

  const [alertTab, setAlertTab] = useState<AlertTabType>('realtime')
  const [alertFilter, setAlertFilter] = useState<AlertFilterType>('all')
  const [levelFilter, setLevelFilter] = useState<AlertLevelFilter>('all')
  const [showAlertFilter, setShowAlertFilter] = useState(false)
  const [selectedAlertIds, setSelectedAlertIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  useEffect(() => {
    setUserMenuOpen(false)
  }, [location.pathname])

  const unreadAlerts = useMemo(() => alerts.filter(a => !a.acknowledged), [alerts])

  const filteredAlerts = useMemo(() => {
    let result = [...alerts]

    if (alertTab === 'realtime') {
      result = result.filter(a => !a.acknowledged)
    }
    if (alertFilter === 'unacknowledged') {
      result = result.filter(a => !a.acknowledged)
    } else if (alertFilter === 'acknowledged') {
      result = result.filter(a => a.acknowledged)
    }
    if (levelFilter !== 'all') {
      result = result.filter(a => a.level === levelFilter)
    }
    return result.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 50)
  }, [alerts, alertTab, alertFilter, levelFilter])

  const getAcknowledgedByName = (userId?: string) => {
    if (!userId) return '未知'
    return users.find(u => u.id === userId)?.name || userId
  }

  const hasPermission = (roles: string[]) => {
    if (!currentUser) return false
    if (roles.includes('ALL')) return true
    return roles.includes(currentUser.role)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleAcknowledgeAlert = async (alertId: string) => {
    if (currentUser) {
      await acknowledgeAlert(alertId, currentUser.id)
      setSelectedAlertIds(prev => {
        const next = new Set(prev)
        next.delete(alertId)
        return next
      })
    }
  }

  const toggleAlertSelected = (alertId: string) => {
    setSelectedAlertIds(prev => {
      const next = new Set(prev)
      if (next.has(alertId)) {
        next.delete(alertId)
      } else {
        next.add(alertId)
      }
      return next
    })
  }

  const toggleSelectAllFiltered = () => {
    const unacknowledgedFiltered = filteredAlerts.filter(a => !a.acknowledged)
    if (selectedAlertIds.size === unacknowledgedFiltered.length) {
      setSelectedAlertIds(new Set())
    } else {
      setSelectedAlertIds(new Set(unacknowledgedFiltered.map(a => a.id)))
    }
  }

  const handleBatchAcknowledge = async () => {
    if (!currentUser || selectedAlertIds.size === 0) return
    for (const id of Array.from(selectedAlertIds)) {
      await acknowledgeAlert(id, currentUser.id)
    }
    setSelectedAlertIds(new Set())
    setShowBatchConfirm(false)
  }

  const handleJumpToMonitor = (alert: any) => {
    const ctx: PersistedAlertContext = {
      sourceAlertId: alert.id,
      monitor: {
        selectedVehicleId: alert.sourceId,
        expandedVehicleId: alert.sourceId,
        selectedOrderId: alert.orderId,
        selectedAlertId: alert.id
      }
    }
    saveAlertContext(ctx)
    setNotificationOpen(false)
    navigate('/transport-monitor')
  }

  const handleJumpToDispatch = (alert: any) => {
    const ctx: PersistedAlertContext = {
      sourceAlertId: alert.id,
      dispatch: {
        openOrderId: alert.orderId
      }
    }
    saveAlertContext(ctx)
    setNotificationOpen(false)
    navigate('/transport-dispatch')
  }

  const getAlertTypeIcon = (type: string) => {
    if (type.includes('TEMPERATURE')) return <AlertTriangle className="w-4 h-4" />
    if (type.includes('WEIGHT')) return <AlertTriangle className="w-4 h-4" />
    if (type.includes('SPEED')) return <AlertTriangle className="w-4 h-4" />
    return <AlertTriangle className="w-4 h-4" />
  }

  return (
    <div className="flex h-screen bg-app-bg overflow-hidden">
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 72 }}
        className="relative bg-app-bg-light border-r border-app-border flex flex-col z-20"
      >
        <div className="h-16 flex items-center px-4 border-b border-app-border">
          <motion.div
            className="flex items-center gap-3 overflow-hidden"
            animate={{ width: sidebarOpen ? 'auto' : 0, marginLeft: sidebarOpen ? 0 : -12 }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">医</span>
            </div>
            <div className="whitespace-nowrap">
              <h1 className="text-base font-bold text-app-text">医疗废物管理</h1>
              <p className="text-xs text-app-text-muted">智慧监管平台</p>
            </div>
          </motion.div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute right-0 top-5 translate-x-1/2 w-6 h-6 rounded-full bg-app-bg-light border border-app-border flex items-center justify-center text-app-text-muted hover:text-app-text transition-colors"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {menuItems.filter(item => hasPermission(item.roles)).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-gradient-primary text-white shadow-glow-primary'
                  : 'text-app-text-secondary hover:text-app-text hover:bg-app-bg-lighter'
                }
              `}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <motion.span
                initial={false}
                animate={{
                  opacity: sidebarOpen ? 1 : 0,
                  width: sidebarOpen ? 'auto' : 0
                }}
                className="whitespace-nowrap overflow-hidden"
              >
                {item.label}
              </motion.span>
              {sidebarOpen && item.path === '/transport-monitor' && unreadAlerts.length > 0 && (
                <Badge variant="danger" size="sm" className="ml-auto">
                  {unreadAlerts.length}
                </Badge>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-app-border">
          <div className={`flex items-center gap-3 px-3 py-2 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-primary-400" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-app-text truncate">
                  {currentUser?.name || '用户'}
                </p>
                <p className="text-xs text-app-text-muted truncate">
                  {currentUser?.role}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-app-bg-light border-b border-app-border flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-app-bg-lighter text-app-text-secondary transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-app-text">
                {menuItems.find(m => m.path === location.pathname)?.label || '工作台'}
              </h2>
              <p className="text-xs text-app-text-muted">{formatDateTime(new Date())}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="relative p-2 rounded-lg hover:bg-app-bg-lighter text-app-text-secondary transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadAlerts.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadAlerts.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notificationOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-96 bg-app-bg-light border border-app-border rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 border-b border-app-border">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-app-text flex items-center gap-2">
                          <Bell className="w-4 h-4 text-primary-400" />
                          报警通知中心
                          {unreadAlerts.length > 0 && (
                            <Badge variant="danger" size="sm">{unreadAlerts.length}</Badge>
                          )}
                        </h3>
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Filter className="w-3 h-3" />}
                            onClick={() => setShowAlertFilter(!showAlertFilter)}
                          >
                            筛选
                          </Button>
                          {showAlertFilter && (
                            <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-app-bg border border-app-border rounded-lg shadow-xl p-3 space-y-3">
                              <div>
                                <label className="text-xs font-medium text-app-text-secondary mb-2 block">处理状态</label>
                                <div className="space-y-1">
                                  {[
                                    { v: 'all' as const, label: '全部' },
                                    { v: 'unacknowledged' as const, label: '未处理' },
                                    { v: 'acknowledged' as const, label: '已确认' }
                                  ].map(o => (
                                    <button
                                      key={o.v}
                                      onClick={() => setAlertFilter(o.v)}
                                      className={twMerge(
                                        'w-full text-left px-2 py-1 rounded text-sm transition-colors',
                                        alertFilter === o.v
                                          ? 'bg-primary-500/20 text-primary-400'
                                          : 'hover:bg-app-bg-lighter text-app-text-secondary'
                                      )}
                                    >
                                      {o.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-app-text-secondary mb-2 block">严重级别</label>
                                <div className="space-y-1">
                                  {[
                                    { v: 'all' as const, label: '全部级别' },
                                    { v: 'CRITICAL' as const, label: '严重', color: '#E53935' },
                                    { v: 'WARNING' as const, label: '警告', color: '#FB8C00' },
                                    { v: 'INFO' as const, label: '提示', color: '#0066CC' }
                                  ].map(o => (
                                    <button
                                      key={o.v}
                                      onClick={() => setLevelFilter(o.v)}
                                      className={twMerge(
                                        'w-full text-left px-2 py-1 rounded text-sm transition-colors flex items-center gap-2',
                                        levelFilter === o.v
                                          ? 'bg-primary-500/20 text-primary-400'
                                          : 'hover:bg-app-bg-lighter text-app-text-secondary'
                                      )}
                                    >
                                      {o.color && (
                                        <span
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: o.color }}
                                        />
                                      )}
                                      {o.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="pt-2 border-t border-app-border flex gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => { setAlertFilter('all'); setLevelFilter('all') }}
                                >
                                  重置
                                </Button>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => setShowAlertFilter(false)}
                                >
                                  应用
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1 p-1 bg-app-bg rounded-lg">
                        <button
                          onClick={() => setAlertTab('realtime')}
                          className={twMerge(
                            'flex-1 px-2 py-1 rounded text-xs font-medium transition-all flex items-center justify-center gap-1',
                            alertTab === 'realtime'
                              ? 'bg-app-bg-light text-primary-400 shadow-sm'
                              : 'text-app-text-muted hover:text-app-text-secondary'
                          )}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          实时报警
                          {unreadAlerts.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-danger-500/20 text-danger-400 text-[10px]">
                              {unreadAlerts.length}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => setAlertTab('history')}
                          className={twMerge(
                            'flex-1 px-2 py-1 rounded text-xs font-medium transition-all flex items-center justify-center gap-1',
                            alertTab === 'history'
                              ? 'bg-app-bg-light text-primary-400 shadow-sm'
                              : 'text-app-text-muted hover:text-app-text-secondary'
                          )}
                        >
                          <Clock className="w-3 h-3" />
                          历史记录
                        </button>
                      </div>

                      {alertTab === 'realtime' && filteredAlerts.filter(a => !a.acknowledged).length > 0 && (
                        <div className="mt-2 flex items-center justify-between">
                          <button
                            onClick={toggleSelectAllFiltered}
                            className="text-xs text-app-text-secondary hover:text-primary-400 flex items-center gap-1"
                          >
                            {selectedAlertIds.size === filteredAlerts.filter(a => !a.acknowledged).length
                              ? <CheckSquare className="w-3 h-3 text-primary-400" />
                              : <Square className="w-3 h-3" />}
                            全选 ({filteredAlerts.filter(a => !a.acknowledged).length})
                          </button>
                          {selectedAlertIds.size > 0 && (
                            <Button
                              variant="primary"
                              size="sm"
                              leftIcon={<CheckCircle className="w-3 h-3" />}
                              onClick={() => setShowBatchConfirm(true)}
                            >
                              批量确认 ({selectedAlertIds.size})
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {filteredAlerts.length === 0 ? (
                        <div className="px-4 py-12 text-center text-app-text-muted">
                          <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success-400 opacity-50" />
                          <p className="text-sm">
                            {alertTab === 'realtime' ? '暂无待处理报警' : '暂无历史报警记录'}
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-app-border">
                          {filteredAlerts.map((alert, idx) => {
                            const vehicle = vehicles.find(v => v.id === alert.sourceId)
                            const order = alert.orderId ? orders.find(o => o.id === alert.orderId) : undefined
                            const isSelected = selectedAlertIds.has(alert.id)
                            return (
                              <motion.div
                                key={alert.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: Math.min(idx * 0.015, 0.3) }}
                                className={twMerge(
                                  'px-3 py-2.5 transition-colors',
                                  alert.level === 'CRITICAL' && !alert.acknowledged
                                    ? 'bg-danger-500/5'
                                    : alert.level === 'WARNING' && !alert.acknowledged
                                      ? 'bg-warning-500/5'
                                      : 'hover:bg-app-bg-lighter'
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  {!alert.acknowledged && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        toggleAlertSelected(alert.id)
                                      }}
                                      className="mt-0.5 flex-shrink-0 text-app-text-muted hover:text-primary-400"
                                    >
                                      {isSelected
                                        ? <CheckSquare className="w-4 h-4 text-primary-400" />
                                        : <Square className="w-4 h-4" />}
                                    </button>
                                  )}
                                  <div
                                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{
                                      backgroundColor: `${AlertLevelColor[alert.level]}20`,
                                      color: AlertLevelColor[alert.level]
                                    }}
                                  >
                                    {getAlertTypeIcon(alert.type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                      <span className="font-medium text-app-text text-sm">{alert.title}</span>
                                      <Badge
                                        variant={alert.level === 'CRITICAL' ? 'danger' : alert.level === 'WARNING' ? 'warning' : 'info'}
                                        size="sm"
                                      >
                                        {AlertLevelLabel[alert.level]}
                                      </Badge>
                                      {vehicle && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleJumpToMonitor(alert)
                                          }}
                                          className="px-1.5 py-0.5 text-xs rounded bg-primary-500/15 text-primary-400 hover:bg-primary-500/25 transition-colors font-medium"
                                        >
                                          🚚 {vehicle.plateNo}
                                        </button>
                                      )}
                                      {order && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleJumpToDispatch(alert)
                                          }}
                                          className="px-1.5 py-0.5 text-xs rounded bg-success-500/15 text-success-400 hover:bg-success-500/25 transition-colors font-medium flex items-center gap-0.5"
                                        >
                                          <Package className="w-2.5 h-2.5" />
                                          {order.orderNo}
                                        </button>
                                      )}
                                    </div>
                                    <p className="text-xs text-app-text-secondary line-clamp-1">{alert.message}</p>
                                    <div className="flex items-center justify-between mt-1">
                                      <div className="flex items-center gap-1.5 text-xs text-app-text-muted flex-wrap">
                                        <span>{AlertTypeLabel[alert.type as keyof typeof AlertTypeLabel] || alert.type}</span>
                                        <span>·</span>
                                        <span>{formatTime(alert.timestamp)}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {!alert.acknowledged ? (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            leftIcon={<CheckCircle className="w-3 h-3" />}
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleAcknowledgeAlert(alert.id)
                                            }}
                                            className="!px-2 !py-0.5 text-xs"
                                          >
                                            确认
                                          </Button>
                                        ) : (
                                          <div className="text-[11px] text-success-400 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            {getAcknowledgedByName(alert.acknowledgedBy)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {alert.acknowledged && (
                                      <div className="mt-0.5 text-[11px] text-app-text-muted">
                                        确认时间: {formatDateTime(alert.acknowledgedAt || '')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="px-4 py-2.5 border-t border-app-border flex items-center justify-between bg-app-bg-lighter/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<AlertTriangle className="w-3 h-3" />}
                        onClick={() => {
                          setNotificationOpen(false)
                          navigate('/transport-monitor')
                        }}
                      >
                        打开运输监控
                      </Button>
                      <span className="text-xs text-app-text-muted">
                        {alertTab === 'realtime'
                          ? `显示前 ${filteredAlerts.length} 条未处理`
                          : `显示前 ${filteredAlerts.length} 条历史`}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <ConfirmModal
                isOpen={showBatchConfirm}
                onClose={() => setShowBatchConfirm(false)}
                onConfirm={handleBatchAcknowledge}
                title="批量确认报警"
                message={`确定要确认选中的 ${selectedAlertIds.size} 条报警吗？确认后将移出实时列表，历史记录中仍可查看处理人及时间。`}
                confirmText={`确认 ${selectedAlertIds.size} 条`}
                confirmVariant="primary"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-app-bg-lighter transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {currentUser?.name?.charAt(0) || '用'}
                  </span>
                </div>
                <ChevronRight className={`w-4 h-4 text-app-text-muted transition-transform ${userMenuOpen ? '-rotate-90' : 'rotate-90'}`} />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-app-bg-light border border-app-border rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 border-b border-app-border">
                      <p className="text-sm font-medium text-app-text">{currentUser?.name}</p>
                      <p className="text-xs text-app-text-muted mt-0.5">{currentUser?.email}</p>
                      <p className="text-[11px] text-app-text-muted mt-0.5">角色: {currentUser?.role}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 text-left text-sm text-app-text-secondary hover:text-danger-400 hover:bg-danger-500/10 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      退出登录
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
