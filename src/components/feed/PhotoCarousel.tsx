'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  photos: string[]
  name: string
  locationLabel?: string | null
}

export function PhotoCarousel({ photos, name, locationLabel }: Props) {
  const [current, setCurrent] = useState(0)
  const list = photos.length > 0 ? photos : ['https://i.pravatar.cc/400']

  const showPrev = () => {
    if (list.length < 2) return
    setCurrent((index) => (index - 1 + list.length) % list.length)
  }

  const showNext = () => {
    if (list.length < 2) return
    setCurrent((index) => (index + 1) % list.length)
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[1.75rem]">
      <Image
        src={list[current]}
        alt={name}
        fill
        className="object-cover"
        sizes="(max-width: 448px) 100vw, 448px"
        priority={current === 0}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/48 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

      <div className="absolute left-4 right-4 top-4 z-20 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          {locationLabel ? (
            <span className="inline-flex w-fit max-w-[13rem] truncate rounded-full bg-white/12 px-3 py-1 text-xs font-medium text-white/88">
              {locationLabel}
            </span>
          ) : null}
        </div>

        <div className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-medium text-white/88">
          {current + 1} / {list.length}
        </div>
      </div>

      {list.length > 1 ? (
        <div className="pointer-events-none absolute left-4 right-4 top-[4.5rem] z-20 flex gap-1.5">
          {list.map((_, index) => (
            <div
              key={`${name}-${index}`}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                index === current ? 'bg-white' : 'bg-white/28'
              }`}
            />
          ))}
        </div>
      ) : null}

      {list.length > 1 ? (
        <>
          <button
            type="button"
            onClick={showPrev}
            className="absolute left-4 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/32 text-white shadow-panel transition-transform active:scale-95"
            aria-label="Предыдущее фото"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={showNext}
            className="absolute right-4 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/32 text-white shadow-panel transition-transform active:scale-95"
            aria-label="Следующее фото"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </>
      ) : null}
    </div>
  )
}
