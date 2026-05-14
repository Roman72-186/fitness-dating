'use client'

import Image from 'next/image'
import { Phone, Send } from 'lucide-react'
import type { Profile } from '@/types'

interface Props {
  profile: Profile
  matchDate: string
  telegramUsername?: string | null
  phone?: string | null
}

export function MatchCard({ profile, matchDate, telegramUsername, phone }: Props) {
  const photo = profile.photos[0] ?? 'https://i.pravatar.cc/400'
  const username = telegramUsername || profile.telegram_username
  const tgLink = username ? `https://t.me/${username}` : `tg://user?id=${profile.user_id}`
  const date = new Date(matchDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  })
  const location = [profile.club, profile.city].filter(Boolean).join(' • ')
  const aboutPreview =
    profile.about && profile.about.length > 84 ? `${profile.about.slice(0, 84).trim()}...` : profile.about

  return (
    <article className="rounded-[1.8rem] border border-white/10 bg-brand-bg-2 p-4 shadow-panel">
      <div className="flex items-start gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[1.4rem] bg-brand-bg-3">
          <Image src={photo} alt={profile.name} fill className="object-cover" sizes="96px" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[0.7rem] uppercase tracking-[0.22em] text-brand-text-muted">Мэтч {date}</p>
          <h2 className="truncate font-display text-xl text-brand-text">
            {profile.name}, {profile.age}
          </h2>
          {location ? <p className="mt-2 truncate text-sm text-brand-text-muted">{location}</p> : null}
          {aboutPreview ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-brand-text">{aboutPreview}</p> : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
        <a
          href={tgLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center justify-center rounded-[1.15rem] bg-brand-accent px-4 py-3 text-sm font-semibold text-brand-bg transition hover:opacity-92"
        >
          <Send className="mr-2 h-4 w-4" aria-hidden="true" />
          Написать
        </a>
        {phone ? (
          <a
            href={`tel:${phone}`}
            className="flex min-h-12 min-w-12 items-center justify-center rounded-[1.15rem] border border-white/12 bg-brand-bg-3 px-4 py-3 text-sm font-semibold text-brand-text transition hover:border-brand-accent"
            aria-label="Позвонить"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </article>
  )
}
