/**
 * Скрипт миграции данных: View + Like → ProfileAction
 * Запускать ТОЛЬКО если в старых таблицах есть данные, которые нужно сохранить.
 * При старте с нуля этот скрипт не нужен.
 *
 * Запуск: npx tsx prisma/seed-migration.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Начало миграции данных...')

  // Проверяем что таблицы существуют через raw SQL
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `
  const tableNames = tables.map((t) => t.tablename)
  console.log('Таблицы в БД:', tableNames.join(', '))

  if (!tableNames.includes('likes') && !tableNames.includes('views')) {
    console.log('Старые таблицы не найдены — миграция не нужна.')
    return
  }

  let migratedLikes = 0
  let migratedViews = 0

  // Мигрируем лайки
  if (tableNames.includes('likes')) {
    const likes = await prisma.$queryRaw<{ liker_id: string; target_id: string; created_at: Date }[]>`
      SELECT liker_id, target_id, created_at FROM likes
    `
    for (const like of likes) {
      try {
        await prisma.profileAction.upsert({
          where: {
            viewer_profile_id_target_profile_id: {
              viewer_profile_id: like.liker_id,
              target_profile_id: like.target_id,
            },
          },
          create: {
            viewer_profile_id: like.liker_id,
            target_profile_id: like.target_id,
            action: 'like',
            source: 'feed',
            created_at: like.created_at,
          },
          update: {},
        })
        migratedLikes++
      } catch { /* пропускаем дублирующиеся записи */ }
    }
    console.log(`Мигрировано лайков: ${migratedLikes}`)
  }

  // Мигрируем просмотры (только те, по которым нет лайка)
  if (tableNames.includes('views')) {
    const views = await prisma.$queryRaw<{ viewer_id: string; target_id: string; created_at: Date }[]>`
      SELECT viewer_id, target_id, created_at FROM views
    `
    for (const view of views) {
      try {
        await prisma.profileAction.upsert({
          where: {
            viewer_profile_id_target_profile_id: {
              viewer_profile_id: view.viewer_id,
              target_profile_id: view.target_id,
            },
          },
          create: {
            viewer_profile_id: view.viewer_id,
            target_profile_id: view.target_id,
            action: 'skip',
            source: 'feed',
            created_at: view.created_at,
          },
          update: {}, // не перезаписываем если уже есть лайк
        })
        migratedViews++
      } catch { /* пропускаем */ }
    }
    console.log(`Мигрировано просмотров: ${migratedViews}`)
  }

  console.log('Миграция данных завершена.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
