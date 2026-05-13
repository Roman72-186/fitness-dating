'use client'

import Image from 'next/image'
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
    profile.about && profile.about.length > 96 ? `${profile.about.slice(0, 96).trim()}...` : profile.about

  return (
    <article className="rounded-[1.8rem] border border-white/10 bg-brand-bg-2 p-4 shadow-panel">
      <div className="flex items-start gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[1.4rem] bg-brand-bg-3">
          <Image src={photo} alt={profile.name} fill className="object-cover" sizes="96px" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="mb-1 text-[0.7rem] uppercase tracking-[0.22em] text-brand-text-muted">Готово к контакту</p>
              <h2 className="font-display text-xl text-brand-text">
                {profile.name}, {profile.age}
              </h2>
            </div>
            <span className="rounded-full border border-white/10 bg-brand-bg-3 px-3 py-1 text-[0.72rem] uppercase tracking-[0.18em] text-brand-text-muted">
              Мэтч {date}
            </span>
          </div>

          {location ? <p className="text-sm text-brand-text-muted">{location}</p> : null}
          {aboutPreview ? <p className="mt-3 text-sm leading-6 text-brand-text">{aboutPreview}</p> : null}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-[1.35rem] bg-brand-bg-3/72 px-3 py-3">
        <div className="min-w-0">
          <p className="text-[0.7rem] uppercase tracking-[0.2em] text-brand-text-muted">Следующий шаг</p>
          <p className="text-sm text-brand-text">Здесь уже не нужно выбирать. Осталось написать и перевести мэтч в разговор.</p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-[0.72rem] uppercase tracking-[0.18em] text-brand-text-muted">
          Контакт
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
        <a
          href={tgLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center justify-center rounded-[1.15rem] bg-brand-accent px-4 py-3 text-sm font-semibold text-brand-bg transition hover:opacity-92"
        >
          Написать в Telegram
        </a>
        {phone ? (
          <a
            href={`tel:${phone}`}
            className="flex min-h-12 min-w-12 items-center justify-center rounded-[1.15rem] border border-white/12 bg-brand-bg-3 px-4 py-3 text-sm font-semibold text-brand-text transition hover:border-brand-accent"
            aria-label="Позвонить"
          >
            ☎
          </a>
        ) : null}
      </div>
    </article>
  )
}
