# FitMatch — Знакомства для фитнес-клубов

Telegram Mini App для знакомств между посетителями фитнес-клубов. Пользователи листают анкеты, ставят лайки или скипают. При взаимном лайке возникает мэтч — обоим приходит уведомление в Telegram с контактом партнёра.

## Стек

- **Next.js 14** — React-фреймворк с App Router, Serverless API
- **React 19** — UI
- **TypeScript 5** — строгая типизация (`strict: true`)
- **Tailwind CSS 3** — стилизация (кастомная тёмная тема)
- **framer-motion** — анимации swipe-стека
- **Zustand** — state management
- **Zod** — валидация данных
- **jose** — верификация JWT от Telegram
- **Upstash Redis** — кеширование + rate limiting
- **WATBOT** — CRM и хранилище данных (4 списка: Profiles, Views, Likes, Matches)
- **Vercel** — деплой и хостинг

## Структура проекта

```
src/
├── app/
│   ├── (auth)/          # Защищённые маршруты (feed, likes, matches, profile)
│   └── api/             # API Routes (serverless functions)
├── components/          # React-компоненты
├── lib/                 # Утилиты (JWT, WATBOT client, Redis)
│   └── __mocks__/       # Мок-данные для dev-режима
├── hooks/               # React hooks
├── store/               # Zustand stores
├── types/               # TypeScript типы
└── test/                # Vitest тесты
```

## Быстрый старт

### 1. Установка

```bash
npm install
```

### 2. Переменные окружения

Создать `.env.local`:

```bash
# JWT (секрет Telegram-бота)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# WATBOT REST API
WATBOT_API_TOKEN=your_watbot_token
WATBOT_BOT_ID=12345
WATBOT_LIST_PROFILES=1
WATBOT_LIST_VIEWS=2
WATBOT_LIST_LIKES=3
WATBOT_LIST_MATCHES=4

# Webhook для уведомлений о мэтчах
WATBOT_HOOK_NOTIFY_MATCH=https://watbot.ru/hook/12345:abcdef

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Next.js
NEXT_PUBLIC_APP_URL=https://fitness-dating.vercel.app

# Dev: true — мок-данные без WATBOT
DEV_MODE=true
```

### 3. Запуск dev-сервера

```bash
npm run dev
```

Откройся в браузере: `http://localhost:3000`

### 4. Build

```bash
npm run build
npm run start
```

### 5. Тесты

```bash
npm test              # единоразовый запуск
npm run test:watch    # watch-режим
```

## Деплой на Vercel

### 1. Создать проект

```bash
vercel
```

### 2. Настроить env-переменные

Vercel Dashboard → Settings → Environment Variables → добавить все из `.env.local`

### 3. Деплой

```bash
vercel --prod
```

## Документация

### Obsidian Knowledge Vault

База знаний проекта находится в `../obsidian-vault/`.

**Начальная точка:**
- `obsidian-vault/00-home/index.md` — главная страница
- `obsidian-vault/00-home/текущие приоритеты.md` — roadmap

**Архитектура:**
- `atlas/архитектура проекта.md` — общая схема
- `atlas/стек технологий.md` — детали стека
- `atlas/схема базы данных WATBOT.md` — 4 списка, структура записей

**Интеграции:**
- `knowledge/integrations/WATBOT API.md` — REST API WATBOT
- `knowledge/integrations/Telegram Mini Apps.md` — SDK, initData, haptic

**Паттерны:**
- `knowledge/patterns/JWT верификация.md` — middleware, верификация токена
- `knowledge/business/механика мэтчей.md` — бизнес-логика лайков и мэтчей

**Сессии:**
- `sessions/` — дневник работы (после каждой сессии — новая заметка)

### Техническое задание

`../TZ_MiniApp_Fitness_Dating.docx`

## Скрипты

- `npm run dev` — запуск dev-сервера (port 3000)
- `npm run build` — production build
- `npm run start` — запуск production-сервера
- `npm run lint` — ESLint проверка
- `npm test` — запуск тестов (Vitest)
- `npm run test:watch` — watch-режим тестов

## Особенности

### Dev Mode

При `DEV_MODE=true`:
- Middleware пропускает верификацию JWT
- API возвращает мок-данные из `lib/__mocks__/profiles.ts`
- Используется фейковый `user_id = '123456789'`

### Тёмная тема

Кастомные цвета из `tailwind.config.ts`:
- `brand-bg`: `#080c14` (фон)
- `brand-accent`: `#00d4ff` (акцент, неоновый синий)
- `brand-like`: `#22c55e` (зелёный)
- `brand-skip`: `#ef4444` (красный)

### Rate Limiting

Лимит 100 лайков/скипов в день на пользователя (через Upstash Redis).

## Статус проекта

**Этап 0: Инфраструктура** — ✅ Завершён (23.04.2026)

**Следующий:** Этап 1 — Базовая JWT-авторизация и мок-данные

---

**Автор:** magigigogi2026@gmail.com  
**Лицензия:** Proprietary (не для публичного использования)
