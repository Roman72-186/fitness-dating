'use client'

import { useToken } from '@/hooks/useToken'

interface Props {
  children: React.ReactNode
}

export function AppShell({ children }: Props) {
  const { token, userId, loading, error } = useToken()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 text-4xl">⚠️</div>
        <h1 className="mb-2 text-xl font-bold text-brand-text">Ошибка входа</h1>
        <p className="text-brand-text-muted text-sm">{error}</p>
      </div>
    )
  }

  if (!token || !userId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 text-4xl">🏋️</div>
        <h1 className="mb-2 text-xl font-bold text-brand-text">FitMatch</h1>
        <p className="text-brand-text-muted">Откройте приложение через бота</p>
      </div>
    )
  }

  return <>{children}</>
}
