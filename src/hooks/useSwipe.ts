'use client'

import { useAuthStore } from '@/store/auth-store'
import { useCallback } from 'react'

interface SwipeDonePayload {
  ok: boolean
  isMatch: boolean
}

export function useSwipe(targetId: string, onDone: (payload: SwipeDonePayload) => void) {
  const { token } = useAuthStore()

  const sendAction = useCallback(
    async (action: 'like' | 'skip') => {
      if (!token) {
        onDone({ ok: false, isMatch: false })
        return
      }

      try {
        const res = await fetch('/api/action', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ targetId, action }),
        })

        if (!res.ok) {
          onDone({ ok: false, isMatch: false })
          return
        }

        const data = await res.json()
        onDone({ ok: true, isMatch: data.isMatch ?? false })
      } catch {
        onDone({ ok: false, isMatch: false })
      }
    },
    [token, targetId, onDone]
  )

  return { like: () => sendAction('like'), skip: () => sendAction('skip') }
}
