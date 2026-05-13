# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Язык и обращение

Отвечай **по-русски**, обращайся на **«ты»**. Код, переменные, файлы — на английском. Комментарии в коде и commit messages — на русском.

---

## Команды

```bash
npm run dev          # Next.js dev-сервер (port 3000)
npm run build        # prisma generate + next build
npm run lint         # ESLint
npm run test         # Vitest (один прогон)
npm run test:watch   # Vitest в watch-режиме
npm run gen-token [telegram_id]  # dev JWT (default id: 123456789)
npm run db:migrate   # prisma migrate deploy (только прод через CI)
npm run db:studio    # Prisma Studio локально
npx vitest run src/lib/filtering.test.ts  # один тестовый файл
```

Сгенерировать токен и открыть приложение локально:
```bash
npm run gen-token 270703004
# открыть http://localhost:3000/?token=<JWT>
```

---

## Архитектура

### Слой данных — Prisma + PostgreSQL

Единственная БД — PostgreSQL в Docker-контейнере `fm_db`. Схема в `prisma/schema.prisma`.

**Три таблицы:**
- `users` — профили (`telegram_id` — PK). Поле `photos: Json` — массив URL; `photo_url` — legacy-совместимость.
- `profile_actions` — все действия свайпа (`viewer_profile_id`, `target_profile_id`, `action: like|skip`). Unique constraint исключает повторные действия.
- `matches` — взаимные лайки (`user_a_id < user_b_id` — нормализованный порядок).

Все обращения к БД — только через `src/lib/db.ts`. Файл экспортирует singleton `prisma` и хелперы: `getProfile`, `getAllProfiles`, `upsertProfile`, `writeAction`, `fetchActedTargetIds`, `checkMutualLike`, `writeMatch`, `fetchIncomingLikes`, `fetchMatches`.

### DEV_MODE

`DEV_MODE=true` в `.env.local` — все функции `db.ts` переключаются на мок-данные из `src/lib/__mocks__/`. Middleware и JWT **не** обходятся.

### Авторизация

`src/hooks/useToken.ts` пробует три метода по порядку:
1. `?token=` в URL — прямой JWT (dev через `gen-token`, серверные интеграции)
2. `window.Telegram.WebApp.initData` — Telegram Mini App (BotFather) → `/api/auth/telegram`
3. Гостевая UUID-сессия в localStorage → `/api/auth/guest`

Для серверных интеграций (WATBOT-сценарий с `?telegram_id=`) используется `/api/auth/by-id` (защищён `SYNC_SECRET`). Этот маршрут выдаёт JWT по telegram_id без initData.

После авторизации токен хранится в Zustand (`src/store/auth-store.ts`). Все API-запросы с фронта идут с `Authorization: Bearer <token>`.

Middleware отсутствует (`middleware.ts` не создан) — каждый Route Handler вызывает `getAuthUser(req)` из `src/lib/auth.ts` вручную. `getAuthUser` парсит JWT из заголовка `Authorization: Bearer`.

Гостевые пользователи (`userId.startsWith('guest_')`) пропускаются без записи в `profile_actions`.

### Лента (feed)

`GET /api/feed` — стартовая пачка (3 анкеты).
`GET /api/profiles/next?exclude=id1,id2,...` — одна следующая анкета.

Обе ручки вызывают `buildFeed()` из `src/lib/filtering.ts`. Логика: фильтрует просмотренных (`fetchActedTargetIds`), себя, учитывает `interested_in`. 4-тировая приоритизация: tier1 = тот же клуб **и** город, tier2 = тот же город, tier3 = тот же клуб, tier4 = все остальные. Каждый тир перемешивается случайно.

На клиенте `useFeed.ts` управляет стеком: `fetchFeed()` загружает стартовую пачку, `advanceAfterSwipe()` — запрашивает следующую анкету, потом сдвигает стек. Промежуточного экрана «загрузка» после свайпа нет.

### Действия (action flow)

`POST /api/action` → `src/lib/actions.ts` → `handleAction()`:
1. Загружает оба профиля из БД.
2. `writeAction()` — upsert в `profile_actions` (повторное действие не перезаписывается).
3. Если `action=like`: fire-and-forget `notifyNewLike`, проверка взаимности, при мэтче — `writeMatch` + `notifyMatch`.
4. При мэтче возвращает `contact` с телефоном и username партнёра.

`POST /api/profiles/action` — алиас, ведёт ту же логику.
`POST /api/likes/respond` — ответ на входящий лайк (тот же `handleAction`, source=`incoming_likes`).

### Уведомления

`src/lib/notify.ts` — отправка через Telegram Bot API (fire-and-forget, ошибки логируются но не бросаются).

### Загрузка фото

`POST /api/upload` + `src/lib/s3.ts` — S3-совместимое хранилище (TimeWeb S3). URL строится через `S3_PUBLIC_BASE_URL` или `S3_ENDPOINT/S3_BUCKET/key`. `next.config.mjs` содержит `remotePatterns` для `s3.twcstorage.ru` и `storage.watbot.ru`.

### Структура страниц

Все авторизованные страницы внутри `src/app/(auth)/` (route group). Layout оборачивает в `AppShell` (TokenGate: спиннер → ошибка → контент) и `BottomNav`.

Маршруты: `/feed`, `/likes`, `/matches`, `/profile`. Кеш для этих страниц принудительно отключён (`force-dynamic` + `no-store` headers в `next.config.mjs`).

### Административные ручки

- `POST /api/admin/sync-from-watbot` — импорт профилей из WATBOT (защищён `SYNC_SECRET`)
- `POST /api/admin/migrate-photos-to-s3` — перенос фото с storage.watbot.ru в S3
- `POST /api/bot/register-profile` — регистрация профиля через бота (защищён заголовком `x-webhook-secret: BOT_WEBHOOK_SECRET`)

---

## Деплой

**Прод:** `https://fit.assaru.space`, Docker Compose + Traefik, VPS 89.23.96.254.

```bash
# Сборка перед деплоем
npm run build

# На VPS (путь /home/fitness-dating):
docker compose -f docker-compose.prod.yml build --no-cache app
docker compose -f docker-compose.prod.yml up -d --force-recreate app
docker compose -f docker-compose.prod.yml logs --tail=50 app
```

Prisma на проде использует `linux-musl-openssl-3.0.x` бинарник (Alpine). `binaryTargets` в `prisma/schema.prisma` уже настроены.

**Миграции на проде — только `prisma migrate deploy`, никогда `migrate dev`. Перед миграцией — бэкап БД.**

### SSH

SSH-псевдоним для `89.23.96.254` в `~/.ssh/config` не настроен по умолчанию. Добавить вручную:
```
Host vps-fitness
    HostName 89.23.96.254
    User root
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60
```

На Windows SSH с heredoc зависает — объединять команды в один вызов через `;` или `&&`.

---

## Env-переменные

Обязательные:
```
DATABASE_URL        # postgresql://fituser:pass@db:5432/fitness_dating
JWT_SECRET          # мин. 32 символа
SYNC_SECRET         # защита /api/auth/by-id и /api/admin/*
TELEGRAM_BOT_TOKEN  # верификация initData + уведомления
BOT_WEBHOOK_SECRET  # защита /api/bot/register-profile
S3_ENDPOINT / S3_BUCKET / S3_ACCESS_KEY / S3_SECRET_KEY / S3_REGION
```

Опциональные:
```
S3_PREFIX           # default: fitness-dating/avatars
S3_PUBLIC_BASE_URL  # CDN домен; если пусто, строится через endpoint/bucket
UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN  # кэш ленты (не используется в текущей версии)
DEV_MODE=false      # true — мок-данные
WATBOT_API_TOKEN    # только для /api/admin/sync-from-watbot
```
