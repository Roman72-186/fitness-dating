'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { useState, useEffect } from 'react'

interface Tab {
  href: string
  label: string
  icon: string
}

const tabs: Tab[] = [
  { href: '/feed', label: 'Анкеты', icon: '🔥' },
  { href: '/likes', label: 'Лайки', icon: '❤️' },
  { href: '/matches', label: 'Мэтчи', icon: '⚡' },
  { href: '/profile', label: 'Профиль', icon: '👤' },
]

export function BottomNav() {
  const pathname = usePathname()
  const { token } = useAuthStore()
  const [likesCount, setLikesCount] = useState(0)
  const [myPhoto, setMyPhoto] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    fetch('/api/likes', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setLikesCount(data.likes?.length ?? 0))
      .catch(() => {})

    fetch('/api/profile/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.ok) return
        const photos = data.profile?.photos
        const first = Array.isArray(photos) && photos.length > 0 ? photos[0] : data.profile?.photo_url
        if (first) setMyPhoto(first)
      })
      .catch(() => {})
  }, [token])

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-brand-bg-2 border-t border-white/10 flex z-30">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href)
        const isProfile = tab.href === '/profile'
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors relative ${
              active ? 'text-brand-accent' : 'text-brand-text-muted'
            }`}
          >
            {isProfile && myPhoto ? (
              <span
                className={`inline-flex w-7 h-7 rounded-full overflow-hidden border-2 ${
                  active ? 'border-brand-accent' : 'border-white/20'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={myPhoto}
                  alt="Профиль"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setMyPhoto(null)}
                />
              </span>
            ) : (
              <span className="text-xl leading-none">{tab.icon}</span>
            )}
            <span className="text-xs font-medium">{tab.label}</span>
            {tab.href === '/likes' && likesCount > 0 && (
              <span className="absolute top-2 right-1/4 bg-brand-skip text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                {likesCount > 9 ? '9+' : likesCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
