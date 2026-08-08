'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  Users,
  Mic2,
  CreditCard,
  LayoutDashboard,
  Palette,
  BarChart3,
  ShieldCheck,
  Building2,
  Megaphone,
  Bell,
} from 'lucide-react'
import { Logo } from '@/components/wordfan/logo'

const NAV_ITEMS = [
  { label: 'DASHBOARD', icon: LayoutDashboard, href: '/admin' },
  { label: 'ARTISTAS', icon: Mic2, href: '/admin/artists' },
  { label: 'STUDIO DO ARTISTA', icon: Palette, href: '/admin/studio' },
  { label: 'USUÁRIOS', icon: Users, href: '/admin/users' },
  { label: 'ASSINATURAS', icon: CreditCard, href: '/admin/subscriptions' },
  { label: 'NOTIFICAÇÕES', icon: Bell, href: '/admin/notifications' },
  { label: 'ANÚNCIOS', icon: Megaphone, href: '/admin/ads' },
  { label: 'ENTERPRISE', icon: Building2, href: '/admin/enterprise' },
  { label: 'RELATÓRIOS', icon: BarChart3, href: '/admin/reports' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  useSearchParams()

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-white/8 bg-card px-5 py-7 lg:flex">
      <Logo href="/home" className="px-2 text-xl" />
      <p className="mt-1 flex items-center gap-1.5 px-2 text-[8px] font-black tracking-[0.3em] text-gold">
        <ShieldCheck className="size-3" aria-hidden="true" />
        ADMIN SAAS
      </p>
      <nav className="mt-8 flex flex-col gap-1" aria-label="Menu do admin">
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'flex items-center gap-3 rounded-2xl bg-gold/15 px-4 py-3 text-[10px] font-black tracking-[0.15em] text-gold'
                  : 'flex items-center gap-3 rounded-2xl px-4 py-3 text-[10px] font-black tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground'
              }
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
