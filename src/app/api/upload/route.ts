import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { uploadProfilePhoto } from '@/lib/s3'

export async function POST(req: NextRequest) {
  const userId = await getAuthUser(req)
  if (!userId || userId.startsWith('guest_')) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED', message: 'Не авторизован' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR', message: 'Файл не передан' }, { status: 400 })
    }

    const maxSize = 5 * 1024 * 1024 // 5 MB
    if (file.size > maxSize) {
      return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR', message: 'Файл слишком большой (макс. 5 МБ)' }, { status: 400 })
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR', message: 'Только JPEG, PNG, WebP' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const uploaded = await uploadProfilePhoto({
      userId,
      fileName: file.name || 'photo',
      contentType: file.type,
      bytes: new Uint8Array(bytes),
    })

    return NextResponse.json({ ok: true, url: uploaded.url, key: uploaded.key })
  } catch (err) {
    console.error('[api/upload] Ошибка:', err)
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR', message: 'Внутренняя ошибка' }, { status: 500 })
  }
}
