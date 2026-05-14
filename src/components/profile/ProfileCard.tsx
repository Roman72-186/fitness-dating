'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { AppState } from '@/components/ui/AppState'
import { AdminLogin } from '@/components/admin/AdminLogin'
import { AdminStats } from '@/components/admin/AdminStats'
import { UserRound } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import type { Profile } from '@/types'

type AdminMode = 'profile' | 'login' | 'stats'

const ADMIN_TAP_LIMIT = 3
const ADMIN_TAP_WINDOW_MS = 1200

export function ProfileCard() {
  const { token } = useAuthStore()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [adminMode, setAdminMode] = useState<AdminMode>('profile')
  const [adminToken, setAdminToken] = useState<string | null>(null)
  const adminTapState = useRef({ count: 0, lastTapAt: 0 })

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

  function handleAdminTap(): void {
    const now = Date.now()
    const isInsideWindow = now - adminTapState.current.lastTapAt <= ADMIN_TAP_WINDOW_MS
    const nextCount = isInsideWindow ? adminTapState.current.count + 1 : 1

    adminTapState.current = { count: nextCount, lastTapAt: now }

    if (nextCount >= ADMIN_TAP_LIMIT) {
      adminTapState.current = { count: 0, lastTapAt: 0 }
      setAdminMode(adminToken ? 'stats' : 'login')
    }
  }

  function handleBackToProfile(): void {
    setAdminMode('profile')
  }

  function handleAdminSuccess(nextToken: string): void {
    setAdminToken(nextToken)
    setAdminMode('stats')
  }

  if (adminMode === 'login') {
    return <AdminLogin onBack={handleBackToProfile} onSuccess={handleAdminSuccess} />
  }

  if (adminMode === 'stats' && adminToken) {
    return <AdminStats token={adminToken} onBack={handleBackToProfile} />
  }

  if (loading) {
    return <AppState loading label="Профиль" title="Загружаем" />
  }

  if (!profile) {
    return <AppState icon={UserRound} label="Профиль" title="Анкеты нет" />
  }

  const photo = profile.photos[0] ?? 'https://i.pravatar.cc/640'
  const profileSummary = profile.about || 'Описание не добавлено'

  return (
    <div className="h-full min-h-0 overflow-y-auto px-4 pb-24 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <button
            type="button"
            onClick={handleAdminTap}
            className="block text-left font-display text-[2rem] leading-none text-brand-text"
            aria-label="Профиль"
          >
            Профиль
          </button>
        </div>
        <div className="shrink-0 rounded-[1.4rem] border border-white/10 bg-brand-bg-2 px-4 py-3 text-right shadow-panel">
          <p className="text-[0.7rem] uppercase tracking-[0.22em] text-brand-text-muted">Статус</p>
          <p className="font-display text-2xl text-brand-text">АКТИВЕН</p>
        </div>
      </header>

      <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-brand-bg-2 shadow-float">
        <div className="relative aspect-[4/5] w-full bg-brand-bg-3">
          <Image src={photo} alt={profile.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 448px" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-brand-bg/18 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <div className="mb-3 flex flex-wrap gap-2">
              {profile.club ? (
                <span className="rounded-full border border-white/12 bg-black/18 px-3 py-1 text-[0.72rem] uppercase tracking-[0.18em] text-white/78">
                  {profile.club}
                </span>
              ) : null}
            </div>
            <h2 className="font-display text-[2.2rem] leading-none text-white">
              {profile.name}, {profile.age}
            </h2>
            {profile.city ? <p className="mt-3 text-sm text-white/76">{profile.city}</p> : null}
          </div>
        </div>

        <div className="space-y-5 p-5">
          <section>
            <p className="text-[0.7rem] uppercase tracking-[0.22em] text-brand-text-muted">О себе</p>
            <p className="mt-3 text-sm leading-7 text-brand-text">{profileSummary}</p>
          </section>
        </div>
      </article>
    </div>
  )
}
