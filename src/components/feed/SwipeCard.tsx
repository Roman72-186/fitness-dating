'use client'

import { motion } from 'framer-motion'
import { PhotoCarousel } from './PhotoCarousel'
import type { Profile } from '@/types'

interface Props {
  profile: Profile
  onLike: () => void
  onSkip: () => void
}

export function SwipeCard({ profile }: Props) {
  const infoItems = [
    profile.club && `Клуб: ${profile.club}`,
    profile.city && `Город: ${profile.city}`,
  ].filter(Boolean) as string[]
  const locationLabel = [profile.club, profile.city].filter(Boolean).join(' • ') || null

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden rounded-[1.9rem] border border-white/10 bg-brand-bg-2 shadow-float"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
    >
      <div className="relative h-full w-full">
        <PhotoCarousel photos={profile.photos} name={profile.name} locationLabel={locationLabel} />

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 p-4 sm:p-5">
          <div className="rounded-[1.7rem] border border-white/10 bg-black/36 px-4 py-4 shadow-panel backdrop-blur-[10px]">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/60">
                  Кандидат на тренировку
                </p>
                <h2 className="display-title text-[1.9rem] font-semibold leading-[0.95] text-white">
                  {profile.name}
                  {profile.age > 0 ? (
                    <span className="ml-2 font-sans text-lg font-medium text-white/72">{profile.age}</span>
                  ) : null}
                </h2>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/70">
                Сейчас в ленте
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-[color:color-mix(in_oklab,var(--color-brand-accent)_22%,transparent)] px-3 py-1 text-xs font-medium text-white">
                Выбор без угадывания
              </span>
              {infoItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/86"
                >
                  {item}
                </span>
              ))}
            </div>

            {profile.about ? (
              <p className="mt-3 max-w-[32ch] text-sm leading-6 text-white/80">
                {profile.about}
              </p>
            ) : null}

            <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/10 pt-3 text-[0.72rem] text-white/62">
              <span>Фото переключаются кнопками по бокам</span>
              <span>Лайк и пропуск внизу</span>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute left-4 top-[6.6rem] z-20 rounded-full bg-[color:color-mix(in_oklab,var(--color-brand-like)_18%,transparent)] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/88">
          Живой контакт, не каталог
        </div>
      </div>
    </motion.div>
  )
}
