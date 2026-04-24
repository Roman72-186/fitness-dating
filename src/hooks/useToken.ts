'use client'

import { useEffect } from 'react'
import { parseTokenFromUrl } from '@/lib/auth'
import { useAuthStore } from '@/store/auth-store'

/**
 * Hook для инициализации авторизации при первом открытии Mini App
 * Читает ?token= из URL, парсит payload, сохраняет в Zustand, убирает из URL
 */
export function useToken() {
  const { token, userId, setAuth } = useAuthStore()

  useEffect(() => {
    if (token) return // Уже авторизованы

    const urlToken = parseTokenFromUrl()
    if (!urlToken) return

    // Парсим payload локально (без верификации — верификация на сервере)
    try {
      const [, payloadBase64] = urlToken.split('.')
      const payload = JSON.parse(atob(payloadBase64))
      if (payload.sub) {
        setAuth(urlToken, payload.sub)
        // Убираем token из URL
        const url = new URL(window.location.href)
        url.searchParams.delete('token')
        window.history.replaceState({}, '', url.toString())
      }
    } catch {
      // Невалидный JWT формат — игнорируем
    }
  }, [token, setAuth])

  return { token, userId }
}
