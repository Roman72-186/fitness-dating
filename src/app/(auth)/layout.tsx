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
      <div className="max-w-md mx-auto h-screen relative flex flex-col pb-20">
        {children}
      </div>
      <BottomNav />
    </AppShell>
  )
}
