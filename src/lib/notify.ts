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
  | { text: string; callback_data: string }

type InlineButtons = InlineButton[] | InlineButton[][]

function fullUrl(path: string): string {
  const base = MINIAPP_URL.replace(/\/$/, '')
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
}

// web_app-кнопка открывает Mini App прямо в Telegram, без браузера.
function miniAppButton(text: string, path: string): InlineButton {
  return { text, web_app: { url: fullUrl(path) } }
}

function callbackButton(text: string, callbackData: string): InlineButton {
  return { text, callback_data: callbackData }
}

async function isTelegram(userId: string): Promise<boolean> {
  const platform = await getUserPlatform(userId).catch(() => null)
  // null трактуем как telegram — поведение старого кода (WATBOT-импорт без platform)
  return platform === null || platform === 'telegram'
}

// Telegram может отвергнуть web_app-кнопку (если домен не привязан к боту или чат — не private).
// В этом случае фоллбэк на обычную url-кнопку: откроется в браузере, но хоть откроется.
function isInlineKeyboardRows(buttons: InlineButtons): buttons is InlineButton[][] {
  return Array.isArray(buttons[0])
}

function inlineKeyboard(buttons?: InlineButtons): InlineButton[][] | undefined {
  if (!buttons || buttons.length === 0) return undefined
  return isInlineKeyboardRows(buttons) ? buttons : [buttons]
}

function hasWebApp(buttons?: InlineButtons): boolean {
  return inlineKeyboard(buttons)?.some((row) => row.some((b) => 'web_app' in b)) ?? false
}

function stripWebApp(buttons?: InlineButtons): InlineButtons | undefined {
  if (!buttons) return undefined
  return inlineKeyboard(buttons)?.map((row) =>
    row.map((b) => ('web_app' in b ? { text: b.text, url: b.web_app.url } : b)),
  )
}

interface TgResponse { ok: boolean; status: number; body: string }

interface PhotoFile {
  buffer: Buffer
  filename: string
  contentType: string
}

type RetryOptions = {
  attempts?: number
  delayMs?: number
}

function tgNetworkError(method: string, err: Error): TgResponse {
  return { ok: false, status: 0, body: `${method}: ${err.message}` }
}

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
        let data = ''
        res.on('data', (chunk) => { data += String(chunk) })
        res.on('end', () => {
          const status = res.statusCode ?? 0
          resolve({ ok: status >= 200 && status < 300, status, body: data.slice(0, 500) })
        })
      },
    )
    req.on('timeout', () => { req.destroy(new Error('TIMEOUT')) })
    req.on('error', (err) => { resolve(tgNetworkError(method, err)) })
    req.write(payload)
    req.end()
  })
}

// Telegram с VPS RU работает с перебоями — иногда первые 2-3 попытки таймаутятся.
// Для фото даём больше времени, потому что Telegram иногда дольше принимает media-запросы.
async function callTg(
  method: string,
  body: Record<string, unknown>,
  timeoutMs: number,
  options: RetryOptions = {},
): Promise<TgResponse | null> {
  const attempts = options.attempts ?? 4
  const delayMs = options.delayMs ?? 500

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const res = await callTgOnce(method, body, timeoutMs)
    if (res && (res.ok || (res.status >= 400 && res.status < 500))) return res
    if (attempt < attempts) await new Promise((r) => setTimeout(r, delayMs))
  }
  return null
}

function downloadPhotoOnce(photoUrl: string, timeoutMs: number): Promise<PhotoFile | null> {
  return new Promise((resolve) => {
    let parsed: URL
    try {
      parsed = new URL(photoUrl)
    } catch {
      return resolve(null)
    }

    const req = httpsRequest(
      {
        host: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: 'GET',
        family: 4,
        timeout: timeoutMs,
      },
      (res) => {
        const status = res.statusCode ?? 0
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume()
          downloadPhotoOnce(new URL(res.headers.location, parsed).toString(), timeoutMs)
            .then(resolve)
            .catch(() => resolve(null))
          return
        }

        if (status < 200 || status >= 300) {
          res.resume()
          resolve(null)
          return
        }

        const chunks: Buffer[] = []
        let size = 0
        res.on('data', (chunk: Buffer) => {
          size += chunk.length
          // Telegram photo limit is much higher, but this protects memory on bad URLs.
          if (size <= 10 * 1024 * 1024) chunks.push(chunk)
        })
        res.on('end', () => {
          if (size === 0 || size > 10 * 1024 * 1024) {
            resolve(null)
            return
          }

          const filename = decodeURIComponent(parsed.pathname.split('/').pop() || 'photo.jpg')
          const contentType = String(res.headers['content-type'] || 'image/jpeg').split(';')[0]
          resolve({ buffer: Buffer.concat(chunks), filename, contentType })
        })
      },
    )
    req.on('timeout', () => { req.destroy(new Error('TIMEOUT')) })
    req.on('error', () => { resolve(null) })
    req.end()
  })
}

function callTgMultipartOnce(
  method: string,
  fields: Record<string, string>,
  file: PhotoFile,
  timeoutMs: number,
): Promise<TgResponse | null> {
  return new Promise((resolve) => {
    if (!BOT_TOKEN) return resolve(null)

    const boundary = `----fitmatch-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const parts: Buffer[] = []

    for (const [name, value] of Object.entries(fields)) {
      parts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
      ))
    }

    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="${file.filename.replace(/"/g, '')}"\r\nContent-Type: ${file.contentType}\r\n\r\n`,
    ))
    parts.push(file.buffer)
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`))

    const payload = Buffer.concat(parts)
    const req = httpsRequest(
      {
        host: 'api.telegram.org',
        port: 443,
        path: `/bot${BOT_TOKEN}/${method}`,
        method: 'POST',
        family: 4,
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
          'content-length': payload.length,
        },
        timeout: timeoutMs,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => { data += String(chunk) })
        res.on('end', () => {
          const status = res.statusCode ?? 0
          resolve({ ok: status >= 200 && status < 300, status, body: data.slice(0, 500) })
        })
      },
    )
    req.on('timeout', () => { req.destroy(new Error('TIMEOUT')) })
    req.on('error', (err) => { resolve(tgNetworkError(method, err)) })
    req.write(payload)
    req.end()
  })
}

async function callTgMultipart(
  method: string,
  fields: Record<string, string>,
  file: PhotoFile,
  timeoutMs: number,
  options: RetryOptions = {},
): Promise<TgResponse | null> {
  const attempts = options.attempts ?? 4
  const delayMs = options.delayMs ?? 500

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const res = await callTgMultipartOnce(method, fields, file, timeoutMs)
    if (res && (res.ok || (res.status >= 400 && res.status < 500))) return res
    if (attempt < attempts) await new Promise((r) => setTimeout(r, delayMs))
  }
  return null
}

async function sendMessage(chatId: string, text: string, buttons?: InlineButtons): Promise<void> {
  const payload = (btn?: InlineButtons) => ({
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(btn && btn.length > 0 ? { reply_markup: { inline_keyboard: inlineKeyboard(btn) } } : {}),
  })

  let res = await callTg('sendMessage', payload(buttons), 5000)
  if (res && !res.ok && hasWebApp(buttons)) {
    // web_app не прошёл — пробуем как обычный url
    res = await callTg('sendMessage', payload(stripWebApp(buttons)), 5000)
  }
  if (!res || !res.ok) {
    console.error(`[notify] sendMessage ${chatId}: HTTP ${res?.status} ${res?.body ?? ''}`)
  }
}

async function sendPhotoByUrl(chatId: string, photoUrl: string, caption: string, buttons?: InlineButtons): Promise<boolean> {
  const payload = (btn?: InlineButtons) => ({
    chat_id: chatId,
    photo: photoUrl,
    caption,
    parse_mode: 'HTML',
    ...(btn && btn.length > 0 ? { reply_markup: { inline_keyboard: inlineKeyboard(btn) } } : {}),
  })

  let res = await callTg('sendPhoto', payload(buttons), 20000, { attempts: 6, delayMs: 1500 })
  if (res && !res.ok && hasWebApp(buttons)) {
    res = await callTg('sendPhoto', payload(stripWebApp(buttons)), 20000, { attempts: 3, delayMs: 1500 })
  }
  if (!res || !res.ok) {
    console.error(`[notify] sendPhotoByUrl ${chatId}: HTTP ${res?.status} ${res?.body ?? ''}`)
    return false
  }
  return true
}

async function sendPhotoUpload(chatId: string, photoUrl: string, caption: string, buttons?: InlineButtons): Promise<boolean> {
  const file = await downloadPhotoOnce(photoUrl, 20000)
  if (!file) {
    console.error(`[notify] sendPhotoUpload ${chatId}: PHOTO_DOWNLOAD_FAILED`)
    return false
  }

  const fields = (btn?: InlineButtons): Record<string, string> => ({
    chat_id: chatId,
    caption,
    parse_mode: 'HTML',
    ...(btn && btn.length > 0 ? { reply_markup: JSON.stringify({ inline_keyboard: inlineKeyboard(btn) }) } : {}),
  })

  let res = await callTgMultipart('sendPhoto', fields(buttons), file, 30000, { attempts: 6, delayMs: 1500 })
  if (res && !res.ok && hasWebApp(buttons)) {
    res = await callTgMultipart('sendPhoto', fields(stripWebApp(buttons)), file, 30000, { attempts: 3, delayMs: 1500 })
  }

  if (!res || !res.ok) {
    console.error(`[notify] sendPhotoUpload ${chatId}: HTTP ${res?.status} ${res?.body ?? ''}`)
    return false
  }

  return true
}

async function sendPhoto(chatId: string, photoUrl: string, caption: string, buttons?: InlineButtons): Promise<boolean> {
  const uploaded = await sendPhotoUpload(chatId, photoUrl, caption, buttons)
  if (uploaded) return true

  // Если Telegram не принял multipart, пробуем дать ему прямую S3-ссылку.
  return sendPhotoByUrl(chatId, photoUrl, caption, buttons)
}

function formatProfileLines(profile: {
  name: string
  age?: number
  gender?: string
  club?: string
  city?: string
  about?: string
}, intro: string): string {
  const lines: string[] = []
  lines.push(`${intro} <b>${escapeHtml(profile.name)}</b>${profile.age ? `, ${profile.age}` : ''}`)

  if (profile.club || profile.city) {
    const loc = [profile.club, profile.city].filter(Boolean).map((x) => escapeHtml(String(x))).join(' · ')
    lines.push(`🏋️ ${loc}`)
  }

  if (profile.about) {
    const about = profile.about.length > 300 ? `${profile.about.slice(0, 300)}…` : profile.about
    lines.push(`\n${escapeHtml(about)}`)
  }

  return lines.join('\n')
}

async function sendProfileNotification(
  chatId: string,
  profileId: string,
  fallbackText: string,
  buttons: InlineButtons,
  intro: string,
  outro: string,
): Promise<void> {
  const profile = await getProfile(profileId).catch(() => null)

  if (!profile) {
    await sendMessage(chatId, fallbackText, buttons)
    return
  }

  const text = `${formatProfileLines(profile, intro)}\n\n${outro}`
  const photo = profile.photos?.[0]

  if (photo) {
    const sent = await sendPhoto(chatId, photo, text, buttons)
    if (sent) return
  }

  await sendMessage(chatId, text, buttons)
}

// Уведомление при взаимном мэтче — обоим пользователям (только telegram)
export async function notifyMatch(userAId: string, userBId: string): Promise<void> {
  const matchButtons = [
    [callbackButton('💥 Вместе в BF', '/b4459087')],
    [miniAppButton('⚡ Открыть мэтчи', '/matches')],
  ]
  const [aTg, bTg] = await Promise.all([isTelegram(userAId), isTelegram(userBId)])

  await Promise.allSettled([
    aTg
      ? sendProfileNotification(
          userAId,
          userBId,
          '🎉 У тебя взаимная симпатия! Открой приложение, чтобы увидеть контакт.',
          matchButtons,
          '🎉 У тебя мэтч с',
          'Вы взаимно лайкнули друг друга. Открой приложение, чтобы увидеть контакт.',
        )
      : Promise.resolve(),
    bTg
      ? sendProfileNotification(
          userBId,
          userAId,
          '🎉 У тебя взаимная симпатия! Открой приложение, чтобы увидеть контакт.',
          matchButtons,
          '🎉 У тебя мэтч с',
          'Вы взаимно лайкнули друг друга. Открой приложение, чтобы увидеть контакт.',
        )
      : Promise.resolve(),
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

  const intro = `❤️ Тебя лайкнул${liker.gender === 'female' ? 'а' : ''}`
  const caption = `${formatProfileLines(liker, intro)}\n\nОткрой приложение, чтобы ответить.`
  const photo = liker.photos?.[0]

  if (photo) {
    const sent = await sendPhoto(targetId, photo, caption, [button])
    if (sent) return
  }

  await sendMessage(targetId, caption, [button])
}
