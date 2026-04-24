import { NextRequest, NextResponse } from 'next/server'

/**
 * Тестовый endpoint для проверки middleware
 * Требует авторизации
 */
export function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  return NextResponse.json({ 
    message: 'Авторизация прошла успешно',
    userId 
  })
}
