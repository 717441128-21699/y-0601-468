import React from 'react'
import { twMerge } from 'tailwind-merge'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface Column<T> {
  key: keyof T | string
  title: React.ReactNode
  width?: string | number
  render?: (row: T, index: number) => React.ReactNode
  align?: 'left' | 'center' | 'right'
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  className?: string
  emptyText?: string
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
  }
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  loading,
  rowKey,
  onRowClick,
  className,
  emptyText = '暂无数据',
  pagination
}: TableProps<T>) {
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1

  return (
    <div className={twMerge('bg-app-bg-light border border-app-border rounded-xl overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-app-bg-lighter border-b border-app-border">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  style={{ width: col.width }}
                  className={twMerge(
                    'px-4 py-3 text-sm font-semibold text-app-text-secondary',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                    !col.align && 'text-left'
                  )}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-app-text-muted">
                  <div className="inline-block w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  <p className="mt-2">加载中...</p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-app-text-muted">
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={twMerge(
                    'border-b border-app-border/50 transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-app-bg-lighter',
                    index % 2 === 1 && 'bg-app-bg/30'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={twMerge(
                        'px-4 py-3 text-sm text-app-text',
                        col.align === 'center' && 'text-center',
                        col.align === 'right' && 'text-right'
                      )}
                    >
                      {col.render ? col.render(row, index) : row[col.key as keyof T]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total > 0 && (
        <div className="px-4 py-3 border-t border-app-border flex items-center justify-between">
          <div className="text-sm text-app-text-secondary">
            共 {pagination.total} 条，第 {pagination.page} / {totalPages} 页
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.page === 1}
              className="p-1.5 rounded hover:bg-app-bg-lighter disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsLeft className="w-4 h-4 text-app-text-secondary" />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-1.5 rounded hover:bg-app-bg-lighter disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-app-text-secondary" />
            </button>
            <span className="px-3 py-1 text-sm text-app-text">
              {pagination.page}
            </span>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === totalPages}
              className="p-1.5 rounded hover:bg-app-bg-lighter disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-app-text-secondary" />
            </button>
            <button
              onClick={() => pagination.onPageChange(totalPages)}
              disabled={pagination.page === totalPages}
              className="p-1.5 rounded hover:bg-app-bg-lighter disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsRight className="w-4 h-4 text-app-text-secondary" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
