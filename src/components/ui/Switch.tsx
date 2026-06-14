import React from 'react'
import { twMerge } from 'tailwind-merge'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  className?: string
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  className
}) => {
  return (
    <label className={twMerge('inline-flex items-center gap-3 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed', className)}>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
        />
        <div className={twMerge(
          'w-11 h-6 bg-app-bg-lighter rounded-full peer transition-colors duration-300',
          'border border-app-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500/30',
          'peer-checked:bg-gradient-primary peer-checked:border-primary-500'
        )} />
        <div className={twMerge(
          'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300',
          'peer-checked:translate-x-5'
        )} />
      </div>
      {label && <span className="text-sm text-app-text">{label}</span>}
    </label>
  )
}
