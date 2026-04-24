'use client'

import { useCallback } from 'react'
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { PhotoCarousel } from './PhotoCarousel'
import type { Profile } from '@/types'

interface Props {
  profile: Profile
  onLike: () => void
  onSkip: () => void
  isTop: boolean
}

const SWIPE_THRESHOLD = 120

export function SwipeCard({ profile, onLike, onSkip, isTop }: Props) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-15, 15])
  const likeOpacity = useTransform(x, [20, 100], [0, 1])
  const skipOpacity = useTransform(x, [-100, -20], [1, 0])

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (info.offset.x > SWIPE_THRESHOLD) {
        onLike()
      } else if (info.offset.x < -SWIPE_THRESHOLD) {
        onSkip()
      }
    },
    [onLike, onSkip]
  )

  const infoItems = [
    profile.club && `🏋️ ${profile.club}`,
    profile.city && `📍 ${profile.city}`,
  ].filter(Boolean) as string[]

  return (
    <motion.div
      className="absolute inset-0 rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing"
      style={{ x, rotate }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.03 }}
    >
      {/* Фото */}
      <div className="relative w-full h-full">
        <PhotoCarousel photos={profile.photos} name={profile.name} />

        {/* Градиент снизу */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Overlay LIKE */}
        <motion.div
          className="absolute top-8 left-8 border-4 border-brand-like rounded-xl px-4 py-2 rotate-[-20deg]"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-brand-like font-black text-2xl">ЛАЙК</span>
        </motion.div>

        {/* Overlay SKIP */}
        <motion.div
          className="absolute top-8 right-8 border-4 border-brand-skip rounded-xl px-4 py-2 rotate-[20deg]"
          style={{ opacity: skipOpacity }}
        >
          <span className="text-brand-skip font-black text-2xl">ПРОПУСК</span>
        </motion.div>

        {/* Информация */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
          <h2 className="text-2xl font-bold text-white">
            {profile.name}, {profile.age}
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
