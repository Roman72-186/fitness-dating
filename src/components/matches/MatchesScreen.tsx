'use client'

import { useCallback, useEffect, useState } from 'react'
import { AppState } from '@/components/ui/AppState'
import { MatchCard } from './MatchCard'
import { useAuthStore } from '@/store/auth-store'
import type { Profile } from '@/types'

interface MatchItem {
  user_a_id: string
  user_b_id: string
  timestamp: string
  profile: Profile
  telegram_username?: string | null
  phone?: string | null
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
        cache: 'no-store',
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
    return <AppState loading label="Мэтчи" title="Загружаем" />
  }

  return (
    <div className="flex h-full min-h-0 flex-col px-4 pb-24 pt-6">
      <header className="mb-5 flex shrink-0 items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[2rem] leading-none text-brand-text">Мэтчи</h1>
        </div>
        <div className="rounded-[1.4rem] border border-white/10 bg-brand-bg-2 px-4 py-2 text-right shadow-panel">
          <p className="font-display text-3xl text-brand-text">{matches.length}</p>
        </div>
      </header>

      {matches.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/12 bg-brand-bg-2/75 px-8 text-center">
          <h2 className="font-display text-3xl text-brand-text">Мэтчей нет</h2>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          {matches.map((item) => (
            <MatchCard
              key={`${item.user_a_id}:${item.user_b_id}`}
              profile={item.profile}
              matchDate={item.timestamp}
              telegramUsername={item.telegram_username}
              phone={item.phone}
            />
          ))}
        </div>
      )}
    </div>
  )
}
