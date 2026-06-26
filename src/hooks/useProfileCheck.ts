'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'

const PROFILE_CHECK_TIMEOUT_MS = 8000

async function fetchProfileWithTimeout(token: string): Promise<Response> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), PROFILE_CHECK_TIMEOUT_MS)

  try {
    return await fetch('/api/profile', {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timeout)
  }
}

// Проверяем наличие анкеты в БД.
// Если пользователь вернулся из бота после регистрации, перепроверяем профиль
// на focus/visibilitychange, чтобы не залипать в старом состоянии hasProfile=false.
export function useProfileCheck() {
  const { token, userId, hasProfile, setHasProfile, setError } = useAuthStore()

  useEffect(() => {
    if (!token || !userId || userId.startsWith('guest_')) return

    let cancelled = false
    const authToken = token

    async function checkProfile() {
      try {
        const res = await fetchProfileWithTimeout(authToken)

        if (cancelled) return

        if (res.ok) {
          setHasProfile(true)
          return
        }

        if (res.status === 404) {
          setHasProfile(false)
          return
        }

        if (res.status === 401 || res.status === 403) {
          setError('Сессия устарела. Открой Mini App заново из бота.')
          return
        }

        setError('Не удалось проверить анкету. Попробуй открыть Mini App заново.')
        console.error('[useProfileCheck] неожиданный статус', res.status)
      } catch (err) {
        if (!cancelled) {
          setError('Не удалось проверить анкету. Проверь соединение и открой Mini App заново.')
        }
        console.error('[useProfileCheck]', err)
      }
    }

    if (hasProfile === null) {
      checkProfile()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkProfile()
      }
    }

    const handleFocus = () => {
      checkProfile()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [token, userId, hasProfile, setHasProfile, setError])
}
