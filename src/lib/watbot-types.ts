import { z } from 'zod'
import type { Profile } from '@/types'

// foto в анкетах — объект; в лайках/матчах — строка URL
const fotoImageObject = z.object({ url: z.string() }).passthrough()
const fotoField = z.union([fotoImageObject, z.string()]).transform((v) =>
  typeof v === 'string' ? v : v.url
)

// Схема записи из списка "Анкеты"
export const ProfileRawSchema = z.object({
  id: z.string(),
  id_tg: z.string(),
  kak_obrashhatsia: z.string().default(''),   // имя
  pol: z.string().default(''),                 // "🙋‍♂️ Мужской" / "🙋‍♀️ Женский"
  s_kem_poznakomitsia: z.string().default(''), // "С девушками" / "С парнями" / "Все равно"
  o_sebe: z.string().default(''),
  foto: fotoField.optional(),
  gorod: z.string().default(''),
  vozrast: z.string().default(''),
  klub: z.string().default(''),
})

// Преобразование pol в gender
function parseGender(pol: string): 'male' | 'female' | 'other' {
  if (pol.includes('Мужской')) return 'male'
  if (pol.includes('Женский')) return 'female'
  return 'other'
}

// Преобразование s_kem_poznakomitsia в preference
function parsePreference(s: string): 'male' | 'female' | 'any' {
  const lower = s.toLowerCase()
  if (lower.includes('девушк') || lower.includes('женщин')) return 'female'
  if (lower.includes('парн') || lower.includes('мужч')) return 'male'
  return 'any'
}

// Преобразование raw WATBOT записи → Profile
export function rawToProfile(raw: z.output<typeof ProfileRawSchema>): Profile {
  return {
    user_id: raw.id_tg,
    name: raw.kak_obrashhatsia,
    age: parseInt(raw.vozrast, 10) || 0,
    gender: parseGender(raw.pol),
    preference: parsePreference(raw.s_kem_poznakomitsia),
    about: raw.o_sebe,
    photos: raw.foto ? [raw.foto] : [],
    city: raw.gorod,
    club: raw.klub,
    active: true, // нет поля активности — считаем все активными
  }
}

// Схема записи из списка "Просмотрено"
// id_tg_m = кто смотрел (viewer), id_tg = чью анкету (target)
export const ViewRawSchema = z.object({
  id: z.string(),
  id_tg_m: z.string(), // viewer
  id_tg: z.string(),   // target
  created_at: z.string().optional(),
})

export type ViewRaw = z.output<typeof ViewRawSchema>

// Схема записи из списка "Лайки"
// id_tg = кого лайкнули (target), id_tg_m = кто лайкнул (liker)
// foto здесь — строка URL (не объект)
export const LikeRawSchema = z.object({
  id: z.string(),
  id_tg: z.string(),    // target (кого лайкнули)
  id_tg_m: z.string(),  // liker (кто лайкнул)
  imia: z.string().default(''),
  vozrast: z.string().default(''),
  klub: z.string().default(''),
  gorod: z.string().default(''),
  o_sebe: z.string().default(''),
  foto: z.string().default(''),
  imia_m: z.string().default(''),
  vozrast_m: z.string().default(''),
  klub_m: z.string().default(''),
  gorod_m: z.string().default(''),
  o_sebe_m: z.string().default(''),
  foto_m: z.string().default(''),
  created_at: z.string().optional(),
})

export type LikeRaw = z.output<typeof LikeRawSchema>

// Схема записи из списка "Лайки (взаимные)" — мэтчи
// Аналогична лайкам + username
export const MatchRawSchema = LikeRawSchema.extend({
  username: z.string().nullable().optional(),
})

export type MatchRaw = z.output<typeof MatchRawSchema>

// Ответ WATBOT API
export const WatbotResponseSchema = z.object({
  data: z.array(z.record(z.string(), z.unknown())).default([]),
  meta: z.object({
    current_page: z.number(),
    last_page: z.number(),
    total: z.number(),
    per_page: z.number(),
  }).optional(),
})
