'use client'

import { useCallback, useEffect, useState } from 'react'
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
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-accent border-t-transparent" />
        <p className="mt-5 font-display text-2xl text-brand-text">Собираем анкету</p>
        <p className="mt-2 max-w-xs text-sm leading-6 text-brand-text-muted">Подтягиваем твой публичный образ так, как его увидят в ленте другие.</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <div className="rounded-full border border-white/10 bg-brand-bg-2 px-4 py-2 text-[0.72rem] uppercase tracking-[0.2em] text-brand-text-muted">
          Профиль не собран
        </div>
        <h2 className="mt-4 font-display text-3xl text-brand-text">Анкета ещё не появилась</h2>
        <p className="mt-3 max-w-xs text-sm leading-6 text-brand-text-muted">
          Создай её через бота, чтобы лента видела не пустой слот, а внятный образ с фото и описанием.
        </p>
      </div>
    )
  }

  const photo = profile.photos[0] ?? 'https://i.pravatar.cc/640'
  const profileSummary = profile.about || 'Краткий текст о себе пока не добавлен. Лучше заполнить его в боте, чтобы анкета не выглядела немой.'

  return (
    <div className="h-full overflow-y-auto px-4 pb-24 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="max-w-[18rem]">
          <p className="mb-2 text-[0.7rem] uppercase tracking-[0.26em] text-brand-text-muted">Твой образ</p>
          <h1 className="font-display text-[2rem] leading-none text-brand-text">Профиль без суеты</h1>
          <p className="mt-3 text-sm leading-6 text-brand-text-muted">
            Здесь важна не скорость, а впечатление. Это спокойная витрина того, что увидят другие в момент выбора.
          </p>
        </div>
        <div className="rounded-[1.4rem] border border-white/10 bg-brand-bg-2 px-4 py-3 text-right shadow-panel">
          <p className="text-[0.7rem] uppercase tracking-[0.22em] text-brand-text-muted">Статус</p>
          <p className="font-display text-2xl text-brand-text">В эфире</p>
        </div>
      </header>

      <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-brand-bg-2 shadow-float">
        <div className="relative aspect-[4/5] w-full bg-brand-bg-3">
          <Image src={photo} alt={profile.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 448px" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-brand-bg/18 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/12 bg-black/18 px-3 py-1 text-[0.72rem] uppercase tracking-[0.18em] text-white/78">
                Активная анкета
              </span>
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

        <div className="space-y-6 p-5">
          <section className="rounded-[1.5rem] bg-brand-bg-3/75 p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.22em] text-brand-text-muted">Как ты выглядишь в ленте</p>
            <p className="mt-3 text-sm leading-6 text-brand-text">
              Спокойный, собранный профиль без лишнего шума. Этот экран не соревнуется с лентой и не давит на действие.
            </p>
          </section>

          <section>
            <p className="text-[0.7rem] uppercase tracking-[0.22em] text-brand-text-muted">О себе</p>
            <p className="mt-3 text-sm leading-7 text-brand-text">{profileSummary}</p>
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-[1.35rem] bg-brand-bg-3/78 p-4">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-brand-text-muted">Город</p>
              <p className="mt-3 text-sm text-brand-text">{profile.city || 'Не указан'}</p>
            </div>
            <div className="rounded-[1.35rem] bg-brand-bg-3/78 p-4">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-brand-text-muted">Клуб</p>
              <p className="mt-3 text-sm text-brand-text">{profile.club || 'Не указан'}</p>
            </div>
          </section>

          <div className="rounded-[1.35rem] border border-white/10 px-4 py-4">
            <p className="text-[0.7rem] uppercase tracking-[0.22em] text-brand-text-muted">Редактирование</p>
            <p className="mt-3 text-sm leading-6 text-brand-text-muted">
              Менять анкету по-прежнему нужно через бота. Здесь задача одна: показать текущую версию без шума и догадок.
            </p>
          </div>
        </div>
      </article>
    </div>
  )
}
