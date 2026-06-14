import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactECharts from 'echarts-for-react'
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
  Navigation
} from 'lucide-react'
import {
  startRealTimeMonitoring,
  stopRealTimeMonitoring
} from '@/services/monitorService'
import { useMonitorStore } from '@/store/useMonitorStore'
import { useTransportStore } from '@/store/useTransportStore'
import { useUserStore } from '@/store/useUserStore'
import { Gauge, StatCard } from '@/components/ui/Gauge'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { formatDateTime, formatTime, formatWeight, formatTemperature } from '@/utils/format'
import { Vehicle, TransferOrder } from '@/types/transport'
import { TransportMonitorState } from '@/types/monitor'
import { Alert } from '@/types'
import { AlertLevelColor, AlertLevelLabel, VehicleStatusColor, VehicleStatusLabel } from '@/types/common'

const TransportMonitor: React.FC = () => {
  const { currentUser } = useUserStore()
  const { transportStates, alerts, loadAlerts, acknowledgeAlert } = useMonitorStore()
  const { vehicles, orders, loadAllData } = useTransportStore()

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [selectedMonitorState, setSelectedMonitorState] = useState<TransportMonitorState | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<TransferOrder | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [playbackTime, setPlaybackTime] = useState(0)
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)

  useEffect(() => {
    loadAllData()
    loadAlerts(false)
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
    }
  }, [selectedVehicle, transportStates])

  const statistics = useMemo(() => {
    const online = Object.values(transportStates).filter(s => s.status === 'ONLINE').length
    const inTransit = vehicles.filter(v => v.status === 'IN_TRANSIT').length
    const warning = Object.values(transportStates).filter(s => s.status === 'WARNING' || s.status === 'CRITICAL').length
    const offline = vehicles.length - online

    return { online, inTransit, warning, offline }
  }, [transportStates, vehicles])

  const vehicleList = useMemo(() => {
    return vehicles.map(vehicle => {
      const monitorState = transportStates[vehicle.id]
      return {
        ...vehicle,
        monitorState
      }
    })
  }, [vehicles, transportStates])

  const unacknowledgedAlerts = useMemo(() => {
    return alerts.filter(a => !a.acknowledged).slice(0, 20)
  }, [alerts])

  const inTransitOrders = useMemo(() => {
    return orders.filter(o => o.status === 'IN_TRANSIT')
  }, [orders])

  const handleAcknowledgeAlert = useCallback(async (alertId: string) => {
    if (currentUser) {
      await acknowledgeAlert(alertId, currentUser.id)
    }
  }, [currentUser, acknowledgeAlert])

  const handleDispatch = useCallback((alert: Alert) => {
    setSelectedAlert(alert)
    setShowDispatchModal(true)
  }, [])

  const handleConfirmDispatch = useCallback(() => {
    setShowDispatchModal(false)
    setSelectedAlert(null)
  }, [])

  const handleVehicleSelect = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    const vehicleOrder = orders.find(o => o.vehicleId === vehicle.id && o.status === 'IN_TRANSIT')
    if (vehicleOrder) {
      setSelectedOrder(vehicleOrder)
    }
  }, [orders])

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

  const getAlertTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      TEMPERATURE_HIGH: '温度超限',
      TEMPERATURE_LOW: '温度过低',
      WEIGHT_DEVIATION: '重量异常',
      HUMIDITY_HIGH: '湿度过高',
      VEHICLE_FAULT: '车辆故障',
      DEVICE_OFFLINE: '设备离线',
      DOOR_OPEN: '门异常',
      SPEEDING: '超速'
    }
    return typeMap[type] || type
  }

  const getAlertTypeIcon = (type: string) => {
    if (type.includes('TEMPERATURE')) return <Thermometer className="w-4 h-4" />
    if (type.includes('WEIGHT')) return <GaugeIcon className="w-4 h-4" />
    if (type === 'SPEEDING') return <GaugeIcon className="w-4 h-4" />
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

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-text">运输实时监控</h1>
          <p className="text-app-text-secondary text-sm mt-1">实时监控运输车辆状态、位置及环境数据</p>
        </div>
        <Button
          variant="secondary"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={() => {
            loadAllData()
            loadAlerts(false)
          }}
        >
          刷新数据
        </Button>
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
          label="离线车辆"
          value={statistics.offline}
          icon={<AlertCircle className="w-6 h-6" />}
          color="#64748B"
        />
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        <div className="col-span-3 flex flex-col gap-4 min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary-400" />
                  车辆列表
                </div>
              </CardTitle>
            </CardHeader>
            <CardBody className="flex-1 overflow-auto p-0">
              <div className="divide-y divide-app-border">
                {vehicleList.map((vehicle) => {
                  const status = getVehicleMonitorStatus(vehicle)
                  const isSelected = selectedVehicle?.id === vehicle.id
                  return (
                    <motion.div
                      key={vehicle.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'bg-primary-500/10 border-l-4 border-primary-500'
                          : 'hover:bg-app-bg-lighter border-l-4 border-transparent'
                      }`}
                      onClick={() => handleVehicleSelect(vehicle)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-semibold text-app-text">{vehicle.plateNo}</span>
                        <Badge variant={status.variant as 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default'} size="sm">
                          {status.label}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-app-text-secondary">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">
                            {vehicle.monitorState
                              ? `${vehicle.monitorState.currentLocation.lat.toFixed(4)}, ${vehicle.monitorState.currentLocation.lng.toFixed(4)}`
                              : '位置未知'}
                          </span>
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
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant="default"
                            size="sm"
                            style={{
                              backgroundColor: `${VehicleStatusColor[vehicle.status]}20`,
                              color: VehicleStatusColor[vehicle.status],
                              borderColor: `${VehicleStatusColor[vehicle.status]}30`
                            }}
                          >
                            {VehicleStatusLabel[vehicle.status]}
                          </Badge>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="col-span-6 flex flex-col gap-4 min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Map className="w-5 h-5 text-primary-400" />
                    实时监控面板
                  </div>
                  {selectedVehicle && (
                    <Badge variant="primary">{selectedVehicle.plateNo}</Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardBody className="flex-1 flex flex-col gap-4 p-4 overflow-auto">
              <div className="h-64 bg-app-bg rounded-lg border border-app-border relative overflow-hidden">
                <div className="absolute inset-0 bg-grid opacity-30" />
                {selectedMonitorState ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-4"
                      >
                        <Truck className="w-8 h-8 text-primary-400" />
                      </motion.div>
                      <h4 className="text-xl font-bold text-app-text mb-2">{selectedVehicle?.plateNo}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-center gap-2 text-app-text-secondary">
                          <MapPin className="w-4 h-4 text-primary-400" />
                          <span>
                            纬度: {selectedMonitorState.currentLocation.lat.toFixed(6)},
                            经度: {selectedMonitorState.currentLocation.lng.toFixed(6)}
                          </span>
                        </div>
                        <div className="flex items-center justify-center gap-4 text-app-text-muted">
                          <span>更新时间: {formatDateTime(selectedMonitorState.lastUpdateTime)}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-center gap-4">
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
                      <Map className="w-16 h-16 mx-auto mb-3 opacity-50" />
                      <p>请选择车辆查看实时位置</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-app-bg-light">
                  <CardBody className="p-4 flex justify-center">
                    <Gauge
                      value={selectedMonitorState?.temperature || 0}
                      min={0}
                      max={15}
                      label="箱体温度"
                      unit="°C"
                      warningThreshold={8}
                      criticalThreshold={10}
                      size="md"
                    />
                  </CardBody>
                </Card>
                <Card className="bg-app-bg-light">
                  <CardBody className="p-4 flex justify-center">
                    <Gauge
                      value={selectedMonitorState?.weight || 0}
                      min={0}
                      max={selectedVehicle?.capacity || 5000}
                      label="载重"
                      unit="kg"
                      warningThreshold={(selectedVehicle?.capacity || 5000) * 0.8}
                      criticalThreshold={(selectedVehicle?.capacity || 5000) * 0.95}
                      size="md"
                    />
                  </CardBody>
                </Card>
                <Card className="bg-app-bg-light">
                  <CardBody className="p-4 flex justify-center">
                    <Gauge
                      value={selectedMonitorState?.speed || 0}
                      min={0}
                      max={120}
                      label="行驶速度"
                      unit="km/h"
                      warningThreshold={60}
                      criticalThreshold={80}
                      size="md"
                    />
                  </CardBody>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-app-bg-light">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">
                      <div className="flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-primary-400" />
                        温度变化趋势
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardBody className="p-0">
                    <div className="h-48">
                      {selectedMonitorState?.temperatureHistory && selectedMonitorState.temperatureHistory.length > 0 ? (
                        <ReactECharts option={temperatureChartOption} style={{ height: '100%', width: '100%' }} />
                      ) : (
                        <div className="h-full flex items-center justify-center text-app-text-muted">
                          暂无数据
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>

                <Card className="bg-app-bg-light">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">
                      <div className="flex items-center gap-2">
                        <GaugeIcon className="w-4 h-4 text-success-400" />
                        重量变化趋势
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardBody className="p-0">
                    <div className="h-48">
                      {selectedMonitorState?.weightHistory && selectedMonitorState.weightHistory.length > 0 ? (
                        <ReactECharts option={weightChartOption} style={{ height: '100%', width: '100%' }} />
                      ) : (
                        <div className="h-full flex items-center justify-center text-app-text-muted">
                          暂无数据
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </div>

              <Card className="bg-app-bg-light">
                <CardHeader>
                  <CardTitle className="text-base">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary-400" />
                      运输轨迹回放
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="text-app-text-secondary w-20">选择订单:</span>
                      <div className="flex-1">
                        <select
                          className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-app-text focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                          {inTransitOrders.map((order) => (
                            <option key={order.id} value={order.id}>
                              {order.orderNo} - {formatWeight(order.totalWeight)}
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
                          leftIcon={<SkipBack className="w-4 h-4" />}
                          onClick={() => setPlaybackTime(Math.max(0, playbackTime - 10))}
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          onClick={() => setIsPlaying(!isPlaying)}
                        >
                          {isPlaying ? '暂停' : '播放'}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<SkipForward className="w-4 h-4" />}
                          onClick={() => setPlaybackTime(Math.min(100, playbackTime + 10))}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-app-text-muted text-sm">倍速:</span>
                        {[0.5, 1, 2, 4].map((speed) => (
                          <Button
                            key={speed}
                            variant={playbackSpeed === speed ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => setPlaybackSpeed(speed)}
                          >
                            {speed}x
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-app-text-secondary w-20">时间轴:</span>
                      <div className="flex-1 flex items-center gap-3">
                        <span className="text-app-text-muted text-sm w-16">00:00</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={playbackTime}
                          onChange={(e) => setPlaybackTime(Number(e.target.value))}
                          className="flex-1 h-2 bg-app-border rounded-full appearance-none cursor-pointer accent-primary-500"
                        />
                        <span className="text-app-text-muted text-sm w-16 text-right">
                          {String(Math.floor(playbackTime / 60)).padStart(2, '0')}:
                          {String(playbackTime % 60).padStart(2, '0')}
                        </span>
                      </div>
                    </div>

                    {selectedOrder && (
                      <div className="grid grid-cols-3 gap-4 pt-2 border-t border-app-border">
                        <div>
                          <span className="text-app-text-muted text-sm">订单号</span>
                          <p className="text-app-text font-medium">{selectedOrder.orderNo}</p>
                        </div>
                        <div>
                          <span className="text-app-text-muted text-sm">总重量</span>
                          <p className="text-app-text font-medium">{formatWeight(selectedOrder.totalWeight)}</p>
                        </div>
                        <div>
                          <span className="text-app-text-muted text-sm">出发时间</span>
                          <p className="text-app-text font-medium">
                            {selectedOrder.departureTime ? formatDateTime(selectedOrder.departureTime) : '--'}
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-danger-400" />
                    实时报警
                    {unacknowledgedAlerts.length > 0 && (
                      <Badge variant="danger" size="sm" className="animate-blink">
                        {unacknowledgedAlerts.length}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardBody className="flex-1 overflow-auto p-0">
              <div className="divide-y divide-app-border">
                <AnimatePresence>
                  {unacknowledgedAlerts.length > 0 ? (
                    unacknowledgedAlerts.map((alert, index) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-4 ${
                          alert.level === 'CRITICAL'
                            ? 'bg-danger-500/5 animate-blink'
                            : alert.level === 'WARNING'
                            ? 'bg-warning-500/5'
                            : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{
                              backgroundColor: `${AlertLevelColor[alert.level]}20`,
                              color: AlertLevelColor[alert.level]
                            }}
                          >
                            {getAlertTypeIcon(alert.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-app-text">{alert.title}</span>
                              <Badge
                                variant={alert.level === 'CRITICAL' ? 'danger' : alert.level === 'WARNING' ? 'warning' : 'info'}
                                size="sm"
                              >
                                {AlertLevelLabel[alert.level]}
                              </Badge>
                            </div>
                            <p className="text-sm text-app-text-secondary mb-2">{alert.message}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-app-text-muted">
                                <Badge variant="default" size="sm">
                                  {getAlertTypeLabel(alert.type)}
                                </Badge>
                                <span>{formatTime(alert.timestamp)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  leftIcon={<CheckCircle className="w-3 h-3" />}
                                  onClick={() => handleAcknowledgeAlert(alert.id)}
                                >
                                  确认
                                </Button>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  leftIcon={<Send className="w-3 h-3" />}
                                  onClick={() => handleDispatch(alert)}
                                >
                                  派单
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-app-text-muted">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success-400 opacity-50" />
                      <p>暂无报警信息</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

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
              className="bg-app-bg-light border border-app-border rounded-xl p-6 w-96 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-app-text mb-4">派单处理</h3>
              <div className="space-y-4">
                <div className="p-3 bg-app-bg rounded-lg">
                  <p className="text-sm font-medium text-app-text">{selectedAlert.title}</p>
                  <p className="text-sm text-app-text-secondary mt-1">{selectedAlert.message}</p>
                </div>
                <div>
                  <label className="block text-sm text-app-text-secondary mb-2">处理人员</label>
                  <Input placeholder="请选择处理人员" />
                </div>
                <div>
                  <label className="block text-sm text-app-text-secondary mb-2">处理说明</label>
                  <textarea
                    className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-app-text focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-24 resize-none"
                    placeholder="请输入处理说明..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setShowDispatchModal(false)}>
                    取消
                  </Button>
                  <Button variant="primary" onClick={handleConfirmDispatch}>
                    确认派单
                  </Button>
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
