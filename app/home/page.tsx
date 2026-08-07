import Link from 'next/link'
import Image from 'next/image'
import { getArtists } from '@/lib/data'
import { resolveTheme } from '@/lib/artist-theme'
import { BottomNav } from '@/components/wordfan/bottom-nav'
import { Bell, Search, SlidersHorizontal, BadgeCheck, Check, ChevronRight } from 'lucide-react'

function formatFans(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const GENRES = ['Todos', 'Sertanejo', 'Forró', 'Pop', 'Hip hop', 'Samba', 'Rock']

export default async function HomePage() {
  const artists = await getArtists()
  const featured = artists.filter((a) => a.is_featured)
  const top = [...artists].sort((a, b) => b.followers_count - a.followers_count).slice(0, 4)

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background pb-32">
      {/* Nav bar translúcida (iOS) */}
      <header className="ios-material fixed inset-x-0 top-0 z-40 mx-auto w-full max-w-md border-b border-border pt-safe">
        <div className="flex items-center justify-between px-4 py-2.5">
          <p className="text-[13px] font-medium text-[color:var(--label-secondary)]">Olá, fã</p>
          <Link
            href="/notifications"
            aria-label="Notificações"
            className="relative flex size-9 items-center justify-center rounded-full ios-fill text-primary active:opacity-60"
          >
            <Bell className="size-5" aria-hidden="true" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main className="px-4 pt-20">
        {/* Large Title (iOS) */}
        <h1 className="ios-large-title text-balance">Descobrir</h1>

        {/* Campo de busca iOS */}
        <Link
          href="/search"
          className="mt-4 flex h-11 items-center gap-2 rounded-xl bg-[color:var(--ios-fill-2)] px-3 active:opacity-70"
        >
          <Search className="size-[18px] text-[color:var(--label-secondary)]" aria-hidden="true" />
          <span className="flex-1 text-[17px] text-[color:var(--label-secondary)]">Buscar</span>
          <SlidersHorizontal className="size-[18px] text-[color:var(--label-secondary)]" aria-hidden="true" />
        </Link>

        {/* Filtros de gênero (pílulas iOS) */}
        <div className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
          {GENRES.map((g, i) => (
            <span
              key={g}
              className={
                i === 0
                  ? 'shrink-0 rounded-full bg-primary px-4 py-1.5 text-[15px] font-semibold text-primary-foreground'
                  : 'shrink-0 rounded-full bg-[color:var(--ios-fill-2)] px-4 py-1.5 text-[15px] font-medium text-foreground'
              }
            >
              {g}
            </span>
          ))}
        </div>

        {/* Em destaque */}
        <section aria-labelledby="destaque" className="mt-8">
          <div className="flex items-center justify-between">
            <h2 id="destaque" className="ios-title text-[22px] font-bold">
              Em destaque
            </h2>
            <Link href="/search" className="text-[17px] font-normal text-primary active:opacity-60">
              Ver todos
            </Link>
          </div>

          <div className="scrollbar-none -mx-4 mt-4 flex gap-4 overflow-x-auto px-4">
            {featured.map((a) => {
              const t = resolveTheme(a.theme)
              return (
                <Link
                  key={a.id}
                  href={`/artist/${a.slug}`}
                  className="relative w-[290px] shrink-0 overflow-hidden rounded-[22px] active:opacity-90"
                >
                  <Image
                    src={a.avatar_url || '/placeholder.svg?height=380&width=290'}
                    alt={a.name}
                    width={290}
                    height={380}
                    className="h-[380px] w-full object-cover"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"
                    aria-hidden="true"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="flex items-center gap-1.5 text-[22px] font-bold tracking-[-0.019em] text-white">
                      {a.name}
                      <BadgeCheck className="size-5" style={{ color: t.primary }} aria-hidden="true" />
                    </p>
                    <p className="mt-0.5 text-[13px] font-medium text-white/80">
                      {formatFans(a.followers_count)} fãs
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Top do mês (lista inset grouped iOS) */}
        <section aria-labelledby="top-mes" className="mt-9">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 id="top-mes" className="ios-title text-[22px] font-bold">
              Top do mês
            </h2>
            <Link href="/search" className="text-[17px] font-normal text-primary active:opacity-60">
              Ver todos
            </Link>
          </div>

          <div className="ios-list">
            {top.map((a) => {
              const t = resolveTheme(a.theme)
              return (
                <Link key={a.id} href={`/artist/${a.slug}`} className="ios-row ios-row-inset active:bg-[color:var(--ios-fill-2)]">
                  <span className="relative shrink-0">
                    <Image
                      src={a.avatar_url || '/placeholder.svg?height=44&width=44'}
                      alt=""
                      width={44}
                      height={44}
                      className="size-11 rounded-full object-cover"
                    />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full border-2 border-card"
                      style={{ backgroundColor: t.primary }}
                      aria-hidden="true"
                    >
                      <Check className="size-2.5 text-white" />
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] font-semibold">{a.name}</span>
                    <span className="mt-0.5 block truncate text-[13px] text-[color:var(--label-secondary)]">
                      {a.genre} · {formatFans(a.followers_count)} fãs
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-[color:var(--label-tertiary)]" aria-hidden="true" />
                </Link>
              )
            })}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
