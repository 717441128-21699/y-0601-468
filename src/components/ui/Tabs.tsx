import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { twMerge } from 'tailwind-merge'

interface Tab {
  key: string
  label: string
  disabled?: boolean
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  onChange?: (key: string) => void
  className?: string
  tabClassName?: string
  children: React.ReactNode
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultTab,
  onChange,
  className,
  tabClassName,
  children
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.key)

  const handleTabClick = (key: string) => {
    if (key === activeTab) return
    setActiveTab(key)
    onChange?.(key)
  }

  return (
    <div className={className}>
      <div className="relative flex gap-1 p-1 bg-app-bg rounded-xl border border-app-border">
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            onClick={() => !tab.disabled && handleTabClick(tab.key)}
            disabled={tab.disabled}
            className={twMerge(
              'relative z-10 flex-1 px-4 py-2.5 text-sm font-medium transition-colors rounded-lg',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/30',
              activeTab === tab.key ? 'text-app-text' : 'text-app-text-muted hover:text-app-text-secondary',
              tab.disabled && 'opacity-50 cursor-not-allowed',
              tabClassName
            )}
          >
            {tab.label}
            {activeTab === tab.key && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-gradient-primary rounded-lg shadow-lg -z-10"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && child.props.tabKey === activeTab) {
            return <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {child}
            </motion.div>
          }
          return null
        })}
      </div>
    </div>
  )
}

interface TabPanelProps {
  tabKey: string
  children: React.ReactNode
}

export const TabPanel: React.FC<TabPanelProps> = ({ children }) => {
  return <div>{children}</div>
}
