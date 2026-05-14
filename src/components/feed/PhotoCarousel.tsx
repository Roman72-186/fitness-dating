'use client'

import Image from 'next/image'

interface Props {
  photos: string[]
  name: string
  current: number
}

export function PhotoCarousel({ photos, name, current }: Props) {
  const list = photos.length > 0 ? photos : ['https://i.pravatar.cc/400']
  const safeCurrent = Math.min(current, list.length - 1)

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[1.75rem]">
      <Image
        src={list[safeCurrent]}
        alt={name}
        fill
        className="object-cover"
        sizes="(max-width: 448px) 100vw, 448px"
        priority={safeCurrent === 0}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
    </div>
  )
}
