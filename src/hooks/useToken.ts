'use client'

import { useEffect } from 'react'
import { parseTokenFromUrl } from '@/lib/auth'
import { useAuthStore } from '@/store/auth-store'

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string
        ready: () => void
        expand: () => void
      }
    }
  }
}

function parseJwtPayload(token: string): { sub?: string } | null {
  try {
    const [, payloadBase64] = token.split('.')
    return JSON.parse(atob(payloadBase64)) as { sub?: string }
  } catch {
    return null
  }
}

export function useToken() {
  const { token, userId, loading, error, setAuth, setLoading, setError } = useAuthStore()

  useEffect(() => {
    if (token) return

    // Способ 1: JWT из ?token= (WATBOT передаёт при открытии)
    const urlToken = parseTokenFromUrl()
    if (urlToken) {
      const payload = parseJwtPayload(urlToken)
      if (payload?.sub) {
        setAuth(urlToken, payload.sub)
        const url = new URL(window.location.href)
        url.searchParams.delete('token')
        window.history.replaceState({}, '', url.toString())
        return
      }
    }

    // Способ 2: Telegram WebApp initData
    const tg = window.Telegram?.WebApp
    if (tg?.initData) {
      tg.ready()
      tg.expand()

      fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
      })
        .then((res) => res.json())
        .then((data: { token?: string; userId?: string; error?: string }) => {
          if (data.token && data.userId) {
            setAuth(data.token, data.userId)
          } else {
            setError(data.error ?? 'Ошибка авторизации')
          }
        })
        .catch(() => setError('Нет соединения с сервером'))

      return
    }

    // Нет ни токена, ни initData — не в Telegram
    setLoading(false)
  }, [token, setAuth, setLoading, setError])

  return { token, userId, loading, error }
}
