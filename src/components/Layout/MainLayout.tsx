import React, { useState, useEffect } from 'react'
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
  AlertTriangle
} from 'lucide-react'
import { useUserStore, useMonitorStore } from '@/store'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime } from '@/utils/format'

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

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, logout } = useUserStore()
  const { alerts, acknowledgeAlert } = useMonitorStore()
  const unreadAlerts = alerts.filter(a => !a.acknowledged)

  useEffect(() => {
    setUserMenuOpen(false)
    setNotificationOpen(false)
  }, [location.pathname])

  const hasPermission = (roles: string[]) => {
    if (!currentUser) return false
    if (roles.includes('ALL')) return true
    return roles.includes(currentUser.role)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
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
            <div className="relative">
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
                    className="absolute right-0 top-full mt-2 w-80 bg-app-bg-light border border-app-border rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 border-b border-app-border flex items-center justify-between">
                      <h3 className="font-semibold text-app-text">报警通知</h3>
                      <span className="text-xs text-app-text-muted">共 {unreadAlerts.length} 条</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {unreadAlerts.length === 0 ? (
                        <div className="px-4 py-8 text-center text-app-text-muted">
                          暂无报警信息
                        </div>
                      ) : (
                        unreadAlerts.slice(0, 10).map(alert => (
                          <div
                            key={alert.id}
                            className="px-4 py-3 border-b border-app-border/50 hover:bg-app-bg-lighter cursor-pointer transition-colors"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            <div className="flex items-start gap-3">
                              <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                alert.level === 'CRITICAL' ? 'text-danger-400' :
                                alert.level === 'WARNING' ? 'text-warning-400' : 'text-primary-400'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-app-text truncate">{alert.title}</p>
                                <p className="text-xs text-app-text-muted mt-1">{alert.message}</p>
                                <p className="text-xs text-app-text-muted mt-1">{alert.timestamp}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
