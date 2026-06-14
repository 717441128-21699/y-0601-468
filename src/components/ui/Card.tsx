import React from 'react'
import { motion } from 'framer-motion'
import { twMerge } from 'tailwind-merge'

interface CardProps {
  children: React.ReactNode
  className?: string
  hoverable?: boolean
  gradient?: boolean
  onClick?: () => void
}

export const Card: React.FC<CardProps> = ({ children, className, hoverable = false, gradient = false, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={twMerge(
        'bg-app-bg-light border border-app-border rounded-xl shadow-card',
        gradient && 'bg-gradient-card',
        hoverable && 'cursor-pointer transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1',
        className
      )}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => {
  return (
    <div className={twMerge('px-6 py-4 border-b border-app-border', className)}>
      {children}
    </div>
  )
}

interface CardTitleProps {
  children: React.ReactNode
  className?: string
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className }) => {
  return (
    <h3 className={twMerge('text-lg font-semibold text-app-text', className)}>
      {children}
    </h3>
  )
}

interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(({ children, className, ...props }, ref) => {
  return (
    <div ref={ref} className={twMerge('px-6 py-4', className)} {...props}>
      {children}
    </div>
  )
})
CardBody.displayName = 'CardBody'

interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className }) => {
  return (
    <div className={twMerge('px-6 py-4 border-t border-app-border', className)}>
      {children}
    </div>
  )
}
