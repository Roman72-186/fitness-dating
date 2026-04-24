'use client'

import { useAuthStore } from '@/store/auth-store'
import { useCallback } from 'react'

export function useSwipe(targetId: string, onDone: (isMatch: boolean) => void) {
  const { token } = useAuthStore()

  const sendAction = useCallback(
    async (action: 'like' | 'skip') => {
      if (!token) return

      try {
        const res = await fetch('/api/action', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ targetId, action }),
        })

        if (!res.ok) return

        const data = await res.json()
        onDone(data.isMatch ?? false)
      } catch {
        // Ошибка сети — продолжаем без уведомления
        onDone(false)
      }
    },
    [token, targetId, onDone]
  )

  return { like: () => sendAction('like'), skip: () => sendAction('skip') }
}
