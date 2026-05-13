'use client'

import { useCallback, useEffect, useState } from 'react'
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
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-accent border-t-transparent" />
        <p className="mt-5 font-display text-2xl text-brand-text">Собираем мэтчи</p>
        <p className="mt-2 max-w-xs text-sm leading-6 text-brand-text-muted">Проверяем, кто уже готов перейти из ленты в реальный диалог.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col px-4 pb-24 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="max-w-[18rem]">
          <p className="mb-2 text-[0.7rem] uppercase tracking-[0.26em] text-brand-text-muted">Зона контакта</p>
          <h1 className="font-display text-[2rem] leading-none text-brand-text">Люди, с кем уже можно говорить</h1>
          <p className="mt-3 text-sm leading-6 text-brand-text-muted">
            Этот экран должен двигать к разговору. Никакой лишней драматургии: только готовые взаимные сигналы.
          </p>
        </div>
        <div className="rounded-[1.4rem] border border-white/10 bg-brand-bg-2 px-4 py-3 text-right shadow-panel">
          <p className="text-[0.7rem] uppercase tracking-[0.22em] text-brand-text-muted">Открыто</p>
          <p className="font-display text-3xl text-brand-text">{matches.length}</p>
        </div>
      </header>

      {matches.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/12 bg-brand-bg-2/75 px-8 text-center">
          <p className="text-[0.7rem] uppercase tracking-[0.24em] text-brand-text-muted">Пока пусто</p>
          <h2 className="mt-3 font-display text-3xl text-brand-text">Мэтчи ещё не собрались</h2>
          <p className="mt-3 max-w-xs text-sm leading-6 text-brand-text-muted">
            Когда ответный лайк совпадёт, здесь появится прямой путь к контакту без повторного выбора.
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto">
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
