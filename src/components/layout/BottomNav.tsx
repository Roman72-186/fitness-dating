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

  useEffect(() => {
    if (!token) return

    fetch('/api/likes', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setLikesCount(data.likes?.length ?? 0))
      .catch(() => {})
  }, [token])

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-brand-bg-2 border-t border-white/10 flex z-30">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors relative ${
              active ? 'text-brand-accent' : 'text-brand-text-muted'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
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
