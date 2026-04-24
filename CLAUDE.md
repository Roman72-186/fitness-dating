# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Язык и обращение

Отвечай **по-русски**, обращайся на **«ты»**. Код, переменные, файлы — на английском. Комментарии в коде и commit messages — на русском.

---

## Команды

```bash
npm run dev          # Next.js dev-сервер (port 3000)
npm run build        # Production сборка + TypeScript check
npm run lint         # ESLint
npm run test         # Vitest (один прогон)
npm run test:watch   # Vitest в watch-режиме
npm run gen-token [telegram_id]  # Сгенерировать dev JWT (default id: 123456789)
```

Запустить один тестовый файл:
```bash
npx vitest run src/lib/filtering.test.ts
```

Сгенерировать токен для реального WATBOT-пользователя и открыть приложение:
```bash
npm run gen-token 270703004
# → открыть http://localhost:3000/?token=<JWT>
```

---

## Архитектура

### Слой данных — только WATBOT API

Никакой собственной БД. Все данные хранятся в четырёх WATBOT-списках:

| Список | Env var | Назначение |
|---|---|---|
| Анкеты | `WATBOT_LIST_PROFILES` | Профили пользователей |
| Просмотрено | `WATBOT_LIST_VIEWS` | Кто чью анкету смотрел |
| Лайки | `WATBOT_LIST_LIKES` | Лайки (содержат полные данные обоих профилей) |
| Мэтчи | `WATBOT_LIST_MATCHES` | Взаимные лайки + username |

WATBOT API: `POST /api/v1/getListItems` (чтение) и `POST /api/v1/addListItem` (запись). Параметр списка — `schema_id` (не `list_id`!). Детали схем полей — в `watbot-lists-reference.md`.

**Реальная структура WATBOT отличается от очевидной:**
- `foto` в анкетах — объект `{ url, ... }`, в лайках/мэтчах — строка URL
- `pol` — `"🙋‍♂️ Мужской"` / `"🙋‍♀️ Женский"` (требует маппинга в `gender`)
- `s_kem_poznakomitsia` — `"С девушками"` / `"С парнями"` / `"Все равно"` → `preference`
- Суффикс `_m` в полях лайков/мэтчей = тот, кто совершил действие (liker, viewer)
- Полей `active`, `training_time`, `is_viewed` в реальных данных нет

### Авторизация — три метода, один хук

`src/hooks/useToken.ts` пробует методы по порядку:
1. `?telegram_id=` в URL — WATBOT сценарий подставляет `{{id_tg}}` в ссылку кнопки → наш `/api/auth/by-id` выдаёт JWT
2. `?token=` в URL — прямой JWT (для dev-тестирования через `gen-token`)
3. `window.Telegram.WebApp.initData` — стандартный Telegram Mini App (BotFather menu button) → `/api/auth/telegram`

После авторизации token убирается из URL, сохраняется в Zustand (`src/store/auth-store.ts`).

**Важно:** статическая кнопка меню в WATBOT открывает URL без параметров. Метод 1 работает только через кнопку в **сообщении сценария** WATBOT, где поддерживается `{{id_tg}}`.

### Middleware

`middleware.ts` защищает все `/api/*` маршруты кроме `/api/health`. Верифицирует JWT через `jose`, пробрасывает `x-user-id` в заголовки запроса. Каждый Route Handler дополнительно вызывает `getAuthUser(req)` из `src/lib/auth.ts` (парсит JWT напрямую из `Authorization` заголовка).

### Фильтрация ленты

`src/lib/filtering.ts` — чистая функция `buildFeed()`. 3-тировая приоритизация:
1. Тот же клуб (`club`)
2. Тот же город (`city`)
3. Все остальные

Каждый тир перемешивается случайно. Лента кэшируется в Upstash Redis (ключ `feed:{userId}`, TTL 5 мин). Redis опционален — при отсутствии работает без кэша.

### Клиентская часть

- `AppShell` — TokenGate: показывает спиннер пока идёт авторизация, ошибку если упала, контент если ок
- `FeedScreen` + `SwipeCard` — стек карточек Framer Motion (`drag="x"`), overlays ЛАЙК/ПРОПУСК
- `useFeed` — загружает `/api/feed`, управляет стеком профилей
- Все API-запросы с фронта идут с `Authorization: Bearer <token>` заголовком

---

## DEV_MODE

`DEV_MODE=true` в `.env.local` — все WATBOT-запросы заменяются мок-данными из `src/lib/__mocks__/`. Реальный API не вызывается. Для переключения на реальный WATBOT: `DEV_MODE=false`.

---

## Деплой

Vercel. Необходимые env vars (все обязательны кроме Redis и WATBOT_HOOK_NOTIFY_MATCH):

```
JWT_SECRET                  # мин. 32 символа
TELEGRAM_BOT_TOKEN          # для верификации initData (метод 3)
WATBOT_API_TOKEN
WATBOT_LIST_PROFILES
WATBOT_LIST_VIEWS
WATBOT_LIST_LIKES
WATBOT_LIST_MATCHES
DEV_MODE=false
UPSTASH_REDIS_REST_URL      # опционально
UPSTASH_REDIS_REST_TOKEN    # опционально
WATBOT_HOOK_NOTIFY_MATCH    # опционально, webhook для уведомления о мэтче
```

Реальные значения schema_id всех списков — в `watbot-lists-reference.md`.

### next.config.mjs

Домен фото WATBOT (`storage.watbot.ru`) не добавлен в `remotePatterns` — если фото не грузятся через `next/image`, добавить:
```js
{ protocol: 'https', hostname: 'storage.watbot.ru' }
```
