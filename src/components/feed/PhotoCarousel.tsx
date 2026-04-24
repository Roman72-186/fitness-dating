'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Props {
  photos: string[]
  name: string
}

export function PhotoCarousel({ photos, name }: Props) {
  const [current, setCurrent] = useState(0)
  const list = photos.length > 0 ? photos : ['https://i.pravatar.cc/400']

  const prev = () => setCurrent((i) => (i - 1 + list.length) % list.length)
  const next = () => setCurrent((i) => (i + 1) % list.length)

  return (
    <div className="relative w-full h-full">
      <Image
        src={list[current]}
        alt={name}
        fill
        className="object-cover"
        sizes="(max-width: 448px) 100vw, 448px"
        priority={current === 0}
      />

      {/* Зоны тапа для переключения */}
      {list.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-0 top-0 h-full w-1/3 z-10"
            aria-label="Предыдущее фото"
          />
          <button
            onClick={next}
            className="absolute right-0 top-0 h-full w-1/3 z-10"
            aria-label="Следующее фото"
          />
        </>
      )}

      {/* Индикаторы */}
      {list.length > 1 && (
        <div className="absolute top-3 left-0 right-0 flex justify-center gap-1 z-20">
          {list.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === current ? 'w-6 bg-white' : 'w-2 bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
