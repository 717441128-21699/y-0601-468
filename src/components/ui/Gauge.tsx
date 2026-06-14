import React from 'react'
import { motion } from 'framer-motion'
import { twMerge } from 'tailwind-merge'

interface GaugeProps {
  value: number
  min?: number
  max?: number
  label: string
  unit: string
  warningThreshold?: number
  criticalThreshold?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Gauge: React.FC<GaugeProps> = ({
  value,
  min = 0,
  max = 100,
  label,
  unit,
  warningThreshold,
  criticalThreshold,
  size = 'md',
  className
}) => {
  const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100)
  const rotation = (percentage / 100) * 180 - 90

  const getColor = () => {
    if (criticalThreshold !== undefined && value >= criticalThreshold) return '#E53935'
    if (warningThreshold !== undefined && value >= warningThreshold) return '#FB8C00'
    return '#0066CC'
  }

  const sizeMap = {
    sm: { width: 120, height: 70, strokeWidth: 8, valueSize: 'text-2xl', labelSize: 'text-xs' },
    md: { width: 180, height: 100, strokeWidth: 12, valueSize: 'text-3xl', labelSize: 'text-sm' },
    lg: { width: 240, height: 130, strokeWidth: 16, valueSize: 'text-4xl', labelSize: 'text-base' }
  }

  const dimensions = sizeMap[size]
  const color = getColor()

  const centerX = dimensions.width / 2
  const centerY = dimensions.height - 10
  const radius = Math.min(centerX, centerY) - dimensions.strokeWidth

  const circumference = Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className={twMerge('flex flex-col items-center', className)}>
      <div className="relative" style={{ width: dimensions.width, height: dimensions.height }}>
        <svg width={dimensions.width} height={dimensions.height}>
          <defs>
            <linearGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0.6" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
            </linearGradient>
          </defs>

          <path
            d={`M ${dimensions.strokeWidth} ${centerY} A ${radius} ${radius} 0 0 1 ${dimensions.width - dimensions.strokeWidth} ${centerY}`}
            fill="none"
            stroke="#3A4A61"
            strokeWidth={dimensions.strokeWidth}
            strokeLinecap="round"
          />

          <motion.path
            d={`M ${dimensions.strokeWidth} ${centerY} A ${radius} ${radius} 0 0 1 ${dimensions.width - dimensions.strokeWidth} ${centerY}`}
            fill="none"
            stroke={`url(#gradient-${label})`}
            strokeWidth={dimensions.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ transformOrigin: 'center', transform: 'rotate(0deg)' }}
          />

          <g transform={`translate(${centerX}, ${centerY})`}>
            <motion.line
              x1="0"
              y1="0"
              x2="0"
              y2={-radius + dimensions.strokeWidth}
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ rotate: -90 }}
              animate={{ rotate: rotation }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ transformOrigin: 'center bottom' }}
            />
            <circle cx="0" cy="0" r="6" fill={color} />
          </g>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <motion.span
            className={twMerge('font-mono font-bold text-app-text', dimensions.valueSize)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {value.toFixed(1)}
            <span className="text-app-text-muted text-sm ml-1">{unit}</span>
          </motion.span>
        </div>
      </div>
      <span className={twMerge('text-app-text-secondary mt-1', dimensions.labelSize)}>{label}</span>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
  color?: string
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  changeLabel = '较昨日',
  icon,
  color = '#0066CC',
  className
}) => {
  const isPositive = (change || 0) >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={twMerge(
        'relative overflow-hidden bg-gradient-card border border-app-border rounded-xl p-6',
        className
      )}
    >
      <div
        className="absolute top-0 right-0 w-24 h-24 opacity-10 rounded-full -translate-y-1/2 translate-x-1/2"
        style={{ backgroundColor: color }}
      />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-app-text-secondary text-sm mb-1">{label}</p>
            <motion.p
              className="text-3xl font-bold font-mono text-app-text"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {value}
            </motion.p>
          </div>
          {icon && (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {icon}
            </div>
          )}
        </div>
        {change !== undefined && (
          <div className="mt-3 flex items-center gap-1">
            <span
              className={twMerge(
                'text-sm font-medium',
                isPositive ? 'text-success-400' : 'text-danger-400'
              )}
            >
              {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
            </span>
            <span className="text-app-text-muted text-sm">{changeLabel}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
