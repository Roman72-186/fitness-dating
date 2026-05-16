'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { X } from 'lucide-react'
import { PhotoCarousel } from './PhotoCarousel'
import type { Profile } from '@/types'

interface Props {
  profile: Profile
  onLike: () => void
  onSkip: () => void
}

export function SwipeCard({ profile }: Props) {
  const [photoOpen, setPhotoOpen] = useState(false)
  const [aboutExpanded, setAboutExpanded] = useState(false)
  const photo = profile.photos[0] ?? 'https://i.pravatar.cc/400'
  const canExpandAbout = profile.about.length > 110
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
      <div className="flex h-full w-full flex-col overflow-y-auto p-2">
        <div className="h-[58%] min-h-[17rem] shrink-0">
          <PhotoCarousel photos={profile.photos} name={profile.name} current={0} onOpen={() => setPhotoOpen(true)} />
        </div>

        <div className="relative z-10 -mt-8 px-2 pb-3">
          <div className="rounded-[1.55rem] border border-white/10 bg-black/42 px-4 py-4 shadow-panel backdrop-blur-[14px]">
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
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => canExpandAbout && setAboutExpanded((value) => !value)}
                  className="block w-full text-left text-sm leading-6 text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                  aria-expanded={aboutExpanded}
                >
                  <span className={aboutExpanded ? 'block' : 'line-clamp-3 block'}>
                    {profile.about}
                  </span>
                </button>

                {canExpandAbout ? (
                  <button
                    type="button"
                    onClick={() => setAboutExpanded((value) => !value)}
                    className="mt-2 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold text-white/82 transition-colors active:bg-white/14"
                  >
                    {aboutExpanded ? 'Свернуть' : 'Развернуть'}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {photoOpen ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/94 p-3"
          role="dialog"
          aria-modal="true"
          aria-label={`Фото ${profile.name}`}
          onClick={() => setPhotoOpen(false)}
        >
          <button
            type="button"
            onClick={() => setPhotoOpen(false)}
            className="absolute right-4 top-4 z-10 rounded-full border border-white/12 bg-black/50 p-3 text-white backdrop-blur-md"
            aria-label="Закрыть фото"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="relative h-full max-h-[92vh] w-full max-w-xl" onClick={(event) => event.stopPropagation()}>
            <Image
              src={photo}
              alt={profile.name}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>
        </div>,
        document.body,
      ) : null}
    </motion.div>
  )
}
