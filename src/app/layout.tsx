import type { Metadata } from 'next'
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
      <body className="bg-brand-bg text-brand-text min-h-screen">
        {children}
      </body>
    </html>
  )
}
