'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Props {
  photos: string[]
  name: string
  onLike?: () => void
  onSkip?: () => void
}

export function PhotoCarousel({ photos, name, onLike, onSkip }: Props) {
  const [current, setCurrent] = useState(0)
  const list = photos.length > 0 ? photos : ['https://i.pravatar.cc/400']

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const third = rect.width / 3

    if (list.length > 1) {
      if (x < third) {
        setCurrent((i) => (i - 1 + list.length) % list.length)
        return
      }
      if (x > rect.width - third) {
        setCurrent((i) => (i + 1) % list.length)
        return
      }
    }
  }

  return (
    <div className="relative w-full h-full" onClick={handleTap}>
      <Image
        src={list[current]}
        alt={name}
        fill
        className="object-cover"
        sizes="(max-width: 448px) 100vw, 448px"
        priority={current === 0}
      />

      {/* Индикаторы фото */}
      {list.length > 1 && (
        <div className="absolute top-3 left-0 right-0 flex justify-center gap-1 z-20 pointer-events-none">
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

      {/* Зоны действий — левая треть: пропуск, правая треть: лайк */}
      {onSkip && (
        <button
          onClick={(e) => { e.stopPropagation(); onSkip() }}
          className="absolute left-0 top-0 h-full w-1/3 z-10 opacity-0"
          aria-label="Пропустить"
        />
      )}
      {onLike && (
        <button
          onClick={(e) => { e.stopPropagation(); onLike() }}
          className="absolute right-0 top-0 h-full w-1/3 z-10 opacity-0"
          aria-label="Лайк"
        />
      )}
    </div>
  )
}
