import { Redis } from '@upstash/redis'
import type { Profile } from '@/types'

interface FeedCacheState {
  profileIds: string[]
  cursor: number
}

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

const FEED_TTL = 300
const PROFILE_TTL = 600
const ALL_TTL = 300

function normalizeFeedState(raw: unknown): FeedCacheState | null {
  if (Array.isArray(raw)) {
    return {
      profileIds: raw.filter((item): item is string => typeof item === 'string' && item.length > 0),
      cursor: 0,
    }
  }

  if (!raw || typeof raw !== 'object') {
    return null
  }

  const candidate = raw as { profileIds?: unknown; cursor?: unknown }
  if (!Array.isArray(candidate.profileIds)) {
    return null
  }

  const profileIds = candidate.profileIds.filter((item): item is string => typeof item === 'string' && item.length > 0)
  const rawCursor = typeof candidate.cursor === 'number' && Number.isFinite(candidate.cursor) ? candidate.cursor : 0

  return {
    profileIds,
    cursor: Math.max(0, Math.min(rawCursor, profileIds.length)),
  }
}

async function getFeedState(userId: string): Promise<FeedCacheState | null> {
  try {
    const raw = await getRedis().get<FeedCacheState | string[]>(`feed:${userId}`)
    return normalizeFeedState(raw)
  } catch {
    return null
  }
}

export async function getCachedFeed(userId: string): Promise<string[] | null> {
  const state = await getFeedState(userId)
  if (!state) return null
  return state.profileIds.slice(state.cursor)
}

export async function setCachedFeed(userId: string, profileIds: string[], cursor = 0): Promise<void> {
  try {
    const normalizedCursor = Math.max(0, Math.min(cursor, profileIds.length))
    await getRedis().set(`feed:${userId}`, { profileIds, cursor: normalizedCursor }, { ex: FEED_TTL })
  } catch {
    // Работаем без кеша, если Redis недоступен.
  }
}

export async function getNextCachedFeedIds(userId: string, count: number): Promise<string[] | null> {
  const state = await getFeedState(userId)
  if (!state) return null

  return state.profileIds.slice(state.cursor, state.cursor + count)
}

export async function consumeCachedFeed(userId: string, count: number): Promise<string[] | null> {
  const state = await getFeedState(userId)
  if (!state) return null

  const batch = state.profileIds.slice(state.cursor, state.cursor + count)
  const nextCursor = Math.min(state.cursor + batch.length, state.profileIds.length)

  await setCachedFeed(userId, state.profileIds, nextCursor)
  return batch
}

export async function invalidateFeedCache(userId: string): Promise<void> {
  try {
    await getRedis().del(`feed:${userId}`)
  } catch {
    // Игнорируем проблемы Redis.
  }
}

export async function getCachedProfile(userId: string): Promise<Profile | null> {
  try {
    return await getRedis().get<Profile>(`profile:${userId}`)
  } catch {
    return null
  }
}

export async function setCachedProfile(userId: string, profile: Profile): Promise<void> {
  try {
    await getRedis().set(`profile:${userId}`, profile, { ex: PROFILE_TTL })
  } catch {
    // Работаем без кеша, если Redis недоступен.
  }
}

export async function invalidateProfile(userId: string): Promise<void> {
  try {
    await getRedis().del(`profile:${userId}`)
  } catch {
    // Игнорируем проблемы Redis.
  }
}

export async function getCachedAllProfiles(): Promise<Profile[] | null> {
  try {
    return await getRedis().get<Profile[]>('all_profiles')
  } catch {
    return null
  }
}

export async function setCachedAllProfiles(profiles: Profile[]): Promise<void> {
  try {
    await getRedis().set('all_profiles', profiles, { ex: ALL_TTL })
  } catch {
    // Работаем без кеша, если Redis недоступен.
  }
}

export async function invalidateAllProfiles(): Promise<void> {
  try {
    await getRedis().del('all_profiles')
  } catch {
    // Игнорируем проблемы Redis.
  }
}
