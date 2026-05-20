'use client'

import { AlertTriangle, ClipboardPenLine } from 'lucide-react'
import { useToken } from '@/hooks/useToken'
import { useProfileCheck } from '@/hooks/useProfileCheck'
import { useAuthStore } from '@/store/auth-store'
import { AppState } from '@/components/ui/AppState'
import { returnToBot } from '@/lib/telegram-webapp'

interface Props {
  children: React.ReactNode
}

export function AppShell({ children }: Props) {
  const { loading, error } = useToken()
  useProfileCheck()
  const { userId, hasProfile } = useAuthStore()

  if (loading) {
    return <AppState loading label="FitMatch" title="Загрузка" />
  }

  if (error) {
    return <AppState icon={AlertTriangle} label="Ошибка входа" title="Сессия не открылась" description={error} />
  }

  const isGuest = !userId || userId.startsWith('guest_')

  if (!isGuest && hasProfile === false) {
    return (
      <AppState
        icon={ClipboardPenLine}
        label="Анкета"
        title="Профиль пустой"
        actionLabel="Открыть бота"
        onAction={returnToBot}
      />
    )
  }

  if (!isGuest && hasProfile === null) {
    return <AppState loading label="Профиль" title="Проверка" />
  }

  return <>{children}</>
}
