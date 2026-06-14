import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, User, Lock, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { useUserStore } from '@/store'
import { UserRole } from '@/types'

const roleOptions = [
  { value: 'INSTITUTION', label: '医疗机构用户' },
  { value: 'TRANSPORT', label: '运输企业用户' },
  { value: 'DISPOSAL', label: '处置厂用户' },
  { value: 'REGULATOR', label: '环保监管用户' },
  { value: 'ADMIN', label: '系统管理员' },
  { value: 'SUPER_ADMIN', label: '超级管理员' }
]

export const Login: React.FC = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('INSTITUTION')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login, users, loadAll } = useUserStore()

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const filteredUsers = users.filter(u => u.role === role && u.status === 'ACTIVE')
      const user = filteredUsers.find(u => u.username === username)

      if (!user || user.password !== password) {
        setError('用户名或密码错误')
        setLoading(false)
        return
      }

      await login(user)
      navigate('/dashboard')
    } catch (err) {
      setError('登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-app-bg via-app-bg-light to-app-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-400/5 rounded-full blur-3xl" />
      </div>

      <div className="absolute top-8 left-8 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-primary">
          <span className="text-white font-bold text-xl">医</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-app-text">医疗废物智慧管理系统</h1>
          <p className="text-sm text-app-text-muted">Medical Waste Intelligent Management System</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <Card gradient className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow-primary">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-app-text">欢迎登录</h2>
            <p className="text-app-text-muted mt-2">请选择角色并输入账号密码</p>
          </div>

          {error && (
            <Alert variant="error" message={error} onClose={() => setError('')} className="mb-6" />
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Select
              label="用户角色"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              options={roleOptions}
            />

            <Input
              label="用户名"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              leftIcon={<User className="w-4 h-4 text-app-text-muted" />}
              autoComplete="username"
            />

            <Input
              label="密码"
              type={showPassword ? 'text' : 'password'}
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4 text-app-text-muted" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-app-text-muted hover:text-app-text transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-app-text-secondary cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-app-border bg-app-bg text-primary-500 focus:ring-primary-500" />
                记住账号
              </label>
              <a href="#" className="text-primary-400 hover:text-primary-300 transition-colors">
                忘记密码?
              </a>
            </div>

            <Button type="submit" className="w-full" loading={loading} size="lg">
              登 录
            </Button>
          </form>

          <div className="mt-6 p-4 bg-app-bg rounded-lg border border-app-border">
            <p className="text-xs text-app-text-muted mb-2 font-medium">演示账号：</p>
            <div className="text-xs text-app-text-secondary space-y-1">
              <p>医疗机构: admin / 123456</p>
              <p>运输企业: transport / 123456</p>
              <p>监管部门: regulator / 123456</p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
