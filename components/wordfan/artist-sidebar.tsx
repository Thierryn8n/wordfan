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
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ArtistSidebarProps {
  name: string
  slug: string
  avatarUrl: string | null
  planLabel: string
}

const NAV = [
  { label: 'Visão geral', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Estúdio', href: '/dashboard/estudio', icon: Clapperboard },
  { label: 'Financeiro', href: '/dashboard/financeiro', icon: Wallet },
  { label: 'Fãs', href: '/dashboard/fas', icon: HeartHandshake },
]

export function ArtistSidebar({ name, slug, avatarUrl, planLabel }: ArtistSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="sticky top-4 z-20 hidden h-[calc(100dvh-2rem)] w-[248px] shrink-0 lg:block">
      <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[var(--artist-surface)]/80 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl">
        {/* Cabeçalho com identidade do artista */}
        <div className="gradient-brand relative px-5 pb-6 pt-5">
          <div className="pointer-events-none absolute inset-0 bg-black/10" aria-hidden="true" />
          <Link
            href="/profile"
            className="relative flex items-center gap-1.5 text-[9px] font-black tracking-[0.2em] text-white/80 transition-colors hover:text-white"
          >
            <ChevronLeft className="size-3" aria-hidden="true" />
            PAINEL DO ARTISTA
          </Link>
          <div className="relative mt-4 flex items-center gap-3">
            <Image
              src={avatarUrl || '/placeholder.svg?height=48&width=48&query=artist avatar'}
              alt=""
              width={48}
              height={48}
              className="size-12 rounded-2xl border-2 border-white/30 object-cover"
            />
            <div className="min-w-0">
              <p className="truncate font-serif text-base font-black leading-tight text-white">
                {name}
              </p>
              <p className="mt-0.5 text-[8px] font-black tracking-[0.2em] text-white/70">
                PLANO {planLabel.toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex flex-1 flex-col gap-1.5 p-3" aria-label="Menu do painel do artista">
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group flex items-center gap-3 rounded-2xl px-4 py-3 text-[11px] font-black tracking-[0.08em] transition-all',
                  active
                    ? 'bg-[var(--artist-primary)]/15 text-[var(--artist-primary)]'
                    : 'text-[var(--artist-muted)] hover:bg-white/5 hover:text-[var(--artist-text)]',
                )}
              >
                <span
                  className={cn(
                    'flex size-8 items-center justify-center rounded-xl transition-colors',
                    active
                      ? 'gradient-brand text-white'
                      : 'bg-white/5 text-[var(--artist-muted)] group-hover:text-[var(--artist-text)]',
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                {label.toUpperCase()}
              </Link>
            )
          })}
        </nav>

        {/* Rodapé */}
        <div className="p-3 pt-0">
          <Link
            href={`/artist/${slug}`}
            className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[9px] font-black tracking-[0.15em] text-[var(--artist-text)] transition-colors hover:bg-white/10"
          >
            VER PERFIL PÚBLICO
            <ExternalLink className="size-3.5 text-[var(--artist-primary)]" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </aside>
  )
}
