'use client'

import Image from 'next/image'
import { useAuthStore } from '@/store/auth-store'
import { useState } from 'react'
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
      const res = await fetch('/api/action', {
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

  const photo = profile.photos[0] ?? 'https://i.pravatar.cc/200'

  return (
    <div className="flex items-center gap-4 p-4 bg-brand-bg-2 rounded-2xl">
      <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
        <Image src={photo} alt={profile.name} fill className="object-cover" sizes="64px" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-brand-text truncate">
          {profile.name}, {profile.age}
        </p>
        <p className="text-sm text-brand-text-muted truncate">
          {profile.club || profile.city || ''}
        </p>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => sendAction('skip')}
          disabled={loading}
          className="w-10 h-10 rounded-full border-2 border-brand-skip text-brand-skip flex items-center justify-center text-lg hover:bg-brand-skip hover:text-white transition-all disabled:opacity-40"
          aria-label="Отклонить"
        >
          ✕
        </button>
        <button
          onClick={() => sendAction('like')}
          disabled={loading}
          className="w-10 h-10 rounded-full border-2 border-brand-like text-brand-like flex items-center justify-center text-lg hover:bg-brand-like hover:text-white transition-all disabled:opacity-40"
          aria-label="Лайк в ответ"
        >
          ❤
        </button>
      </div>
    </div>
  )
}
