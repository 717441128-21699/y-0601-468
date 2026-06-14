import React, { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import {
  ClipboardList,
  Scale,
  Truck,
  Navigation,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Loader2
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getDashboardStatistics } from '@/services/reportService'
import { db } from '@/db'
import { formatWeight, formatDateTime, getRelativeTime } from '@/utils/format'
import {
  Alert,
  TransferOrder,
  AlertLevelType,
  TransferOrderStatusType,
  AlertLevelLabel,
  AlertLevelColor,
  TransferOrderStatusLabel
} from '@/types'

interface DashboardStats {
  todayRegistrations: number
  todayWeight: number
  pendingTransfers: number
  inTransitVehicles: number
  activeAlerts: number
  completedOrders: number
  categoryDistribution: { name: string; value: number; color: string }[]
  weeklyTrend: { date: string; registrations: number; weight: number }[]
}

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([])
  const [recentOrders, setRecentOrders] = useState<TransferOrder[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const [dashboardStats, alerts, orders] = await Promise.all([
        getDashboardStatistics(),
        db.alerts.orderBy('timestamp').reverse().limit(5).toArray(),
        db.transferOrders.orderBy('applyTime').reverse().limit(5).toArray()
      ])
      setStats(dashboardStats)
      setRecentAlerts(alerts)
      setRecentOrders(orders)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const getPieChartOption = () => {
    if (!stats) return {}
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#2D3B4F',
        borderColor: '#3A4A61',
        textStyle: {
          color: '#E2E8F0'
        },
        formatter: (params: any) => {
          return `${params.name}<br/>重量: ${params.value.toFixed(2)} kg<br/>占比: ${params.percent}%`
        }
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: {
          color: '#94A3B8',
          fontSize: 12
        },
        itemWidth: 12,
        itemHeight: 12,
        itemGap: 12
      },
      series: [
        {
          name: '废物类别',
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#253142',
            borderWidth: 2
          },
          label: {
            show: false
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
              color: '#E2E8F0'
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          data: stats.categoryDistribution.map((item) => ({
            name: item.name,
            value: item.value,
            itemStyle: {
              color: item.color
            }
          }))
        }
      ]
    }
  }

  const getLineChartOption = () => {
    if (!stats) return {}
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#2D3B4F',
        borderColor: '#3A4A61',
        textStyle: {
          color: '#E2E8F0'
        },
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: '#94A3B8'
          }
        }
      },
      legend: {
        data: ['登记数量', '重量(kg)'],
        textStyle: {
          color: '#94A3B8'
        },
        top: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: 60,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: stats.weeklyTrend.map((item) => item.date),
        axisLine: {
          lineStyle: {
            color: '#3A4A61'
          }
        },
        axisLabel: {
          color: '#94A3B8'
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '数量',
          axisLine: {
            lineStyle: {
              color: '#0066CC'
            }
          },
          axisLabel: {
            color: '#94A3B8'
          },
          splitLine: {
            lineStyle: {
              color: '#3A4A61',
              type: 'dashed'
            }
          }
        },
        {
          type: 'value',
          name: '重量(kg)',
          axisLine: {
            lineStyle: {
              color: '#43A047'
            }
          },
          axisLabel: {
            color: '#94A3B8'
          },
          splitLine: {
            show: false
          }
        }
      ],
      series: [
        {
          name: '登记数量',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            width: 3,
            color: '#0066CC'
          },
          itemStyle: {
            color: '#0066CC',
            borderWidth: 2,
            borderColor: '#253142'
          },
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
          data: stats.weeklyTrend.map((item) => item.registrations)
        },
        {
          name: '重量(kg)',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            width: 3,
            color: '#43A047'
          },
          itemStyle: {
            color: '#43A047',
            borderWidth: 2,
            borderColor: '#253142'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(67, 160, 71, 0.3)' },
                { offset: 1, color: 'rgba(67, 160, 71, 0.05)' }
              ]
            }
          },
          data: stats.weeklyTrend.map((item) => item.weight)
        }
      ]
    }
  }

  const alertColumns = [
    {
      key: 'level',
      title: '级别',
      width: 80,
      render: (row: Alert) => {
        const variantMap: Record<AlertLevelType, 'danger' | 'warning' | 'info'> = {
          CRITICAL: 'danger',
          WARNING: 'warning',
          INFO: 'info'
        }
        return (
          <Badge variant={variantMap[row.level]} size="sm">
            {AlertLevelLabel[row.level]}
          </Badge>
        )
      }
    },
    {
      key: 'title',
      title: '标题',
      render: (row: Alert) => (
        <div className="flex items-center gap-2">
          <AlertTriangle
            className="w-4 h-4 flex-shrink-0"
            style={{ color: AlertLevelColor[row.level] }}
          />
          <span className="truncate">{row.title}</span>
        </div>
      )
    },
    {
      key: 'timestamp',
      title: '时间',
      width: 140,
      render: (row: Alert) => (
        <span className="text-app-text-secondary text-sm">
          {getRelativeTime(row.timestamp)}
        </span>
      )
    }
  ]

  const orderColumns = [
    {
      key: 'orderNo',
      title: '订单号',
      width: 120,
      render: (row: TransferOrder) => (
        <span className="font-mono text-primary-400">{row.orderNo}</span>
      )
    },
    {
      key: 'status',
      title: '状态',
      width: 90,
      render: (row: TransferOrder) => {
        const variantMap: Record<TransferOrderStatusType, 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
          DRAFT: 'default',
          PENDING_AUDIT: 'warning',
          APPROVED: 'info',
          REJECTED: 'danger',
          IN_TRANSIT: 'primary',
          ARRIVED: 'info',
          COMPLETED: 'success'
        }
        return (
          <Badge variant={variantMap[row.status]} size="sm">
            {TransferOrderStatusLabel[row.status]}
          </Badge>
        )
      }
    },
    {
      key: 'totalWeight',
      title: '重量',
      width: 100,
      render: (row: TransferOrder) => (
        <span className="mono-number">{formatWeight(row.totalWeight)}</span>
      )
    },
    {
      key: 'applyTime',
      title: '申请时间',
      width: 160,
      render: (row: TransferOrder) => (
        <span className="text-app-text-secondary text-sm">
          {formatDateTime(row.applyTime)}
        </span>
      )
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
          <p className="text-app-text-secondary">正在加载数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="今日登记量"
          value={stats?.todayRegistrations || 0}
          unit="件"
          color="primary"
          icon={<ClipboardList className="w-6 h-6" />}
        />
        <StatCard
          title="今日重量"
          value={stats ? stats.todayWeight.toFixed(2) : '0.00'}
          unit="kg"
          color="info"
          icon={<Scale className="w-6 h-6" />}
        />
        <StatCard
          title="待转运"
          value={stats?.pendingTransfers || 0}
          unit="单"
          color="warning"
          icon={<Truck className="w-6 h-6" />}
        />
        <StatCard
          title="运输中"
          value={stats?.inTransitVehicles || 0}
          unit="辆"
          color="primary"
          icon={<Navigation className="w-6 h-6" />}
        />
        <StatCard
          title="活跃报警"
          value={stats?.activeAlerts || 0}
          unit="条"
          color="danger"
          icon={<AlertTriangle className="w-6 h-6" />}
        />
        <StatCard
          title="已完成"
          value={stats?.completedOrders || 0}
          unit="单"
          color="success"
          icon={<CheckCircle className="w-6 h-6" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>废物类别分布</CardTitle>
            <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
              查看详情
            </Button>
          </CardHeader>
          <CardBody>
            <div className="h-[320px]">
              <ReactECharts
                option={getPieChartOption()}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'canvas' }}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>近7天趋势</CardTitle>
            <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
              查看详情
            </Button>
          </CardHeader>
          <CardBody>
            <div className="h-[320px]">
              <ReactECharts
                option={getLineChartOption()}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'canvas' }}
              />
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-danger-500" />
              最近报警
            </CardTitle>
            <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
              查看全部
            </Button>
          </CardHeader>
          <CardBody className="p-0">
            <Table
              columns={alertColumns}
              data={recentAlerts}
              rowKey={(row) => row.id}
              emptyText="暂无报警数据"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary-500" />
              最近转运订单
            </CardTitle>
            <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
              查看全部
            </Button>
          </CardHeader>
          <CardBody className="p-0">
            <Table
              columns={orderColumns}
              data={recentOrders}
              rowKey={(row) => row.id}
              emptyText="暂无订单数据"
            />
          </CardBody>
        </Card>
      </div>
    </div>
  )
}


