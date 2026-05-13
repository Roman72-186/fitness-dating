'use client'

import { useToken } from '@/hooks/useToken'
import { useProfileCheck } from '@/hooks/useProfileCheck'
import { useAuthStore } from '@/store/auth-store'

interface Props {
  children: React.ReactNode
}

const REGISTRATION_BOT_URL =
  process.env.NEXT_PUBLIC_REGISTRATION_BOT_URL || 'https://t.me/BrightMatch_Bot'

function openRegistrationBot() {
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(REGISTRATION_BOT_URL)
  } else if (typeof window !== 'undefined') {
    window.open(REGISTRATION_BOT_URL, '_blank')
  }
}

export function AppShell({ children }: Props) {
  const { loading, error } = useToken()
  useProfileCheck()
  const { userId, hasProfile } = useAuthStore()

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

  // Авторизованный TG-пользователь, но анкеты нет → отправляем в бот заполнять
  const isGuest = !userId || userId.startsWith('guest_')
  if (!isGuest && hasProfile === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 text-5xl">📝</div>
        <h1 className="mb-2 text-xl font-bold text-brand-text">Анкета не заполнена</h1>
        <p className="mb-6 text-brand-text-muted text-sm">
          Чтобы знакомиться, заполни анкету в боте. После этого вернись сюда — лента откроется.
        </p>
        <button
          onClick={openRegistrationBot}
          className="rounded-full bg-brand-accent px-6 py-3 text-base font-semibold text-white shadow-lg active:opacity-80"
        >
          Заполнить анкету в боте
        </button>
      </div>
    )
  }

  // Ещё проверяем профиль — показываем спиннер
  if (!isGuest && hasProfile === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
