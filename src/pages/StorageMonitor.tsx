import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactECharts from 'echarts-for-react'
import {
  Thermometer,
  Droplets,
  Package,
  AlertTriangle,
  Wind,
  Settings,
  X,
  Play,
  Square,
  RefreshCw,
  Building2,
  DoorOpen,
  Clock,
  Bell,
  CheckCircle,
  Filter,
  ChevronRight
} from 'lucide-react'
import {
  startEnvironmentMonitoring,
  stopEnvironmentMonitoring
} from '@/services/monitorService'
import { useMonitorStore } from '@/store/useMonitorStore'
import { useWasteStore } from '@/store/useWasteStore'
import { Gauge, StatCard } from '@/components/ui/Gauge'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { formatDateTime, formatTime, formatTemperature, formatHumidity } from '@/utils/format'
import { StorageMonitorState, VentilationDevice, MonitorThreshold } from '@/types/monitor'
import { Alert } from '@/types'
import { MedicalInstitution, StorageRoom } from '@/types/waste'
import { AlertLevelColor, AlertLevelLabel } from '@/types/common'

const StorageMonitor: React.FC = () => {
  const {
    storageStates,
    envData,
    alerts,
    ventilationDevices,
    thresholds,
    loadVentilationDevices,
    loadThresholds,
    loadAlerts,
    toggleVentilation,
    getThresholdByCode
  } = useMonitorStore()

  const { institutions, loadInstitutions } = useWasteStore()

  const [selectedRoom, setSelectedRoom] = useState<StorageRoom | null>(null)
  const [selectedMonitorState, setSelectedMonitorState] = useState<StorageMonitorState | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<VentilationDevice | null>(null)
  const [showDetailPanel, setShowDetailPanel] = useState(false)
  const [filterInstitution, setFilterInstitution] = useState('')
  const [filterRoom, setFilterRoom] = useState('')
  const [tempThreshold, setTempThreshold] = useState(25)
  const [humidityThreshold, setHumidityThreshold] = useState(80)
  const [autoVentilationEnabled, setAutoVentilationEnabled] = useState(true)
  const [alertNotificationEnabled, setAlertNotificationEnabled] = useState(true)
  const [activeTab, setActiveTab] = useState('realtime')

  const alertScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadInstitutions()
    loadVentilationDevices()
    loadThresholds()
    loadAlerts()
    startEnvironmentMonitoring()

    return () => {
      stopEnvironmentMonitoring()
    }
  }, [loadInstitutions, loadVentilationDevices, loadThresholds, loadAlerts])

  useEffect(() => {
    const tempThresholdConfig = getThresholdByCode('STORAGE_TEMP')
    const humidityThresholdConfig = getThresholdByCode('STORAGE_HUMIDITY')
    if (tempThresholdConfig?.warningMax) {
      setTempThreshold(tempThresholdConfig.warningMax)
    }
    if (humidityThresholdConfig?.warningMax) {
      setHumidityThreshold(humidityThresholdConfig.warningMax)
    }
  }, [getThresholdByCode, thresholds])

  useEffect(() => {
    if (selectedRoom) {
      const state = storageStates[selectedRoom.id]
      if (state) {
        setSelectedMonitorState(state)
      }
      const device = ventilationDevices.find(d => d.roomId === selectedRoom.id)
      if (device) {
        setSelectedDevice(device)
        setAutoVentilationEnabled(device.autoControlEnabled)
      }
    }
  }, [selectedRoom, storageStates, ventilationDevices])

  useEffect(() => {
    if (alertScrollRef.current) {
      alertScrollRef.current.scrollTop = alertScrollRef.current.scrollHeight
    }
  }, [alerts])

  const statistics = useMemo(() => {
    const states = Object.values(storageStates)
    const totalRooms = states.length
    const normalRooms = states.filter(s => s.temperatureStatus === 'NORMAL' && s.humidityStatus === 'NORMAL').length
    const warningRooms = states.filter(s => s.temperatureStatus === 'WARNING' || s.humidityStatus === 'WARNING' || s.temperatureStatus === 'CRITICAL' || s.humidityStatus === 'CRITICAL').length
    const runningVentilation = ventilationDevices.filter(d => d.status === 'RUNNING').length

    return { totalRooms, normalRooms, warningRooms, runningVentilation }
  }, [storageStates, ventilationDevices])

  const allStorageRooms = useMemo(() => {
    const rooms: (StorageRoom & { institutionName: string })[] = []
    institutions.forEach(inst => {
      inst.storageRooms.forEach(room => {
        rooms.push({ ...room, institutionName: inst.name })
      })
    })
    return rooms
  }, [institutions])

  const filteredRooms = useMemo(() => {
    return allStorageRooms.filter(room => {
      const matchInstitution = !filterInstitution || room.institutionId === filterInstitution
      const matchRoom = !filterRoom || room.id === filterRoom
      return matchInstitution && matchRoom
    })
  }, [allStorageRooms, filterInstitution, filterRoom])

  const storageRoomAlerts = useMemo(() => {
    return alerts.filter(a => a.sourceType === 'STORAGE_ROOM' && !a.acknowledged).slice(0, 50)
  }, [alerts])

  const roomAlerts = useMemo(() => {
    if (!selectedRoom) return []
    return alerts.filter(a => a.sourceId === selectedRoom.id).slice(0, 20)
  }, [selectedRoom, alerts])

  const institutionOptions = useMemo(() => {
    return [
      { value: '', label: '全部机构' },
      ...institutions.map(inst => ({ value: inst.id, label: inst.name }))
    ]
  }, [institutions])

  const roomOptions = useMemo(() => {
    const rooms = filterInstitution
      ? allStorageRooms.filter(r => r.institutionId === filterInstitution)
      : allStorageRooms
    return [
      { value: '', label: '全部房间' },
      ...rooms.map(r => ({ value: r.id, label: r.name }))
    ]
  }, [allStorageRooms, filterInstitution])

  const getStatusColor = (status: 'NORMAL' | 'WARNING' | 'CRITICAL') => {
    switch (status) {
      case 'NORMAL': return 'success'
      case 'WARNING': return 'warning'
      case 'CRITICAL': return 'danger'
      default: return 'default'
    }
  }

  const getStatusLabel = (status: 'NORMAL' | 'WARNING' | 'CRITICAL') => {
    switch (status) {
      case 'NORMAL': return '正常'
      case 'WARNING': return '警告'
      case 'CRITICAL': return '危险'
      default: return '未知'
    }
  }

  const getAlertTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      TEMPERATURE_HIGH: '温度超限',
      TEMPERATURE_LOW: '温度过低',
      HUMIDITY_HIGH: '湿度过高',
      STORAGE_FULL: '容量已满',
      DEVICE_OFFLINE: '设备离线'
    }
    return typeMap[type] || type
  }

  const getAlertTypeIcon = (type: string) => {
    if (type.includes('TEMPERATURE')) return <Thermometer className="w-4 h-4" />
    if (type.includes('HUMIDITY')) return <Droplets className="w-4 h-4" />
    return <AlertTriangle className="w-4 h-4" />
  }

  const handleRoomClick = useCallback((room: StorageRoom & { institutionName: string }) => {
    setSelectedRoom(room)
    setShowDetailPanel(true)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setShowDetailPanel(false)
    setSelectedRoom(null)
    setSelectedMonitorState(null)
    setSelectedDevice(null)
  }, [])

  const handleToggleVentilation = useCallback(async () => {
    if (selectedDevice) {
      await toggleVentilation(selectedDevice.id)
    }
  }, [selectedDevice, toggleVentilation])

  const handleToggleAutoVentilation = useCallback(async () => {
    if (selectedDevice) {
      await toggleVentilation(selectedDevice.id, true)
      setAutoVentilationEnabled(!autoVentilationEnabled)
    }
  }, [selectedDevice, toggleVentilation, autoVentilationEnabled])

  const temperatureHumidityChartOption = useMemo(() => {
    if (!selectedMonitorState?.temperatureHistory || !selectedMonitorState?.humidityHistory) {
      return {}
    }

    const tempData = selectedMonitorState.temperatureHistory
    const humidityData = selectedMonitorState.humidityHistory

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(37, 49, 66, 0.95)',
        borderColor: '#3A4A61',
        textStyle: { color: '#E2E8F0' }
      },
      legend: {
        data: ['温度', '湿度'],
        textStyle: { color: '#94A3B8' },
        top: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: tempData.map(d => d.time),
        axisLine: { lineStyle: { color: '#3A4A61' } },
        axisLabel: {
          color: '#64748B',
          formatter: (value: string) => formatTime(value)
        },
        splitLine: { show: false }
      },
      yAxis: [
        {
          type: 'value',
          name: '温度(°C)',
          min: 15,
          max: 35,
          axisLine: { lineStyle: { color: '#3A4A61' } },
          axisLabel: { color: '#64748B', formatter: '{value}°C' },
          splitLine: { lineStyle: { color: '#3A4A61', type: 'dashed' } }
        },
        {
          type: 'value',
          name: '湿度(%)',
          min: 30,
          max: 100,
          axisLine: { lineStyle: { color: '#3A4A61' } },
          axisLabel: { color: '#64748B', formatter: '{value}%' },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: '温度',
          type: 'line',
          data: tempData.map(d => d.value),
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
        },
        {
          name: '湿度',
          type: 'line',
          yAxisIndex: 1,
          data: humidityData.map(d => d.value),
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

  const renderStorageRoomCard = (room: StorageRoom & { institutionName: string }) => {
    const monitorState = storageStates[room.id]
    const device = ventilationDevices.find(d => d.roomId === room.id)

    if (!monitorState) {
      return (
        <Card key={room.id} hoverable className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-app-text-secondary text-sm">{room.institutionName}</p>
              <p className="text-app-text font-semibold">{room.name}</p>
            </div>
            <Badge variant="default" size="sm">离线</Badge>
          </div>
          <div className="text-app-text-muted text-sm text-center py-4">
            暂无监控数据
          </div>
        </Card>
      )
    }

    const overallStatus = monitorState.temperatureStatus === 'CRITICAL' || monitorState.humidityStatus === 'CRITICAL'
      ? 'CRITICAL'
      : monitorState.temperatureStatus === 'WARNING' || monitorState.humidityStatus === 'WARNING'
      ? 'WARNING'
      : 'NORMAL'

    return (
      <Card
        key={room.id}
        hoverable
        className="p-4"
        onClick={() => handleRoomClick(room)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-app-text-muted flex-shrink-0" />
              <p className="text-app-text-secondary text-sm truncate">{room.institutionName}</p>
            </div>
            <div className="flex items-center gap-2">
              <DoorOpen className="w-4 h-4 text-primary-400 flex-shrink-0" />
              <p className="text-app-text font-semibold truncate">{room.name}</p>
            </div>
          </div>
          <StatusBadge
            status={overallStatus === 'NORMAL' ? 'normal' : overallStatus === 'WARNING' ? 'warning' : 'critical'}
            label={getStatusLabel(overallStatus)}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 bg-app-bg rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Thermometer className={`w-3 h-3 ${
                monitorState.temperatureStatus === 'CRITICAL' ? 'text-danger-400' :
                monitorState.temperatureStatus === 'WARNING' ? 'text-warning-400' : 'text-primary-400'
              }`} />
              <span className="text-xs text-app-text-muted">温度</span>
            </div>
            <p className={`font-mono font-bold ${
              monitorState.temperatureStatus === 'CRITICAL' ? 'text-danger-400' :
              monitorState.temperatureStatus === 'WARNING' ? 'text-warning-400' : 'text-app-text'
            }`}>
              {formatTemperature(monitorState.currentTemperature)}
            </p>
          </div>

          <div className="text-center p-2 bg-app-bg rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Droplets className={`w-3 h-3 ${
                monitorState.humidityStatus === 'CRITICAL' ? 'text-danger-400' :
                monitorState.humidityStatus === 'WARNING' ? 'text-warning-400' : 'text-success-400'
              }`} />
              <span className="text-xs text-app-text-muted">湿度</span>
            </div>
            <p className={`font-mono font-bold ${
              monitorState.humidityStatus === 'CRITICAL' ? 'text-danger-400' :
              monitorState.humidityStatus === 'WARNING' ? 'text-warning-400' : 'text-app-text'
            }`}>
              {formatHumidity(monitorState.currentHumidity)}
            </p>
          </div>

          <div className="text-center p-2 bg-app-bg rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Package className="w-3 h-3 text-warning-400" />
              <span className="text-xs text-app-text-muted">容量</span>
            </div>
            <p className="font-mono font-bold text-app-text">
              {monitorState.capacityUsage.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className={`w-4 h-4 ${device?.status === 'RUNNING' ? 'text-primary-400' : 'text-app-text-muted'}`} />
            <span className={`text-sm ${device?.status === 'RUNNING' ? 'text-primary-400' : 'text-app-text-muted'}`}>
              {device?.status === 'RUNNING' ? '排风运行中' : '排风已停止'}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-app-text-muted" />
        </div>
      </Card>
    )
  }

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-text">贮存环境监控</h1>
          <p className="text-app-text-secondary text-sm mt-1">实时监控各医疗机构贮存间温湿度及环境状态</p>
        </div>
        <Button
          variant="secondary"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={() => {
            loadInstitutions()
            loadVentilationDevices()
            loadAlerts()
          }}
        >
          刷新数据
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="监控贮存间数"
          value={statistics.totalRooms}
          icon={<Building2 className="w-6 h-6" />}
          color="#0066CC"
        />
        <StatCard
          label="正常运行"
          value={statistics.normalRooms}
          icon={<CheckCircle className="w-6 h-6" />}
          color="#43A047"
        />
        <StatCard
          label="预警中"
          value={statistics.warningRooms}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="#FB8C00"
        />
        <StatCard
          label="排风启动中"
          value={statistics.runningVentilation}
          icon={<Wind className="w-6 h-6" />}
          color="#00897B"
        />
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        <div className="col-span-9 flex flex-col gap-4 min-h-0">
          <Card className="flex flex-col flex-1 min-h-0">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DoorOpen className="w-5 h-5 text-primary-400" />
                    贮存间列表
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-app-text-muted" />
                      <Select
                        className="w-48"
                        value={filterInstitution}
                        onChange={(e) => {
                          setFilterInstitution(e.target.value)
                          setFilterRoom('')
                        }}
                        options={institutionOptions}
                      />
                      <Select
                        className="w-40"
                        value={filterRoom}
                        onChange={(e) => setFilterRoom(e.target.value)}
                        options={roomOptions}
                      />
                    </div>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardBody className="flex-1 overflow-auto">
              <div className="grid grid-cols-3 gap-4">
                {filteredRooms.map(room => renderStorageRoomCard(room))}
              </div>
              {filteredRooms.length === 0 && (
                <div className="text-center py-12 text-app-text-muted">
                  <DoorOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>暂无符合条件的贮存间</p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary-400" />
                  环境监控配置
                </div>
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <h4 className="text-app-text font-medium mb-4">阈值配置</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-app-text-secondary mb-2">温度上限 (°C)</label>
                      <Input
                        type="number"
                        value={tempThreshold}
                        onChange={(e) => setTempThreshold(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-app-text-secondary mb-2">湿度上限 (%)</label>
                      <Input
                        type="number"
                        value={humidityThreshold}
                        onChange={(e) => setHumidityThreshold(Number(e.target.value))}
                      />
                    </div>
                    <Button variant="primary" size="sm">
                      保存阈值配置
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="text-app-text font-medium mb-4">排风联动</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-app-bg rounded-lg">
                      <div>
                        <p className="text-app-text text-sm">自动排风联动</p>
                        <p className="text-app-text-muted text-xs">湿度过高时自动启动排风</p>
                      </div>
                      <button
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          autoVentilationEnabled ? 'bg-primary-500' : 'bg-app-border'
                        }`}
                        onClick={() => setAutoVentilationEnabled(!autoVentilationEnabled)}
                      >
                        <motion.div
                          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                          animate={{ left: autoVentilationEnabled ? 'calc(100% - 20px)' : '4px' }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-app-bg rounded-lg">
                      <div>
                        <p className="text-app-text text-sm">排风运行时长</p>
                        <p className="text-app-text-muted text-xs">每次自动排风持续时间</p>
                      </div>
                      <Select
                        className="w-24"
                        value="30"
                        options={[
                          { value: '15', label: '15分钟' },
                          { value: '30', label: '30分钟' },
                          { value: '60', label: '60分钟' }
                        ]}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-app-text font-medium mb-4">报警通知</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-app-bg rounded-lg">
                      <div>
                        <p className="text-app-text text-sm">系统通知</p>
                        <p className="text-app-text-muted text-xs">接收系统弹窗通知</p>
                      </div>
                      <button
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          alertNotificationEnabled ? 'bg-primary-500' : 'bg-app-border'
                        }`}
                        onClick={() => setAlertNotificationEnabled(!alertNotificationEnabled)}
                      >
                        <motion.div
                          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                          animate={{ left: alertNotificationEnabled ? 'calc(100% - 20px)' : '4px' }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-app-bg rounded-lg">
                      <div>
                        <p className="text-app-text text-sm">声音提醒</p>
                        <p className="text-app-text-muted text-xs">严重报警时播放提示音</p>
                      </div>
                      <button
                        className="relative w-12 h-6 rounded-full bg-primary-500"
                      >
                        <motion.div
                          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                          animate={{ left: 'calc(100% - 20px)' }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="col-span-3 flex flex-col gap-4 min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-danger-400" />
                    实时报警
                    {storageRoomAlerts.length > 0 && (
                      <Badge variant="danger" size="sm" className="animate-blink">
                        {storageRoomAlerts.length}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardBody className="flex-1 overflow-auto p-0" ref={alertScrollRef}>
              <div className="divide-y divide-app-border">
                <AnimatePresence>
                  {storageRoomAlerts.length > 0 ? (
                    storageRoomAlerts.map((alert, index) => {
                      const room = allStorageRooms.find(r => r.id === alert.sourceId)
                      return (
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
                                <span className="font-medium text-app-text text-sm">{alert.title}</span>
                                <Badge
                                  variant={alert.level === 'CRITICAL' ? 'danger' : alert.level === 'WARNING' ? 'warning' : 'info'}
                                  size="sm"
                                >
                                  {AlertLevelLabel[alert.level]}
                                </Badge>
                              </div>
                              <p className="text-xs text-app-text-secondary mb-1">{alert.message}</p>
                              <div className="flex items-center gap-2 text-xs text-app-text-muted">
                                <Building2 className="w-3 h-3" />
                                <span className="truncate">{room?.institutionName || '未知机构'}</span>
                                <span>·</span>
                                <span>{room?.name || '未知房间'}</span>
                              </div>
                              <div className="text-xs text-app-text-muted mt-1">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {formatTime(alert.timestamp)}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })
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
        {showDetailPanel && selectedRoom && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={handleCloseDetail}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-[600px] bg-app-bg border-l border-app-border z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-app-border">
                <div>
                  <h3 className="text-lg font-semibold text-app-text">
                    {selectedMonitorState?.roomName || selectedRoom.name}
                  </h3>
                  <p className="text-sm text-app-text-secondary">
                    {selectedMonitorState?.institutionName || institutions.find(i => i.id === selectedRoom.institutionId)?.name || '未知机构'}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCloseDetail}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-auto p-4">
                <Tabs
                  tabs={[
                    { key: 'realtime', label: '实时数据' },
                    { key: 'history', label: '历史曲线' },
                    { key: 'alerts', label: '报警历史' },
                    { key: 'control', label: '设备控制' }
                  ]}
                  defaultTab="realtime"
                  onChange={setActiveTab}
                >
                  <TabPanel tabKey="realtime">
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <Card className="bg-app-bg-light">
                          <CardBody className="p-4 flex justify-center">
                            <Gauge
                              value={selectedMonitorState?.currentTemperature || 0}
                              min={15}
                              max={35}
                              label="当前温度"
                              unit="°C"
                              warningThreshold={tempThreshold}
                              criticalThreshold={tempThreshold + 5}
                              size="md"
                            />
                          </CardBody>
                        </Card>
                        <Card className="bg-app-bg-light">
                          <CardBody className="p-4 flex justify-center">
                            <Gauge
                              value={selectedMonitorState?.currentHumidity || 0}
                              min={30}
                              max={100}
                              label="当前湿度"
                              unit="%"
                              warningThreshold={humidityThreshold}
                              criticalThreshold={humidityThreshold + 10}
                              size="md"
                            />
                          </CardBody>
                        </Card>
                        <Card className="bg-app-bg-light">
                          <CardBody className="p-4 flex justify-center">
                            <Gauge
                              value={selectedMonitorState?.capacityUsage || 0}
                              min={0}
                              max={100}
                              label="容量使用率"
                              unit="%"
                              warningThreshold={80}
                              criticalThreshold={95}
                              size="md"
                            />
                          </CardBody>
                        </Card>
                      </div>

                      <Card className="bg-app-bg-light">
                        <CardBody className="p-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-app-text-muted text-sm mb-1">温度状态</p>
                              <Badge
                                variant={getStatusColor(selectedMonitorState?.temperatureStatus || 'NORMAL')}
                                dot
                                pulse={selectedMonitorState?.temperatureStatus !== 'NORMAL'}
                              >
                                {getStatusLabel(selectedMonitorState?.temperatureStatus || 'NORMAL')}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-app-text-muted text-sm mb-1">湿度状态</p>
                              <Badge
                                variant={getStatusColor(selectedMonitorState?.humidityStatus || 'NORMAL')}
                                dot
                                pulse={selectedMonitorState?.humidityStatus !== 'NORMAL'}
                              >
                                {getStatusLabel(selectedMonitorState?.humidityStatus || 'NORMAL')}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-app-text-muted text-sm mb-1">通风状态</p>
                              <Badge
                                variant={selectedDevice?.status === 'RUNNING' ? 'primary' : 'default'}
                                dot
                                pulse={selectedDevice?.status === 'RUNNING'}
                              >
                                {selectedDevice?.status === 'RUNNING' ? '运行中' : '已停止'}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-app-text-muted text-sm mb-1">最后更新</p>
                              <span className="text-app-text text-sm">
                                {selectedMonitorState?.lastUpdateTime
                                  ? formatDateTime(selectedMonitorState.lastUpdateTime)
                                  : '--'}
                              </span>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    </div>
                  </TabPanel>

                  <TabPanel tabKey="history">
                    <Card className="bg-app-bg-light">
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary-400" />
                            24小时温湿度趋势
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardBody className="p-0">
                        <div className="h-72">
                          {selectedMonitorState?.temperatureHistory && selectedMonitorState.temperatureHistory.length > 0 ? (
                            <ReactECharts option={temperatureHumidityChartOption} style={{ height: '100%', width: '100%' }} />
                          ) : (
                            <div className="h-full flex items-center justify-center text-app-text-muted">
                              暂无历史数据
                            </div>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  </TabPanel>

                  <TabPanel tabKey="alerts">
                    <Card className="bg-app-bg-light">
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-danger-400" />
                            环境报警历史
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardBody className="p-0 max-h-96 overflow-auto">
                        <div className="divide-y divide-app-border">
                          {roomAlerts.length > 0 ? (
                            roomAlerts.map((alert) => (
                              <div key={alert.id} className="p-3 hover:bg-app-bg transition-colors">
                                <div className="flex items-start gap-3">
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
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-app-text text-sm">{alert.title}</span>
                                      <Badge
                                        variant={alert.level === 'CRITICAL' ? 'danger' : alert.level === 'WARNING' ? 'warning' : 'info'}
                                        size="sm"
                                      >
                                        {AlertLevelLabel[alert.level]}
                                      </Badge>
                                      {alert.acknowledged && (
                                        <Badge variant="success" size="sm">已确认</Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-app-text-secondary mb-1">{alert.message}</p>
                                    <div className="text-xs text-app-text-muted">
                                      {formatDateTime(alert.timestamp)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center text-app-text-muted">
                              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-success-400 opacity-50" />
                              <p>暂无报警记录</p>
                            </div>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  </TabPanel>

                  <TabPanel tabKey="control">
                    <div className="space-y-4">
                      <Card className="bg-app-bg-light">
                        <CardHeader className="py-3">
                          <CardTitle className="text-base">
                            <div className="flex items-center gap-2">
                              <Wind className="w-4 h-4 text-primary-400" />
                              排风控制
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardBody>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-app-bg rounded-lg">
                              <div>
                                <p className="text-app-text text-sm font-medium">当前状态</p>
                                <p className="text-app-text-muted text-xs">
                                  {selectedDevice?.status === 'RUNNING' ? '排风系统正在运行' : '排风系统已停止'}
                                </p>
                              </div>
                              <StatusBadge
                                status={selectedDevice?.status === 'RUNNING' ? 'online' : 'offline'}
                                label={selectedDevice?.status === 'RUNNING' ? '运行中' : '已停止'}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <Button
                                variant={selectedDevice?.status === 'RUNNING' ? 'danger' : 'primary'}
                                leftIcon={selectedDevice?.status === 'RUNNING' ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                onClick={handleToggleVentilation}
                              >
                                {selectedDevice?.status === 'RUNNING' ? '停止排风' : '启动排风'}
                              </Button>
                              <Button
                                variant="secondary"
                                leftIcon={<RefreshCw className="w-4 h-4" />}
                                onClick={() => loadVentilationDevices()}
                              >
                                刷新状态
                              </Button>
                            </div>

                            <div className="p-3 bg-app-bg rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="text-app-text text-sm">自动控制</p>
                                  <p className="text-app-text-muted text-xs">湿度过高时自动启动排风</p>
                                </div>
                                <button
                                  className={`relative w-12 h-6 rounded-full transition-colors ${
                                    autoVentilationEnabled ? 'bg-primary-500' : 'bg-app-border'
                                  }`}
                                  onClick={handleToggleAutoVentilation}
                                >
                                  <motion.div
                                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                                    animate={{ left: autoVentilationEnabled ? 'calc(100% - 20px)' : '4px' }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                  />
                                </button>
                              </div>
                            </div>

                            {selectedDevice && (
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-app-text-muted">累计运行时长</p>
                                  <p className="text-app-text font-medium">{selectedDevice.runHours.toFixed(2)} 小时</p>
                                </div>
                                <div>
                                  <p className="text-app-text-muted">最后启动时间</p>
                                  <p className="text-app-text font-medium">
                                    {selectedDevice.lastStartTime ? formatDateTime(selectedDevice.lastStartTime) : '--'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardBody>
                      </Card>

                      <Card className="bg-app-bg-light">
                        <CardHeader className="py-3">
                          <CardTitle className="text-base">
                            <div className="flex items-center gap-2">
                              <Settings className="w-4 h-4 text-primary-400" />
                              阈值设置
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardBody>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm text-app-text-secondary mb-2">温度上限 (°C)</label>
                              <Input
                                type="number"
                                value={tempThreshold}
                                onChange={(e) => setTempThreshold(Number(e.target.value))}
                              />
                              <p className="text-xs text-app-text-muted mt-1">超过此温度将触发报警</p>
                            </div>
                            <div>
                              <label className="block text-sm text-app-text-secondary mb-2">湿度上限 (%)</label>
                              <Input
                                type="number"
                                value={humidityThreshold}
                                onChange={(e) => setHumidityThreshold(Number(e.target.value))}
                              />
                              <p className="text-xs text-app-text-muted mt-1">超过此湿度将触发报警和自动排风</p>
                            </div>
                            <Button variant="primary" className="w-full">
                              保存设置
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    </div>
                  </TabPanel>
                </Tabs>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export { StorageMonitor }
