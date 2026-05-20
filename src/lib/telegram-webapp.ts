export const BOT_URL = process.env.NEXT_PUBLIC_REGISTRATION_BOT_URL || 'https://t.me/BrightMatch_Bot'

export function returnToBot(): void {
  if (typeof window === 'undefined') return

  const tg = window.Telegram?.WebApp

  if (tg?.openTelegramLink) {
    tg.openTelegramLink(BOT_URL)
    setTimeout(() => {
      tg.close?.()
    }, 150)
    return
  }

  window.location.href = BOT_URL
  setTimeout(() => {
    window.close()
  }, 150)
}
