'use client'

import { motion } from 'framer-motion'
import { PhotoCarousel } from './PhotoCarousel'
import type { Profile } from '@/types'

interface Props {
  profile: Profile
  onLike: () => void
  onSkip: () => void
}

export function SwipeCard({ profile, onLike, onSkip }: Props) {
  const infoItems = [
    profile.club && `🏋️ ${profile.club}`,
    profile.city && `📍 ${profile.city}`,
  ].filter(Boolean) as string[]

  return (
    <motion.div
      className="absolute inset-0 rounded-3xl overflow-hidden"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
    >
      <div className="relative w-full h-full">
        <PhotoCarousel photos={profile.photos} name={profile.name} onLike={onLike} onSkip={onSkip} />

        {/* Градиент снизу */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        {/* Информация */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10 pointer-events-none">
          <h2 className="text-2xl font-bold text-white">
            {profile.name}{profile.age > 0 ? `, ${profile.age}` : ''}
          </h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {infoItems.map((item) => (
              <span
                key={item}
                className="text-xs bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded-full"
              >
                {item}
              </span>
            ))}
          </div>
          {profile.about && (
            <p className="mt-2 text-sm text-white/80 line-clamp-2">{profile.about}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
