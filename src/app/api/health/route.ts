import { NextResponse } from 'next/server'

/**
 * Health check endpoint
 * Не требует авторизации (исключён в middleware)
 */
export function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    time: new Date().toISOString() 
  })
}
