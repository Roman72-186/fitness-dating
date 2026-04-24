import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

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
    <html lang="ru" className="dark">
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className="bg-brand-bg text-brand-text min-h-screen">
        {children}
      </body>
    </html>
  )
}
