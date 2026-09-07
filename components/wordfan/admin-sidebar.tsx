'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  Briefcase,
  ChevronLeft,
  ChevronRight,
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
      { label: 'Artistas', icon: Users, href: '/admin/artists' },
      { label: 'Estúdio', icon: Mic2, href: '/admin/studio' },
      { label: 'Temas', icon: Palette, href: '/admin/themes' },
    ],
  },
  {
    title: 'Artistas',
    items: [{ label: 'Painéis dos artistas', icon: Briefcase, href: '/dashboard' }],
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
    items: [{ label: 'Configurações', icon: Settings2, href: '/admin/settings' }],
  },
] as const

export function AdminSidebar({ siteLogoUrl }: { siteLogoUrl?: string }) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'sticky top-4 hidden h-[calc(100vh-2rem)] shrink-0 flex-col rounded-2xl border border-white/10 bg-[#070707] shadow-2xl lg:flex transition-all duration-300',
        isCollapsed ? 'w-[76px]' : 'w-72',
      )}
    >
      {/* ── Topo ── */}
      <div className="flex items-center gap-3 px-4 pb-4 pt-5">
        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <Logo href="/admin" className="text-xl" imageUrl={siteLogoUrl || undefined} />
            <p className="mt-1 text-[11px] font-bold tracking-[0.06em] text-primary">
              Administração
            </p>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-white"
        >
          {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </div>

      {/* ── Navegação ── */}
      <nav
        className="scrollbar-none flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4"
        aria-label="Menu administrativo"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            {!isCollapsed && <p className="side-group-label mb-1.5 px-2">{group.title}</p>}
            <div className="flex flex-col gap-0.5">
              {group.items.map(({ label, icon: Icon, href }) => {
                const active = href === '/admin' ? pathname === href : pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    data-active={active}
                    aria-current={active ? 'page' : undefined}
                    className={cn('side-item', isCollapsed && 'justify-center px-0')}
                    title={isCollapsed ? label : undefined}
                  >
                    <span className="side-icon">
                      <Icon className="size-[18px]" aria-hidden="true" />
                    </span>
                    {!isCollapsed && <span className="truncate">{label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Rodapé ── */}
      {!isCollapsed && (
        <div className="border-t border-white/8 p-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15">
                <Settings2 className="size-4 text-primary" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-white">Administrador</p>
                <p className="mt-0.5 text-[11px] font-medium text-zinc-500">Acesso total</p>
              </div>
            </div>
            <Link
              href="/home"
              className="mt-3 flex items-center justify-between border-t border-white/8 pt-3 text-[11px] font-bold text-zinc-400 transition-colors hover:text-white"
            >
              Ver aplicativo
              <ArrowUpRight className="size-3.5 text-primary" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </aside>
  )
}
