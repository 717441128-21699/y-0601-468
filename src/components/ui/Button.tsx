import React from 'react'
import { motion } from 'framer-motion'
import { twMerge } from 'tailwind-merge'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variantStyles = {
  primary: 'bg-gradient-primary text-white hover:shadow-glow-primary hover:-translate-y-0.5',
  secondary: 'bg-app-bg-lighter text-app-text hover:bg-app-border border border-app-border',
  danger: 'bg-gradient-danger text-white hover:shadow-glow-danger hover:-translate-y-0.5',
  success: 'bg-gradient-success text-white hover:-translate-y-0.5',
  warning: 'bg-gradient-warning text-white hover:shadow-glow-warning hover:-translate-y-0.5',
  ghost: 'bg-transparent text-app-text hover:bg-app-bg-lighter border border-transparent hover:border-app-border'
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-lg'
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}) => {
  const buttonProps = {
    ...props,
    onDrag: undefined as any,
    onDragEnd: undefined as any,
    onDragStart: undefined as any,
    onAnimationStart: undefined as any,
    onAnimationEnd: undefined as any,
    onAnimationIteration: undefined as any,
  }
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
      className={twMerge(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-app-bg',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || loading}
      {...buttonProps}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {!loading && leftIcon}
      {children}
      {rightIcon}
    </motion.button>
  )
}
