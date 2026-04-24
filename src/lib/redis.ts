import { Redis } from '@upstash/redis'

// Singleton клиент Upstash Redis
let redis: Redis | null = null

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL ?? '',
      token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
    })
  }
  return redis
}

const FEED_TTL = 300 // 5 минут

export async function getCachedFeed(userId: string): Promise<string[] | null> {
  try {
    const r = getRedis()
    return await r.get<string[]>(`feed:${userId}`)
  } catch {
    return null
  }
}

export async function setCachedFeed(userId: string, profileIds: string[]): Promise<void> {
  try {
    const r = getRedis()
    await r.set(`feed:${userId}`, profileIds, { ex: FEED_TTL })
  } catch {
    // Redis недоступен — работаем без кэша
  }
}

export async function invalidateFeedCache(userId: string): Promise<void> {
  try {
    const r = getRedis()
    await r.del(`feed:${userId}`)
  } catch {
    // Игнорируем
  }
}
