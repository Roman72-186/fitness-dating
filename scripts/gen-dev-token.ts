#!/usr/bin/env node
/**
 * Генерация dev JWT для тестирования
 * Запуск: npm run gen-token [telegram_id]
 * 
 * Использует JWT_SECRET из .env.local
 * По умолчанию генерирует токен для telegram_id = 123456789
 */
import { SignJWT } from 'jose'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const secret = process.env.JWT_SECRET
if (!secret) {
  console.error('❌ Ошибка: JWT_SECRET не найден в .env.local')
  console.error('Создайте .env.local и добавьте: JWT_SECRET=your-secret-key')
  process.exit(1)
}

const userId = process.argv[2] ?? '123456789'

;(async () => {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(new TextEncoder().encode(secret))

  console.log('\n✅ Dev токен для пользователя:', userId)
  console.log('\n📱 URL для открытия:')
  console.log(`http://localhost:3000/?token=${token}`)
  console.log('\n🔑 Токен для curl/Postman:')
  console.log(token)
  console.log('')
})()
