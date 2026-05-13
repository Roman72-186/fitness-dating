'use client'

import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SwipeCard } from './SwipeCard'
import { ActionButtons } from './ActionButtons'
import { useFeed } from '@/hooks/useFeed'
import { useSwipe } from '@/hooks/useSwipe'
import type { Profile } from '@/types'

function MatchModal({
  onClose,
  profileName,
}: {
  onClose: () => void
  profileName: string
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/68 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[color:color-mix(in_oklab,var(--color-brand-bg-2)_86%,black)] p-6 text-left shadow-float"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <span className="rounded-full bg-[color:color-mix(in_oklab,var(--color-brand-accent)_20%,transparent)] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white">
            Взаимный интерес
          </span>
          <span className="text-3xl text-brand-accent">✦</span>
        </div>

        <h2 className="display-title text-[2rem] font-semibold leading-[0.95] text-white">
          Это мэтч
        </h2>
        <p className="mt-3 max-w-[28ch] text-sm leading-6 text-white/78">
          У тебя совпадение с <span className="font-semibold text-white">{profileName}</span>. Теперь контакт уже не холодный.
        </p>

        <div className="mt-5 rounded-[1.4rem] bg-white/6 p-4 text-sm text-white/74">
          Написать можно будет на экране мэтчей. Сейчас можно сразу продолжить поиск.
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-[1.2rem] bg-brand-accent px-5 py-4 text-sm font-semibold text-brand-bg transition-transform active:scale-[0.99]"
        >
          Вернуться в ленту
        </button>
      </motion.div>
    </motion.div>
  )
}

export function FeedScreen() {
  const { profiles, loading, error, refresh, advanceAfterSwipe } = useFeed()
  const [showMatch, setShowMatch] = useState(false)
  const [busy, setBusy] = useState(false)
  const [matchedProfileName, setMatchedProfileName] = useState<string>('')
  const [lastActionProfile, setLastActionProfile] = useState<Profile | null>(null)

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
        setMatchedProfileName(lastActionProfile?.name ?? 'этим человеком')
        setShowMatch(true)
      }
    })()
  }, [advanceAfterSwipe, lastActionProfile?.name])

  const { like, skip } = useSwipe(top?.user_id ?? '', handleActionDone)

  const handleLike = () => {
    if (busy || !top) return
    setLastActionProfile(top)
    setBusy(true)
    void like()
  }

  const handleSkip = () => {
    if (busy || !top) return
    setLastActionProfile(top)
    setBusy(true)
    void skip()
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <div className="px-4 pt-5">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-brand-text-muted">
            FitMatch
          </p>
          <h1 className="display-title mt-2 text-3xl font-semibold text-brand-text">
            Собираем ленту
          </h1>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-accent border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col px-4 pb-6 pt-5">
        <div className="rounded-[1.8rem] border border-white/10 bg-brand-bg-2/80 p-5 shadow-panel">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-brand-text-muted">
            Лента временно недоступна
          </p>
          <h1 className="display-title mt-3 text-3xl font-semibold text-brand-text">
            Нужна ещё одна попытка
          </h1>
          <p className="mt-3 text-sm leading-6 text-brand-text/78">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-5 rounded-[1.1rem] bg-brand-accent px-6 py-3 text-sm font-semibold text-brand-bg"
          >
            Обновить ленту
          </button>
        </div>
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <div className="flex h-full flex-col px-4 pb-6 pt-5">
        <div className="rounded-[1.9rem] border border-white/10 bg-brand-bg-2/80 p-5 shadow-panel">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-brand-text-muted">
            Лента выдохлась
          </p>
          <h3 className="display-title mt-3 text-3xl font-semibold text-brand-text">
            Новых анкет пока нет
          </h3>
          <p className="mt-3 max-w-[32ch] text-sm leading-6 text-brand-text/78">
            Вернись позже: как только появятся новые люди из клубов и города, они сразу попадут сюда.
          </p>
          <button
            type="button"
            onClick={refresh}
            className="mt-5 rounded-[1.1rem] bg-brand-accent px-6 py-3 text-sm font-semibold text-brand-bg"
          >
            Проверить снова
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-brand-text-muted">
              FitMatch
            </p>
            <h1 className="display-title mt-2 text-[2.15rem] font-semibold leading-[0.95] text-brand-text">
              Лента
              <br />
              живых анкет
            </h1>
          </div>
          <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-3 py-2 text-right">
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-brand-text-muted">
              Сейчас
            </div>
            <div className="mt-1 text-lg font-semibold text-brand-text">{profiles.length}</div>
          </div>
        </div>

        <p className="mt-3 max-w-[34ch] text-sm leading-6 text-brand-text/78">
          Сначала смотри фото и атмосферу человека. Потом выбирай: идти дальше или оставить контакт на потом.
        </p>
      </div>

      <div className="relative mx-4 mt-4 flex-1">
        {profiles.slice(1, 3).map((profile, index) => (
          <div
            key={profile.user_id}
            className="absolute inset-0 overflow-hidden rounded-[1.9rem] border border-white/8"
            style={{
              transform: `scale(${1 - (index + 1) * 0.035}) translateY(${(index + 1) * 14}px)`,
              zIndex: 10 - index,
            }}
          >
            <div
              className="h-full w-full"
              style={{
                background:
                  index === 0
                    ? 'linear-gradient(180deg, color-mix(in oklab, var(--color-brand-bg-3) 82%, black) 0%, color-mix(in oklab, var(--color-brand-bg-2) 92%, black) 100%)'
                    : 'linear-gradient(180deg, color-mix(in oklab, var(--color-brand-bg-2) 88%, black) 0%, color-mix(in oklab, var(--color-brand-bg) 94%, black) 100%)',
              }}
            />
          </div>
        ))}

        <AnimatePresence>
          {top ? (
            <motion.div
              key={top.user_id}
              className="absolute inset-0 z-20"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            >
              <SwipeCard profile={top} onLike={handleLike} onSkip={handleSkip} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <ActionButtons onLike={handleLike} onSkip={handleSkip} disabled={busy || !top} />

      <AnimatePresence>
        {showMatch ? (
          <MatchModal
            onClose={() => setShowMatch(false)}
            profileName={matchedProfileName || 'этим человеком'}
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}
