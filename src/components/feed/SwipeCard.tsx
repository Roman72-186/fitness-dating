'use client'

import { useEffect, useRef, useState } from 'react'
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
  const [canExpandAbout, setCanExpandAbout] = useState(false)
  const aboutMeasureRef = useRef<HTMLParagraphElement>(null)
  const photo = profile.photos[0] ?? 'https://i.pravatar.cc/400'
  const profileSummary = profile.about || 'Описание не добавлено'

  useEffect(() => {
    setAboutExpanded(false)
  }, [profile.user_id])

  useEffect(() => {
    const measureElement = aboutMeasureRef.current
    if (!measureElement) return

    const updateOverflow = () => {
      setCanExpandAbout(measureElement.scrollHeight > measureElement.clientHeight + 1)
    }

    updateOverflow()

    const resizeObserver = new ResizeObserver(updateOverflow)
    resizeObserver.observe(measureElement)
    window.addEventListener('resize', updateOverflow)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateOverflow)
    }
  }, [profileSummary])

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden rounded-[1.9rem] border border-white/10 bg-brand-bg-2 shadow-float"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
    >
      <div className="grid h-full w-full grid-rows-[minmax(0,1fr)_auto] gap-2 overflow-hidden p-2">
        <article className="grid min-h-0 grid-rows-[minmax(0,3fr)_minmax(6.5rem,1fr)] overflow-hidden rounded-[2rem] border border-white/10 bg-brand-bg-2 shadow-float">
          <div className="relative min-h-0 overflow-hidden bg-brand-bg-3">
            <button
              type="button"
              onClick={() => setPhotoOpen(true)}
              className="relative block h-full min-h-0 w-full cursor-zoom-in overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
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
              <div className="absolute inset-x-0 bottom-0 p-4">
                {profile.club ? (
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/12 bg-black/18 px-3 py-1 text-[0.72rem] uppercase tracking-[0.18em] text-white/78">
                      {profile.club}
                    </span>
                  </div>
                ) : null}
                <h2 className="font-display text-[2rem] leading-none text-white">
                  {profile.name}
                  {profile.age > 0 ? <span>, {profile.age}</span> : null}
                </h2>
                {profile.city ? <p className="mt-2 text-sm text-white/76">{profile.city}</p> : null}
              </div>
            </button>

            {aboutExpanded ? (
              <button
                type="button"
                onClick={() => setAboutExpanded(false)}
                className="absolute inset-3 z-20 rounded-[1.5rem] border border-white/12 bg-brand-bg/72 p-4 text-left text-brand-text shadow-float backdrop-blur-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                aria-label="Свернуть описание"
              >
                <span className="block text-[0.7rem] uppercase tracking-[0.22em] text-brand-text-muted">О себе</span>
                <span className="mt-3 block max-h-full overflow-y-auto pr-1 text-sm leading-6">{profileSummary}</span>
              </button>
            ) : null}
          </div>

          <div className="min-h-0 overflow-hidden p-4">
            <section className="relative">
              <p className="text-[0.7rem] uppercase tracking-[0.22em] text-brand-text-muted">О себе</p>
              <button
                type="button"
                onClick={() => canExpandAbout && setAboutExpanded(true)}
                className="mt-2 block w-full text-left text-sm leading-6 text-brand-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                aria-expanded={aboutExpanded}
              >
                <span className="relative line-clamp-2 block">
                  {profileSummary}
                  {canExpandAbout ? (
                    <em className="absolute bottom-0 right-0 bg-brand-bg-2 pl-2 text-brand-text-muted">... еще</em>
                  ) : null}
                </span>
              </button>
              <p
                ref={aboutMeasureRef}
                className="pointer-events-none invisible absolute -z-10 mt-2 line-clamp-2 w-[calc(100%-2rem)] text-sm leading-6"
                aria-hidden="true"
              >
                {profileSummary}
              </p>
            </section>
          </div>
        </article>

        <ActionButtons
          onLike={onLike}
          onSkip={onSkip}
          disabled={disabled}
          className="relative z-20 px-1 pb-1"
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
