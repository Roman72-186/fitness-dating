'use client'

import Image from 'next/image'

interface Props {
  photos: string[]
  name: string
  current: number
  onOpen?: () => void
}

export function PhotoCarousel({ photos, name, current, onOpen }: Props) {
  const list = photos.length > 0 ? photos : ['https://i.pravatar.cc/400']
  const safeCurrent = Math.min(current, list.length - 1)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative h-full w-full overflow-hidden rounded-[1.75rem] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
      aria-label={`Открыть фото ${name} на весь экран`}
    >
      <Image
        src={list[safeCurrent]}
        alt={name}
        fill
        className="object-cover"
        sizes="(max-width: 448px) 100vw, 448px"
        priority={safeCurrent === 0}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
    </button>
  )
}
