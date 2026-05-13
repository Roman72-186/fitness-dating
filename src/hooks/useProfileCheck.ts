'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'

// Проверяем наличие анкеты в БД.
// Профиля нет → setHasProfile(false). AppShell покажет экран с редиректом в бот.
// Профиль есть → setHasProfile(true).
// Гостевые сессии (userId='guest_...') не проверяются — для них экран регистрации не нужен.
export function useProfileCheck() {
  const { token, userId, hasProfile, setHasProfile } = useAuthStore()

  useEffect(() => {
    if (!token || !userId || userId.startsWith('guest_')) return
    if (hasProfile !== null) return

    async function check() {
      try {
        const res = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          setHasProfile(true)
          return
        }

        if (res.status === 404) {
          setHasProfile(false)
          return
        }

        console.error('[useProfileCheck] неожиданный статус', res.status)
      } catch (err) {
        console.error('[useProfileCheck]', err)
      }
    }

    check()
  }, [token, userId, hasProfile, setHasProfile])
}
