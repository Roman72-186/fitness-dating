// Исходящий вебхук для уведомления о мэтче через WATBOT сценарий

interface MatchPayload {
  user_a_id: string
  user_b_id: string
  event: 'mutual_match'
}

export async function notifyMatch(userAId: string, userBId: string): Promise<void> {
  const hookUrl = process.env.WATBOT_HOOK_NOTIFY_MATCH
  if (!hookUrl) return

  const payload: MatchPayload = {
    user_a_id: userAId,
    user_b_id: userBId,
    event: 'mutual_match',
  }

  try {
    await fetch(hookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    // Уведомление некритично — логируем и продолжаем
    console.error('[watbot-notify] Не удалось отправить уведомление о мэтче')
  }
}
