import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactECharts from 'echarts-for-react'
import { useNavigate } from 'react-router-dom'
import {
  Truck,
  MapPin,
  Thermometer,
  Gauge as GaugeIcon,
  AlertTriangle,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Clock,
  CheckCircle,
  Send,
  RefreshCw,
  AlertCircle,
  Map,
  Navigation,
  Package,
  Route,
  Filter,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  X
} from 'lucide-react'
import {
  startRealTimeMonitoring,
  stopRealTimeMonitoring
} from '@/services/monitorService'
import { useMonitorStore } from '@/store/useMonitorStore'
import { useTransportStore } from '@/store/useTransportStore'
import { useUserStore } from '@/store/useUserStore'
import { useWasteStore } from '@/store/useWasteStore'
import { Gauge, StatCard } from '@/components/ui/Gauge'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import {
  formatDateTime,
  formatTime,
  formatWeight,
  formatTemperature,
  formatDistance,
  formatDuration
} from '@/utils/format'
import { Vehicle, TransferOrder, RouteInfo } from '@/types/transport'
import { TransportMonitorState } from '@/types/monitor'
import { Alert, UserRoleType } from '@/types'
import {
  AlertLevelColor,
  AlertLevelLabel,
  AlertTypeLabel,
  VehicleStatusColor,
  VehicleStatusLabel,
  TransferOrderStatusLabel
} from '@/types/common'
import { calculateDistance } from '@/utils/algorithm'
import { twMerge } from 'tailwind-merge'

type AlertTabType = 'realtime' | 'history'
type AlertFilterType = 'all' | 'unacknowledged' | 'acknowledged'
type AlertLevelFilter = 'all' | 'CRITICAL' | 'WARNING' | 'INFO'

interface VehicleProgressInfo {
  stage: 'not_started' | 'v2i' | 'loading' | 'i2f' | 'unloading' | 'arrived'
  stageLabel: string
  progressPercent: number
  traveledDistance: number
  remainingDistance: number
  estimatedArrivalTime?: string
  remainingMinutes: number
}

const TransportMonitor: React.FC = () => {
  const navigate = useNavigate()
  const { currentUser, users } = useUserStore()
  const { transportStates, alerts, loadAlerts, acknowledgeAlert, acknowledgeAllAlerts } = useMonitorStore()
  const { vehicles, drivers, orders, loadAllData } = useTransportStore()
  const { institutions, factories } = useWasteStore()

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [selectedMonitorState, setSelectedMonitorState] = useState<TransportMonitorState | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<TransferOrder | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [playbackTime, setPlaybackTime] = useState(0)
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null)
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [selectedAlertIds, setSelectedAlertIds] = useState<Set<string>>(new Set())
  const [alertTab, setAlertTab] = useState<AlertTabType>('realtime')
  const [alertFilter, setAlertFilter] = useState<AlertFilterType>('all')
  const [levelFilter, setLevelFilter] = useState<AlertLevelFilter>('all')
  const [showAlertFilter, setShowAlertFilter] = useState(false)
  const [showBatchConfirm, setShowBatchConfirm] = useState(false)

  useEffect(() => {
    loadAllData()
    loadAlerts()
    startRealTimeMonitoring()

    return () => {
      stopRealTimeMonitoring()
    }
  }, [loadAllData, loadAlerts])

  useEffect(() => {
    if (selectedVehicle) {
      const state = transportStates[selectedVehicle.id]
      if (state) {
        setSelectedMonitorState(state)
      }
      const vehicleOrder = orders.find(o =>
        (o.status === 'IN_TRANSIT' || o.status === 'APPROVED') && o.vehicleId === selectedVehicle.id
      )
      if (vehicleOrder) {
        setSelectedOrder(vehicleOrder)
      }
    }
  }, [selectedVehicle, transportStates, orders])

  const statistics = useMemo(() => {
    const online = Object.values(transportStates).filter(s => s.status === 'ONLINE').length
    const inTransit = vehicles.filter(v => v.status === 'IN_TRANSIT').length
    const warning = Object.values(transportStates).filter(s => s.status === 'WARNING' || s.status === 'CRITICAL').length
    const offline = vehicles.length - online

    return { online, inTransit, warning, offline }
  }, [transportStates, vehicles])

  const getVehicleCurrentOrder = useCallback((vehicleId: string): TransferOrder | undefined => {
    return orders.find(o =>
      (o.status === 'IN_TRANSIT' || o.status === 'APPROVED') && o.vehicleId === vehicleId
    )
  }, [orders])

  const getDriverNameById = useCallback((driverId: string) => {
    return drivers.find(d => d.id === driverId)?.name || '未知司机'
  }, [drivers])

  const getInstitutionNameById = useCallback((instId: string) => {
    return institutions.find(i => i.id === instId)?.name || '未知机构'
  }, [institutions])

  const getFactoryNameById = useCallback((fid: string) => {
    return factories.find(f => f.id === fid)?.name || '未知处置厂'
  }, [factories])

  const getVehicleProgressInfo = useCallback((vehicle: Vehicle, order?: TransferOrder): VehicleProgressInfo => {
    const defaultInfo: VehicleProgressInfo = {
      stage: 'not_started',
      stageLabel: '待出发',
      progressPercent: 0,
      traveledDistance: 0,
      remainingDistance: 0,
      remainingMinutes: 0
    }
    if (!order || !order.route) return defaultInfo

    const route = order.route
    const totalDistance = route.totalDistance
    const monitorState = transportStates[vehicle.id]

    if (order.status === 'COMPLETED' || order.status === 'ARRIVED') {
      return {
        stage: 'arrived',
        stageLabel: '已到达',
        progressPercent: 100,
        traveledDistance: totalDistance,
        remainingDistance: 0,
        remainingMinutes: 0,
        estimatedArrivalTime: order.arrivalTime
      }
    }

    if (order.status === 'APPROVED' || !order.departureTime) {
      return {
        stage: 'not_started',
        stageLabel: '等待出发',
        progressPercent: 0,
        traveledDistance: 0,
        remainingDistance: totalDistance,
        remainingMinutes: route.totalEstimatedTime,
        estimatedArrivalTime: new Date(Date.now() + route.totalEstimatedTime * 60000).toISOString()
      }
    }

    const now = new Date()
    const departure = new Date(order.departureTime)
    const elapsedMinutes = (now.getTime() - departure.getTime()) / 60000
    const avgSpeed = 45 * 1000 / 60

    const v2iDistance = route.vehicleToInstitution.distance
    const v2iTime = route.vehicleToInstitution.estimatedTime
    const loadingTime = 20
    const i2fDistance = route.institutionToFactory.distance
    const i2fTime = route.institutionToFactory.estimatedTime
    const unloadingTime = 15

    let stage: VehicleProgressInfo['stage'] = 'v2i'
    let stageLabel = '前往医疗机构'
    let progressPercent = 0
    let traveledDistance = 0
    let remainingMinutes = route.totalEstimatedTime
    let remainingDistance = totalDistance

    if (elapsedMinutes < v2iTime) {
      stage = 'v2i'
      stageLabel = '前往医疗机构'
      const ratio = Math.min(elapsedMinutes / Math.max(v2iTime, 1), 1)
      traveledDistance = v2iDistance * ratio
      progressPercent = (traveledDistance / Math.max(totalDistance, 1)) * 100
      remainingMinutes = route.totalEstimatedTime - elapsedMinutes
      remainingDistance = totalDistance - traveledDistance
    } else if (elapsedMinutes < v2iTime + loadingTime) {
      stage = 'loading'
      stageLabel = '医疗机构装货'
      traveledDistance = v2iDistance
      const stageTotal = v2iTime + loadingTime
      progressPercent = ((v2iDistance + ((elapsedMinutes - v2iTime) / Math.max(loadingTime, 1)) * 100) / Math.max(totalDistance, 1)) * 80 + 15
      progressPercent = Math.min(progressPercent, 45)
      remainingMinutes = stageTotal - elapsedMinutes + i2fTime + unloadingTime
      remainingDistance = i2fDistance
    } else if (elapsedMinutes < v2iTime + loadingTime + i2fTime) {
      stage = 'i2f'
      stageLabel = '前往处置厂'
      const intoStage = elapsedMinutes - v2iTime - loadingTime
      const ratio = Math.min(intoStage / Math.max(i2fTime, 1), 1)
      traveledDistance = v2iDistance + i2fDistance * ratio
      progressPercent = 45 + ratio * 45
      remainingMinutes = (v2iTime + loadingTime + i2fTime - elapsedMinutes) + unloadingTime
      remainingDistance = i2fDistance * (1 - ratio)
    } else if (elapsedMinutes < v2iTime + loadingTime + i2fTime + unloadingTime) {
      stage = 'unloading'
      stageLabel = '处置厂卸货'
      traveledDistance = v2iDistance + i2fDistance
      progressPercent = 92
      const intoStage = elapsedMinutes - v2iTime - loadingTime - i2fTime
      remainingMinutes = unloadingTime - intoStage
      remainingDistance = 0
    } else {
      stage = 'arrived'
      stageLabel = '运输即将完成'
      traveledDistance = totalDistance
      progressPercent = 100
      remainingMinutes = 0
      remainingDistance = 0
    }

    const estimatedArrivalTime = new Date(now.getTime() + remainingMinutes * 60000).toISOString()

    return {
      stage,
      stageLabel,
      progressPercent: Math.min(Math.max(progressPercent, 0), 100),
      traveledDistance: Math.max(traveledDistance, 0),
      remainingDistance: Math.max(remainingDistance, 0),
      estimatedArrivalTime,
      remainingMinutes: Math.max(remainingMinutes, 0)
    }
  }, [transportStates])

  const vehicleList = useMemo(() => {
    return vehicles.map(vehicle => {
      const monitorState = transportStates[vehicle.id]
      const order = getVehicleCurrentOrder(vehicle.id)
      const progress = getVehicleProgressInfo(vehicle, order)
      return {
        ...vehicle,
        monitorState,
        order,
        progress
      }
    })
  }, [vehicles, transportStates, getVehicleCurrentOrder, getVehicleProgressInfo])

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

    return result.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 100)
  }, [alerts, alertTab, alertFilter, levelFilter])

  const unacknowledgedAlertsCount = useMemo(() => {
    return alerts.filter(a => !a.acknowledged).length
  }, [alerts])

  const inTransitOrders = useMemo(() => {
    return orders.filter(o => o.status === 'IN_TRANSIT')
  }, [orders])

  const handleAcknowledgeAlert = useCallback(async (alertId: string) => {
    if (currentUser) {
      await acknowledgeAlert(alertId, currentUser.id)
      setSelectedAlertIds(prev => {
        const next = new Set(prev)
        next.delete(alertId)
        return next
      })
    }
  }, [currentUser, acknowledgeAlert])

  const handleBatchAcknowledge = useCallback(async () => {
    if (!currentUser || selectedAlertIds.size === 0) return
    for (const id of Array.from(selectedAlertIds)) {
      await acknowledgeAlert(id, currentUser.id)
    }
    setSelectedAlertIds(new Set())
    setShowBatchConfirm(false)
  }, [currentUser, selectedAlertIds, acknowledgeAlert])

  const toggleAlertSelected = useCallback((alertId: string) => {
    setSelectedAlertIds(prev => {
      const next = new Set(prev)
      if (next.has(alertId)) {
        next.delete(alertId)
      } else {
        next.add(alertId)
      }
      return next
    })
  }, [])

  const toggleSelectAllFiltered = useCallback(() => {
    if (selectedAlertIds.size === filteredAlerts.filter(a => !a.acknowledged).length) {
      setSelectedAlertIds(new Set())
    } else {
      setSelectedAlertIds(new Set(filteredAlerts.filter(a => !a.acknowledged).map(a => a.id)))
    }
  }, [filteredAlerts, selectedAlertIds.size])

  const handleAlertClick = useCallback((alert: Alert) => {
    const vehicle = vehicles.find(v => v.id === alert.sourceId)
    if (vehicle) {
      setSelectedVehicle(vehicle)
      setExpandedVehicleId(vehicle.id)
    }
    const order = alert.orderId ? orders.find(o => o.id === alert.orderId) : undefined
    if (order) {
      setSelectedOrder(order)
    }
    setSelectedAlert(alert)
  }, [vehicles, orders])

  const handleDispatch = useCallback((alert: Alert) => {
    handleAlertClick(alert)
  }, [handleAlertClick])

  const handleVehicleSelect = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setExpandedVehicleId(vehicle.id === expandedVehicleId ? null : vehicle.id)
    const vehicleOrder = orders.find(o =>
      (o.status === 'IN_TRANSIT' || o.status === 'APPROVED') && o.vehicleId === vehicle.id
    )
    if (vehicleOrder) {
      setSelectedOrder(vehicleOrder)
    }
  }, [expandedVehicleId, orders])

  const getAcknowledgedByName = (userId?: string) => {
    if (!userId) return '未知'
    return users.find(u => u.id === userId)?.name || userId
  }

  const temperatureChartOption = useMemo(() => {
    if (!selectedMonitorState?.temperatureHistory) {
      return {}
    }

    const data = selectedMonitorState.temperatureHistory
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(37, 49, 66, 0.95)',
        borderColor: '#3A4A61',
        textStyle: { color: '#E2E8F0' },
        formatter: (params: { name: string; value: number }[]) => {
          const item = params[0]
          return `${formatTime(item.name)}<br/>温度: ${item.value.toFixed(1)}°C`
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.map(d => d.time),
        axisLine: { lineStyle: { color: '#3A4A61' } },
        axisLabel: {
          color: '#64748B',
          formatter: (value: string) => formatTime(value)
        },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 15,
        axisLine: { lineStyle: { color: '#3A4A61' } },
        axisLabel: { color: '#64748B', formatter: '{value}°C' },
        splitLine: { lineStyle: { color: '#3A4A61', type: 'dashed' } }
      },
      series: [
        {
          data: data.map(d => d.value),
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: '#0066CC', width: 2 },
          itemStyle: { color: '#0066CC' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(0, 102, 204, 0.3)' },
                { offset: 1, color: 'rgba(0, 102, 204, 0.05)' }
              ]
            }
          }
        }
      ]
    }
  }, [selectedMonitorState])

  const weightChartOption = useMemo(() => {
    if (!selectedMonitorState?.weightHistory) {
      return {}
    }

    const data = selectedMonitorState.weightHistory
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(37, 49, 66, 0.95)',
        borderColor: '#3A4A61',
        textStyle: { color: '#E2E8F0' },
        formatter: (params: { name: string; value: number }[]) => {
          const item = params[0]
          return `${formatTime(item.name)}<br/>重量: ${item.value.toFixed(1)} kg`
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.map(d => d.time),
        axisLine: { lineStyle: { color: '#3A4A61' } },
        axisLabel: {
          color: '#64748B',
          formatter: (value: string) => formatTime(value)
        },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#3A4A61' } },
        axisLabel: { color: '#64748B', formatter: '{value} kg' },
        splitLine: { lineStyle: { color: '#3A4A61', type: 'dashed' } }
      },
      series: [
        {
          data: data.map(d => d.value),
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: '#43A047', width: 2 },
          itemStyle: { color: '#43A047' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(67, 160, 71, 0.3)' },
                { offset: 1, color: 'rgba(67, 160, 71, 0.05)' }
              ]
            }
          }
        }
      ]
    }
  }, [selectedMonitorState])

  const getAlertTypeIcon = (type: string) => {
    if (type.includes('TEMPERATURE')) return <Thermometer className="w-4 h-4" />
    if (type.includes('WEIGHT')) return <GaugeIcon className="w-4 h-4" />
    if (type.includes('SPEED')) return <GaugeIcon className="w-4 h-4" />
    if (type.includes('DOOR')) return <AlertTriangle className="w-4 h-4" />
    return <AlertTriangle className="w-4 h-4" />
  }

  const getVehicleMonitorStatus = (vehicle: Vehicle & { monitorState?: TransportMonitorState }) => {
    if (vehicle.monitorState) {
      const status = vehicle.monitorState.status
      if (status === 'CRITICAL') return { variant: 'danger', label: '异常' }
      if (status === 'WARNING') return { variant: 'warning', label: '警告' }
      if (status === 'ONLINE') return { variant: 'success', label: '在线' }
    }
    return { variant: 'default', label: '离线' }
  }

  const ProgressBar: React.FC<{ percent: number; stageColor?: string }> = ({ percent, stageColor = '#0066CC' }) => (
    <div className="w-full h-2 bg-app-bg-lighter rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: stageColor }}
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.5 }}
      />
    </div>
  )

  const getStageColor = (stage: VehicleProgressInfo['stage']) => {
    switch (stage) {
      case 'not_started': return '#64748B'
      case 'v2i': return '#0066CC'
      case 'loading': return '#FB8C00'
      case 'i2f': return '#7B1FA2'
      case 'unloading': return '#1976D2'
      case 'arrived': return '#43A047'
      default: return '#64748B'
    }
  }

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-text">运输实时监控</h1>
          <p className="text-app-text-secondary text-sm mt-1">实时监控运输车辆状态、位置、订单进度及报警</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            leftIcon={<Package className="w-4 h-4" />}
            onClick={() => navigate('/transport-dispatch')}
          >
            转运调度
          </Button>
          <Button
            variant="secondary"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={async () => {
              await loadAllData()
              await loadAlerts()
            }}
          >
            刷新数据
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="在线车辆"
          value={statistics.online}
          icon={<Truck className="w-6 h-6" />}
          color="#43A047"
        />
        <StatCard
          label="运输中"
          value={statistics.inTransit}
          icon={<Navigation className="w-6 h-6" />}
          color="#0066CC"
        />
        <StatCard
          label="异常车辆"
          value={statistics.warning}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="#FB8C00"
        />
        <StatCard
          label="待处理报警"
          value={unacknowledgedAlertsCount}
          icon={<AlertCircle className="w-6 h-6" />}
          color="#E53935"
        />
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        <div className="col-span-4 flex flex-col gap-4 min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary-400" />
                    车辆实时状态
                  </div>
                  <Badge variant="default" size="sm">{vehicles.length} 辆</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardBody className="flex-1 overflow-auto p-0">
              <div className="divide-y divide-app-border">
                {vehicleList.map((vehicle) => {
                  const status = getVehicleMonitorStatus(vehicle)
                  const isSelected = selectedVehicle?.id === vehicle.id
                  const isExpanded = expandedVehicleId === vehicle.id
                  const order = vehicle.order
                  const progress = vehicle.progress
                  const stageColor = getStageColor(progress.stage)
                  return (
                    <motion.div
                      key={vehicle.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`transition-all duration-200 ${
                        isSelected
                          ? 'bg-primary-500/10 border-l-4 border-primary-500'
                          : 'hover:bg-app-bg-lighter border-l-4 border-transparent'
                      }`}
                    >
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => handleVehicleSelect(vehicle)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-app-text">{vehicle.plateNo}</span>
                            {order && (
                              <Badge variant="primary" size="sm">
                                {order.orderNo}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant={status.variant as any} size="sm">
                              {status.label}
                            </Badge>
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4 text-app-text-muted" />
                              : <ChevronDown className="w-4 h-4 text-app-text-muted" />}
                          </div>
                        </div>

                        <div className="space-y-1 text-sm mb-3">
                          <div className="flex items-center gap-2 text-app-text-secondary">
                            <User className="w-3 h-3" />
                            <span>{getDriverNameById(vehicle.driverId || order?.driverId || '')}</span>
                          </div>
                          <div className="flex items-center gap-4 text-app-text-muted">
                            <span className="flex items-center gap-1">
                              <Thermometer className="w-3 h-3" />
                              {vehicle.monitorState ? formatTemperature(vehicle.monitorState.temperature) : '--'}
                            </span>
                            <span className="flex items-center gap-1">
                              <GaugeIcon className="w-3 h-3" />
                              {vehicle.monitorState ? `${vehicle.monitorState.speed.toFixed(0)} km/h` : '--'}
                            </span>
                          </div>
                        </div>

                        {order ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-app-text-muted">
                                {getInstitutionNameById(order.institutionId)}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-white text-xs font-medium"
                                style={{ backgroundColor: stageColor }}>
                                {progress.stageLabel}
                              </span>
                              <span className="text-app-text-muted">
                                {getFactoryNameById(order.factoryId)}
                              </span>
                            </div>
                            <ProgressBar percent={progress.progressPercent} stageColor={stageColor} />
                            <div className="flex items-center justify-between text-xs text-app-text-muted">
                              <span>已行 {formatDistance(progress.traveledDistance)}</span>
                              {progress.estimatedArrivalTime && (
                                <span className="flex items-center gap-1 text-primary-400">
                                  <Clock className="w-3 h-3" />
                                  预计 {formatTime(progress.estimatedArrivalTime)} 到达
                                </span>
                              )}
                              <span>剩余 {formatDistance(progress.remainingDistance)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-app-text-muted text-center py-1">
                            当前无运输任务
                          </div>
                        )}
                      </div>

                      <AnimatePresence>
                        {isExpanded && order && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-0 space-y-3">
                              <div className="border-t border-app-border/50 pt-3 grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2 bg-app-bg rounded">
                                  <p className="text-app-text-muted mb-1 flex items-center gap-1">
                                    <Package className="w-3 h-3" /> 订单状态
                                  </p>
                                  <Badge variant={order.status === 'IN_TRANSIT' ? 'info' : 'primary'} size="sm">
                                    {TransferOrderStatusLabel[order.status]}
                                  </Badge>
                                </div>
                                <div className="p-2 bg-app-bg rounded">
                                  <p className="text-app-text-muted mb-1 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> 出发时间
                                  </p>
                                  <p className="text-app-text">
                                    {order.departureTime ? formatTime(order.departureTime) : '未出发'}
                                  </p>
                                </div>
                                <div className="p-2 bg-app-bg rounded col-span-2">
                                  <p className="text-app-text-muted mb-1 flex items-center gap-1">
                                    <Route className="w-3 h-3" /> 运输进度
                                  </p>
                                  <div className="flex items-center justify-between text-app-text mt-2 space-x-1">
                                    <span className="flex items-center gap-1 flex-shrink-0">
                                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white
                                        ${['not_started', 'v2i'].includes(progress.stage) ? 'bg-gray-400 animate-pulse' : 'bg-success-500'}`}>
                                        {['not_started', 'v2i'].includes(progress.stage) ? '1' : '✓'}
                                      </div>
                                      车辆出发
                                    </span>
                                    <div className="flex-1 h-0.5 bg-app-border mx-1" />
                                    <span className="flex items-center gap-1 flex-shrink-0">
                                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white
                                        ${['loading', 'i2f'].includes(progress.stage) ? 'bg-warning-500 animate-pulse' :
                                          ['v2i'].includes(progress.stage) ? 'bg-gray-400' : 'bg-success-500'}`}>
                                        {['not_started', 'v2i', 'loading', 'i2f'].some(s =>
                                          s === progress.stage) && ['loading', 'i2f'].includes(progress.stage) ? '2' :
                                          ['not_started', 'v2i'].includes(progress.stage) ? '2' : '✓'}
                                      </div>
                                      机构装货
                                    </span>
                                    <div className="flex-1 h-0.5 bg-app-border mx-1" />
                                    <span className="flex items-center gap-1 flex-shrink-0">
                                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white
                                        ${['unloading'].includes(progress.stage) ? 'bg-primary-500 animate-pulse' :
                                          ['i2f', 'loading', 'v2i', 'not_started'].includes(progress.stage) ? 'bg-gray-400' : 'bg-success-500'}`}>
                                        {['arrived'].includes(progress.stage) ? '✓' : '3'}
                                      </div>
                                      到达处置
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="col-span-5 flex flex-col gap-4 min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Map className="w-5 h-5 text-primary-400" />
                    实时监控面板
                  </div>
                  {selectedVehicle && (
                    <div className="flex items-center gap-2">
                      <Badge variant="primary">{selectedVehicle.plateNo}</Badge>
                      {selectedOrder && (
                        <Badge variant="default">{selectedOrder.orderNo}</Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardBody className="flex-1 flex flex-col gap-4 p-4 overflow-auto">
              <div className="h-56 bg-app-bg rounded-lg border border-app-border relative overflow-hidden">
                <div className="absolute inset-0 bg-grid opacity-30" />
                {selectedMonitorState && selectedVehicle ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-3"
                      >
                        <Truck className="w-8 h-8 text-primary-400" />
                      </motion.div>
                      <h4 className="text-lg font-bold text-app-text mb-2">{selectedVehicle.plateNo}</h4>
                      {selectedOrder && (
                        <p className="text-xs text-primary-400 mb-2">
                          订单 {selectedOrder.orderNo} · {getInstitutionNameById(selectedOrder.institutionId)}
                        </p>
                      )}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-center gap-2 text-app-text-secondary">
                          <MapPin className="w-4 h-4 text-primary-400" />
                          <span>
                            纬度: {selectedMonitorState.currentLocation.lat.toFixed(6)},
                            经度: {selectedMonitorState.currentLocation.lng.toFixed(6)}
                          </span>
                        </div>
                        <div className="flex items-center justify-center gap-4 text-app-text-muted">
                          <span>更新: {formatTime(selectedMonitorState.lastUpdateTime)}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-center gap-3">
                        <StatusBadge status="online" label="在线" />
                        <Badge variant="info">
                          行驶中 · {selectedMonitorState.speed.toFixed(0)} km/h
                        </Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-app-text-muted">
                    <div className="text-center">
                      <Map className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>请选择车辆查看实时位置</p>
                    </div>
                  </div>
                )}
              </div>

              {selectedOrder && selectedOrder.route && (
                <Card className="bg-app-bg-light">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm">
                      <div className="flex items-center gap-2">
                        <Route className="w-4 h-4 text-primary-400" />
                        路线进度
                        {(() => {
                          const p = getVehicleProgressInfo(selectedVehicle || {} as Vehicle, selectedOrder)
                          return (
                            <Badge variant="default" size="sm"
                              style={{ backgroundColor: `${getStageColor(p.stage)}20`, color: getStageColor(p.stage) }}>
                              {p.stageLabel} · {p.progressPercent.toFixed(0)}%
                            </Badge>
                          )
                        })()}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardBody className="px-3 py-2 space-y-2">
                    <div className="relative pl-6 space-y-3">
                      <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-app-border" />
                      {[
                        { key: 'vehicle', label: '车辆出发', sub: '出发地', status: 'done', time: selectedOrder.departureTime },
                        { key: 'inst', label: '医疗机构装货', sub: getInstitutionNameById(selectedOrder.institutionId), status:
                          (() => {
                            const p = getVehicleProgressInfo(selectedVehicle || {} as Vehicle, selectedOrder)
                            if (['loading', 'i2f', 'unloading', 'arrived'].includes(p.stage)) return 'done'
                            if (p.stage === 'v2i') return 'active'
                            return 'pending'
                          })(),
                          time: selectedOrder.departureTime
                        },
                        { key: 'fac', label: '到达处置厂', sub: getFactoryNameById(selectedOrder.factoryId), status:
                          (() => {
                            const p = getVehicleProgressInfo(selectedVehicle || {} as Vehicle, selectedOrder)
                            if (p.stage === 'arrived') return 'done'
                            if (['loading', 'i2f', 'unloading'].includes(p.stage)) return 'active'
                            return 'pending'
                          })(),
                          time: (() => {
                            const p = getVehicleProgressInfo(selectedVehicle || {} as Vehicle, selectedOrder)
                            return p.estimatedArrivalTime
                          })()
                        }
                      ].map((node, idx) => (
                        <div key={node.key} className="relative">
                          <div className={twMerge(
                            'absolute -left-6 w-4 h-4 rounded-full border-2 flex items-center justify-center',
                            node.status === 'done'
                              ? 'bg-success-500 border-success-500 text-white text-[10px] font-bold'
                              : node.status === 'active'
                                ? 'bg-primary-500 border-primary-500 animate-pulse'
                                : 'bg-app-bg border-app-border'
                          )}>
                            {node.status === 'done' && '✓'}
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={twMerge(
                                'text-sm font-medium',
                                node.status === 'pending' ? 'text-app-text-muted' : 'text-app-text'
                              )}>{node.label}</p>
                              <p className="text-xs text-app-text-muted">{node.sub}</p>
                            </div>
                            {node.time && (
                              <p className="text-xs text-app-text-muted">{formatTime(node.time)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )}

              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-app-bg-light">
                  <CardBody className="p-3 flex justify-center">
                    <Gauge
                      value={selectedMonitorState?.temperature || 0}
                      min={0}
                      max={15}
                      label="箱体温度"
                      unit="°C"
                      warningThreshold={8}
                      criticalThreshold={10}
                      size="sm"
                    />
                  </CardBody>
                </Card>
                <Card className="bg-app-bg-light">
                  <CardBody className="p-3 flex justify-center">
                    <Gauge
                      value={selectedMonitorState?.weight || 0}
                      min={0}
                      max={selectedVehicle?.capacity || 5000}
                      label="载重"
                      unit="kg"
                      warningThreshold={(selectedVehicle?.capacity || 5000) * 0.8}
                      criticalThreshold={(selectedVehicle?.capacity || 5000) * 0.95}
                      size="sm"
                    />
                  </CardBody>
                </Card>
                <Card className="bg-app-bg-light">
                  <CardBody className="p-3 flex justify-center">
                    <Gauge
                      value={selectedMonitorState?.speed || 0}
                      min={0}
                      max={120}
                      label="行驶速度"
                      unit="km/h"
                      warningThreshold={60}
                      criticalThreshold={80}
                      size="sm"
                    />
                  </CardBody>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-app-bg-light">
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm">
                      <div className="flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-primary-400" />
                        温度变化
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardBody className="p-0">
                    <div className="h-40">
                      {selectedMonitorState?.temperatureHistory && selectedMonitorState.temperatureHistory.length > 0 ? (
                        <ReactECharts option={temperatureChartOption} style={{ height: '100%', width: '100%' }} />
                      ) : (
                        <div className="h-full flex items-center justify-center text-app-text-muted text-xs">
                          暂无数据
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>

                <Card className="bg-app-bg-light">
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm">
                      <div className="flex items-center gap-2">
                        <GaugeIcon className="w-4 h-4 text-success-400" />
                        重量变化
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardBody className="p-0">
                    <div className="h-40">
                      {selectedMonitorState?.weightHistory && selectedMonitorState.weightHistory.length > 0 ? (
                        <ReactECharts option={weightChartOption} style={{ height: '100%', width: '100%' }} />
                      ) : (
                        <div className="h-full flex items-center justify-center text-app-text-muted text-xs">
                          暂无数据
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </div>

              <Card className="bg-app-bg-light">
                <CardHeader className="py-2">
                  <CardTitle className="text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary-400" />
                      运输轨迹回放
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardBody className="py-2 px-3">
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <span className="text-app-text-secondary w-20 text-xs">运输订单:</span>
                      <div className="flex-1">
                        <select
                          className="w-full bg-app-bg border border-app-border rounded px-3 py-1.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          value={selectedOrder?.id || ''}
                          onChange={(e) => {
                            const order = inTransitOrders.find(o => o.id === e.target.value)
                            setSelectedOrder(order || null)
                            const vehicle = vehicles.find(v => v.id === order?.vehicleId)
                            if (vehicle) {
                              handleVehicleSelect(vehicle)
                            }
                          }}
                        >
                          <option value="">请选择运输订单</option>
                          {orders.filter(o => ['APPROVED', 'IN_TRANSIT', 'ARRIVED'].includes(o.status)).map((order) => (
                            <option key={order.id} value={order.id}>
                              {order.orderNo} - {TransferOrderStatusLabel[order.status]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<SkipBack className="w-3 h-3" />}
                          onClick={() => setPlaybackTime(Math.max(0, playbackTime - 10))}
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          onClick={() => setIsPlaying(!isPlaying)}
                        >
                          {isPlaying ? '暂停' : '播放'}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<SkipForward className="w-3 h-3" />}
                          onClick={() => setPlaybackTime(Math.min(100, playbackTime + 10))}
                        />
                      </div>

                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-app-text-muted text-xs">倍速:</span>
                        {[0.5, 1, 2, 4].map((speed) => (
                          <Button
                            key={speed}
                            variant={playbackSpeed === speed ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => setPlaybackSpeed(speed)}
                            className="!px-2"
                          >
                            {speed}x
                          </Button>
                        ))}
                      </div>
                    </div>

                    {selectedOrder && (
                      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-app-border text-xs">
                        <div>
                          <span className="text-app-text-muted">订单号</span>
                          <p className="text-app-text font-medium mt-0.5">{selectedOrder.orderNo}</p>
                        </div>
                        <div>
                          <span className="text-app-text-muted">总重量</span>
                          <p className="text-app-text font-medium mt-0.5">{formatWeight(selectedOrder.totalWeight)}</p>
                        </div>
                        <div>
                          <span className="text-app-text-muted">出发时间</span>
                          <p className="text-app-text font-medium mt-0.5">
                            {selectedOrder.departureTime ? formatTime(selectedOrder.departureTime) : '--'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            </CardBody>
          </Card>
        </div>

        <div className="col-span-3 flex flex-col gap-4 min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader>
              <CardTitle>
                <div className="w-full">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-danger-400" />
                      报警中心
                      {unacknowledgedAlertsCount > 0 && (
                        <Badge variant="danger" size="sm">
                          {unacknowledgedAlertsCount}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
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
                          <div className="absolute right-0 top-full mt-2 z-20 w-64 bg-app-bg-light border border-app-border rounded-lg shadow-xl p-3 space-y-3">
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
                                        : 'hover:bg-app-bg text-app-text-secondary'
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
                                        : 'hover:bg-app-bg text-app-text-secondary'
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
                                onClick={() => {
                                  setAlertFilter('all')
                                  setLevelFilter('all')
                                }}
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
                  </div>

                  <div className="flex gap-1 p-1 bg-app-bg-lighter rounded-lg">
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
                      {unacknowledgedAlertsCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-danger-500/20 text-danger-400">
                          {unacknowledgedAlertsCount}
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
                          ? <CheckSquare className="w-3 h-3" />
                          : <Square className="w-3 h-3" />}
                        全选当前 ({filteredAlerts.filter(a => !a.acknowledged).length})
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
              </CardTitle>
            </CardHeader>
            <CardBody className="flex-1 overflow-auto p-0">
              <div className="divide-y divide-app-border">
                <AnimatePresence>
                  {filteredAlerts.length > 0 ? (
                    filteredAlerts.map((alert, index) => {
                      const vehicle = vehicles.find(v => v.id === alert.sourceId)
                      const order = alert.orderId ? orders.find(o => o.id === alert.orderId) : undefined
                      const isSelected = selectedAlertIds.has(alert.id)
                      const isActiveAlert = selectedAlert?.id === alert.id
                      return (
                        <motion.div
                          key={alert.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: Math.min(index * 0.02, 0.3) }}
                          className={twMerge(
                            'p-3',
                            alert.level === 'CRITICAL' && !alert.acknowledged
                              ? 'bg-danger-500/5 animate-pulse'
                              : alert.level === 'WARNING' && !alert.acknowledged
                                ? 'bg-warning-500/5'
                                : '',
                            isActiveAlert ? 'ring-1 ring-primary-500/50 bg-primary-500/5' : ''
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
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{
                                backgroundColor: `${AlertLevelColor[alert.level]}20`,
                                color: AlertLevelColor[alert.level]
                              }}
                            >
                              {getAlertTypeIcon(alert.type)}
                            </div>
                            <div className="flex-1 min-w-0" onClick={() => handleAlertClick(alert)}>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-medium text-app-text text-sm">{alert.title}</span>
                                <Badge
                                  variant={alert.level === 'CRITICAL' ? 'danger' : alert.level === 'WARNING' ? 'warning' : 'info'}
                                  size="sm"
                                >
                                  {AlertLevelLabel[alert.level]}
                                </Badge>
                                {vehicle && (
                                  <Badge
                                    variant="default"
                                    size="sm"
                                    className="cursor-pointer hover:ring-1 hover:ring-primary-400"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleVehicleSelect(vehicle)
                                    }}
                                  >
                                    <Truck className="w-3 h-3 inline mr-1" />
                                    {vehicle.plateNo}
                                  </Badge>
                                )}
                                {order && (
                                  <Badge
                                    variant="primary"
                                    size="sm"
                                    className="cursor-pointer hover:ring-1 hover:ring-primary-400"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigate('/transport-dispatch')
                                    }}
                                  >
                                    <Package className="w-3 h-3 inline mr-1" />
                                    {order.orderNo}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-app-text-secondary mb-2 line-clamp-2">{alert.message}</p>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-app-text-muted flex-wrap">
                                  <span style={{
                                    color: AlertTypeLabel[alert.type] ? undefined : 'inherit'
                                  }}>
                                    {AlertTypeLabel[alert.type as keyof typeof AlertTypeLabel] || alert.type}
                                  </span>
                                  <span>·</span>
                                  <span>{formatTime(alert.timestamp)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {!alert.acknowledged ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        leftIcon={<CheckCircle className="w-3 h-3" />}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleAcknowledgeAlert(alert.id)
                                        }}
                                      >
                                        确认
                                      </Button>
                                      <Button
                                        variant="primary"
                                        size="sm"
                                        leftIcon={<MapPin className="w-3 h-3" />}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDispatch(alert)
                                        }}
                                      >
                                        定位
                                      </Button>
                                    </>
                                  ) : (
                                    <div className="text-xs flex items-center gap-1 text-success-400">
                                      <CheckCircle className="w-3 h-3" />
                                      {getAcknowledgedByName(alert.acknowledgedBy)} 已确认
                                    </div>
                                  )}
                                </div>
                              </div>
                              {alert.acknowledged && (
                                <div className="mt-1 text-xs text-app-text-muted">
                                  确认时间: {formatDateTime(alert.acknowledgedAt || '')}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })
                  ) : (
                    <div className="p-8 text-center text-app-text-muted">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success-400 opacity-50" />
                      <p className="text-sm">
                        {alertTab === 'realtime' ? '暂无待处理报警' : '暂无历史报警记录'}
                      </p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmModal
        isOpen={showBatchConfirm}
        onClose={() => setShowBatchConfirm(false)}
        onConfirm={handleBatchAcknowledge}
        title="批量确认报警"
        message={`确定要确认选中的 ${selectedAlertIds.size} 条报警吗？确认后这些报警将移出实时列表，历史记录中仍可查看。`}
        confirmText={`确认 ${selectedAlertIds.size} 条`}
        confirmVariant="primary"
      />

      <AnimatePresence>
        {showDispatchModal && selectedAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowDispatchModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-app-bg-light border border-app-border rounded-xl p-6 w-[480px] shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-app-text">报警详情</h3>
                <button
                  className="text-app-text-muted hover:text-app-text"
                  onClick={() => setShowDispatchModal(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: `${AlertLevelColor[selectedAlert.level]}10`,
                    borderColor: `${AlertLevelColor[selectedAlert.level]}30`,
                    borderWidth: 1
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={selectedAlert.level === 'CRITICAL' ? 'danger' : selectedAlert.level === 'WARNING' ? 'warning' : 'info'} size="sm">
                      {AlertLevelLabel[selectedAlert.level]}
                    </Badge>
                    <span className="font-medium text-app-text">{selectedAlert.title}</span>
                  </div>
                  <p className="text-sm text-app-text-secondary">{selectedAlert.message}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-app-bg rounded">
                    <p className="text-app-text-muted text-xs mb-1">报警类型</p>
                    <p className="text-app-text">{AlertTypeLabel[selectedAlert.type as keyof typeof AlertTypeLabel] || selectedAlert.type}</p>
                  </div>
                  <div className="p-3 bg-app-bg rounded">
                    <p className="text-app-text-muted text-xs mb-1">报警时间</p>
                    <p className="text-app-text">{formatDateTime(selectedAlert.timestamp)}</p>
                  </div>
                  <div className="p-3 bg-app-bg rounded">
                    <p className="text-app-text-muted text-xs mb-1">关联车辆</p>
                    <p className="text-app-text">
                      {vehicles.find(v => v.id === selectedAlert.sourceId)?.plateNo || selectedAlert.sourceId}
                    </p>
                  </div>
                  <div className="p-3 bg-app-bg rounded">
                    <p className="text-app-text-muted text-xs mb-1">关联订单</p>
                    <p className="text-app-text">
                      {selectedAlert.orderId
                        ? orders.find(o => o.id === selectedAlert.orderId)?.orderNo || selectedAlert.orderId
                        : '无'}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setShowDispatchModal(false)}>
                    关闭
                  </Button>
                  {!selectedAlert.acknowledged && (
                    <Button
                      variant="primary"
                      onClick={() => {
                        handleAcknowledgeAlert(selectedAlert.id)
                        setShowDispatchModal(false)
                      }}
                    >
                      确认报警
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { TransportMonitor }