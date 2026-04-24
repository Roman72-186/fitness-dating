'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useAuthStore } from '@/store/auth-store'
import type { Profile } from '@/types'

export function ProfileCard() {
  const { token } = useAuthStore()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setProfile(data.profile ?? null)
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center p-8">
        <div className="text-5xl mb-4">😔</div>
        <p className="text-brand-text-muted">Профиль не найден</p>
        <p className="text-sm text-brand-text-muted mt-2">Создай анкету через бота</p>
      </div>
    )
  }

  const photo = profile.photos[0] ?? 'https://i.pravatar.cc/400'

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      {/* Фото */}
      <div className="relative w-full aspect-square">
        <Image src={photo} alt={profile.name} fill className="object-cover" sizes="448px" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h2 className="text-2xl font-bold text-white">
            {profile.name}, {profile.age}
          </h2>
        </div>
      </div>

      {/* Инфо */}
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {profile.city && (
            <span className="px-3 py-1 bg-brand-bg-3 rounded-full text-sm text-brand-text">
              📍 {profile.city}
            </span>
          )}
          {profile.club && (
            <span className="px-3 py-1 bg-brand-bg-3 rounded-full text-sm text-brand-text">
              🏋️ {profile.club}
            </span>
          )}
        </div>

        {profile.about && (
          <div>
            <p className="text-brand-text-muted text-sm mb-1">О себе</p>
            <p className="text-brand-text">{profile.about}</p>
          </div>
        )}

        <div className="pt-2 border-t border-white/10">
          <p className="text-xs text-brand-text-muted">
            Для изменения анкеты вернитесь в бота
          </p>
        </div>
      </div>
    </div>
  )
}
