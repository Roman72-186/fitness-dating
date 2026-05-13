'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LikeCard } from './LikeCard'
import { useAuthStore } from '@/store/auth-store'
import type { Profile } from '@/types'

interface LikeItem {
  from_user_id: string
  profile: Profile
}

function MatchModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/72 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md rounded-[2rem] border border-white/10 bg-brand-bg-2 p-6 shadow-float"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="rounded-full border border-white/10 bg-brand-bg-3 px-3 py-1 text-[0.72rem] uppercase tracking-[0.2em] text-brand-text-muted">
            Взаимный сигнал
          </span>
          <span className="text-2xl text-brand-like">♥</span>
        </div>
        <h2 className="font-display text-3xl text-brand-text">Ответ совпал</h2>
        <p className="mt-3 text-sm leading-6 text-brand-text-muted">
          Лайк уже превратился в контакт. Теперь этот человек появится в разделе мэтчей, и можно сразу перейти к
          диалогу.
        </p>
        <button
          onClick={onClose}
          className="mt-6 flex min-h-12 w-full items-center justify-center rounded-[1.2rem] bg-brand-like px-4 py-3 text-sm font-semibold text-brand-bg transition hover:opacity-92"
        >
          Открыть ленту дальше
        </button>
      </motion.div>
    </motion.div>
  )
}

export function LikesScreen() {
  const { token } = useAuthStore()
  const [likes, setLikes] = useState<LikeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showMatch, setShowMatch] = useState(false)

  const fetchLikes = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/likes', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setLikes(data.likes ?? [])
    } catch {
      setLikes([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchLikes()
  }, [fetchLikes])

  const handleDone = (fromUserId: string, isMatch: boolean) => {
    setLikes((prev) => prev.filter((item) => item.from_user_id !== fromUserId))
    if (isMatch) setShowMatch(true)
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-accent border-t-transparent" />
        <p className="mt-5 font-display text-2xl text-brand-text">Собираем входящие</p>
        <p className="mt-2 max-w-xs text-sm leading-6 text-brand-text-muted">Проверяем, кто уже увидел в тебе повод написать первым.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col px-4 pb-24 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="max-w-[18rem]">
          <p className="mb-2 text-[0.7rem] uppercase tracking-[0.26em] text-brand-text-muted">Входящие лайки</p>
          <h1 className="font-display text-[2rem] leading-none text-brand-text">Те, кто уже выбрал тебя</h1>
          <p className="mt-3 text-sm leading-6 text-brand-text-muted">
            Здесь не витрина, а быстрый разбор сигналов. Отвечай сразу, пока энергия не ушла.
          </p>
        </div>
        <div className="rounded-[1.4rem] border border-white/10 bg-brand-bg-2 px-4 py-3 text-right shadow-panel">
          <p className="text-[0.7rem] uppercase tracking-[0.22em] text-brand-text-muted">Сейчас</p>
          <p className="font-display text-3xl text-brand-text">{likes.length}</p>
        </div>
      </header>

      {likes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/12 bg-brand-bg-2/75 px-8 text-center">
          <p className="text-[0.7rem] uppercase tracking-[0.24em] text-brand-text-muted">Пауза</p>
          <h2 className="mt-3 font-display text-3xl text-brand-text">Входящие молчат</h2>
          <p className="mt-3 max-w-xs text-sm leading-6 text-brand-text-muted">
            Новых лайков пока нет. Вернись позже: этот экран должен ощущаться как поток входящих, а не как архив.
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto">
          {likes.map((item) => (
            <LikeCard
              key={item.from_user_id}
              fromUserId={item.from_user_id}
              profile={item.profile}
              onDone={(isMatch) => handleDone(item.from_user_id, isMatch)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>{showMatch ? <MatchModal onClose={() => setShowMatch(false)} /> : null}</AnimatePresence>
    </div>
  )
}
