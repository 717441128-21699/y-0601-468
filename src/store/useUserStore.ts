import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, CurrentUser, UserRoleType } from '@/types'
import { db } from '@/db'

interface UserState {
  currentUser: CurrentUser | null
  users: User[]
  loading: boolean
  login: (usernameOrUser: string | User, password?: string) => Promise<boolean>
  logout: () => void
  loadUsers: () => Promise<void>
  loadAll: () => Promise<void>
  addUser: (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateUser: (id: string, user: Partial<User>) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  hasPermission: (permission: string) => boolean
}

const rolePermissions: Partial<Record<UserRoleType, string[]>> = {
  INSTITUTION_OPERATOR: ['waste:register', 'waste:view', 'transfer:apply', 'storage:view'],
  TRANSPORT_DISPATCHER: ['transport:dispatch', 'transport:view', 'vehicle:manage', 'route:plan'],
  ENVIRONMENTAL_AUDITOR: ['transfer:audit', 'alert:handle', 'statistics:view', 'report:export'],
  DISPOSAL_OPERATOR: ['waste:receive', 'waste:dispose', 'ewaybill:generate', 'ewaybill:view'],
  SYSTEM_ADMIN: ['*'],
  INSTITUTION: ['waste:register', 'waste:view', 'transfer:apply', 'storage:view'],
  TRANSPORT: ['transport:dispatch', 'transport:view', 'vehicle:manage', 'route:plan'],
  DISPOSAL: ['waste:receive', 'waste:dispose', 'ewaybill:generate', 'ewaybill:view'],
  REGULATOR: ['transfer:audit', 'alert:handle', 'statistics:view', 'report:export'],
  ADMIN: ['*'],
  SUPER_ADMIN: ['*']
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: [],
      loading: false,

      login: async (usernameOrUser, password) => {
        if (typeof usernameOrUser === 'object' && usernameOrUser !== null) {
          const user = usernameOrUser
          if (user.status === 'ACTIVE') {
            const permissions = rolePermissions[user.role] || []
            const { password: _, ...userWithoutPassword } = user
            set({ currentUser: { ...userWithoutPassword, permissions } })
            await db.users.update(user.id, { lastLoginAt: new Date().toISOString() })
            return true
          }
          return false
        }

        const username = usernameOrUser
        const allUsers = await db.users.toArray()
        const user = allUsers.find(u => u.username === username)
        if (user && user.password === password && user.status === 'ACTIVE') {
          const permissions = rolePermissions[user.role] || []
          const { password: _, ...userWithoutPassword } = user
          set({ currentUser: { ...userWithoutPassword, permissions } })
          await db.users.update(user.id, { lastLoginAt: new Date().toISOString() })
          return true
        }
        return false
      },

      loadAll: async () => {
        await get().loadUsers()
      },

      logout: () => {
        set({ currentUser: null })
      },

      loadUsers: async () => {
        set({ loading: true })
        try {
          const users = await db.users.orderBy('createdAt').reverse().toArray()
          set({ users })
        } finally {
          set({ loading: false })
        }
      },

      addUser: async (userData) => {
        const now = new Date().toISOString()
        const user: User = {
          ...userData,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now
        }
        await db.users.add(user)
        await get().loadUsers()
      },

      updateUser: async (id, userData) => {
        await db.users.update(id, { ...userData, updatedAt: new Date().toISOString() })
        await get().loadUsers()
      },

      deleteUser: async (id) => {
        await db.users.delete(id)
        await get().loadUsers()
      },

      hasPermission: (permission) => {
        const { currentUser } = get()
        if (!currentUser) return false
        if (currentUser.permissions.includes('*')) return true
        return currentUser.permissions.includes(permission)
      }
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({ currentUser: state.currentUser })
    }
  )
)
