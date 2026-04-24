import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { fetchAllProfiles, fetchProfile, fetchViewedIds } from '@/lib/watbot-api'
import { buildFeed } from '@/lib/filtering'
import { getCachedFeed, setCachedFeed } from '@/lib/redis'

export async function GET(req: NextRequest) {
  const userId = await getAuthUser(req)
  if (!userId) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  try {
    // Пробуем получить кэшированный список ID анкет
    const cachedIds = await getCachedFeed(userId)

    // Загружаем профиль текущего пользователя (null для гостей)
    const me = await fetchProfile(userId)

    if (cachedIds && cachedIds.length > 0) {
      // Возвращаем первые 10 из кэша
      const pageIds = cachedIds.slice(0, 10)
      const allProfiles = await fetchAllProfiles()
      const profileMap = new Map(allProfiles.map((p) => [p.user_id, p]))
      const profiles = pageIds.map((id) => profileMap.get(id)).filter(Boolean)

      return NextResponse.json({
        profiles,
        hasMore: cachedIds.length > 10,
      })
    }

    // Загружаем все анкеты и просмотренные ID
    const [allProfiles, viewedIds] = await Promise.all([
      fetchAllProfiles(),
      fetchViewedIds(userId),
    ])

    const feed = buildFeed(allProfiles, me, viewedIds)
    const feedIds = feed.map((p) => p.user_id)

    // Кэшируем список ID
    await setCachedFeed(userId, feedIds)

    return NextResponse.json({
      profiles: feed.slice(0, 10),
      hasMore: feed.length > 10,
    })
  } catch (err) {
    console.error('[api/feed] Ошибка:', err)
    return NextResponse.json({ error: 'Ошибка загрузки ленты' }, { status: 500 })
  }
}
