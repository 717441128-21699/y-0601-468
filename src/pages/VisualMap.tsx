import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactECharts from 'echarts-for-react'
import {
  Truck,
  Factory,
  Building2,
  Thermometer,
  RefreshCw,
  Play,
  Pause,
  Calendar,
  Layers,
  Flame,
  Route,
  Navigation,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Package,
  Activity
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { useMonitorStore } from '@/store/useMonitorStore'
import { useTransportStore } from '@/store/useTransportStore'
import { useWasteStore } from '@/store/useWasteStore'
import {
  MedicalInstitution,
  Vehicle,
  DisposalFactory,
  HeatMapPoint,
  TransferOrder,
  TransferOrderStatusLabel,
  TransferOrderStatusColor,
  VehicleStatusLabel,
  VehicleStatusColor,
  WasteCategoryLabel,
  WasteCategoryColor,
  AlertLevelColor
} from '@/types'
import { formatWeight, formatDateTime, formatTime } from '@/utils/format'

type MapMode = 'heatmap' | 'track' | 'realtime'

interface LayerControl {
  institutions: boolean
  factories: boolean
  vehicles: boolean
  heatmap: boolean
}

interface DetailPopupData {
  type: 'institution' | 'vehicle' | 'factory'
  data: MedicalInstitution | Vehicle | DisposalFactory
}

const HeatMapLayer: React.FC<{ points: HeatMapPoint[]; show: boolean }> = ({ points, show }) => {
  const map = useMap()

  useEffect(() => {
    if (!show || points.length === 0) return

    const heatPoints = points.map((p) => [p.lat, p.lng, p.value] as [number, number, number])
    const heatLayer = (L as any).heatLayer(heatPoints, {
      radius: 35,
      blur: 20,
      maxZoom: 15,
      gradient: {
        0.1: '#43A047',
        0.3: '#0066CC',
        0.5: '#7B1FA2',
        0.7: '#FB8C00',
        0.9: '#E53935'
      }
    })

    heatLayer.addTo(map)

    return () => {
      map.removeLayer(heatLayer)
    }
  }, [points, show, map])

  return null
}

const createInstitutionIcon = (weight: number) => {
  const size = Math.min(Math.max(20, weight / 10 + 20), 40)
  const color = weight > 500 ? '#E53935' : weight > 200 ? '#FB8C00' : '#43A047'

  return L.divIcon({
    className: 'institution-marker',
    html: `<div style="width: ${size}px; height: ${size}px; background: ${color}; border: 3px solid #253142; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px ${color}80;">
      <svg xmlns="http://www.w3.org/2000/svg" width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  })
}

const createFactoryIcon = () => {
  return L.divIcon({
    className: 'factory-marker',
    html: `<div style="width: 44px; height: 44px; background: linear-gradient(135deg, #7B1FA2 0%, #512DA8 100%); border: 3px solid #253142; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(123, 31, 162, 0.5);">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  })
}

const createVehicleIcon = (status: string, direction: number = 0) => {
  const color = VehicleStatusColor[status as keyof typeof VehicleStatusColor] || '#64748B'
  const pulseClass = status === 'IN_TRANSIT' ? 'animate-pulse' : ''

  return L.divIcon({
    className: 'vehicle-marker',
    html: `<div style="width: 40px; height: 40px; transform: rotate(${direction}deg);" class="${pulseClass}">
      <div style="width: 100%; height: 100%; background: ${color}; border: 3px solid #253142; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px ${color}80;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M14 17h5"/><path d="M4 17h3"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
      </div>
      <div style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 10px solid ${color};"></div>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  })
}

export const VisualMap: React.FC = () => {
  const [mapMode, setMapMode] = useState<MapMode>('realtime')
  const [layers, setLayers] = useState<LayerControl>({
    institutions: true,
    factories: true,
    vehicles: true,
    heatmap: true
  })
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [timeRange, setTimeRange] = useState({ start: '00:00', end: '23:59' })
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0)
  const [detailPopup, setDetailPopup] = useState<DetailPopupData | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [heatMapData, setHeatMapData] = useState<HeatMapPoint[]>([])
  const [institutionStats, setInstitutionStats] = useState<{ name: string; weight: number }[]>([])
  const [categoryStats, setCategoryStats] = useState<{ name: string; value: number; color: string }[]>([])
  const [realtimeStats, setRealtimeStats] = useState({
    todayProduction: 0,
    todayTransport: 0,
    inTransitVehicles: 0
  })
  const [institutionTrend, setInstitutionTrend] = useState<{ date: string; weight: number }[]>([])
  const [vehicleMonitorData, setVehicleMonitorData] = useState<{ time: string; temperature: number; humidity: number }[]>([])
  const [factoryStats, setFactoryStats] = useState({ todayReceived: 0, currentStock: 0, capacity: 0 })

  const playIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeSlots = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

  const { getHeatMapData } = useMonitorStore()
  const { vehicles, orders, loadVehicles, loadOrders } = useTransportStore()
  const { institutions, factories, wasteRecords, categories, loadAllData } = useWasteStore()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([loadAllData(), loadVehicles(), loadOrders()])

      const heatData = await getHeatMapData()
      setHeatMapData(heatData)

      const today = new Date().toISOString().split('T')[0]
      const todayRecords = wasteRecords.filter((r) => r.createdAt.startsWith(today))
      const todayProduction = todayRecords.reduce((sum, r) => sum + r.weight, 0)

      const todayOrders = orders.filter((o) => o.departureTime?.startsWith(today))
      const todayTransport = todayOrders.reduce((sum, o) => sum + (o.totalWeight || 0), 0)
      const inTransitVehicles = vehicles.filter((v) => v.status === 'IN_TRANSIT').length

      setRealtimeStats({ todayProduction, todayTransport, inTransitVehicles })

      const instStats = institutions
        .map((inst) => {
          const instRecords = wasteRecords.filter((r) => r.institutionId === inst.id)
          return {
            name: inst.name,
            weight: instRecords.reduce((sum, r) => sum + r.weight, 0)
          }
        })
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 10)
      setInstitutionStats(instStats)

      const catStats = categories.map((cat) => {
        const catRecords = wasteRecords.filter((r) => r.categoryId === cat.id)
        return {
          name: WasteCategoryLabel[cat.type as keyof typeof WasteCategoryLabel] || cat.name,
          value: catRecords.reduce((sum, r) => sum + r.weight, 0),
          color: WasteCategoryColor[cat.type as keyof typeof WasteCategoryColor] || cat.color
        }
      })
      setCategoryStats(catStats)

      const trendData: { date: string; weight: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        const dayRecords = wasteRecords.filter((r) => r.createdAt.startsWith(dateStr))
        trendData.push({
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          weight: dayRecords.reduce((sum, r) => sum + r.weight, 0)
        })
      }
      setInstitutionTrend(trendData)

      if (factories.length > 0) {
        const factory = factories[0]
        const factoryTodayOrders = orders.filter(
          (o) => o.factoryId === factory.id && o.arrivalTime?.startsWith(today)
        )
        const todayReceived = factoryTodayOrders.reduce((sum, o) => sum + (o.totalWeight || 0), 0)
        setFactoryStats({
          todayReceived,
          currentStock: factory.currentDailyVolume || 0,
          capacity: factory.dailyCapacity || 10000
        })
      }

      const monitorData: { time: string; temperature: number; humidity: number }[] = []
      for (let i = 23; i >= 0; i--) {
        const time = new Date()
        time.setHours(time.getHours() - i)
        monitorData.push({
          time: `${String(time.getHours()).padStart(2, '0')}:00`,
          temperature: 2 + Math.random() * 6,
          humidity: 40 + Math.random() * 20
        })
      }
      setVehicleMonitorData(monitorData)
    } catch (error) {
      console.error('Failed to load map data:', error)
    } finally {
      setLoading(false)
    }
  }, [getHeatMapData, loadAllData, loadVehicles, loadOrders, wasteRecords, institutions, factories, categories, vehicles, orders])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentTimeIndex((prev) => (prev + 1) % 24)
      }, 1000)
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }
  }, [isPlaying])

  const toggleLayer = (key: keyof LayerControl) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleMarkerClick = (type: 'institution' | 'vehicle' | 'factory', data: any) => {
    setDetailPopup({ type, data })
  }

  const getBarChartOption = () => ({
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#2D3B4F',
      borderColor: '#3A4A61',
      textStyle: { color: '#E2E8F0' },
      formatter: (params: any) => {
        const param = params[0]
        return `${param.name}<br/>产生量: ${param.value.toFixed(2)} kg`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10px',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#3A4A61' } },
      axisLabel: { color: '#94A3B8', fontSize: 10 },
      splitLine: { lineStyle: { color: '#3A4A61', type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: institutionStats.map((item) => item.name.length > 6 ? item.name.slice(0, 6) + '...' : item.name),
      axisLine: { lineStyle: { color: '#3A4A61' } },
      axisLabel: { color: '#94A3B8', fontSize: 10 }
    },
    series: [
      {
        type: 'bar',
        data: institutionStats.map((item, index) => ({
          value: item.weight,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: '#0066CC' },
                { offset: 1, color: index < 3 ? '#E53935' : '#0099FF' }
              ]
            },
            borderRadius: [0, 4, 4, 0]
          }
        })),
        barWidth: 12
      }
    ]
  })

  const getPieChartOption = () => ({
    tooltip: {
      trigger: 'item',
      backgroundColor: '#2D3B4F',
      borderColor: '#3A4A61',
      textStyle: { color: '#E2E8F0' },
      formatter: (params: any) => `${params.name}<br/>${params.value.toFixed(2)} kg (${params.percent}%)`
    },
    legend: {
      orient: 'horizontal',
      bottom: 0,
      textStyle: { color: '#94A3B8', fontSize: 10 },
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 8
    },
    series: [
      {
        name: '废物类别',
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['50%', '40%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: '#253142',
          borderWidth: 2
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 12, fontWeight: 'bold', color: '#E2E8F0' }
        },
        data: categoryStats.filter((c) => c.value > 0).map((item) => ({
          name: item.name,
          value: item.value,
          itemStyle: { color: item.color }
        }))
      }
    ]
  })

  const getTrendChartOption = () => ({
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#2D3B4F',
      borderColor: '#3A4A61',
      textStyle: { color: '#E2E8F0' }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10px', containLabel: true },
    xAxis: {
      type: 'category',
      data: institutionTrend.map((item) => item.date),
      axisLine: { lineStyle: { color: '#3A4A61' } },
      axisLabel: { color: '#94A3B8', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#3A4A61' } },
      axisLabel: { color: '#94A3B8', fontSize: 10 },
      splitLine: { lineStyle: { color: '#3A4A61', type: 'dashed' } }
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, color: '#0066CC' },
        itemStyle: { color: '#0066CC', borderWidth: 2, borderColor: '#253142' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 102, 204, 0.3)' },
              { offset: 1, color: 'rgba(0, 102, 204, 0.05)' }
            ]
          }
        },
        data: institutionTrend.map((item) => item.weight)
      }
    ]
  })

  const getMonitorChartOption = () => ({
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#2D3B4F',
      borderColor: '#3A4A61',
      textStyle: { color: '#E2E8F0' }
    },
    legend: {
      data: ['温度(°C)', '湿度(%)'],
      textStyle: { color: '#94A3B8', fontSize: 10 },
      top: 0
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '30px', containLabel: true },
    xAxis: {
      type: 'category',
      data: vehicleMonitorData.map((item) => item.time),
      axisLine: { lineStyle: { color: '#3A4A61' } },
      axisLabel: { color: '#94A3B8', fontSize: 10 }
    },
    yAxis: [
      {
        type: 'value',
        name: '温度',
        axisLine: { lineStyle: { color: '#E53935' } },
        axisLabel: { color: '#94A3B8', fontSize: 10 },
        splitLine: { lineStyle: { color: '#3A4A61', type: 'dashed' } }
      },
      {
        type: 'value',
        name: '湿度',
        axisLine: { lineStyle: { color: '#0066CC' } },
        axisLabel: { color: '#94A3B8', fontSize: 10 },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '温度(°C)',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2, color: '#E53935' },
        itemStyle: { color: '#E53935' },
        data: vehicleMonitorData.map((item) => item.temperature)
      },
      {
        name: '湿度(%)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2, color: '#0066CC' },
        itemStyle: { color: '#0066CC' },
        data: vehicleMonitorData.map((item) => item.humidity)
      }
    ]
  })

  const getTrackLines = () => {
    if (mapMode !== 'track') return []

    const inTransitOrders = orders.filter((o) => o.status === 'IN_TRANSIT')
    return inTransitOrders.map((order) => {
      const institution = institutions.find((i) => i.id === order.institutionId)
      const factory = factories.find((f) => f.id === order.factoryId)
      const vehicle = vehicles.find((v) => v.id === order.vehicleId)

      if (!institution || !factory) return null

      const positions: [number, number][] = [
        [institution.lat, institution.lng],
        [vehicle?.currentLat || (institution.lat + factory.lat) / 2, vehicle?.currentLng || (institution.lng + factory.lng) / 2],
        [factory.lat, factory.lng]
      ]

      const color = TransferOrderStatusColor[order.status as keyof typeof TransferOrderStatusColor] || '#64748B'

      return { positions, color, order }
    }).filter(Boolean) as { positions: [number, number][]; color: string; order: TransferOrder }[]
  }

  const mapCenter: [number, number] = [39.9042, 116.4074]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 text-primary-500 animate-spin" />
          <p className="text-app-text-secondary">正在加载地图数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-app-bg">
      <div className="flex items-center justify-between px-4 py-3 bg-app-bg-light border-b border-app-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-app-bg rounded-lg p-1">
            <Button
              variant={mapMode === 'heatmap' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setMapMode('heatmap')}
              leftIcon={<Flame className="w-4 h-4" />}
            >
              热力图
            </Button>
            <Button
              variant={mapMode === 'track' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setMapMode('track')}
              leftIcon={<Route className="w-4 h-4" />}
            >
              运输轨迹
            </Button>
            <Button
              variant={mapMode === 'realtime' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setMapMode('realtime')}
              leftIcon={<Navigation className="w-4 h-4" />}
            >
              实时位置
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-app-text-secondary" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <input
              type="time"
              value={timeRange.start}
              onChange={(e) => setTimeRange((prev) => ({ ...prev, start: e.target.value }))}
              className="px-3 py-1.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <span className="text-app-text-secondary">至</span>
            <input
              type="time"
              value={timeRange.end}
              onChange={(e) => setTimeRange((prev) => ({ ...prev, end: e.target.value }))}
              className="px-3 py-1.5 bg-app-bg border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-app-text-secondary" />
            <div className="flex items-center gap-1 bg-app-bg rounded-lg p-1">
              <Button
                variant={layers.institutions ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => toggleLayer('institutions')}
                leftIcon={<Building2 className="w-3.5 h-3.5" />}
              >
                医疗机构
              </Button>
              <Button
                variant={layers.factories ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => toggleLayer('factories')}
                leftIcon={<Factory className="w-3.5 h-3.5" />}
              >
                处置厂
              </Button>
              <Button
                variant={layers.vehicles ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => toggleLayer('vehicles')}
                leftIcon={<Truck className="w-3.5 h-3.5" />}
              >
                运输车辆
              </Button>
              <Button
                variant={layers.heatmap ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => toggleLayer('heatmap')}
                leftIcon={<Flame className="w-3.5 h-3.5" />}
              >
                热力图
              </Button>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            刷新数据
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div
          className={`${sidebarCollapsed ? 'w-12' : 'w-80'} bg-app-bg-light border-r border-app-border flex flex-col transition-all duration-300`}
        >
          <div className="flex items-center justify-between p-3 border-b border-app-border">
            {!sidebarCollapsed && <span className="font-medium text-app-text">数据分析</span>}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>

          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              <div className="grid grid-cols-1 gap-2">
                <StatCard
                  title="今日产生量"
                  value={realtimeStats.todayProduction.toFixed(1)}
                  unit="kg"
                  color="primary"
                  icon={<TrendingUp className="w-5 h-5" />}
                />
                <StatCard
                  title="今日运输量"
                  value={realtimeStats.todayTransport.toFixed(1)}
                  unit="kg"
                  color="success"
                  icon={<Package className="w-5 h-5" />}
                />
                <StatCard
                  title="在途车辆数"
                  value={realtimeStats.inTransitVehicles}
                  unit="辆"
                  color="warning"
                  icon={<Truck className="w-5 h-5" />}
                />
              </div>

              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm">产生量 Top 10</CardTitle>
                </CardHeader>
                <CardBody className="py-2 px-4">
                  <div className="h-48">
                    <ReactECharts
                      option={getBarChartOption()}
                      style={{ height: '100%', width: '100%' }}
                      opts={{ renderer: 'canvas' }}
                    />
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm">类别分布</CardTitle>
                </CardHeader>
                <CardBody className="py-2 px-4">
                  <div className="h-48">
                    <ReactECharts
                      option={getPieChartOption()}
                      style={{ height: '100%', width: '100%' }}
                      opts={{ renderer: 'canvas' }}
                    />
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col relative">
          <div className="flex-1 relative">
            <MapContainer
              center={mapCenter}
              zoom={11}
              style={{ height: '100%', width: '100%', background: '#1A2332' }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                maxZoom={19}
              />

              <HeatMapLayer points={heatMapData} show={layers.heatmap && mapMode === 'heatmap'} />

              {layers.institutions &&
                institutions.map((inst) => {
                  const instWeight = wasteRecords
                    .filter((r) => r.institutionId === inst.id)
                    .reduce((sum, r) => sum + r.weight, 0)
                  return (
                    <Marker
                      key={inst.id}
                      position={[inst.lat, inst.lng]}
                      icon={createInstitutionIcon(instWeight)}
                      eventHandlers={{ click: () => handleMarkerClick('institution', inst) }}
                    >
                      <Popup className="dark-popup">
                        <div className="p-2">
                          <h4 className="font-medium text-app-text mb-1">{inst.name}</h4>
                          <p className="text-xs text-app-text-secondary mb-1">{inst.address}</p>
                          <p className="text-xs text-app-text-secondary">
                            产生量: <span className="text-primary-400">{formatWeight(instWeight)}</span>
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}

              {layers.factories &&
                factories.map((factory) => (
                  <Marker
                    key={factory.id}
                    position={[factory.lat, factory.lng]}
                    icon={createFactoryIcon()}
                    eventHandlers={{ click: () => handleMarkerClick('factory', factory) }}
                  >
                    <Popup className="dark-popup">
                      <div className="p-2">
                        <h4 className="font-medium text-app-text mb-1">{factory.name}</h4>
                        <p className="text-xs text-app-text-secondary mb-1">{factory.address}</p>
                        <p className="text-xs text-app-text-secondary">
                          日处理能力: <span className="text-primary-400">{factory.dailyCapacity} kg</span>
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

              {layers.vehicles &&
                vehicles.map((vehicle) => (
                  <Marker
                    key={vehicle.id}
                    position={[vehicle.currentLat, vehicle.currentLng]}
                    icon={createVehicleIcon(vehicle.status, Math.random() * 360)}
                    eventHandlers={{ click: () => handleMarkerClick('vehicle', vehicle) }}
                  >
                    <Popup className="dark-popup">
                      <div className="p-2">
                        <h4 className="font-medium text-app-text mb-1">{vehicle.plateNo}</h4>
                        <p className="text-xs text-app-text-secondary mb-1">
                          状态: <Badge variant={vehicle.status === 'IN_TRANSIT' ? 'primary' : 'default'} size="sm">
                            {VehicleStatusLabel[vehicle.status as keyof typeof VehicleStatusLabel]}
                          </Badge>
                        </p>
                        <p className="text-xs text-app-text-secondary">
                          温度: <span className="text-danger-400">{vehicle.temperature.toFixed(1)}°C</span>
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

              {mapMode === 'track' &&
                getTrackLines().map((track, index) => (
                  <Polyline
                    key={index}
                    positions={track.positions}
                    color={track.color}
                    weight={4}
                    opacity={0.8}
                    dashArray="10, 10"
                  />
                ))}

              {mapMode === 'track' &&
                getTrackLines().map((track, index) => (
                  <Circle
                    key={`mid-${index}`}
                    center={track.positions[1]}
                    radius={150}
                    color={track.color}
                    fillColor={track.color}
                    fillOpacity={0.3}
                  />
                ))}
            </MapContainer>

            <div className="absolute bottom-24 right-4 bg-app-bg-light/95 backdrop-blur-sm border border-app-border rounded-lg p-3 shadow-lg">
              <h4 className="text-sm font-medium text-app-text mb-2">图例</h4>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-success-500"></div>
                  <span className="text-xs text-app-text-secondary">低产生量</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-warning-500"></div>
                  <span className="text-xs text-app-text-secondary">中产生量</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-danger-500"></div>
                  <span className="text-xs text-app-text-secondary">高产生量</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-lg bg-purple-600"></div>
                  <span className="text-xs text-app-text-secondary">处置厂</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-primary-500"></div>
                  <span className="text-xs text-app-text-secondary">运输车辆</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-app-bg-light border-t border-app-border px-4 py-3">
            <div className="flex items-center gap-4">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                leftIcon={isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              >
                {isPlaying ? '暂停' : '播放'}
              </Button>

              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max="23"
                  value={currentTimeIndex}
                  onChange={(e) => setCurrentTimeIndex(Number(e.target.value))}
                  className="w-full h-2 bg-app-bg rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
                <div className="flex justify-between mt-1">
                  {timeSlots.filter((_, i) => i % 4 === 0).map((slot) => (
                    <span key={slot} className="text-xs text-app-text-secondary">{slot}</span>
                  ))}
                </div>
              </div>

              <div className="text-sm text-app-text-secondary">
                当前时间: <span className="text-app-text font-medium">{timeSlots[currentTimeIndex]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={detailPopup !== null}
        onClose={() => setDetailPopup(null)}
        title={
          detailPopup?.type === 'institution'
            ? '医疗机构详情'
            : detailPopup?.type === 'vehicle'
            ? '车辆详情'
            : '处置厂详情'
        }
        size="lg"
      >
        {detailPopup?.type === 'institution' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-app-text-secondary">机构名称</label>
                <p className="text-app-text font-medium">{(detailPopup.data as MedicalInstitution).name}</p>
              </div>
              <div>
                <label className="text-xs text-app-text-secondary">机构编码</label>
                <p className="text-app-text font-medium">{(detailPopup.data as MedicalInstitution).code}</p>
              </div>
              <div>
                <label className="text-xs text-app-text-secondary">地址</label>
                <p className="text-app-text">{(detailPopup.data as MedicalInstitution).address}</p>
              </div>
              <div>
                <label className="text-xs text-app-text-secondary">联系人</label>
                <p className="text-app-text">
                  {(detailPopup.data as MedicalInstitution).contactPerson} (
                  {(detailPopup.data as MedicalInstitution).contactPhone})
                </p>
              </div>
            </div>

            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">近期产生量趋势</CardTitle>
              </CardHeader>
              <CardBody className="py-2 px-4">
                <div className="h-40">
                  <ReactECharts
                    option={getTrendChartOption()}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                  />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">贮存间状态</CardTitle>
              </CardHeader>
              <CardBody className="py-2 px-4">
                <div className="space-y-2">
                  {(detailPopup.data as MedicalInstitution).storageRooms?.map((room) => (
                    <div key={room.id} className="flex items-center justify-between p-2 bg-app-bg rounded-lg">
                      <div>
                        <p className="text-sm text-app-text">{room.name}</p>
                        <p className="text-xs text-app-text-secondary">
                          容量: {room.currentVolume.toFixed(1)} / {room.capacity} kg
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity
                          className="w-4 h-4"
                          style={{
                            color:
                              room.currentVolume / room.capacity > 0.8
                                ? AlertLevelColor.CRITICAL
                                : room.currentVolume / room.capacity > 0.5
                                ? AlertLevelColor.WARNING
                                : AlertLevelColor.INFO
                          }}
                        />
                        <span className="text-xs text-app-text-secondary">
                          {((room.currentVolume / room.capacity) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {detailPopup?.type === 'vehicle' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-app-text-secondary">车牌号</label>
                <p className="text-app-text font-medium">{(detailPopup.data as Vehicle).plateNo}</p>
              </div>
              <div>
                <label className="text-xs text-app-text-secondary">车型</label>
                <p className="text-app-text">{(detailPopup.data as Vehicle).model}</p>
              </div>
              <div>
                <label className="text-xs text-app-text-secondary">状态</label>
                <Badge
                  variant={
                    (detailPopup.data as Vehicle).status === 'IN_TRANSIT'
                      ? 'primary'
                      : (detailPopup.data as Vehicle).status === 'IDLE'
                      ? 'success'
                      : 'default'
                  }
                >
                  {VehicleStatusLabel[(detailPopup.data as Vehicle).status as keyof typeof VehicleStatusLabel]}
                </Badge>
              </div>
              <div>
                <label className="text-xs text-app-text-secondary">载重</label>
                <p className="text-app-text">{formatWeight((detailPopup.data as Vehicle).currentWeight)}</p>
              </div>
              <div>
                <label className="text-xs text-app-text-secondary">实时温度</label>
                <div className="flex items-center gap-1">
                  <Thermometer className="w-4 h-4 text-danger-400" />
                  <span className="text-danger-400 font-medium">
                    {(detailPopup.data as Vehicle).temperature.toFixed(1)}°C
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs text-app-text-secondary">GPS设备</label>
                <p className="text-app-text font-mono">{(detailPopup.data as Vehicle).gpsDeviceId}</p>
              </div>
            </div>

            {orders
              .filter(
                (o) =>
                  o.vehicleId === (detailPopup.data as Vehicle).id &&
                  ['IN_TRANSIT', 'APPROVED'].includes(o.status)
              )
              .slice(0, 1)
              .map((order) => (
                <Card key={order.id}>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm">当前运输任务</CardTitle>
                  </CardHeader>
                  <CardBody className="py-2 px-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-app-text-secondary">订单号</span>
                      <span className="text-sm text-primary-400 font-mono">{order.orderNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-app-text-secondary">状态</span>
                      <Badge variant="primary" size="sm">
                        {TransferOrderStatusLabel[order.status as keyof typeof TransferOrderStatusLabel]}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-app-text-secondary">重量</span>
                      <span className="text-sm text-app-text">{formatWeight(order.totalWeight)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-app-text-secondary">出发时间</span>
                      <span className="text-sm text-app-text">{order.departureTime ? formatDateTime(order.departureTime) : '-'}</span>
                    </div>
                  </CardBody>
                </Card>
              ))}

            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">温湿度监控</CardTitle>
              </CardHeader>
              <CardBody className="py-2 px-4">
                <div className="h-40">
                  <ReactECharts
                    option={getMonitorChartOption()}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                  />
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {detailPopup?.type === 'factory' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-app-text-secondary">处置厂名称</label>
                <p className="text-app-text font-medium">{(detailPopup.data as DisposalFactory).name}</p>
              </div>
              <div>
                <label className="text-xs text-app-text-secondary">编码</label>
                <p className="text-app-text">{(detailPopup.data as DisposalFactory).code}</p>
              </div>
              <div>
                <label className="text-xs text-app-text-secondary">地址</label>
                <p className="text-app-text">{(detailPopup.data as DisposalFactory).address}</p>
              </div>
              <div>
                <label className="text-xs text-app-text-secondary">联系人</label>
                <p className="text-app-text">
                  {(detailPopup.data as DisposalFactory).contactPerson} (
                  {(detailPopup.data as DisposalFactory).contactPhone})
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <StatCard
                title="日处理能力"
                value={factoryStats.capacity}
                unit="kg"
                color="info"
                icon={<Factory className="w-5 h-5" />}
              />
              <StatCard
                title="今日接收量"
                value={factoryStats.todayReceived.toFixed(1)}
                unit="kg"
                color="primary"
                icon={<Package className="w-5 h-5" />}
              />
              <StatCard
                title="当前库存"
                value={factoryStats.currentStock}
                unit="kg"
                color={factoryStats.currentStock / factoryStats.capacity > 0.8 ? 'danger' : 'warning'}
                icon={<Activity className="w-5 h-5" />}
              />
            </div>

            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">库存使用率</CardTitle>
              </CardHeader>
              <CardBody className="py-4 px-4">
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <span className="text-xs font-semibold text-app-text-secondary">0%</span>
                    <span className="text-xs font-semibold text-app-text">
                      {((factoryStats.currentStock / factoryStats.capacity) * 100).toFixed(1)}%
                    </span>
                    <span className="text-xs font-semibold text-app-text-secondary">100%</span>
                  </div>
                  <div className="overflow-hidden h-3 text-xs flex rounded-full bg-app-bg">
                    <div
                      style={{ width: `${Math.min((factoryStats.currentStock / factoryStats.capacity) * 100, 100)}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                        factoryStats.currentStock / factoryStats.capacity > 0.8
                          ? 'bg-gradient-danger'
                          : factoryStats.currentStock / factoryStats.capacity > 0.5
                          ? 'bg-gradient-warning'
                          : 'bg-gradient-success'
                      }`}
                    ></div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">今日接收订单</CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                <div className="max-h-40 overflow-y-auto">
                  {orders
                    .filter(
                      (o) =>
                        o.factoryId === (detailPopup.data as DisposalFactory).id &&
                        o.arrivalTime?.startsWith(selectedDate)
                    )
                    .map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between px-4 py-2 border-b border-app-border last:border-0"
                      >
                        <div>
                          <p className="text-sm text-app-text font-mono">{order.orderNo}</p>
                          <p className="text-xs text-app-text-secondary">
                            {formatTime(order.arrivalTime || '')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-app-text">{formatWeight(order.totalWeight)}</p>
                          <Badge variant="success" size="sm">
                            {TransferOrderStatusLabel[order.status as keyof typeof TransferOrderStatusLabel]}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  {orders.filter(
                    (o) =>
                      o.factoryId === (detailPopup.data as DisposalFactory).id &&
                      o.arrivalTime?.startsWith(selectedDate)
                  ).length === 0 && (
                    <p className="text-center py-4 text-app-text-secondary text-sm">暂无接收订单</p>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </Modal>

      <style>{`
        .leaflet-container {
          background: #1A2332 !important;
        }
        .leaflet-control-zoom {
          display: none;
        }
        .leaflet-popup-content-wrapper {
          background: #2D3B4F;
          border-radius: 8px;
          border: 1px solid #3A4A61;
        }
        .leaflet-popup-tip {
          background: #2D3B4F;
        }
        .leaflet-popup-content {
          margin: 0;
        }
        .institution-marker,
        .vehicle-marker,
        .factory-marker {
          background: transparent;
          border: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #0066CC;
          cursor: pointer;
          border: 2px solid #253142;
          box-shadow: 0 0 10px rgba(0, 102, 204, 0.5);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #0066CC;
          cursor: pointer;
          border: 2px solid #253142;
          box-shadow: 0 0 10px rgba(0, 102, 204, 0.5);
        }
      `}</style>
    </div>
  )
}
