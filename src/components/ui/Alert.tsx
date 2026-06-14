import React from 'react'
import { motion } from 'framer-motion'
import { twMerge } from 'tailwind-merge'
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react'

type AlertVariant = 'info' | 'success' | 'warning' | 'error'

interface AlertProps {
  variant?: AlertVariant
  title?: string
  message: string
  onClose?: () => void
  className?: string
  showIcon?: boolean
}

const variantStyles: Record<AlertVariant, { bg: string; border: string; icon: React.ReactNode }> = {
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
  },
  success: {
    bg: 'bg-success-500/10',
    border: 'border-success-500/30',
    icon: <CheckCircle className="w-5 h-5 text-success-400 flex-shrink-0" />
  },
  warning: {
    bg: 'bg-warning-500/10',
    border: 'border-warning-500/30',
    icon: <AlertTriangle className="w-5 h-5 text-warning-400 flex-shrink-0" />
  },
  error: {
    bg: 'bg-danger-500/10',
    border: 'border-danger-500/30',
    icon: <AlertCircle className="w-5 h-5 text-danger-400 flex-shrink-0" />
  }
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  message,
  onClose,
  className,
  showIcon = true
}) => {
  const styles = variantStyles[variant]

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={twMerge(
        'flex items-start gap-3 p-4 rounded-lg border',
        styles.bg,
        styles.border,
        className
      )}
    >
      {showIcon && styles.icon}
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-medium text-app-text mb-1">{title}</h4>}
        <p className="text-sm text-app-text-secondary">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded hover:bg-white/10 text-app-text-muted hover:text-app-text transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  )
}

interface AlertToastProps extends AlertProps {
  isVisible: boolean
}

export const AlertToast: React.FC<AlertToastProps> = ({ isVisible, ...props }) => {
  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 400 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 400 }}
      className="fixed top-4 right-4 z-50 w-96"
    >
      <Alert {...props} />
    </motion.div>
  )
}
