'use client'

import { useState, useEffect, useCallback } from 'react'
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
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-brand-bg-2 rounded-3xl p-8 text-center max-w-xs w-full border border-brand-accent"
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl mb-3">🎉</div>
        <h2 className="text-2xl font-bold text-brand-text mb-2">Мэтч!</h2>
        <p className="text-brand-text-muted mb-6">Теперь вы можете написать друг другу</p>
        <button onClick={onClose} className="w-full py-3 rounded-xl bg-brand-accent text-brand-bg font-bold">
          Отлично!
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
    setLikes((prev) => prev.filter((l) => l.from_user_id !== fromUserId))
    if (isMatch) setShowMatch(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <h1 className="text-xl font-bold text-brand-text px-4 pt-6 pb-4">Кто тебя лайкнул</h1>

      {likes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="text-5xl mb-4">👀</div>
          <p className="text-brand-text-muted">Пока никто не лайкнул</p>
          <p className="text-sm text-brand-text-muted mt-2">Заходи почаще — всё изменится!</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-24">
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

      <AnimatePresence>
        {showMatch && <MatchModal onClose={() => setShowMatch(false)} />}
      </AnimatePresence>
    </div>
  )
}
