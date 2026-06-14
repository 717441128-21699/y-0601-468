import React from 'react'
import { motion } from 'framer-motion'
import { twMerge } from 'tailwind-merge'

interface StatCardProps {
  title: string
  value: string | number
  unit?: string
  icon?: React.ReactNode
  trend?: number
  trendLabel?: string
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
  onClick?: () => void
}

const colorStyles = {
  primary: {
    bg: 'bg-primary-500/10',
    text: 'text-primary-400',
    border: 'border-primary-500/20',
    iconBg: 'bg-primary-500/20'
  },
  success: {
    bg: 'bg-success-500/10',
    text: 'text-success-400',
    border: 'border-success-500/20',
    iconBg: 'bg-success-500/20'
  },
  warning: {
    bg: 'bg-warning-500/10',
    text: 'text-warning-400',
    border: 'border-warning-500/20',
    iconBg: 'bg-warning-500/20'
  },
  danger: {
    bg: 'bg-danger-500/10',
    text: 'text-danger-400',
    border: 'border-danger-500/20',
    iconBg: 'bg-danger-500/20'
  },
  info: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    iconBg: 'bg-blue-500/20'
  }
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  icon,
  trend,
  trendLabel,
  color = 'primary',
  className,
  onClick
}) => {
  const styles = colorStyles[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onClick={onClick}
      className={twMerge(
        'bg-app-bg-light border border-app-border rounded-xl p-5 shadow-card',
        'transition-all duration-300',
        onClick && 'cursor-pointer hover:shadow-card-hover hover:-translate-y-1',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-app-text-secondary mb-2">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className={twMerge('text-3xl font-bold mono-number', styles.text)}>
              {value}
            </span>
            {unit && <span className="text-sm text-app-text-muted">{unit}</span>}
          </div>
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={twMerge(
                  'text-sm font-medium',
                  trend >= 0 ? 'text-success-400' : 'text-danger-400'
                )}
              >
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
              {trendLabel && <span className="text-sm text-app-text-muted">{trendLabel}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className={twMerge('p-3 rounded-lg', styles.iconBg)}>
            <div className={twMerge('w-6 h-6', styles.text)}>{icon}</div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
