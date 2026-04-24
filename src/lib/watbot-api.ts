import {
  ProfileRawSchema,
  ViewRawSchema,
  LikeRawSchema,
  MatchRawSchema,
  rawToProfile,
  type LikeRaw,
  type MatchRaw,
} from './watbot-types'
import { mockProfiles } from './__mocks__/profiles'
import { mockLikes } from './__mocks__/likes'
import { mockMatches } from './__mocks__/matches'
import type { Profile } from '@/types'

const BASE_URL = 'https://watbot.ru/api/v1'
const DEV_MODE = process.env.DEV_MODE === 'true'
const API_TOKEN = process.env.WATBOT_API_TOKEN ?? ''

// schema_id — реальное название параметра в WATBOT (не list_id!)
const SCHEMA_PROFILES = process.env.WATBOT_LIST_PROFILES ?? ''
const SCHEMA_VIEWS    = process.env.WATBOT_LIST_VIEWS    ?? ''
const SCHEMA_LIKES    = process.env.WATBOT_LIST_LIKES    ?? ''
const SCHEMA_MATCHES  = process.env.WATBOT_LIST_MATCHES  ?? ''

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

// --- Базовые HTTP-функции ---

async function getListItems(
  schemaId: string,
  filters: Record<string, string> = {},
  page = 1,
  limit = 500
): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${BASE_URL}/getListItems`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      api_token: API_TOKEN,
      schema_id: schemaId,
      filters,
      limit,
      page,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error(`[WATBOT] getListItems ${schemaId} HTTP ${res.status}:`, text.slice(0, 300))
    throw new Error(`WATBOT getListItems ${schemaId}: HTTP ${res.status}`)
  }
  const json = await res.json() as { data?: unknown; meta?: unknown }
  console.log(`[WATBOT] getListItems schema=${schemaId} page=${page} items=${(json.data as unknown[])?.length ?? 0} meta=`, json.meta)
  return (json.data ?? []) as Record<string, unknown>[]
}

async function addListItem(
  schemaId: string,
  fields: Record<string, string>
): Promise<void> {
  const res = await fetch(`${BASE_URL}/addListItem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({ api_token: API_TOKEN, schema_id: schemaId, ...fields }),
  })

  if (!res.ok) throw new Error(`WATBOT addListItem ${schemaId}: HTTP ${res.status}`)
}

// Загрузить все страницы списка (с учётом rate limit)
async function getAllPages(
  schemaId: string,
  filters: Record<string, string> = {},
  limit = 100
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = []
  let page = 1

  while (true) {
    const items = await getListItems(schemaId, filters, page, limit)
    all.push(...items)
    if (items.length < limit) break
    page++
    await delay(300) // соблюдаем rate limit ~2 req/sec
  }

  return all
}

// --- Анкеты ---

export async function fetchAllProfiles(): Promise<Profile[]> {
  if (DEV_MODE) return mockProfiles

  const raw = await getAllPages(SCHEMA_PROFILES)
  const profiles: Profile[] = []
  const seen = new Set<string>()

  let parseErrors = 0
  for (const item of raw) {
    const result = ProfileRawSchema.safeParse(item)
    if (!result.success) {
      parseErrors++
      if (parseErrors <= 3) {
        console.error('[WATBOT] ProfileRawSchema parse error:', JSON.stringify(result.error.issues), 'item:', JSON.stringify(item).slice(0, 200))
      }
      continue
    }
    if (seen.has(result.data.id_tg)) continue
    seen.add(result.data.id_tg)
    profiles.push(rawToProfile(result.data))
  }

  console.log(`[WATBOT] fetchAllProfiles: raw=${raw.length} parsed=${profiles.length} errors=${parseErrors}`)
  return profiles
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (DEV_MODE) return mockProfiles.find((p) => p.user_id === userId) ?? null

  const raw = await getListItems(SCHEMA_PROFILES, { id_tg: userId }, 1, 1)
  if (raw.length === 0) return null
  const result = ProfileRawSchema.safeParse(raw[0])
  return result.success ? rawToProfile(result.data) : null
}

// --- Просмотры ---
// id_tg_m = viewer, id_tg = target

export async function fetchViewedIds(viewerId: string): Promise<Set<string>> {
  if (DEV_MODE) return new Set()

  const raw = await getAllPages(SCHEMA_VIEWS, { id_tg_m: viewerId })
  const ids = new Set<string>()

  for (const item of raw) {
    const result = ViewRawSchema.safeParse(item)
    if (result.success) ids.add(result.data.id_tg)
  }

  return ids
}

export async function writeView(viewerId: string, targetId: string): Promise<void> {
  if (DEV_MODE) return
  await addListItem(SCHEMA_VIEWS, { id_tg_m: viewerId, id_tg: targetId })
}

// --- Лайки ---
// id_tg = кого лайкнули (target), id_tg_m = кто лайкнул (liker)

export async function writeLike(
  likerId: string,
  targetId: string,
  likerProfile: Profile,
  targetProfile: Profile
): Promise<void> {
  if (DEV_MODE) return

  // Сохраняем данные обоих профилей для отображения в списке лайков
  await addListItem(SCHEMA_LIKES, {
    id_tg: targetId,
    nomer: targetId,
    imia: targetProfile.name,
    vozrast: String(targetProfile.age),
    klub: targetProfile.club,
    gorod: targetProfile.city,
    o_sebe: targetProfile.about,
    foto: targetProfile.photos[0] ?? '',
    id_tg_m: likerId,
    imia_m: likerProfile.name,
    vozrast_m: String(likerProfile.age),
    klub_m: likerProfile.club,
    gorod_m: likerProfile.city,
    o_sebe_m: likerProfile.about,
    foto_m: likerProfile.photos[0] ?? '',
  })
}

// Проверить взаимный лайк: лайкнул ли target меня (id_tg_m=target, id_tg=me)
export async function checkMutualLike(
  myId: string,
  targetId: string
): Promise<boolean> {
  if (DEV_MODE) return false

  const raw = await getListItems(SCHEMA_LIKES, { id_tg_m: targetId, id_tg: myId }, 1, 1)
  return raw.length > 0
}

// Входящие лайки: записи где id_tg = мой ID (кого лайкнули = меня)
export async function fetchIncomingLikes(userId: string): Promise<LikeRaw[]> {
  if (DEV_MODE) {
    return mockLikes
      .filter((l) => l.to_user_id === userId)
      .map((l) => ({
        id: l.from_user_id,
        id_tg: userId,
        id_tg_m: l.from_user_id,
        imia: '', vozrast: '', klub: '', gorod: '', o_sebe: '', foto: '',
        imia_m: '', vozrast_m: '', klub_m: '', gorod_m: '', o_sebe_m: '', foto_m: '',
      }))
  }

  const raw = await getAllPages(SCHEMA_LIKES, { id_tg: userId })
  const result: LikeRaw[] = []

  for (const item of raw) {
    const parsed = LikeRawSchema.safeParse(item)
    if (parsed.success) result.push(parsed.data)
  }

  return result
}

// --- Мэтчи ---

export async function writeMatch(
  userId: string,
  partnerId: string,
  userProfile: Profile,
  partnerProfile: Profile
): Promise<void> {
  if (DEV_MODE) return

  await addListItem(SCHEMA_MATCHES, {
    id_tg: userId,
    nomer: userId,
    imia: userProfile.name,
    vozrast: String(userProfile.age),
    klub: userProfile.club,
    gorod: userProfile.city,
    o_sebe: userProfile.about,
    foto: userProfile.photos[0] ?? '',
    id_tg_m: partnerId,
    imia_m: partnerProfile.name,
    vozrast_m: String(partnerProfile.age),
    klub_m: partnerProfile.club,
    gorod_m: partnerProfile.city,
    o_sebe_m: partnerProfile.about,
    foto_m: partnerProfile.photos[0] ?? '',
    username: '',
  })
}

export async function fetchMatches(userId: string): Promise<MatchRaw[]> {
  if (DEV_MODE) {
    return mockMatches
      .filter((m) => m.user_a_id === userId || m.user_b_id === userId)
      .map((m) => {
        const partnerId = m.user_a_id === userId ? m.user_b_id : m.user_a_id
        return {
          id: m.user_a_id + m.user_b_id,
          id_tg: userId,
          id_tg_m: partnerId,
          imia: '', vozrast: '', klub: '', gorod: '', o_sebe: '', foto: '',
          imia_m: '', vozrast_m: '', klub_m: '', gorod_m: '', o_sebe_m: '', foto_m: '',
          username: null,
        }
      })
  }

  // WATBOT не поддерживает OR в фильтрах — два запроса
  const [asInitiator, asPartner] = await Promise.all([
    getAllPages(SCHEMA_MATCHES, { id_tg: userId }),
    getAllPages(SCHEMA_MATCHES, { id_tg_m: userId }),
  ])

  const seen = new Set<string>()
  const result: MatchRaw[] = []

  for (const item of [...asInitiator, ...asPartner]) {
    const parsed = MatchRawSchema.safeParse(item)
    if (!parsed.success) continue
    const key = [parsed.data.id_tg, parsed.data.id_tg_m].sort().join(':')
    if (seen.has(key)) continue
    seen.add(key)
    result.push(parsed.data)
  }

  return result
}
