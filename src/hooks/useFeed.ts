'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'
import type { Profile } from '@/types'

interface FeedState {
  profiles: Profile[]
  loading: boolean
  error: string | null
  hasMore: boolean
}

export function useFeed() {
  const { token } = useAuthStore()
  const [state, setState] = useState<FeedState>({
    profiles: [],
    loading: true,
    error: null,
    hasMore: false,
  })

  const fetchFeed = useCallback(async () => {
    if (!token) return

    setState((s) => ({ ...s, loading: true, error: null }))

    try {
      const res = await fetch('/api/feed', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Ошибка загрузки ленты')

      const data = await res.json()
      setState({
        profiles: data.profiles ?? [],
        loading: false,
        error: null,
        hasMore: data.hasMore ?? false,
      })
    } catch {
      setState((s) => ({ ...s, loading: false, error: 'Не удалось загрузить анкеты' }))
    }
  }, [token])

  useEffect(() => {
    fetchFeed()
  }, [fetchFeed])

  // Убрать первую карточку из стека
  const removeTop = useCallback(() => {
    setState((s) => ({ ...s, profiles: s.profiles.slice(1) }))
  }, [])

  return { ...state, refresh: fetchFeed, removeTop }
}
