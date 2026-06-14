import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useUserStore } from '@/store'
import { MainLayout } from '@/components/Layout/MainLayout'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { WasteRegistration } from '@/pages/WasteRegistration'
import { TransportDispatch } from '@/pages/TransportDispatch'
import { TransportMonitor } from '@/pages/TransportMonitor'
import { StorageMonitor } from '@/pages/StorageMonitor'
import { EWaybill } from '@/pages/EWaybill'
import { VisualMap } from '@/pages/VisualMap'
import { Settings } from '@/pages/Settings'
import { db } from '@/db'
import { initializeMockData } from '@/utils/mock'

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRoles?: string[] }> = ({ children, requiredRoles }) => {
  const { currentUser } = useUserStore()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (requiredRoles && !requiredRoles.includes(currentUser.role) && !requiredRoles.includes('ALL')) {
    return <Navigate to="/dashboard" replace />
  }

  return <MainLayout>{children}</MainLayout>
}

export const AppRouter: React.FC = () => {
  const [initialized, setInitialized] = useState(false)
  const { loadAll, currentUser } = useUserStore()

  useEffect(() => {
    const init = async () => {
      try {
        const userCount = await db.users.count()
        if (userCount === 0) {
          await initializeMockData()
        }
        await loadAll()
      } catch (error) {
        console.error('初始化数据失败:', error)
      } finally {
        setInitialized(true)
      }
    }
    init()
  }, [loadAll])

  if (!initialized) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-app-text-secondary">系统初始化中...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={currentUser ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRoles={['ALL']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/waste-registration"
          element={
            <ProtectedRoute requiredRoles={['INSTITUTION', 'ADMIN', 'SUPER_ADMIN']}>
              <WasteRegistration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transport-dispatch"
          element={
            <ProtectedRoute requiredRoles={['TRANSPORT', 'ADMIN', 'SUPER_ADMIN', 'REGULATOR']}>
              <TransportDispatch />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transport-monitor"
          element={
            <ProtectedRoute requiredRoles={['TRANSPORT', 'ADMIN', 'SUPER_ADMIN', 'REGULATOR']}>
              <TransportMonitor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/storage-monitor"
          element={
            <ProtectedRoute requiredRoles={['INSTITUTION', 'ADMIN', 'SUPER_ADMIN', 'REGULATOR']}>
              <StorageMonitor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ewaybill"
          element={
            <ProtectedRoute requiredRoles={['ALL']}>
              <EWaybill />
            </ProtectedRoute>
          }
        />
        <Route
          path="/visual-map"
          element={
            <ProtectedRoute requiredRoles={['ADMIN', 'SUPER_ADMIN', 'REGULATOR']}>
              <VisualMap />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute requiredRoles={['ADMIN', 'SUPER_ADMIN']}>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={currentUser ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
