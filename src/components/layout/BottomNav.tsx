'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Flame, Heart, UserRound, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth-store'
import type { LucideIcon } from 'lucide-react'

interface Tab {
  href: string
  label: string
  Icon: LucideIcon
}

const tabs: Tab[] = [
  { href: '/feed', label: 'Анкеты', Icon: Flame },
  { href: '/likes', label: 'Лайки', Icon: Heart },
  { href: '/matches', label: 'Мэтчи', Icon: Zap },
  { href: '/profile', label: 'Профиль', Icon: UserRound },
]

export function BottomNav() {
  const pathname = usePathname()
  const { token } = useAuthStore()
  const [likesCount, setLikesCount] = useState(0)
  const [myPhoto, setMyPhoto] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    fetch('/api/likes', { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.json())
      .then((data) => setLikesCount(data.likes?.length ?? 0))
      .catch(() => {})

    fetch('/api/profile/me', { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data?.ok) return
        const photos = data.profile?.photos
        const first = Array.isArray(photos) && photos.length > 0 ? photos[0] : data.profile?.photo_url
        if (first) setMyPhoto(first)
      })
      .catch(() => {})
  }, [token])

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 mx-auto w-full max-w-md px-3 pt-2"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      aria-label="Основная навигация"
    >
      <div className="grid grid-cols-4 gap-1 rounded-3xl border border-white/10 bg-brand-bg-2/96 p-2 shadow-float backdrop-blur-md">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href)
          const isProfile = href === '/profile'

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-h-[3.5rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 text-xs font-medium transition duration-200 ${
                active
                  ? 'bg-brand-accent text-brand-bg'
                  : 'text-brand-text-muted hover:bg-brand-bg-3/70 hover:text-brand-text'
              }`}
            >
              {isProfile && myPhoto ? (
                <span
                  className={`inline-flex h-6 w-6 overflow-hidden rounded-full border ${
                    active ? 'border-brand-bg/35' : 'border-white/20'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={myPhoto}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => setMyPhoto(null)}
                  />
                </span>
              ) : (
                <Icon className="h-5 w-5" aria-hidden="true" />
              )}

              <span className="max-w-full truncate">{label}</span>

              {href === '/likes' && likesCount > 0 ? (
                <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-skip px-1 text-[0.65rem] font-semibold leading-none text-white">
                  {likesCount > 9 ? '9+' : likesCount}
                </span>
              ) : null}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
