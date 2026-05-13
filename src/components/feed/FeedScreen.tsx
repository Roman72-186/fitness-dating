'use client'

import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SwipeCard } from './SwipeCard'
import { ActionButtons } from './ActionButtons'
import { useFeed } from '@/hooks/useFeed'
import { useSwipe } from '@/hooks/useSwipe'

function MatchModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-xs rounded-3xl border border-brand-accent bg-brand-bg-2 p-8 text-center"
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.5 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 text-5xl">🎉</div>
        <h2 className="mb-2 text-2xl font-bold text-brand-text">Мэтч!</h2>
        <p className="mb-6 text-brand-text-muted">Вы понравились друг другу</p>
        <button
          onClick={onClose}
          className="w-full rounded-xl bg-brand-accent py-3 font-bold text-brand-bg"
        >
          Продолжить
        </button>
      </motion.div>
    </motion.div>
  )
}

export function FeedScreen() {
  const { profiles, loading, error, refresh, advanceAfterSwipe } = useFeed()
  const [showMatch, setShowMatch] = useState(false)
  const [busy, setBusy] = useState(false)

  const top = profiles[0]

  const handleActionDone = useCallback(({ ok, isMatch }: { ok: boolean; isMatch: boolean }) => {
    if (!ok) {
      setBusy(false)
      return
    }

    void (async () => {
      const advanced = await advanceAfterSwipe()
      setBusy(false)

      if (advanced && isMatch) {
        setShowMatch(true)
      }
    })()
  }, [advanceAfterSwipe])

  const { like, skip } = useSwipe(top?.user_id ?? '', handleActionDone)

  const handleLike = () => {
    if (busy || !top) return
    setBusy(true)
    void like()
  }

  const handleSkip = () => {
    if (busy || !top) return
    setBusy(true)
    void skip()
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-accent border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="mb-4 text-brand-text-muted">{error}</p>
        <button onClick={refresh} className="rounded-xl bg-brand-accent px-6 py-2 font-bold text-brand-bg">
          Повторить
        </button>
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 text-5xl">🏋️</div>
        <h3 className="mb-2 text-xl font-bold text-brand-text">Анкеты закончились</h3>
        <p className="mb-6 text-brand-text-muted">Возвращайся позже — появятся новые люди</p>
        <button onClick={refresh} className="rounded-xl bg-brand-accent px-6 py-2 font-bold text-brand-bg">
          Посмотреть заново
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative mx-4 mt-4 flex-1">
        {profiles.slice(1, 3).map((profile, index) => (
          <div
            key={profile.user_id}
            className="absolute inset-0 overflow-hidden rounded-3xl"
            style={{
              transform: `scale(${1 - (index + 1) * 0.04}) translateY(${(index + 1) * 10}px)`,
              zIndex: 10 - index,
            }}
          >
            <div className="h-full w-full bg-brand-bg-3" />
          </div>
        ))}

        <AnimatePresence>
          {top && (
            <motion.div
              key={top.user_id}
              className="absolute inset-0 z-20"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            >
              <SwipeCard profile={top} onLike={handleLike} onSkip={handleSkip} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ActionButtons onLike={handleLike} onSkip={handleSkip} disabled={busy || !top} />

      <AnimatePresence>
        {showMatch && <MatchModal onClose={() => setShowMatch(false)} />}
      </AnimatePresence>
    </div>
  )
}
