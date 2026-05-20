'use client'

import { useEffect } from 'react'
import { parseTokenFromUrl } from '@/lib/auth'
import { useAuthStore } from '@/store/auth-store'

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string
        initDataUnsafe?: {
          user?: {
            id?: number
            first_name?: string
            last_name?: string
            username?: string
          }
        }
        ready: () => void
        expand: () => void
        openTelegramLink?: (url: string) => void
        close?: () => void
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

    // Способ 1: ?token= из URL (прямой JWT — dev или серверные интеграции)
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

    // Способ 2: Telegram WebApp initData (основной способ через BotFather)
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

    // Способ 3: гостевая UUID-сессия (браузер без Telegram)
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
