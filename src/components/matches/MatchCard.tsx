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
  const photo = profile.photos[0] ?? 'https://i.pravatar.cc/200'
  // Приоритет: публичный username → universal deep-link по id → телефон
  const username = telegramUsername || profile.telegram_username
  const tgLink = username
    ? `https://t.me/${username}`
    : `tg://user?id=${profile.user_id}`

  const date = new Date(matchDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="flex items-center gap-4 p-4 bg-brand-bg-2 rounded-2xl">
      <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-brand-accent">
        <Image src={photo} alt={profile.name} fill className="object-cover" sizes="64px" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-brand-text truncate">
          {profile.name}, {profile.age}
        </p>
        <p className="text-xs text-brand-text-muted truncate">
          Мэтч {date} · {profile.club || profile.city || ''}
        </p>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <a
          href={tgLink}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl bg-brand-accent text-brand-bg text-sm font-bold hover:opacity-90 transition-opacity"
        >
          Написать
        </a>
        {phone && (
          <a
            href={`tel:${phone}`}
            className="w-10 h-10 rounded-xl bg-brand-bg-3 text-brand-text flex items-center justify-center hover:opacity-90 transition-opacity"
            aria-label="Позвонить"
          >
            📞
          </a>
        )}
      </div>
    </div>
  )
}
