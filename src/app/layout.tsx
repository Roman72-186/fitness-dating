import type { Metadata } from 'next'
import { Nunito } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const bodyFont = Nunito({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-body',
  display: 'swap',
})

const displayFont = Nunito({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'FitMatch — знакомства для фитнес-клуба',
  description: 'Найди партнёра по тренировкам',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className={`dark ${bodyFont.variable} ${displayFont.variable}`}>
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className="bg-brand-bg text-brand-text min-h-screen font-sans">
        {children}
      </body>
    </html>
  )
}
