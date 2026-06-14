import React from 'react'
import { twMerge } from 'tailwind-merge'

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  className?: string
  dot?: boolean
  pulse?: boolean
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-primary-500/20 text-primary-400 border-primary-500/30',
  success: 'bg-success-500/20 text-success-400 border-success-500/30',
  warning: 'bg-warning-500/20 text-warning-400 border-warning-500/30',
  danger: 'bg-danger-500/20 text-danger-400 border-danger-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  default: 'bg-app-bg-lighter text-app-text-secondary border-app-border'
}

const dotColors: Record<BadgeVariant, string> = {
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-blue-500',
  default: 'bg-app-text-muted'
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
  dot = false,
  pulse = false,
  style,
  ...props
}) => {
  return (
    <span
      className={twMerge(
        'inline-flex items-center gap-1.5 border rounded-full font-medium',
        variantStyles[variant],
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className
      )}
      style={style}
      {...props}
    >
      {dot && (
        <span
          className={twMerge(
            'w-2 h-2 rounded-full',
            dotColors[variant],
            pulse && 'animate-pulse'
          )}
        />
      )}
      {children}
    </span>
  )
}

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'warning' | 'critical' | 'normal'
  label: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const variants: Record<string, BadgeVariant> = {
    online: 'success',
    offline: 'default',
    warning: 'warning',
    critical: 'danger',
    normal: 'primary'
  }

  return (
    <Badge variant={variants[status]} dot pulse={status === 'online'}>
      {label}
    </Badge>
  )
}
