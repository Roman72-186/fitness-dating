# Plan: Schema Migration & Feature Completion
**Дата:** 2026-05-07
**Источник:** `instruction_dating_app_gpt_claude_code.md`

---

## Что уже готово (не трогать)

- JWT-авторизация: `middleware.ts`, `src/lib/auth.ts`, `src/hooks/useToken.ts`, `src/store/auth-store.ts`
- Redis-кэш: `src/lib/redis.ts`
- Supabase Storage: `src/app/api/upload/route.ts`
- Гостевая сессия: `src/app/api/auth/guest/route.ts`
- Docker-инфраструктура: `Dockerfile`, `docker-compose.yml`, `nginx.conf`
- Базовая Prisma-схема: `prisma/schema.prisma`
- `/api/feed/route.ts` — не требует изменений после обновления db + filtering

---

## Фаза 1 — Prisma-схема

**Файл:** `prisma/schema.prisma`

### Модель `User` — добавить поля:

| Поле | Тип | Default | Примечание |
|---|---|---|---|
| `last_name` | `String?` | — | Опционально |
| `phone` | `String?` | — | Только через бота, показывать при мэтче |
| `telegram_username` | `String?` | — | Из initData или бота |
| `photos` | `Json` | `[]` | Массив URL, заменяет `photo_url` |
| `is_blocked` | `Boolean` | `false` | |
| `platform` | `String` | `"telegram"` | |

`photo_url` — оставить пока как устаревшее поле, удалить позже.

**Enum:** `Preference` → `InterestedIn`, значение `any` → `all`.

### Заменить `View` + `Like` на `ProfileAction`:

```prisma
model ProfileAction {
  id                Int      @id @default(autoincrement())
  viewer_profile_id String
  target_profile_id String
  action            String   // 'like' | 'skip'
  source            String   // 'feed' | 'incoming_likes'
  created_at        DateTime @default(now())

  @@unique([viewer_profile_id, target_profile_id])
  @@index([target_profile_id, action])
  @@index([viewer_profile_id])
  @@map("profile_actions")
}
```

### `Match` — добавить индекс:
```prisma
@@index([user_b_id])  // уже есть user_a_id, нужен второй
```

**Новый файл:** `prisma/seed-migration.ts`
Перенос: `Like` → `ProfileAction(like, feed)`, `View без Like` → `ProfileAction(skip, feed)`, `photo_url` → `photos[0]`.

---

## Фаза 2 — Типы и слой данных

### `src/types/index.ts`
- `preference` → `interested_in`, тип: `'male' | 'female' | 'all'`
- Добавить `last_name?`, `phone?`, `telegram_username?`, `is_blocked?`
- `ProfileInput` — убрать `phone` (только через бота)

### `src/lib/db.ts`
- `toProfile()` — маппинг новых полей, `photos` из `Json`
- Заменить `writeView` + `writeLike` на `writeAction(viewerId, targetId, action, source)`
- `fetchActedTargetIds(viewerId)` — всё что уже видел (вместо `fetchViewedIds`)
- `checkMutualLike` — ищет `ProfileAction(action='like')`
- `fetchIncomingLikes` — исключать: мэтчи, уже отвеченные (`source='incoming_likes'`), заблокированных
- `fetchMatches` — добавить `phone` и `telegram_username` в `MatchWithPartner`
- `getAllProfiles` — `where: { is_active: true, is_blocked: false }`

### Новый файл: `src/lib/actions.ts`
Общая функция `handleAction(userId, targetId, action, source)` — переиспользуется в `/api/action` и `/api/likes/respond`.

---

## Фаза 3 — Фильтрация

### `src/lib/filtering.ts`

4-тировая логика:

**Если `interested_in !== 'all'`:**
1. gender + city + club
2. gender + city (другой клуб)
3. gender + club (другой город)
4. только gender

**Если `interested_in === 'all'`:**
1. city + club
2. city (другой клуб)
3. club (другой город)
4. все остальные

Каждый тир перемешивается случайно. Профиль — строго в одном тире.

### `src/lib/filtering.test.ts`
Переписать тесты под новую модель. Добавить тесты порядка тиров.

---

## Фаза 4 — Существующие route handlers

| Файл | Изменение |
|---|---|
| `src/app/api/profile/route.ts` | Добавить поля, `preference`→`interested_in`, убрать `phone` из PUT |
| `src/app/api/action/route.ts` | `writeAction(…, 'feed')`, fire-and-forget `notifyNewLike(targetId)` |
| `src/app/api/likes/route.ts` | Обновлённый `fetchIncomingLikes` |
| `src/app/api/matches/route.ts` | `phone` + `telegram_username` в ответе |

---

## Фаза 5 — Auth endpoints

| Файл | Изменение |
|---|---|
| `src/app/api/auth/by-id/route.ts` | Принять `username?`, `phone?`, апсертить в User |
| `src/app/api/auth/telegram/route.ts` | Извлекать `user.username` из initData, апсертить |

---

## Фаза 6 — Новые endpoints

### `src/app/api/bot/register-profile/route.ts`
- Защита: `x-webhook-secret` header == `BOT_WEBHOOK_SECRET`
- НЕ требует JWT — добавить `/api/bot` в `publicPaths` в `middleware.ts`
- Zod-валидация всех полей включая `phone`
- Вызов `upsertProfile`, инвалидация кэша

### `src/app/api/likes/respond/route.ts`
- Требует JWT (стандартный путь)
- Тело: `{ targetId, action: 'like' | 'skip' }`
- Вызов `handleAction(userId, targetId, action, 'incoming_likes')`

---

## Фаза 7 — Уведомления

### `src/lib/notify.ts`
Добавить: `notifyNewLike(targetId)` — «❤️ Кто-то оценил твою анкету! Открой приложение, чтобы ответить.»

---

## Фаза 8 — Моки

`src/lib/__mocks__/profiles.ts`, `likes.ts`, `matches.ts`
`preference` → `interested_in`, `'any'` → `'all'`, добавить запись с `is_blocked: true`.

---

## Env-переменные: добавить

```
BOT_WEBHOOK_SECRET=   # защита /api/bot/register-profile
```

---

## Сводная таблица файлов

| Файл | Действие |
|---|---|
| `prisma/schema.prisma` | Изменить |
| `prisma/seed-migration.ts` | Создать |
| `src/types/index.ts` | Изменить |
| `src/lib/db.ts` | Изменить |
| `src/lib/filtering.ts` | Изменить |
| `src/lib/filtering.test.ts` | Переписать |
| `src/lib/notify.ts` | Добавить notifyNewLike |
| `src/lib/actions.ts` | Создать |
| `src/lib/__mocks__/*.ts` | Обновить |
| `src/app/api/profile/route.ts` | Изменить |
| `src/app/api/action/route.ts` | Изменить |
| `src/app/api/likes/route.ts` | Изменить |
| `src/app/api/matches/route.ts` | Изменить |
| `src/app/api/auth/by-id/route.ts` | Изменить |
| `src/app/api/auth/telegram/route.ts` | Изменить |
| `src/app/api/bot/register-profile/route.ts` | Создать |
| `src/app/api/likes/respond/route.ts` | Создать |
| `middleware.ts` | Добавить `/api/bot` в publicPaths |
| `.env.example` | Добавить BOT_WEBHOOK_SECRET |

**Итого: 8 фаз, 19 файлов, 2 новых endpoint, 1 новая модель БД.**
