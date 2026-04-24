'use client'

import { useState, useEffect, useCallback } from 'react'
import { MatchCard } from './MatchCard'
import { useAuthStore } from '@/store/auth-store'
import type { Profile } from '@/types'

interface MatchItem {
  user_a_id: string
  user_b_id: string
  timestamp: string
  profile: Profile
}

export function MatchesScreen() {
  const { token } = useAuthStore()
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMatches = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/matches', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setMatches(data.matches ?? [])
    } catch {
      setMatches([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <h1 className="text-xl font-bold text-brand-text px-4 pt-6 pb-4">Мэтчи</h1>

      {matches.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="text-5xl mb-4">⚡</div>
          <p className="text-brand-text-muted">Мэтчей пока нет</p>
          <p className="text-sm text-brand-text-muted mt-2">Лайкай анкеты — и они появятся!</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-24">
          {matches.map((item) => (
            <MatchCard
              key={`${item.user_a_id}:${item.user_b_id}`}
              profile={item.profile}
              matchDate={item.timestamp}
            />
          ))}
        </div>
      )}
    </div>
  )
}
