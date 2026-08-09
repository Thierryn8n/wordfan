'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  Mic2,
  Palette,
  Settings2,
  Users,
} from 'lucide-react'
import { Logo } from '@/components/wordfan/logo'
import { cn } from '@/lib/utils'

const NAV_GROUPS = [
  {
    title: 'Controle',
    items: [
      { label: 'Visão global', icon: LayoutDashboard, href: '/admin' },
      { label: 'Artistas', icon: Mic2, href: '/admin/artists' },
      { label: 'Studio do artista', icon: Palette, href: '/admin/studio' },
      { label: 'Usuários', icon: Users, href: '/admin/users' },
    ],
  },
  {
    title: 'Operação',
    items: [
      { label: 'Assinaturas', icon: CreditCard, href: '/admin/subscriptions' },
      { label: 'Notificações', icon: Bell, href: '/admin/notifications' },
      { label: 'Anúncios', icon: Megaphone, href: '/admin/ads' },
      { label: 'Enterprise', icon: Building2, href: '/admin/enterprise' },
      { label: 'Relatórios', icon: BarChart3, href: '/admin/reports' },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { label: 'Configurações', icon: Settings2, href: '/admin/settings' },
    ],
  },
] as const

export function AdminSidebar({ siteLogoUrl }: { siteLogoUrl?: string }) {
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-r border-white/8 bg-[#050505] lg:flex">
      <div className="border-b border-white/8 px-7 py-7">
        <div className="flex items-center gap-3">
          <Logo href="/admin" className="text-4xl" imageUrl={siteLogoUrl || undefined} />
        </div>
      </div>

      <nav className="scrollbar-none flex flex-1 flex-col gap-7 overflow-y-auto px-4 py-6" aria-label="Menu administrativo">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-2 text-[9px] font-black tracking-[0.22em] text-zinc-600">
              {group.title.toUpperCase()}
            </p>
            <div className="flex flex-col gap-1">
              {group.items.map(({ label, icon: Icon, href }) => {
                const active = href === '/admin' ? pathname === href : pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-xl px-4 py-3 text-[11px] font-bold transition-colors',
                      active
                        ? 'bg-primary/12 text-white'
                        : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white',
                    )}
                  >
                    {active && (
                      <span className="absolute inset-y-2 right-0 w-0.5 rounded-full bg-primary" aria-hidden="true" />
                    )}
                    <Icon className={cn('size-4', active ? 'text-primary' : 'text-zinc-500 group-hover:text-zinc-300')} aria-hidden="true" />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/8 p-4">
        <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/12">
              <Settings2 className="size-4 text-primary" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-black text-white">Administrador</p>
              <p className="mt-0.5 text-[8px] font-bold text-zinc-600">Acesso total</p>
            </div>
          </div>
          <Link
            href="/home"
            className="mt-3 flex items-center justify-between border-t border-white/8 pt-3 text-[8px] font-black tracking-[0.14em] text-zinc-500 transition-colors hover:text-white"
          >
            VER APLICATIVO
            <ArrowUpRight className="size-3.5 text-primary" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </aside>
  )
}
