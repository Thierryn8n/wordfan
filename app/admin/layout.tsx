import { headers } from 'next/headers'
import { DesktopBlocker, DesktopOnly } from '@/components/wordfan/desktop-only'
import { AdminSidebar } from '@/components/wordfan/admin-sidebar'
import { isMobileUserAgent } from '@/lib/is-mobile'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  if (isMobileUserAgent(h.get('user-agent'))) return <DesktopBlocker />
  return (
    <DesktopOnly>
      {/* A sidebar vive no layout: permanece montada enquanto só o conteúdo troca. */}
      <div className="flex min-h-dvh bg-background">
        <AdminSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </DesktopOnly>
  )
}
