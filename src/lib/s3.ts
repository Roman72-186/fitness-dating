import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const S3_ENDPOINT = process.env.S3_ENDPOINT ?? ''
const S3_REGION = process.env.S3_REGION ?? 'ru-1'
const S3_BUCKET = process.env.S3_BUCKET ?? ''
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY ?? ''
const S3_SECRET_KEY = process.env.S3_SECRET_KEY ?? ''
const S3_PREFIX = (process.env.S3_PREFIX ?? 'fitness-dating/avatars').replace(/^\/+|\/+$/g, '')
const S3_PUBLIC_BASE_URL = (process.env.S3_PUBLIC_BASE_URL ?? '').replace(/\/+$/g, '')

let client: S3Client | null = null

function getS3Client(): S3Client {
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY || !S3_SECRET_KEY) {
    throw new Error('S3 env vars не настроены')
  }

  if (!client) {
    client = new S3Client({
      region: S3_REGION,
      endpoint: S3_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY,
      },
    })
  }

  return client
}

function buildPublicUrl(key: string): string {
  if (S3_PUBLIC_BASE_URL) {
    return `${S3_PUBLIC_BASE_URL}/${key}`
  }

  const endpoint = S3_ENDPOINT.replace(/\/+$/g, '')
  return `${endpoint}/${S3_BUCKET}/${key}`
}

export function isManagedS3Url(url: string): boolean {
  if (!url) return false

  if (S3_PUBLIC_BASE_URL && url.startsWith(`${S3_PUBLIC_BASE_URL}/`)) {
    return true
  }

  const endpoint = S3_ENDPOINT.replace(/\/+$/g, '')
  return url.startsWith(`${endpoint}/${S3_BUCKET}/`)
}

function inferContentType(url: string, headerContentType: string | null): string {
  const normalized = headerContentType?.split(';')[0]?.trim().toLowerCase() ?? ''
  if (['image/jpeg', 'image/png', 'image/webp'].includes(normalized)) return normalized
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'image/jpeg'
    if (pathname.endsWith('.png')) return 'image/png'
    if (pathname.endsWith('.webp')) return 'image/webp'
  } catch { /* ignore */ }
  if (normalized === 'application/octet-stream') return 'image/jpeg'
  return normalized || 'image/jpeg'
}

function inferFileName(url: string, contentType: string, index: number): string {
  try {
    const tail = new URL(url).pathname.split('/').pop() || ''
    if (tail.includes('.')) return tail
  } catch { /* ignore */ }
  const extByType: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  }
  return `photo-${index}.${extByType[contentType] ?? 'jpg'}`
}

// Перекладывает внешние URL фото в наш S3. Уже-S3 ссылки пропускает.
// На ошибке оставляет исходный URL — лучше иметь хоть что-то, чем потерять фото.
export async function ensurePhotosInS3(userId: string, urls: string[]): Promise<string[]> {
  const out: string[] = []
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    if (!url) continue
    if (isManagedS3Url(url)) { out.push(url); continue }

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const contentType = inferContentType(url, res.headers.get('content-type'))
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
        throw new Error(`UNSUPPORTED_TYPE ${contentType}`)
      }
      const bytes = new Uint8Array(await res.arrayBuffer())
      const uploaded = await uploadProfilePhoto({
        userId,
        fileName: inferFileName(url, contentType, i),
        contentType,
        bytes,
      })
      out.push(uploaded.url)
    } catch (err) {
      console.error(`[s3] ensurePhotosInS3: не удалось перенести ${url}:`, err)
      out.push(url) // оставляем исходный URL — Mini App потом покажет ошибку, лучше чем пусто
    }
  }
  return out
}

export async function uploadProfilePhoto(params: {
  userId: string
  fileName: string
  contentType: string
  bytes: Uint8Array
}): Promise<{ key: string; url: string }> {
  const { userId, fileName, contentType, bytes } = params
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '')
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '-')
  const key = `${S3_PREFIX}/${safeUserId}/${Date.now()}-${safeFileName}`

  await getS3Client().send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: bytes,
    ContentType: contentType,
  }))

  return { key, url: buildPublicUrl(key) }
}
