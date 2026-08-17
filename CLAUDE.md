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
npm run db:seed-migration        # tsx prisma/seed-migration.ts
npx vitest run src/lib/filtering.test.ts  # один тестовый файл
```

Сгенерировать токен и открыть приложение локально:
```bash
npm run gen-token 270703004
# открыть http://localhost:3000/?token=<JWT>
```

Тестами покрыт один файл — `src/lib/filtering.test.ts` (30 тестов на `buildFeed`). Остальная логика тестов не имеет: зелёный `npm run test` не означает, что регрессии нет.

### Git

`fitness-dating/` — **отдельный git-репозиторий** внутри workspace-репозитория `Project`, remote `https://github.com/Roman72-186/fitness-dating.git`, ветка `main`. Коммитить изнутри этой папки, не из корня workspace.

### Устаревшая документация

`README.md` описывает исходную архитектуру апреля 2026: WATBOT как хранилище данных, деплой на Vercel, лимит 100 лайков в день через Redis. Ничего из этого уже не работает так. Источник правды — этот файл, README не использовать.

---

## Архитектура

### Слой данных — Prisma + PostgreSQL

Единственная БД — PostgreSQL в Docker-контейнере `fm_db`. Схема в `prisma/schema.prisma`.

**Три таблицы:**
- `users` — профили (`telegram_id` — PK). Поле `photos: Json` — массив URL; `photo_url` — legacy-совместимость. `platform` (`telegram` по умолчанию) определяет, куда идут уведомления.
- `profile_actions` — все действия свайпа (`viewer_profile_id`, `target_profile_id`, `action: like|skip`, `source: feed|incoming_likes`). Unique constraint на пару viewer+target исключает повторные действия.
- `matches` — взаимные лайки (`user_a_id < user_b_id` — нормализованный порядок).

Все обращения к БД — только через `src/lib/db.ts`. Файл экспортирует singleton `prisma` и хелперы: `getProfile`, `getAllProfiles`, `upsertProfile`, `deleteProfile`, `clearProfileInteractions`, `getUserPlatform`, `maskPhone`, `writeAction`, `fetchActedTargetIds`, `checkMutualLike`, `writeMatch`, `fetchIncomingLikes`, `fetchMatches`.

### Два инварианта, которые ломают всё, если их не знать

**1. Сохранение анкеты = полная замена анкеты и очистка истории.** Перед каждым `upsertProfile` вызывается `clearProfileInteractions(userId)`: удаляются все `profile_actions` и `matches`, где пользователь участвует любой стороной. Правило действует в `POST /api/bot/register-profile`, `POST /api/profile` и `PUT /api/profile`. Причина: пользователь удаляет себя в WATBOT и заводит анкету заново с тем же `telegram_id` — без очистки к новой анкете прилипала старая история и лента оставалась пустой. Спека — `spec/profile-replace-clears-history.md`. Bulk-импорт `/api/admin/sync-from-watbot` историю намеренно **не** чистит, чтобы один прогон не обнулил всю базу; массовый сброс — только отдельным явным действием с бэкапом.

**2. Неполная анкета невидима.** `getProfile` и `getAllProfiles` пропускают строку через `isCompleteProfileRow`: непустые `name`, `city`, `club`, `about`, `age >= 18`, `gender != other`, `is_active`, `!is_blocked`. Строка в БД есть, а `getProfile` вернёт `null` — и `GET /api/feed` отдаст `403 PROFILE_REQUIRED` («Анкета не найдена. Сначала пройдите регистрацию в боте»). Такую жалобу разбирать не в авторизации, а в полноте полей.

### DEV_MODE

`DEV_MODE=true` в `.env.local` — все функции `db.ts` переключаются на мок-данные из `src/lib/__mocks__/`. Middleware и JWT **не** обходятся.

### Авторизация

`src/hooks/useToken.ts` пробует три метода по порядку:
1. `?token=` в URL — прямой JWT (dev через `gen-token`, серверные интеграции)
2. `window.Telegram.WebApp.initData` — Telegram Mini App (BotFather) → `/api/auth/telegram`
3. Гостевая UUID-сессия в localStorage → `/api/auth/guest`

Для серверных интеграций используется `POST /api/auth/by-id` — выдаёт JWT по `telegram_id` без initData. Тело: `{ telegram_id, secret, username?, phone? }`, где `secret` сверяется с `SYNC_SECRET`; `username` и `phone` при передаче апсертятся в `users` (пустыми не перезаписывают).

После авторизации токен хранится в Zustand (`src/store/auth-store.ts`). Все API-запросы с фронта идут с `Authorization: Bearer <token>`.

Гостевые пользователи (`userId.startsWith('guest_')`) в `/api/feed` идут по ветке `me = null` — лента без фильтров, история не пишется.

### Два уровня защиты API

`middleware.ts` **существует** и работает на `matcher: ['/api/:path*']`: проверяет `Authorization: Bearer`, при ошибке отдаёт `401 UNAUTHORIZED`, при успехе прокидывает `x-user-id` в заголовки запроса. Мимо middleware проходят префиксы из `publicPaths`: `/api/health`, `/api/auth`, `/api/bot`, `/api/admin`.

Поверх этого каждый пользовательский Route Handler ещё раз вызывает `getAuthUser(req)` из `src/lib/auth.ts` — то есть JWT проверяется дважды, и это не лишнее: `x-user-id` из middleware читает только `/api/test`. Пользовательские ручки на инъекцию заголовка не опираются.

Раз `/api/admin` и `/api/bot` middleware не покрывает, каждая такая ручка защищается сама, и способы разные:

| Ручка | Чем защищена | Где лежит секрет |
|---|---|---|
| `/api/auth/by-id` | поле `secret` в JSON-теле | `SYNC_SECRET` |
| `/api/admin/sync-from-watbot`, `/api/admin/migrate-photos-to-s3` | заголовок `x-sync-secret` | `SYNC_SECRET` |
| `/api/admin/stats`, `/api/admin/reset-views` | админский JWT, `Authorization: Bearer` → `verifyAdminToken` | `ADMIN_SESSION_SECRET` (fallback `JWT_SECRET`) |
| `/api/bot/register-profile`, `/api/bot/delete-profile` | заголовок `x-webhook-secret` | `BOT_WEBHOOK_SECRET` |
| `/api/health`, `/api/auth/telegram`, `/api/auth/guest` | ничем, публичные | — |

Добавляешь ручку под `/api/admin` или `/api/bot` — проверку авторизации пишешь руками, middleware её не прикроет.

### Лента (feed)

`GET /api/feed` — стартовая пачка (3 анкеты).
`GET /api/profiles/next?exclude=id1,id2,...` — одна следующая анкета.

Обе ручки вызывают `buildFeed()` из `src/lib/filtering.ts` — 70 строк чистой функции, единственный покрытый тестами модуль. Логика:

- отбрасывает себя, неактивных, заблокированных и всех из `fetchActedTargetIds`;
- фильтр по полу **взаимный**: зритель должен искать пол кандидата, а кандидат — пол зрителя, `interested_in='all'` подходит всем;
- **три** тира, не четыре: tier1 — тот же клуб и тот же город, tier2 — тот же город, tier3 — все остальные. Каждый тир перемешивается случайно;
- `«Другой клуб»` — это метка «клуб не указан», а не название клуба. Если такой клуб у зрителя, tier1 недоступен вовсе; если у кандидата — совпадением клуба не считается;
- `me = null` (гость) — все активные незаблокированные без фильтрации.

На клиенте `useFeed.ts` управляет стеком: `fetchFeed()` загружает стартовую пачку, `advanceAfterSwipe()` — запрашивает следующую анкету, потом сдвигает стек. Промежуточного экрана «загрузка» после свайпа нет.

### Действия (action flow)

`POST /api/action` → `src/lib/actions.ts` → `handleAction()`:
1. Загружает профиль цели, при отсутствии бросает `PROFILE_NOT_FOUND`.
2. `writeAction()` — upsert в `profile_actions` (первое действие окончательное, повторное не перезаписывается).
3. `skip` — на этом всё.
4. `like`: **сначала** `checkMutualLike`, и только потом уведомление. При мэтче — `writeMatch` + `notifyMatch` и в ответе `contact` с телефоном и username партнёра. Если мэтча нет — `notifyNewLike`. Порядок именно такой, чтобы при мэтче не уходило два уведомления; менять его нельзя.

`POST /api/profiles/action` — алиас, ведёт ту же логику.
`POST /api/likes/respond` — ответ на входящий лайк (тот же `handleAction`, source=`incoming_likes`).

### Уведомления

`src/lib/notify.ts` (449 строк) — отправка через Telegram Bot API, fire-and-forget: ошибки логируются, но наверх не бросаются. Два экспорта: `notifyMatch`, `notifyNewLike`.

Два неочевидных места:

- **Фото отправляется загрузкой файла, а не ссылкой.** Порядок такой: скачать фото на сервер и отправить multipart → fallback на `sendPhoto` по URL → текстовый fallback. Причина: с VPS бывают сетевые сбои до `api.telegram.org`, и Telegram не забирает картинку, хотя S3-ссылка из браузера открывается.
- **Маршрутизация по платформе.** `isTelegram()` смотрит `getUserPlatform(userId)`; `platform = null` трактуется как `telegram` (так ведут себя анкеты, импортированные из WATBOT до появления поля).

### Загрузка фото

`POST /api/upload` + `src/lib/s3.ts` — S3-совместимое хранилище. URL строится через `S3_PUBLIC_BASE_URL` или `S3_ENDPOINT/S3_BUCKET/key`. Экспорты `s3.ts`: `uploadProfilePhoto`, `ensurePhotosInS3` (скачивает фото с чужого адреса и перекладывает в бакет — вызывается при регистрации анкеты), `isManagedS3Url`.

**Хранилищ сейчас два, и это не задумка, а незавершённый переезд** (замер 17.08.2026, подробности — `../MIGRATION-RUNBOOK.md`, часть 2):

| Где лежит | Ссылок в `photo_url` | Пишется ли сейчас |
|---|---|---|
| диск сервера, отдаётся nginx `fm_photos` по `fit.assaru.space/photos/…` | 431 | нет, каталог заморожен 08.08 |
| Object Storage Selectel (`…selstorage.ru`, бакет `s3-apparchi`, регион ru-3) | 22 | да, сюда идут все новые загрузки |
| `tempfile.redpandaai.co` — мёртвый временный хостинг | 5 | нет |
| TimeWeb `s3.twcstorage.ru` — прежнее хранилище | 0 | нет |

Важное следствие: 431 фотография существует только на диске VPS в `/opt/fitmatch-photos/files` (1356 файлов, 284 МБ). Внешней копии у них нет. **Не удалять этот каталог и не гасить `fm_photos`**, пока файлы не перелиты в бакет и ссылки в базе не переписаны.

`remotePatterns` в `next.config.mjs` разрешает семь хостов: `fit.assaru.space`, `b44804bc-…selstorage.ru`, `s3.twcstorage.ru`, `storage.watbot.ru`, `i.pravatar.cc`, `**.telegram.org`, `**.supabase.co`. Новый источник фото без записи здесь даст сломанные картинки в `next/image`. Первые два хоста до 17.08.2026 были только на сервере и отсутствовали в репозитории — деплой из локальной копии погасил бы все фото; сейчас конфиг сведён.

### Структура страниц

Все авторизованные страницы внутри `src/app/(auth)/` (route group). Layout оборачивает в `AppShell` (TokenGate: спиннер → ошибка → контент) и `BottomNav`.

Маршруты: `/feed`, `/likes`, `/matches`, `/profile`. Кеш отключён в трёх местах, и все три нужны из-за агрессивного кеширования Telegram WebView: `dynamic = 'force-dynamic'` и `revalidate = 0` в `src/app/(auth)/layout.tsx`, `no-store` headers на эти четыре пути в `next.config.mjs`, `Cache-Control: no-store` в ответах `/api/likes` и `/api/matches` плюс `cache: 'no-store'` в запросах с фронта.

### Административные и ботовые ручки

- `POST /api/admin/login` — логин по `ADMIN_LOGIN`/`ADMIN_PASSWORD`, выдаёт админский JWT на 8 часов
- `GET /api/admin/stats` — статистика (админский JWT)
- `POST /api/admin/reset-views` — точечный сброс истории по `telegramId` с флагами `resetSkips`/`resetLikes`/`resetMatches` (админский JWT)
- `POST /api/admin/sync-from-watbot` — импорт анкет из WATBOT, поддерживает `{ "dryRun": true }`
- `POST /api/admin/migrate-photos-to-s3` — перенос фото с внешних адресов в S3
- `POST /api/bot/register-profile` — регистрация или полная замена анкеты из бота. Внутри — нормализация свободного текста: `GENDER_ALIASES`/`INTERESTED_ALIASES` переводят «парнями», «девушкой», «не важно» в enum-значения, плюс `ensurePhotosInS3` перекладывает фото с чужих хостингов в бакет
- `POST /api/bot/delete-profile` — удаление анкеты со всеми связями (`deleteProfile`)

Кто чем защищён — в таблице выше. Отдельной страницы `/admin` нет: админка открывается изнутри `src/components/profile/ProfileCard.tsx` (`AdminLogin` → `AdminStats`).

### Redis

`src/lib/redis.ts` — Upstash. Чтение из кэша (`getCachedFeed`, `getCachedProfile`, `getCachedAllProfiles`) **нигде не подключено**, лента всегда собирается из БД. А вот инвалидация используется: `invalidateProfile`/`invalidateAllProfiles` вызываются в `/api/profile`, `/api/bot/register-profile`, `/api/bot/delete-profile`, `/api/admin/sync-from-watbot`, `/api/admin/migrate-photos-to-s3`. То есть код чистит кэш, который сам же не читает — если будешь включать кэширование чтения, инвалидация уже расставлена.

---

## Деплой

**Прод:** `https://fit.assaru.space`, Docker Compose + Traefik, **VPS 139.100.237.57** (Selectel; проверено 17.08.2026). Контейнеры — `fm_app` (Next.js, `output: 'standalone'`, лимит 512 МБ) и `fm_db` (postgres:16-alpine, том `fm_postgres_data`). Traefik берётся из внешней сети `web`, домен подставляется переменной `DOMAIN` в labels. Рядом на том же хосте живёт `fm_photos` — отдельный nginx из `/opt/fitmatch-photos`, раздаёт старые фото по пути `/photos` (см. «Загрузка фото»).

Старый хост `89.23.96.254` выведен из работы: на 17.08.2026 он не отвечает ни на 22, ни на 80, ни на 443 порту. Все упоминания этого адреса в старых заметках читать как историю.

```bash
# Сборка перед деплоем
npm run build

# На VPS (путь /home/fitness-dating):
docker compose -f docker-compose.prod.yml build --no-cache app
docker compose -f docker-compose.prod.yml up -d --force-recreate app
docker compose -f docker-compose.prod.yml logs --tail=50 app
```

`/home/fitness-dating` на сервере — **не git-репозиторий**, `git pull` там не работает. Путь деплоя: локально прогнать `lint`/`test`/`build`, закоммитить, скопировать изменённые файлы в `/home/fitness-dating/`, пересобрать контейнер.

**`/api/health` не годится как проверка живости.** Ручка не использует динамические API, поэтому Next вмораживает её ответ в сборку: поле `time` показывает момент билда и не меняется между запросами, даже если приложение лежит. Ответ `200` там доказывает только, что Traefik маршрутизирует. Проверять после деплоя так:

- `curl -s https://fit.assaru.space/api/profile` → `401 UNAUTHORIZED` — ответ формируется на лету, значит приложение живо;
- рендер картинки через `/_next/image?url=<ссылка из БД>&w=640&q=75` → `200` — заодно проверяет `remotePatterns`, прямой `curl` по ссылке этого не ловит;
- логи `fm_app` первые 30 секунд.

### Дубля больше нет

С 04.08 по 17.08.2026 существовали два живых экземпляра приложения с одинаковым ярлыком Traefik, и главным риском было раздвоение записи по двум базам. **Переезд состоялся, дубль снят:** экземпляр остался один, на `139.100.237.57`, старый хост недоступен. Записывать анкеты в две базы больше некуда.

Риск вернётся при следующем переезде — процедура с понижением TTL и остановкой `fm_app` в окне лежит в `../MIGRATION-RUNBOOK.md`, часть 1.

**Нельзя** делать `docker compose down` в `/home/portfolio-saas`: Traefik принадлежит compose-проекту Apparchi, но через него ходят и FitMatch, и `strekoza.assaru.space`. Гасить только точечно — `docker stop <контейнер>`.

Prisma на проде использует `linux-musl-openssl-3.0.x` бинарник (Alpine). `binaryTargets` в `prisma/schema.prisma` уже настроены.

**Миграции на проде — только `prisma migrate deploy`, никогда `migrate dev`. Перед миграцией — бэкап БД.**

### SSH

SSH-псевдоним для прода в `~/.ssh/config` не настроен по умолчанию. Добавить вручную:
```
Host vps-fitness
    HostName 139.100.237.57
    User root
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60
```

На Windows SSH с heredoc зависает — объединять команды в один вызов через `;` или `&&`.

---

## Env-переменные

Полный список с комментариями — `.env.example`, его держать в синхроне с кодом. Значения не печатать в чат и не коммитить.

Обязательные:
```
DATABASE_URL        # postgresql://fituser:pass@db:5432/fitness_dating
JWT_SECRET          # мин. 32 символа
SYNC_SECRET         # защита /api/auth/by-id и /api/admin/sync-*
TELEGRAM_BOT_TOKEN  # верификация initData + уведомления
BOT_WEBHOOK_SECRET  # защита /api/bot/register-profile и /api/bot/delete-profile
S3_ENDPOINT / S3_BUCKET / S3_ACCESS_KEY / S3_SECRET_KEY / S3_REGION
```

Только для прод-compose (`docker-compose.prod.yml` подставляет их из `.env` на сервере):
```
POSTGRES_USER / POSTGRES_PASSWORD  # из них собирается DATABASE_URL контейнера
DOMAIN                             # хост для Traefik-роутера
```

Админка статистики (без них `/api/admin/stats` и `/api/admin/reset-views` отвечают 401 всегда):
```
ADMIN_LOGIN / ADMIN_PASSWORD
ADMIN_SESSION_SECRET  # если пусто, подписью админского JWT работает JWT_SECRET
```

Опциональные:
```
S3_PREFIX           # default: fitness-dating/avatars
S3_PUBLIC_BASE_URL  # CDN домен; если пусто, строится через endpoint/bucket
UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN  # чтение кэша не подключено, вызывается только инвалидация
DEV_MODE=false      # true — мок-данные
WATBOT_API_TOKEN    # только для /api/admin/sync-from-watbot
NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  # legacy, Supabase Storage больше не используется
```

Хранилище фото: в БД лежат **абсолютные ссылки** (`users.photos`, `users.photo_url`), а не ключи объектов. Поэтому смена бакета — всегда две операции: файлы и база. Удаления объектов из S3 в коде нет ни одного, фоновых заданий тоже.

Раз хранилища сейчас два, запрос «заменить старый base-url на новый» закроет только часть строк. Любую правку ссылок писать сразу под оба префикса — локальный `fit.assaru.space/photos` и селектеловский.

В серверном `/home/fitness-dating/.env` блок `S3_*` записан **дважды** (на 17.08.2026). Побеждает нижняя копия: поправишь верхнюю — ничего не изменится. Дубли стоит вычистить.
