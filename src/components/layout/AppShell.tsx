'use client'

import { useToken } from '@/hooks/useToken'

interface Props {
  children: React.ReactNode
}

/**
 * Обёртка для всего приложения
 * Проверяет наличие токена, отображает заглушку если его нет
 */
export function AppShell({ children }: Props) {
  const { token, userId } = useToken()

  if (!token || !userId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 text-4xl">🏋️</div>
        <h1 className="mb-2 text-xl font-bold text-brand-text">FitMatch</h1>
        <p className="text-brand-text-muted">
          Откройте приложение через бота
        </p>
      </div>
    )
  }

  return <>{children}</>
}
