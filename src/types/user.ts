import { BaseEntity, UserRoleType } from './common'

export interface User extends BaseEntity {
  username: string
  password: string
  role: UserRoleType
  name: string
  phone: string
  email?: string
  avatar?: string
  institutionId?: string
  status: 'ACTIVE' | 'INACTIVE'
  lastLoginAt?: string
}

export interface CurrentUser extends Omit<User, 'password'> {
  permissions: string[]
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: CurrentUser
}

export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
}
