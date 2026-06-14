import React from 'react'
import { twMerge } from 'tailwind-merge'
import { Search, X } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  onClear?: () => void
  searchable?: boolean
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onClear,
  searchable,
  className,
  value,
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-app-text-secondary mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {searchable && (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-text-muted" />
        )}
        {leftIcon && !searchable && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">{leftIcon}</div>
        )}
        <input
          value={value}
          className={twMerge(
            'w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg',
            'text-app-text placeholder-app-text-muted',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'transition-all duration-200',
            searchable && 'pl-10',
            leftIcon && !searchable && 'pl-10',
            (rightIcon || onClear) && 'pr-10',
            error && 'border-danger-500 focus:ring-danger-500',
            className
          )}
          {...props}
        />
        {onClear && value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-muted hover:text-app-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {rightIcon && !onClear && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightIcon}</div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-danger-500">{error}</p>}
    </div>
  )
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const TextArea: React.FC<TextAreaProps> = ({ label, error, className, ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-app-text-secondary mb-1.5">
          {label}
        </label>
      )}
      <textarea
        className={twMerge(
          'w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg',
          'text-app-text placeholder-app-text-muted',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          'transition-all duration-200 resize-y min-h-[100px]',
          error && 'border-danger-500 focus:ring-danger-500',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-danger-500">{error}</p>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: Array<{ value: string; label: string }>
}

export const Select: React.FC<SelectProps> = ({ label, error, options, className, ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-app-text-secondary mb-1.5">
          {label}
        </label>
      )}
      <select
        className={twMerge(
          'w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-lg',
          'text-app-text',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          'transition-all duration-200 appearance-none cursor-pointer',
          'bg-no-repeat bg-right',
          error && 'border-danger-500 focus:ring-danger-500',
          className
        )}
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.25rem', backgroundPosition: 'right 0.75rem center' }}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-danger-500">{error}</p>}
    </div>
  )
}
