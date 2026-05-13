'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useAuthStore } from '@/store/auth-store'
import type { Profile } from '@/types'

interface Props {
  fromUserId: string
  profile: Profile
  onDone: (isMatch: boolean) => void
}

export function LikeCard({ fromUserId, profile, onDone }: Props) {
  const { token } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const sendAction = async (action: 'like' | 'skip') => {
    if (!token || loading) return
    setLoading(true)

    try {
      const res = await fetch('/api/likes/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetId: fromUserId, action }),
      })

      const data = await res.json()
      onDone(action === 'like' ? (data.isMatch ?? false) : false)
    } catch {
      onDone(false)
    } finally {
      setLoading(false)
    }
  }

  const photo = profile.photos[0] ?? 'https://i.pravatar.cc/400'
  const location = [profile.club, profile.city].filter(Boolean).join(' • ')
  const aboutPreview =
    profile.about && profile.about.length > 112 ? `${profile.about.slice(0, 112).trim()}...` : profile.about

  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-brand-bg-2 px-4 py-4 shadow-panel">
      <div className="flex items-start gap-4">
        <div className="relative h-24 w-20 overflow-hidden rounded-[1.25rem] bg-brand-bg-3">
          <Image src={photo} alt={profile.name} fill className="object-cover" sizes="80px" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="mb-1 text-[0.7rem] uppercase tracking-[0.24em] text-brand-text-muted">Входящий сигнал</p>
              <h2 className="font-display text-xl text-brand-text">
                {profile.name}, {profile.age}
              </h2>
            </div>
            <span className="rounded-full border border-white/10 bg-brand-bg-3 px-3 py-1 text-[0.72rem] uppercase tracking-[0.18em] text-brand-text-muted">
              Ждёт ответ
            </span>
          </div>

          {location ? <p className="text-sm text-brand-text-muted">{location}</p> : null}
          {aboutPreview ? <p className="mt-3 text-sm leading-6 text-brand-text">{aboutPreview}</p> : null}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-[1.35rem] bg-brand-bg-3/70 px-3 py-3">
        <div className="min-w-0">
          <p className="text-[0.7rem] uppercase tracking-[0.2em] text-brand-text-muted">Быстрый выбор</p>
          <p className="text-sm text-brand-text">Оставь контакт в движении, не откладывая на потом.</p>
        </div>
        <div className="rounded-full border border-white/10 px-3 py-1 text-[0.72rem] uppercase tracking-[0.18em] text-brand-text-muted">
          2 шага
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => sendAction('skip')}
          disabled={loading}
          className="flex min-h-12 items-center justify-center rounded-[1.15rem] border border-white/12 bg-transparent px-4 py-3 text-sm font-semibold text-brand-text transition duration-200 hover:border-brand-skip hover:bg-brand-skip/12 focus-visible:border-brand-skip disabled:opacity-40"
        >
          Не сейчас
        </button>
        <button
          onClick={() => sendAction('like')}
          disabled={loading}
          className="flex min-h-12 items-center justify-center rounded-[1.15rem] bg-brand-like px-4 py-3 text-sm font-semibold text-brand-bg transition duration-200 hover:opacity-92 disabled:opacity-40"
        >
          Ответить лайком
        </button>
      </div>
    </article>
  )
}
