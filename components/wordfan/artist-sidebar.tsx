'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Briefcase,
  ChevronLeft,
  Clapperboard,
  ExternalLink,
  HeartHandshake,
  LayoutDashboard,
  MessageSquare,
  Wallet,
  Users,
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

export function ArtistSidebar({ name, slug, avatarUrl, logoUrl, planLabel, isAdmin = false, allArtists = [] }: ArtistSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 z-20 hidden h-dvh w-72 shrink-0 border-r border-white/8 bg-[#050505] lg:block">
      <div className="flex h-full flex-col">
        <div className="border-b border-white/8 px-7 py-7">
          <Logo href="/home" className="text-xl" imageUrl={logoUrl || undefined} />
          <p className="mt-1 text-[8px] font-black tracking-[0.24em] text-[var(--artist-primary)]">
            {isAdmin ? 'PAINEL ADMIN' : 'PAINEL DO ARTISTA'}
          </p>
        </div>

        {isAdmin && allArtists.length > 0 && (
          <div className="border-b border-white/8 px-5 py-4">
            <p className="mb-3 flex items-center gap-2 text-[9px] font-black tracking-[0.2em] text-zinc-600">
              <Users className="size-3" />
              SELECIONAR ARTISTA
            </p>
            <div className="scrollbar-none flex max-h-32 flex-col gap-2 overflow-y-auto">
              {allArtists.map((artist) => (
                <Link
                  key={artist.id}
                  href={`/dashboard?artist=${artist.slug}`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-bold transition-colors',
                    artist.slug === slug
                      ? 'bg-[var(--artist-primary)]/12 text-white'
                      : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white',
                  )}
                >
                  <Image
                    src={artist.avatar_url || '/placeholder-user.jpg'}
                    alt=""
                    width={24}
                    height={24}
                    className="size-6 rounded-lg object-cover"
                  />
                  <span className="truncate">{artist.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="border-b border-white/8 px-5 py-5">
          <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
            <div className="flex items-center gap-3">
              <Image
                src={avatarUrl || '/placeholder-user.jpg'}
                alt=""
                width={48}
                height={48}
                className="size-12 rounded-xl border border-[var(--artist-primary)]/30 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-sm font-black text-white">{name}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[8px] font-black tracking-[0.13em] text-zinc-500">
                  <span className="size-1.5 rounded-full bg-[var(--artist-primary)]" aria-hidden="true" />
                  PLANO {planLabel.toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <nav className="scrollbar-none flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6" aria-label="Menu do painel do artista">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-2 text-[9px] font-black tracking-[0.2em] text-zinc-600">
                {group.title.toUpperCase()}
              </p>
              <div className="flex flex-col gap-1">
                {group.items.map(({ label, href, icon: Icon }) => {
                  const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-xl px-4 py-3 text-[11px] font-bold transition-colors',
                        active
                          ? 'bg-[var(--artist-primary)]/12 text-white'
                          : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white',
                      )}
                    >
                      {active && (
                        <span className="absolute inset-y-2 right-0 w-0.5 rounded-full bg-[var(--artist-primary)]" aria-hidden="true" />
                      )}
                      <Icon
                        className={cn(
                          'size-4',
                          active
                            ? 'text-[var(--artist-primary)]'
                            : 'text-zinc-500 group-hover:text-zinc-300',
                        )}
                        aria-hidden="true"
                      />
                      {label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/8 p-4">
          <Link
            href={`/artist/${slug}`}
            className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3 text-[9px] font-black tracking-[0.12em] text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            VER PERFIL PÚBLICO
            <ExternalLink className="size-3.5 text-[var(--artist-primary)]" aria-hidden="true" />
          </Link>
          <Link
            href="/profile"
            className="mt-2 flex items-center gap-2 px-3 py-2 text-[8px] font-black tracking-[0.14em] text-zinc-600 transition-colors hover:text-white"
          >
            <ChevronLeft className="size-3" aria-hidden="true" />
            VOLTAR AO APLICATIVO
          </Link>
        </div>
      </div>
    </aside>
  )
}
