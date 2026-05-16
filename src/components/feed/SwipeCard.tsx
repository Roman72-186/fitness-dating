'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { X } from 'lucide-react'
import { ActionButtons } from './ActionButtons'
import type { Profile } from '@/types'

interface Props {
  profile: Profile
  onLike: () => void
  onSkip: () => void
  disabled?: boolean
}

export function SwipeCard({ profile, onLike, onSkip, disabled }: Props) {
  const [photoOpen, setPhotoOpen] = useState(false)
  const [aboutExpanded, setAboutExpanded] = useState(false)
  const photo = profile.photos[0] ?? 'https://i.pravatar.cc/400'
  const canExpandAbout = profile.about.length > 110
  const aboutPreview = canExpandAbout
    ? `${profile.about.slice(0, 118).trim().replace(/[.,!?;:\s]+$/, '')}...`
    : profile.about
  const profileSummary = profile.about || 'Описание не добавлено'

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden rounded-[1.9rem] border border-white/10 bg-brand-bg-2 shadow-float"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
    >
      <div className="flex h-full w-full flex-col gap-2 overflow-y-auto p-2">
        <article className="shrink-0 overflow-hidden rounded-[2rem] border border-white/10 bg-brand-bg-2 shadow-float">
          <button
            type="button"
            onClick={() => setPhotoOpen(true)}
            className="relative block aspect-[4/5] max-h-[27rem] min-h-[18rem] w-full cursor-zoom-in overflow-hidden bg-brand-bg-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
            aria-label={`Открыть фото ${profile.name} на весь экран`}
          >
            <Image
              src={photo}
              alt={profile.name}
              fill
              className="object-cover object-top"
              sizes="(max-width: 448px) 100vw, 448px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-brand-bg/18 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              {profile.club ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/12 bg-black/18 px-3 py-1 text-[0.72rem] uppercase tracking-[0.18em] text-white/78">
                    {profile.club}
                  </span>
                </div>
              ) : null}
              <h2 className="font-display text-[2.2rem] leading-none text-white">
                {profile.name}
                {profile.age > 0 ? <span>, {profile.age}</span> : null}
              </h2>
              {profile.city ? <p className="mt-3 text-sm text-white/76">{profile.city}</p> : null}
            </div>
          </button>

          <div className="space-y-5 p-5">
            <section>
              <p className="text-[0.7rem] uppercase tracking-[0.22em] text-brand-text-muted">О себе</p>
              <button
                type="button"
                onClick={() => canExpandAbout && setAboutExpanded((value) => !value)}
                className="mt-3 block w-full text-left text-sm leading-7 text-brand-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                aria-expanded={aboutExpanded}
              >
                <span className={aboutExpanded ? 'block' : 'line-clamp-2 block'}>
                  {aboutExpanded ? profileSummary : aboutPreview || profileSummary}
                  {canExpandAbout && !aboutExpanded ? <em className="ml-1 text-brand-text-muted">еще</em> : null}
                </span>
              </button>
            </section>
          </div>
        </article>

        <ActionButtons
          onLike={onLike}
          onSkip={onSkip}
          disabled={disabled}
          className="relative z-20 shrink-0 px-2 pb-2"
        />
      </div>

      {photoOpen ? createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
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

          <div className="relative h-[100svh] w-screen" onClick={(event) => event.stopPropagation()}>
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
