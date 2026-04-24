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
  const { token, userId, setAuth } = useAuthStore()

  useEffect(() => {
    if (token) return

    // Способ 1: JWT из URL ?token= (WATBOT передаёт при открытии)
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

    // Способ 2: Telegram WebApp initData (стандартный Mini App)
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
        .then((data: { token?: string; userId?: string }) => {
          if (data.token && data.userId) {
            setAuth(data.token, data.userId)
          }
        })
        .catch(() => {})
    }
  }, [token, setAuth])

  return { token, userId }
}
