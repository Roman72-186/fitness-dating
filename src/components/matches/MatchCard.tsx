'use client'

import Image from 'next/image'
import type { Profile } from '@/types'

interface Props {
  profile: Profile
  matchDate: string
}

export function MatchCard({ profile, matchDate }: Props) {
  const photo = profile.photos[0] ?? 'https://i.pravatar.cc/200'
  const tgLink = `https://t.me/${profile.user_id}`
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

      <a
        href={tgLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 px-4 py-2 rounded-xl bg-brand-accent text-brand-bg text-sm font-bold hover:opacity-90 transition-opacity"
      >
        Написать
      </a>
    </div>
  )
}
