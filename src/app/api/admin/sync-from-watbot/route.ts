import { NextRequest, NextResponse } from 'next/server'
import { upsertProfile } from '@/lib/db'
import { invalidateAllProfiles } from '@/lib/redis'

// ─── WATBOT API константы ────────────────────────────────────────────────────
const WATBOT_BASE_URL = 'https://watbot.ru/api/v1'

// schema_id списка «Анкеты» (watbot-lists-reference.md)
const SCHEMA_PROFILES = '69707769a7b40f826a0d9e22'

// Пример записи из WATBOT:
// {
//   "id_tg": "270703004",           ← наш telegram_id
//   "kak_obrashhatsia": "Nikita",   ← name
//   "pol": "🙋‍♂️ Мужской",           ← gender (маппинг ниже)
//   "s_kem_poznakomitsia": "С девушками", ← interested_in (маппинг ниже)
//   "vozrast": "28",                ← age (string → parseInt)
//   "gorod": "Тюмень",              ← city
//   "klub": "BF_Сити Молл",         ← club
//   "o_sebe": "Текст о себе",       ← about
//   "foto": { "url": "https://storage.watbot.ru/..." } ← photos[0]  ⚠️ объект, не строка!
// }
// ─────────────────────────────────────────────────────────────────────────────

const SYNC_SECRET = process.env.SYNC_SECRET ?? ''
const WATBOT_API_TOKEN = process.env.WATBOT_API_TOKEN ?? ''

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Маппинг pol → gender
function parseGender(pol: string): 'male' | 'female' | 'other' {
  if (pol.includes('Мужской')) return 'male'
  if (pol.includes('Женский')) return 'female'
  return 'other'
}

// Маппинг s_kem_poznakomitsia → interested_in
function parseInterestedIn(s: string): 'male' | 'female' | 'all' {
  const lower = s.toLowerCase()
  if (lower.includes('девушк') || lower.includes('женщин')) return 'female'
  if (lower.includes('парн') || lower.includes('мужч')) return 'male'
  return 'all'
}

// Извлечь URL фото: foto — объект в анкетах (не строка!)
function parsePhotoUrl(foto: unknown): string {
  if (!foto) return ''
  if (typeof foto === 'string') return foto
  if (typeof foto === 'object' && foto !== null && 'url' in foto) {
    return (foto as { url: string }).url ?? ''
  }
  return ''
}

// Один запрос к WATBOT API
async function fetchPage(page: number, limit = 500): Promise<{
  data: Record<string, unknown>[]
  meta: { last_page: number; total: number }
}> {
  const res = await fetch(`${WATBOT_BASE_URL}/getListItems`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_token: WATBOT_API_TOKEN,
      schema_id: SCHEMA_PROFILES,
      limit,
      page,
    }),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) throw new Error(`WATBOT HTTP ${res.status}`)
  const json = await res.json() as {
    data?: Record<string, unknown>[]
    meta?: { last_page?: number; total?: number }
  }
  return {
    data: (json.data ?? []) as Record<string, unknown>[],
    meta: { last_page: json.meta?.last_page ?? 1, total: json.meta?.total ?? 0 },
  }
}

// POST /api/admin/sync-from-watbot
// Защита: x-sync-secret заголовок
// Тело (опционально): { "dryRun": true } — посчитать без записи в БД
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-sync-secret')
  if (!SYNC_SECRET || secret !== SYNC_SECRET) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  if (!WATBOT_API_TOKEN) {
    return NextResponse.json({ ok: false, error: 'WATBOT_API_TOKEN не настроен' }, { status: 500 })
  }

  let dryRun = false
  try {
    const body = await req.json() as { dryRun?: boolean }
    dryRun = body.dryRun === true
  } catch { /* тело необязательно */ }

  console.log(`[sync-from-watbot] старт, dryRun=${dryRun}`)

  let imported = 0
  let errors = 0
  const seenIds = new Set<string>()

  try {
    // Первая страница — узнаём last_page
    const first = await fetchPage(1)
    const lastPage = first.meta.last_page
    console.log(`[sync-from-watbot] всего страниц: ${lastPage}, записей: ${first.meta.total}`)

    const allItems: Record<string, unknown>[] = [...first.data]

    // Догружаем остальные страницы с задержкой (rate limit ~2 req/sec)
    for (let page = 2; page <= lastPage; page++) {
      await delay(300)
      const { data } = await fetchPage(page)
      allItems.push(...data)
    }

    console.log(`[sync-from-watbot] получено записей: ${allItems.length}`)

    // Обрабатываем каждую запись
    for (const item of allItems) {
      const telegramId = String(item.id_tg ?? '').trim()
      if (!telegramId || !/^\d+$/.test(telegramId)) continue
      if (seenIds.has(telegramId)) continue
      seenIds.add(telegramId)

      try {
        if (!dryRun) {
          await upsertProfile({
            telegram_id: telegramId,
            name: String(item.kak_obrashhatsia ?? ''),
            age: parseInt(String(item.vozrast ?? '0'), 10) || 0,
            gender: parseGender(String(item.pol ?? '')),
            interested_in: parseInterestedIn(String(item.s_kem_poznakomitsia ?? '')),
            about: String(item.o_sebe ?? ''),
            photos: parsePhotoUrl(item.foto) ? [parsePhotoUrl(item.foto)] : [],
            city: String(item.gorod ?? ''),
            club: String(item.klub ?? ''),
            platform: 'telegram',
          })
        }
        imported++
      } catch (err) {
        errors++
        console.error(`[sync-from-watbot] ошибка upsert id_tg=${telegramId}:`, err)
      }
    }

    // Инвалидируем кэш ленты
    if (!dryRun && imported > 0) {
      await invalidateAllProfiles()
    }

    console.log(`[sync-from-watbot] готово: imported=${imported} errors=${errors} dryRun=${dryRun}`)
    return NextResponse.json({ ok: true, imported, errors, dryRun, total: allItems.length })

  } catch (err) {
    console.error('[sync-from-watbot] критическая ошибка:', err)
    return NextResponse.json({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: String(err),
      imported,
      errors,
    }, { status: 500 })
  }
}
