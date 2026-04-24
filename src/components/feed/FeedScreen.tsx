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
        exit={{ scale: 0.5 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl mb-3">🎉</div>
        <h2 className="text-2xl font-bold text-brand-text mb-2">Мэтч!</h2>
        <p className="text-brand-text-muted mb-6">Вы понравились друг другу</p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-brand-accent text-brand-bg font-bold"
        >
          Продолжить
        </button>
      </motion.div>
    </motion.div>
  )
}


export function FeedScreen() {
  const { profiles, loading, error, hasMore, refresh, removeTop } = useFeed()
  const [showMatch, setShowMatch] = useState(false)
  const [busy, setBusy] = useState(false)

  const top = profiles[0]
  const { like, skip } = useSwipe(top?.user_id ?? '', useCallback((isMatch: boolean) => {
    setBusy(false)
    removeTop()
    if (isMatch) setShowMatch(true)
  }, [removeTop]))

  const handleLike = () => {
    if (busy || !top) return
    setBusy(true)
    like()
  }

  const handleSkip = () => {
    if (busy || !top) return
    setBusy(true)
    skip()
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center">
        <p className="text-brand-text-muted mb-4">{error}</p>
        <button onClick={refresh} className="px-6 py-2 rounded-xl bg-brand-accent text-brand-bg font-bold">
          Повторить
        </button>
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center">
        <div className="text-5xl mb-4">🏋️</div>
        <h3 className="text-xl font-bold text-brand-text mb-2">Анкеты закончились</h3>
        <p className="text-brand-text-muted mb-6">
          {hasMore ? 'Загружаем ещё...' : 'Возвращайся позже — появятся новые люди'}
        </p>
        <button onClick={refresh} className="px-6 py-2 rounded-xl bg-brand-accent text-brand-bg font-bold">
          Посмотреть заново
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Стек карточек */}
      <div className="flex-1 relative mx-4 mt-4">
        {/* Фоновые карточки */}
        {profiles.slice(1, 3).map((profile, i) => (
          <div
            key={profile.user_id}
            className="absolute inset-0 rounded-3xl overflow-hidden"
            style={{
              transform: `scale(${1 - (i + 1) * 0.04}) translateY(${(i + 1) * 10}px)`,
              zIndex: 10 - i,
            }}
          >
            <div className="w-full h-full bg-brand-bg-3" />
          </div>
        ))}

        {/* Активная карточка */}
        <AnimatePresence>
          {top && (
            <motion.div
              key={top.user_id}
              className="absolute inset-0 z-20"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            >
              <SwipeCard
                profile={top}
                onLike={handleLike}
                onSkip={handleSkip}
                isTop
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Кнопки действий */}
      <ActionButtons onLike={handleLike} onSkip={handleSkip} disabled={busy || !top} />

      {/* Модалка мэтча */}
      <AnimatePresence>
        {showMatch && <MatchModal onClose={() => setShowMatch(false)} />}
      </AnimatePresence>
    </div>
  )
}
