import type { Metadata } from 'next'
import localFont from 'next/font/local'
import Script from 'next/script'
import './globals.css'

const bodyFont = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-body',
  display: 'swap',
})

const displayFont = localFont({
  src: './fonts/GeistMonoVF.woff',
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
