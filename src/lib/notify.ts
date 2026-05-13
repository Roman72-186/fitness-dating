// Уведомления через Telegram Bot API
import { request as httpsRequest } from 'node:https'
import { getProfile, getUserPlatform } from '@/lib/db'

// В нашей docker-сети IPv6 не маршрутится наружу. fetch/undici делает Happy Eyeballs
// и упирается в IPv6-таймаут. Поэтому шлём через `node:https` с family:4.

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? ''
const MINIAPP_URL = process.env.NEXT_PUBLIC_MINIAPP_URL || 'https://fit.assaru.space'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

type InlineButton =
  | { text: string; web_app: { url: string } }
  | { text: string; url: string }

function fullUrl(path: string): string {
  const base = MINIAPP_URL.replace(/\/$/, '')
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
}

// web_app-кнопка открывает Mini App прямо в Telegram, без браузера.
function miniAppButton(text: string, path: string): InlineButton {
  return { text, web_app: { url: fullUrl(path) } }
}

async function isTelegram(userId: string): Promise<boolean> {
  const platform = await getUserPlatform(userId).catch(() => null)
  // null трактуем как telegram — поведение старого кода (WATBOT-импорт без platform)
  return platform === null || platform === 'telegram'
}

// Telegram может отвергнуть web_app-кнопку (если домен не привязан к боту или чат — не private).
// В этом случае фоллбэк на обычную url-кнопку: откроется в браузере, но хоть откроется.
function stripWebApp(buttons?: InlineButton[]): InlineButton[] | undefined {
  if (!buttons) return undefined
  return buttons.map((b) => ('web_app' in b ? { text: b.text, url: b.web_app.url } : b))
}

interface TgResponse { ok: boolean; status: number }

function callTgOnce(method: string, body: Record<string, unknown>, timeoutMs: number): Promise<TgResponse | null> {
  return new Promise((resolve) => {
    if (!BOT_TOKEN) return resolve(null)
    const payload = Buffer.from(JSON.stringify(body))
    const req = httpsRequest(
      {
        host: 'api.telegram.org',
        port: 443,
        path: `/bot${BOT_TOKEN}/${method}`,
        method: 'POST',
        family: 4,
        headers: {
          'content-type': 'application/json',
          'content-length': payload.length,
        },
        timeout: timeoutMs,
      },
      (res) => {
        res.on('data', () => {})
        res.on('end', () => {
          const status = res.statusCode ?? 0
          resolve({ ok: status >= 200 && status < 300, status })
        })
      },
    )
    req.on('timeout', () => { req.destroy(new Error('TIMEOUT')) })
    req.on('error', () => { resolve(null) })
    req.write(payload)
    req.end()
  })
}

// Telegram с VPS RU работает с перебоями — иногда первые 2-3 попытки таймаутятся.
// Делаем до 4 попыток с короткой паузой; если 4xx — не ретраим.
async function callTg(method: string, body: Record<string, unknown>, timeoutMs: number): Promise<TgResponse | null> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await callTgOnce(method, body, timeoutMs)
    if (res && (res.ok || (res.status >= 400 && res.status < 500))) return res
    if (attempt < 4) await new Promise((r) => setTimeout(r, 500))
  }
  console.error(`[notify] callTg ${method}: все 4 попытки провалились`)
  return null
}

async function sendMessage(chatId: string, text: string, buttons?: InlineButton[]): Promise<void> {
  const payload = (btn?: InlineButton[]) => ({
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(btn && btn.length > 0 ? { reply_markup: { inline_keyboard: [btn] } } : {}),
  })

  let res = await callTg('sendMessage', payload(buttons), 5000)
  if (res && !res.ok && buttons?.some((b) => 'web_app' in b)) {
    // web_app не прошёл — пробуем как обычный url
    res = await callTg('sendMessage', payload(stripWebApp(buttons)), 5000)
  }
  if (!res || !res.ok) {
    console.error(`[notify] sendMessage ${chatId}: HTTP ${res?.status}`)
  }
}

async function sendPhoto(chatId: string, photoUrl: string, caption: string, buttons?: InlineButton[]): Promise<boolean> {
  const payload = (btn?: InlineButton[]) => ({
    chat_id: chatId,
    photo: photoUrl,
    caption,
    parse_mode: 'HTML',
    ...(btn && btn.length > 0 ? { reply_markup: { inline_keyboard: [btn] } } : {}),
  })

  let res = await callTg('sendPhoto', payload(buttons), 10000)
  if (res && !res.ok && buttons?.some((b) => 'web_app' in b)) {
    res = await callTg('sendPhoto', payload(stripWebApp(buttons)), 10000)
  }
  if (!res || !res.ok) {
    console.error(`[notify] sendPhoto ${chatId}: HTTP ${res?.status}`)
    return false
  }
  return true
}

// Уведомление при взаимном мэтче — обоим пользователям (только telegram)
export async function notifyMatch(userAId: string, userBId: string): Promise<void> {
  const button = miniAppButton('⚡ Открыть мэтчи', '/matches')
  const message = '🎉 У тебя взаимная симпатия! Открой приложение, чтобы увидеть контакт.'
  const [aTg, bTg] = await Promise.all([isTelegram(userAId), isTelegram(userBId)])
  await Promise.allSettled([
    aTg ? sendMessage(userAId, message, [button]) : Promise.resolve(),
    bTg ? sendMessage(userBId, message, [button]) : Promise.resolve(),
  ])
}

// Уведомление при новом входящем лайке — тянем профиль лайкнувшего и шлём фото + данные
export async function notifyNewLike(targetId: string, likerId: string): Promise<void> {
  if (!(await isTelegram(targetId))) return

  const liker = await getProfile(likerId).catch(() => null)
  const button = miniAppButton('❤️ Открыть лайки', '/likes')

  if (!liker) {
    await sendMessage(
      targetId,
      '❤️ Кто-то оценил твою анкету! Открой приложение, чтобы посмотреть.',
      [button],
    )
    return
  }

  const parts: string[] = []
  parts.push(`❤️ Тебя лайкнул${liker.gender === 'female' ? 'а' : ''} <b>${escapeHtml(liker.name)}</b>${liker.age ? `, ${liker.age}` : ''}`)
  if (liker.club || liker.city) {
    const loc = [liker.club, liker.city].filter(Boolean).map(escapeHtml).join(' · ')
    parts.push(`🏋️ ${loc}`)
  }
  if (liker.about) {
    const about = liker.about.length > 300 ? liker.about.slice(0, 300) + '…' : liker.about
    parts.push(`\n${escapeHtml(about)}`)
  }
  parts.push('\nОткрой приложение, чтобы ответить.')

  const caption = parts.join('\n')
  const photo = liker.photos?.[0]

  if (photo) {
    const sent = await sendPhoto(targetId, photo, caption, [button])
    if (sent) return
  }

  await sendMessage(targetId, caption, [button])
}
