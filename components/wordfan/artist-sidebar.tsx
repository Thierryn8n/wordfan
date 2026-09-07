'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  BarChart3,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clapperboard,
  ExternalLink,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Wallet,
} from 'lucide-react'
import { Logo } from '@/components/wordfan/logo'
import { cn } from '@/lib/utils'
import type { Artist } from '@/lib/types'

interface ArtistSidebarProps {
  name: string
  slug: string
  avatarUrl: string | null
  logoUrl: string | null
  planLabel: string
  isAdmin?: boolean
  allArtists?: Artist[]
}

const NAV_GROUPS = [
  {
    title: 'Gestão',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Conteúdos', href: '/dashboard/estudio', icon: Clapperboard },
      { label: 'Analytics', href: '/dashboard/insights', icon: BarChart3 },
    ],
  },
  {
    title: 'Comunidade',
    items: [
      { label: 'Fãs e assinaturas', href: '/dashboard/fas', icon: HeartHandshake },
      { label: 'Moderação', href: '/dashboard/comunidade', icon: MessageSquare },
      { label: 'Propostas', href: '/dashboard/propostas', icon: Briefcase },
    ],
  },
  {
    title: 'Negócio',
    items: [{ label: 'Financeiro', href: '/dashboard/financeiro', icon: Wallet }],
  },
] as const

export function ArtistSidebar({
  name,
  slug,
  avatarUrl,
  logoUrl,
  planLabel,
  isAdmin = false,
  allArtists = [],
}: ArtistSidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)

  return (
    <aside
      className={cn(
        'sticky top-4 z-20 hidden h-[calc(100vh-2rem)] shrink-0 rounded-2xl border border-white/10 bg-[#070707] shadow-2xl lg:block transition-all duration-300',
        isCollapsed ? 'w-[76px]' : 'w-72',
      )}
    >
      <div className="flex h-full flex-col">
        {/* ── Topo: logo + colapsar ── */}
        <div className="flex items-center gap-3 px-4 pb-3 pt-4">
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <Logo href="/home" className="text-xl" imageUrl={logoUrl || undefined} />
              <p className="mt-1 text-[11px] font-bold tracking-[0.06em] text-[var(--artist-primary)]">
                {isAdmin ? 'Painel admin' : 'Painel do artista'}
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

        {/* ── Cartão de identidade do artista ── */}
        <div className="px-3">
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-2.5',
              isCollapsed && 'justify-center border-transparent bg-transparent p-0',
            )}
          >
            <Image
              src={avatarUrl || '/placeholder-user.jpg'}
              alt=""
              width={44}
              height={44}
              className="size-11 shrink-0 rounded-lg border border-[var(--artist-primary)]/40 object-cover"
            />
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-sm font-black text-white">{name}</p>
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-[var(--artist-primary)]/25 bg-[var(--artist-primary)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--artist-primary)]">
                  <span className="size-1.5 rounded-full bg-[var(--artist-primary)]" aria-hidden="true" />
                  {planLabel}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Seletor de artista (admin) ── */}
        {!isCollapsed && isAdmin && allArtists.length > 0 && (
          <div className="mt-3 px-3">
            <button
              type="button"
              onClick={() => setSwitcherOpen((v) => !v)}
              aria-expanded={switcherOpen}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
            >
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
                  Trocar artista
                </span>
                <span className="mt-0.5 block truncate text-xs font-bold text-white">{name}</span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-zinc-500" aria-hidden="true" />
            </button>
            {switcherOpen && (
              <div className="scrollbar-none mt-1.5 flex max-h-64 flex-col gap-1 overflow-y-auto rounded-xl border border-white/10 bg-[#0c0c0c] p-1.5">
                {allArtists.map((artist) => {
                  const current = artist.slug === slug
                  return (
                    <Link
                      key={artist.id}
                      href={`/dashboard/${artist.slug}`}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors',
                        current
                          ? 'bg-[var(--artist-primary)]/15'
                          : 'hover:bg-white/[0.05]',
                      )}
                    >
                      <Image
                        src={artist.avatar_url || '/placeholder-user.jpg'}
                        alt=""
                        width={28}
                        height={28}
                        className="size-7 shrink-0 rounded-md object-cover"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-white">{artist.name}</span>
                        {artist.genre && (
                          <span className="block truncate text-[11px] font-medium text-zinc-500">
                            {artist.genre}
                          </span>
                        )}
                      </span>
                      {current && (
                        <span
                          className="size-1.5 shrink-0 rounded-full bg-[var(--artist-primary)]"
                          aria-hidden="true"
                        />
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Navegação ── */}
        <nav
          className="scrollbar-none mt-4 flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-4"
          aria-label="Menu do painel do artista"
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              {!isCollapsed && <p className="side-group-label mb-1.5 px-2">{group.title}</p>}
              <div className="flex flex-col gap-0.5">
                {group.items.map(({ label, href, icon: Icon }) => {
                  const active =
                    href === '/dashboard' ? pathname === href : pathname.startsWith(href)
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
            <Link
              href={`/artist/${slug}`}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2.5 text-xs font-bold text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              Ver perfil público
              <ExternalLink className="size-3.5 text-[var(--artist-primary)]" aria-hidden="true" />
            </Link>
            <Link
              href="/profile"
              className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold text-zinc-500 transition-colors hover:text-white"
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              Voltar ao aplicativo
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}
