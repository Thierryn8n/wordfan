import { headers } from 'next/headers'
import { DesktopBlocker, DesktopOnly } from '@/components/wordfan/desktop-only'
import { isMobileUserAgent } from '@/lib/is-mobile'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  if (isMobileUserAgent(h.get('user-agent'))) return <DesktopBlocker />
  return <DesktopOnly>{children}</DesktopOnly>
}
