'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Clapperboard,
  Wallet,
  HeartHandshake,
  ExternalLink,
  ChevronLeft,
  BarChart3,
  MessageSquare,
  Briefcase,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ArtistSidebarProps {
  name: string
  slug: string
  avatarUrl: string | null
  planLabel: string
}

const NAV_GROUPS: {
  title: string
  items: { label: string; href: string; icon: typeof LayoutDashboard }[]
}[] = [
  {
    title: 'Gestão',
    items: [
      { label: 'Visão geral', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Estúdio', href: '/dashboard/estudio', icon: Clapperboard },
      { label: 'Insights', href: '/dashboard/insights', icon: BarChart3 },
    ],
  },
  {
    title: 'Relacionamento',
    items: [
      { label: 'Fãs', href: '/dashboard/fas', icon: HeartHandshake },
      { label: 'Comunidade', href: '/dashboard/comunidade', icon: MessageSquare },
      { label: 'Propostas', href: '/dashboard/propostas', icon: Briefcase },
    ],
  },
  {
    title: 'Negócio',
    items: [{ label: 'Financeiro', href: '/dashboard/financeiro', icon: Wallet }],
  },
]

export function ArtistSidebar({ name, slug, avatarUrl, planLabel }: ArtistSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="crm-scope sticky top-4 z-20 hidden h-[calc(100dvh-2rem)] w-[236px] shrink-0 lg:block">
      <div className="flex h-full flex-col overflow-hidden rounded-[14px] border border-white/10 bg-[var(--artist-surface)]">
        {/* Cabeçalho neutro — identidade do artista como acento discreto */}
        <div className="relative border-b border-white/8 px-4 pb-4 pt-4">
          {/* Fina barra de acento na cor do artista */}
          <span
            className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-[var(--artist-primary)]"
            aria-hidden="true"
          />
          <Link
            href="/profile"
            className="flex items-center gap-1.5 text-[8px] font-black tracking-[0.2em] text-[var(--artist-muted)] transition-colors hover:text-[var(--artist-text)]"
          >
            <ChevronLeft className="size-3" aria-hidden="true" />
            PAINEL DO ARTISTA
          </Link>
          <div className="mt-3 flex items-center gap-3">
            <Image
              src={avatarUrl || '/placeholder.svg?height=44&width=44&query=artist avatar'}
              alt=""
              width={44}
              height={44}
              className="size-11 rounded-[10px] border border-[var(--artist-primary)]/40 object-cover"
            />
            <div className="min-w-0">
              <p className="truncate font-serif text-sm font-black leading-tight text-[var(--artist-text)]">
                {name}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[8px] font-black tracking-[0.15em] text-[var(--artist-muted)]">
                <span className="size-1.5 rounded-full bg-[var(--artist-primary)]" aria-hidden="true" />
                PLANO {planLabel.toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav
          className="scrollbar-none flex flex-1 flex-col gap-3 overflow-y-auto p-2.5"
          aria-label="Menu do painel do artista"
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-0.5">
              <p className="px-3 pb-1 text-[8px] font-black tracking-[0.22em] text-[var(--artist-muted)]/60">
                {group.title.toUpperCase()}
              </p>
              {group.items.map(({ label, href, icon: Icon }) => {
                const active =
                  href === '/dashboard' ? pathname === href : pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[11px] font-bold tracking-[0.04em] transition-colors',
                      active
                        ? 'bg-[var(--artist-primary)]/10 text-[var(--artist-text)]'
                        : 'text-[var(--artist-muted)] hover:bg-white/5 hover:text-[var(--artist-text)]',
                    )}
                  >
                    {/* Indicador ativo: barra lateral discreta */}
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[var(--artist-primary)]"
                        aria-hidden="true"
                      />
                    )}
                    <Icon
                      className={cn(
                        'size-4 shrink-0',
                        active ? 'text-[var(--artist-primary)]' : 'text-current',
                      )}
                      aria-hidden="true"
                    />
                    {label.toUpperCase()}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Rodapé */}
        <div className="border-t border-white/8 p-2.5">
          <Link
            href={`/artist/${slug}`}
            className="flex items-center justify-between gap-2 rounded-[8px] border border-white/10 px-3 py-2.5 text-[9px] font-black tracking-[0.12em] text-[var(--artist-muted)] transition-colors hover:bg-white/5 hover:text-[var(--artist-text)]"
          >
            VER PERFIL PÚBLICO
            <ExternalLink className="size-3.5 text-[var(--artist-primary)]" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </aside>
  )
}
