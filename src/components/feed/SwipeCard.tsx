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

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden rounded-[1.9rem] border border-white/10 bg-brand-bg-2 shadow-float"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
    >
      <div className="relative h-full w-full">
        <PhotoCarousel photos={profile.photos} name={profile.name} current={0} />

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 p-3 sm:p-4">
          <div className="rounded-[1.55rem] border border-white/10 bg-black/34 px-4 py-4 shadow-panel backdrop-blur-[10px]">
            <div className="min-w-0">
              <h2 className="font-display text-[1.78rem] font-semibold leading-none text-white">
                {profile.name}
                {profile.age > 0 ? (
                  <span className="ml-2 font-sans text-lg font-medium text-white/72">{profile.age}</span>
                ) : null}
              </h2>
            </div>

            {infoItems.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {infoItems.map((item) => (
                  <span key={item} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/86">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}

            {profile.about ? (
              <p className="mt-3 line-clamp-3 max-w-[32ch] text-sm leading-6 text-white/80">{profile.about}</p>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
