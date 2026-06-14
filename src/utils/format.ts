export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function formatWeight(weight: number): string {
  return `${weight.toFixed(2)} kg`
}

export function formatTemperature(temp: number): string {
  return `${temp.toFixed(1)} °C`
}

export function formatHumidity(humidity: number): string {
  return `${humidity.toFixed(1)} %`
}

export function formatDistance(distance: number): string {
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(2)} km`
  }
  return `${distance.toFixed(0)} m`
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} 分钟`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours} 小时 ${mins} 分钟` : `${hours} 小时`
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0.00%'
  return `${((value / total) * 100).toFixed(2)}%`
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value)
}

export function getRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  if (diffHour < 24) return `${diffHour} 小时前`
  if (diffDay < 7) return `${diffDay} 天前`
  return formatDate(d)
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 11) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
