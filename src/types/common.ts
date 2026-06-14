export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

export type WasteCategoryType = 'INFECTIOUS' | 'INJURY' | 'PATHOLOGICAL' | 'CHEMICAL' | 'DRUG'

export type VehicleStatusType = 'IDLE' | 'IN_TRANSIT' | 'MAINTENANCE' | 'DISABLED'

export type TransferOrderStatusType =
  | 'DRAFT'
  | 'PENDING_AUDIT'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'COMPLETED'

export type UserRoleType =
  | 'INSTITUTION_OPERATOR'
  | 'TRANSPORT_DISPATCHER'
  | 'ENVIRONMENTAL_AUDITOR'
  | 'DISPOSAL_OPERATOR'
  | 'SYSTEM_ADMIN'
  | 'INSTITUTION'
  | 'TRANSPORT'
  | 'DISPOSAL'
  | 'REGULATOR'
  | 'ADMIN'
  | 'SUPER_ADMIN'

export type UserRole = UserRoleType

export type AlertLevelType = 'INFO' | 'WARNING' | 'CRITICAL'

export type AlertTypeType =
  | 'TEMPERATURE_HIGH'
  | 'TEMPERATURE_LOW'
  | 'WEIGHT_DEVIATION'
  | 'HUMIDITY_HIGH'
  | 'STORAGE_FULL'
  | 'VEHICLE_FAULT'
  | 'DEVICE_OFFLINE'

export interface Alert {
  id: string
  type: AlertTypeType
  level: AlertLevelType
  title: string
  message: string
  sourceId: string
  sourceType: string
  timestamp: string
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
}

export interface GeoLocation {
  lat: number
  lng: number
}

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginationResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const WasteCategoryLabel: Record<WasteCategoryType, string> = {
  INFECTIOUS: '感染性废物',
  INJURY: '损伤性废物',
  PATHOLOGICAL: '病理性废物',
  CHEMICAL: '化学性废物',
  DRUG: '药物性废物'
}

export const WasteCategoryColor: Record<WasteCategoryType, string> = {
  INFECTIOUS: '#E53935',
  INJURY: '#FB8C00',
  PATHOLOGICAL: '#7B1FA2',
  CHEMICAL: '#1976D2',
  DRUG: '#388E3C'
}

export const VehicleStatusLabel: Record<VehicleStatusType, string> = {
  IDLE: '空闲',
  IN_TRANSIT: '运输中',
  MAINTENANCE: '维护中',
  DISABLED: '停用'
}

export const VehicleStatusColor: Record<VehicleStatusType, string> = {
  IDLE: '#43A047',
  IN_TRANSIT: '#0066CC',
  MAINTENANCE: '#FB8C00',
  DISABLED: '#64748B'
}

export const TransferOrderStatusLabel: Record<TransferOrderStatusType, string> = {
  DRAFT: '草稿',
  PENDING_AUDIT: '待审批',
  APPROVED: '已批准',
  REJECTED: '已驳回',
  IN_TRANSIT: '运输中',
  ARRIVED: '已到达',
  COMPLETED: '已完成'
}

export const TransferOrderStatusColor: Record<TransferOrderStatusType, string> = {
  DRAFT: '#64748B',
  PENDING_AUDIT: '#FB8C00',
  APPROVED: '#0066CC',
  REJECTED: '#E53935',
  IN_TRANSIT: '#7B1FA2',
  ARRIVED: '#1976D2',
  COMPLETED: '#43A047'
}

export const UserRoleLabel: Partial<Record<UserRoleType, string>> = {
  INSTITUTION_OPERATOR: '医疗机构操作员',
  TRANSPORT_DISPATCHER: '运输调度员',
  ENVIRONMENTAL_AUDITOR: '环保审批员',
  DISPOSAL_OPERATOR: '处置厂操作员',
  SYSTEM_ADMIN: '系统管理员',
  INSTITUTION: '医疗机构用户',
  TRANSPORT: '运输企业用户',
  DISPOSAL: '处置厂用户',
  REGULATOR: '环保监管用户',
  ADMIN: '系统管理员',
  SUPER_ADMIN: '超级管理员'
}

export const AlertLevelLabel: Record<AlertLevelType, string> = {
  INFO: '提示',
  WARNING: '警告',
  CRITICAL: '严重'
}

export const AlertLevelColor: Record<AlertLevelType, string> = {
  INFO: '#0066CC',
  WARNING: '#FB8C00',
  CRITICAL: '#E53935'
}
