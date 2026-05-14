'use client'

import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AppState } from '@/components/ui/AppState'
import { RefreshCcw, Sparkles } from 'lucide-react'
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
            Мэтч
          </span>
          <Sparkles className="h-7 w-7 text-brand-accent" aria-hidden="true" />
        </div>

        <h2 className="font-display text-[2rem] font-semibold leading-none text-white">Это мэтч</h2>
        <p className="mt-3 max-w-[28ch] text-sm leading-6 text-white/78">
          Совпадение с <span className="font-semibold text-white">{profileName}</span>.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-[1.2rem] bg-brand-accent px-5 py-4 text-sm font-semibold text-brand-bg transition-transform active:scale-[0.99]"
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
    return <AppState loading label="FitMatch" title="Собираем ленту" />
  }

  if (error) {
    return (
      <AppState
        icon={RefreshCcw}
        label="Лента недоступна"
        title="Повтори запрос"
        description={error}
        actionLabel="Обновить"
        onAction={refresh}
      />
    )
  }

  if (profiles.length === 0) {
    return (
      <AppState
        icon={RefreshCcw}
        title="ЛЕНТА ПУСТА"
        titleClassName="font-display text-3xl uppercase leading-none tracking-[0.04em] text-brand-text"
        actionLabel="Проверить"
        onAction={refresh}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-brand-text-muted">FitMatch</p>
            <h1 className="font-display mt-2 text-[2.05rem] font-semibold leading-none text-brand-text">
              Лента
            </h1>
          </div>
          <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-3 py-2 text-right">
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-brand-text-muted">
              Сейчас
            </div>
            <div className="mt-1 text-lg font-semibold text-brand-text">{profiles.length}</div>
          </div>
        </div>
      </div>

      <div className="relative mx-4 mt-4 min-h-0 flex-1">
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
