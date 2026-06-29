import { PrismaClient } from '@prisma/client'
import type { Profile, ActionType, ActionSource } from '@/types'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const DEV_MODE = process.env.DEV_MODE === 'true'

// ---------------------------------------------------------------------------
// Маскирование телефона в логах (требование инструкции §43)
// ---------------------------------------------------------------------------

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  return phone.replace(/(\+?\d{4})\d+(\d{4})/, '$1****$2')
}

// ---------------------------------------------------------------------------
// Конвертация Prisma User → Profile (без phone — только при мэтче)
// ---------------------------------------------------------------------------

function parsePhotos(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string')
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as string[] } catch { return [] }
  }
  return []
}

type ProfileRow = {
  telegram_id: string
  name: string
  last_name?: string | null
  age: number
  gender: string
  interested_in: string
  about: string
  photos: unknown
  photo_url: string
  city: string
  club: string
  telegram_username?: string | null
  is_active: boolean
  is_blocked: boolean
}

function isCompleteProfileRow(row: ProfileRow): boolean {
  return (
    row.name.trim().length > 0 &&
    row.age >= 18 &&
    row.gender !== 'other' &&
    row.city.trim().length > 0 &&
    row.club.trim().length > 0 &&
    row.about.trim().length > 0 &&
    row.is_active &&
    !row.is_blocked
  )
}

function toProfile(row: ProfileRow): Profile {
  const photos = parsePhotos(row.photos)
  // Совместимость: если photos пустой, но есть photo_url — используем его
  const finalPhotos = photos.length > 0 ? photos : (row.photo_url ? [row.photo_url] : [])

  return {
    user_id: row.telegram_id,
    name: row.name,
    last_name: row.last_name ?? undefined,
    age: row.age,
    gender: row.gender as Profile['gender'],
    interested_in: row.interested_in as Profile['interested_in'],
    about: row.about,
    photos: finalPhotos,
    city: row.city,
    club: row.club,
    telegram_username: row.telegram_username ?? undefined,
    active: row.is_active,
    is_blocked: row.is_blocked,
  }
}

// ---------------------------------------------------------------------------
// Профили
// ---------------------------------------------------------------------------

// Платформа пользователя (telegram | max | ...) — нужна для маршрутизации уведомлений
export async function getUserPlatform(userId: string): Promise<string | null> {
  if (DEV_MODE) return 'telegram'
  const row = await prisma.user.findUnique({
    where: { telegram_id: userId },
    select: { platform: true },
  })
  return row?.platform ?? null
}

// Полное удаление анкеты + всех связей. Возвращает true если что-то удалили.
export async function deleteProfile(userId: string): Promise<boolean> {
  if (DEV_MODE) return true
  const result = await prisma.$transaction(async (tx) => {
    await tx.match.deleteMany({
      where: { OR: [{ user_a_id: userId }, { user_b_id: userId }] },
    })
    await tx.profileAction.deleteMany({
      where: { OR: [{ viewer_profile_id: userId }, { target_profile_id: userId }] },
    })
    const deleted = await tx.user.deleteMany({ where: { telegram_id: userId } })
    return deleted.count > 0
  })
  return result
}

export interface ClearedProfileInteractions {
  actions: number
  matches: number
}

// Очистка истории связей без удаления самой анкеты.
// Сохранение анкеты трактуем как полную замену текущего профиля и его истории.
export async function clearProfileInteractions(userId: string): Promise<ClearedProfileInteractions> {
  if (DEV_MODE) return { actions: 0, matches: 0 }

  const [matches, actions] = await prisma.$transaction([
    prisma.match.deleteMany({
      where: { OR: [{ user_a_id: userId }, { user_b_id: userId }] },
    }),
    prisma.profileAction.deleteMany({
      where: { OR: [{ viewer_profile_id: userId }, { target_profile_id: userId }] },
    }),
  ])

  return { actions: actions.count, matches: matches.count }
}

export async function getProfile(userId: string): Promise<Profile | null> {
  if (DEV_MODE) {
    const { mockProfiles } = await import('./__mocks__/profiles')
    return mockProfiles.find((p) => p.user_id === userId) ?? null
  }
  const row = await prisma.user.findUnique({ where: { telegram_id: userId } })
  return row && isCompleteProfileRow(row) ? toProfile(row) : null
}

export async function getAllProfiles(): Promise<Profile[]> {
  if (DEV_MODE) {
    const { mockProfiles } = await import('./__mocks__/profiles')
    return mockProfiles.filter((p) => p.active && !p.is_blocked)
  }
  const rows = await prisma.user.findMany({ where: { is_active: true, is_blocked: false } })
  return rows.filter(isCompleteProfileRow).map(toProfile)
}

export async function upsertProfile(data: {
  telegram_id: string
  name: string
  last_name?: string
  age: number
  gender: Profile['gender']
  interested_in: Profile['interested_in']
  about: string
  photos: string[]
  city: string
  club: string
  telegram_username?: string
  phone?: string
  platform?: string
}): Promise<Profile> {
  if (DEV_MODE) {
    return toProfile({
      ...data,
      last_name: data.last_name ?? null,
      telegram_username: data.telegram_username ?? null,
      photo_url: data.photos[0] ?? '',
      is_active: true,
      is_blocked: false,
    })
  }

  const row = await prisma.user.upsert({
    where: { telegram_id: data.telegram_id },
    create: {
      telegram_id: data.telegram_id,
      name: data.name,
      last_name: data.last_name ?? null,
      age: data.age,
      gender: data.gender,
      interested_in: data.interested_in,
      about: data.about,
      photos: data.photos,
      photo_url: data.photos[0] ?? '',
      city: data.city,
      club: data.club,
      telegram_username: data.telegram_username ?? null,
      phone: data.phone ?? null,
      platform: data.platform ?? 'telegram',
      is_active: true,
      is_blocked: false,
    },
    update: {
      name: data.name,
      last_name: data.last_name ?? null,
      age: data.age,
      gender: data.gender,
      interested_in: data.interested_in,
      about: data.about,
      photos: data.photos,
      photo_url: data.photos[0] ?? '',
      city: data.city,
      club: data.club,
      telegram_username: data.telegram_username ?? null,
      phone: data.phone ?? null,
      platform: data.platform ?? 'telegram',
    },
  })
  return toProfile(row)
}

// ---------------------------------------------------------------------------
// ProfileAction (объединяет просмотры, лайки, скипы)
// ---------------------------------------------------------------------------

export async function writeAction(
  viewerId: string,
  targetId: string,
  action: ActionType,
  source: ActionSource,
): Promise<void> {
  if (DEV_MODE) return
  await prisma.profileAction.upsert({
    where: {
      viewer_profile_id_target_profile_id: {
        viewer_profile_id: viewerId,
        target_profile_id: targetId,
      },
    },
    create: { viewer_profile_id: viewerId, target_profile_id: targetId, action, source },
    // Если уже было действие — не перезаписываем (первое действие окончательно)
    update: {},
  })
}

// Все target ID на которые пользователь уже реагировал (любое действие)
export async function fetchActedTargetIds(viewerId: string): Promise<Set<string>> {
  if (DEV_MODE) return new Set()
  const rows = await prisma.profileAction.findMany({
    where: { viewer_profile_id: viewerId },
    select: { target_profile_id: true },
  })
  return new Set(rows.map((r) => r.target_profile_id))
}

export async function checkMutualLike(myId: string, targetId: string): Promise<boolean> {
  if (DEV_MODE) return false
  const row = await prisma.profileAction.findUnique({
    where: {
      viewer_profile_id_target_profile_id: {
        viewer_profile_id: targetId,
        target_profile_id: myId,
      },
    },
    select: { action: true },
  })
  return row?.action === 'like'
}

// ---------------------------------------------------------------------------
// Входящие лайки
// ---------------------------------------------------------------------------

export interface LikeWithPartner {
  likerId: string
  name: string
  age: number
  club: string
  city: string
  about: string
  photo: string
}

export async function fetchIncomingLikes(userId: string): Promise<LikeWithPartner[]> {
  if (DEV_MODE) {
    const { mockLikes } = await import('./__mocks__/likes')
    return mockLikes
      .filter((l) => l.id_tg === userId)
      .map((l) => ({
        likerId: l.id_tg_m,
        name: l.imia_m,
        age: l.vozrast_m ? parseInt(l.vozrast_m, 10) : 0,
        club: l.klub_m,
        city: l.gorod_m,
        about: l.o_sebe_m,
        photo: l.foto_m,
      }))
  }

  // Кто лайкнул меня
  const incoming = await prisma.profileAction.findMany({
    where: { target_profile_id: userId, action: 'like' },
    select: { viewer_profile_id: true, created_at: true },
  })
  if (incoming.length === 0) return []

  const likerIds = incoming.map((r) => r.viewer_profile_id)
  const incomingLikedAt = new Map(incoming.map((r) => [r.viewer_profile_id, r.created_at.getTime()]))

  // Те на кого я уже ответил (любым действием)
  const myActions = await prisma.profileAction.findMany({
    where: { viewer_profile_id: userId, target_profile_id: { in: likerIds } },
    select: { target_profile_id: true, created_at: true },
  })
  const alreadyResponded = new Set(
    myActions
      .filter((r) => r.created_at.getTime() >= (incomingLikedAt.get(r.target_profile_id) ?? 0))
      .map((r) => r.target_profile_id),
  )

  // Мои мэтчи — исключить
  const myMatches = await prisma.match.findMany({
    where: { OR: [{ user_a_id: userId }, { user_b_id: userId }] },
    select: { user_a_id: true, user_b_id: true },
  })
  const matched = new Set(
    myMatches.map((m) => (m.user_a_id === userId ? m.user_b_id : m.user_a_id))
  )

  const candidateIds = likerIds.filter((id) => !alreadyResponded.has(id) && !matched.has(id))
  if (candidateIds.length === 0) return []

  const users = await prisma.user.findMany({
    where: { telegram_id: { in: candidateIds }, is_active: true, is_blocked: false },
  })
  const userMap = new Map(users.map((u) => [u.telegram_id, u]))

  return likerIds
    .filter((id) => userMap.has(id))
    .map((id) => {
      const u = userMap.get(id)!
      const photos = parsePhotos(u.photos)
      return {
        likerId: u.telegram_id,
        name: u.name,
        age: u.age,
        club: u.club,
        city: u.city,
        about: u.about,
        photo: photos[0] ?? u.photo_url ?? '',
      }
    })
}

// ---------------------------------------------------------------------------
// Мэтчи
// ---------------------------------------------------------------------------

export async function writeMatch(userAId: string, userBId: string): Promise<void> {
  if (DEV_MODE) return
  const [a, b] = userAId < userBId ? [userAId, userBId] : [userBId, userAId]
  await prisma.match.upsert({
    where: { user_a_id_user_b_id: { user_a_id: a, user_b_id: b } },
    create: { user_a_id: a, user_b_id: b },
    update: {},
  })
}

export interface MatchWithPartner {
  partnerId: string
  name: string
  age: number
  club: string
  city: string
  about: string
  photo: string
  phone: string | null     // показывается только в мэтчах
  telegram_username: string | null
  createdAt: Date
}

export async function fetchMatches(userId: string): Promise<MatchWithPartner[]> {
  if (DEV_MODE) {
    const { mockMatches } = await import('./__mocks__/matches')
    return mockMatches
      .filter((m) => m.id_tg === userId || m.id_tg_m === userId)
      .map((m) => {
        const iAmA = m.id_tg === userId
        return {
          partnerId: iAmA ? m.id_tg_m : m.id_tg,
          name: iAmA ? m.imia_m : m.imia,
          age: parseInt(iAmA ? m.vozrast_m : m.vozrast, 10) || 0,
          club: iAmA ? m.klub_m : m.klub,
          city: iAmA ? m.gorod_m : m.gorod,
          about: iAmA ? m.o_sebe_m : m.o_sebe,
          photo: iAmA ? m.foto_m : m.foto,
          phone: null,
          telegram_username: m.username ?? null,
          createdAt: new Date(),
        }
      })
  }

  const matches = await prisma.match.findMany({
    where: { OR: [{ user_a_id: userId }, { user_b_id: userId }] },
    orderBy: { created_at: 'desc' },
  })
  if (matches.length === 0) return []

  const partnerIds = matches.map((m) => (m.user_a_id === userId ? m.user_b_id : m.user_a_id))
  const users = await prisma.user.findMany({ where: { telegram_id: { in: partnerIds } } })
  const userMap = new Map(users.map((u) => [u.telegram_id, u]))

  return matches
    .map((m) => {
      const partnerId = m.user_a_id === userId ? m.user_b_id : m.user_a_id
      const u = userMap.get(partnerId)
      if (!u) return null
      const photos = parsePhotos(u.photos)
      return {
        partnerId: u.telegram_id,
        name: u.name,
        age: u.age,
        club: u.club,
        city: u.city,
        about: u.about,
        photo: photos[0] ?? u.photo_url ?? '',
        phone: u.phone ?? null,            // телефон только здесь
        telegram_username: u.telegram_username ?? null,
        createdAt: m.created_at,
      }
    })
    .filter((x): x is MatchWithPartner => x !== null)
}
