import { headers } from 'next/headers'
import { DesktopBlocker, DesktopOnly } from '@/components/wordfan/desktop-only'
import { AdminSidebar } from '@/components/wordfan/admin-sidebar'
import { isMobileUserAgent } from '@/lib/is-mobile'
import { getSiteSettings } from '@/lib/site-settings'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  if (isMobileUserAgent(h.get('user-agent'))) return <DesktopBlocker />
  
  const { logoUrl } = await getSiteSettings()
  
  return (
    <DesktopOnly>
      {/* A sidebar vive no layout: permanece montada enquanto só o conteúdo troca. */}
      <div className="admin-scope flex min-h-dvh bg-[#050505]">
        <AdminSidebar siteLogoUrl={logoUrl || undefined} />
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div
            className="pointer-events-none absolute -right-40 -top-56 size-[520px] rounded-full bg-primary/[0.055] blur-[130px]"
            aria-hidden="true"
          />
          <div className="relative min-h-dvh">{children}</div>
        </div>
      </div>
    </DesktopOnly>
  )
}
