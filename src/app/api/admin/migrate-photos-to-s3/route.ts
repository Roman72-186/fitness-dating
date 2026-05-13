import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isManagedS3Url, uploadProfilePhoto } from '@/lib/s3'
import { invalidateAllProfiles } from '@/lib/redis'

const SYNC_SECRET = process.env.SYNC_SECRET ?? ''

function parsePhotos(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string' && x.length > 0)
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string' && x.length > 0) : []
    } catch {
      return []
    }
  }
  return []
}

function uniqueUrls(urls: string[]): string[] {
  return Array.from(new Set(urls.filter(Boolean)))
}

function inferFileName(url: string, contentType: string, index: number): string {
  try {
    const pathname = new URL(url).pathname
    const tail = pathname.split('/').pop() || ''
    if (tail.includes('.')) return tail
  } catch {
    // ignore
  }

  const extByType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }

  return `photo-${index}.${extByType[contentType] ?? 'jpg'}`
}

function inferContentType(sourceUrl: string, responseContentType: string | null): string {
  const normalized = responseContentType?.split(';')[0]?.trim().toLowerCase() ?? ''
  if (['image/jpeg', 'image/png', 'image/webp'].includes(normalized)) {
    return normalized
  }

  try {
    const pathname = new URL(sourceUrl).pathname.toLowerCase()
    if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'image/jpeg'
    if (pathname.endsWith('.png')) return 'image/png'
    if (pathname.endsWith('.webp')) return 'image/webp'
  } catch {
    // ignore
  }

  if (normalized === 'application/octet-stream') {
    return 'image/jpeg'
  }

  return normalized
}

async function migrateOnePhoto(params: {
  userId: string
  sourceUrl: string
  index: number
}): Promise<string> {
  const { userId, sourceUrl, index } = params
  const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(20000) })
  if (!res.ok) {
    throw new Error(`DOWNLOAD_FAILED ${res.status}`)
  }

  const contentType = inferContentType(sourceUrl, res.headers.get('content-type'))
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
    throw new Error(`UNSUPPORTED_CONTENT_TYPE ${contentType}`)
  }

  const bytes = new Uint8Array(await res.arrayBuffer())
  const uploaded = await uploadProfilePhoto({
    userId,
    fileName: inferFileName(sourceUrl, contentType, index),
    contentType,
    bytes,
  })

  return uploaded.url
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-sync-secret')
  if (!SYNC_SECRET || secret !== SYNC_SECRET) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let dryRun = false
  let limit = 200
  try {
    const body = await req.json() as { dryRun?: boolean; limit?: number }
    dryRun = body.dryRun === true
    if (typeof body.limit === 'number' && Number.isFinite(body.limit) && body.limit > 0) {
      limit = Math.min(body.limit, 1000)
    }
  } catch {
    // body optional
  }

  const users = await prisma.user.findMany({
    take: limit,
    orderBy: { created_at: 'asc' },
    select: {
      telegram_id: true,
      photos: true,
      photo_url: true,
    },
  })

  let scanned = 0
  let migratedUsers = 0
  let migratedPhotos = 0
  let skippedUsers = 0
  const errors: Array<{ userId: string; error: string }> = []

  for (const user of users) {
    scanned++
    const sourceUrls = uniqueUrls([
      ...parsePhotos(user.photos),
      ...(user.photo_url ? [user.photo_url] : []),
    ])

    if (sourceUrls.length === 0) {
      skippedUsers++
      continue
    }

    if (sourceUrls.every(isManagedS3Url)) {
      skippedUsers++
      continue
    }

    const nextUrls: string[] = []
    let failed = false

    for (let index = 0; index < sourceUrls.length; index++) {
      const sourceUrl = sourceUrls[index]

      try {
        if (isManagedS3Url(sourceUrl)) {
          nextUrls.push(sourceUrl)
          continue
        }

        if (dryRun) {
          nextUrls.push(sourceUrl)
          migratedPhotos++
          continue
        }

        const migratedUrl = await migrateOnePhoto({
          userId: user.telegram_id,
          sourceUrl,
          index,
        })
        nextUrls.push(migratedUrl)
        migratedPhotos++
      } catch (err) {
        failed = true
        errors.push({
          userId: user.telegram_id,
          error: err instanceof Error ? err.message : 'UNKNOWN_ERROR',
        })
        break
      }
    }

    if (failed) continue

    migratedUsers++
    if (!dryRun) {
      await prisma.user.update({
        where: { telegram_id: user.telegram_id },
        data: {
          photos: nextUrls,
          photo_url: nextUrls[0] ?? '',
        },
      })
    }
  }

  if (!dryRun && migratedUsers > 0) {
    await invalidateAllProfiles()
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    scanned,
    migratedUsers,
    migratedPhotos,
    skippedUsers,
    errors,
  })
}
