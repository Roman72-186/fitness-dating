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

    // Способ 1: ?telegram_id= из URL (WATBOT передаёт как параметр ссылки)
    const params = new URLSearchParams(window.location.search)
    const telegramId = params.get('telegram_id')
    if (telegramId && /^\d+$/.test(telegramId)) {
      fetch('/api/auth/by-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: telegramId }),
      })
        .then((res) => res.json())
        .then((data: { token?: string; userId?: string; error?: string }) => {
          if (data.token && data.userId) {
            setAuth(data.token, data.userId)
            const url = new URL(window.location.href)
            url.searchParams.delete('telegram_id')
            window.history.replaceState({}, '', url.toString())
          } else {
            setError(data.error ?? 'Ошибка авторизации')
          }
        })
        .catch(() => setError('Нет соединения с сервером'))
      return
    }

    // Способ 2: ?token= из URL (прямой JWT, например для dev-тестирования)
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

    // Способ 3: Telegram WebApp initData (стандартный Mini App через BotFather)
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

    // Способ 4: гостевая UUID-сессия (браузер без Telegram)
    const STORAGE_KEY = 'fitMatch_guest_id'
    let guestId = localStorage.getItem(STORAGE_KEY)
    if (!guestId) {
      guestId = `guest_${crypto.randomUUID()}`
      localStorage.setItem(STORAGE_KEY, guestId)
    }
    fetch('/api/auth/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guest_id: guestId }),
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
  }, [token, setAuth, setLoading, setError])

  return { token, userId, loading, error }
}
