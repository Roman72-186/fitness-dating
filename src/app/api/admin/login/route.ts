import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminToken, hasAdminCredentials, isAdminCredentials } from '@/lib/admin-auth'

const AdminLoginSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
})

export async function POST(req: Request): Promise<NextResponse> {
  if (!hasAdminCredentials()) {
    return NextResponse.json(
      { ok: false, error: 'ADMIN_NOT_CONFIGURED', message: 'Админ-доступ не настроен' },
      { status: 503 },
    )
  }

  const body: unknown = await req.json().catch(() => null)
  const parsed = AdminLoginSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'VALIDATION_ERROR', message: 'Неверный формат данных' },
      { status: 400 },
    )
  }

  if (!isAdminCredentials(parsed.data.login, parsed.data.password)) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_CREDENTIALS', message: 'Неверный логин или пароль' },
      { status: 401 },
    )
  }

  const token = await createAdminToken()
  return NextResponse.json({ ok: true, token })
}
