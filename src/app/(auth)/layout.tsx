import { AppShell } from '@/components/layout/AppShell'
import { BottomNav } from '@/components/layout/BottomNav'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppShell>
      <div className="app-shell-page relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col pb-24">
        {children}
      </div>
      <BottomNav />
    </AppShell>
  )
}
