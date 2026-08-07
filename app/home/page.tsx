import Link from 'next/link'
import Image from 'next/image'
import { getArtists } from '@/lib/data'
import { resolveTheme } from '@/lib/artist-theme'
import { BottomNav } from '@/components/wordfan/bottom-nav'
import { Bell, Search, SlidersHorizontal, Star, BadgeCheck, Check } from 'lucide-react'

function formatFans(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const GENRES = ['TODOS', 'SERTANEJO', 'FORRÓ', 'POP', 'HIP HOP', 'SAMBA', 'ROCK']

export default async function HomePage() {
  const artists = await getArtists()
  const featured = artists.filter((a) => a.is_featured)
  const top = [...artists].sort((a, b) => b.followers_count - a.followers_count).slice(0, 4)

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background pb-40">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-40 mx-auto w-full max-w-md border-b border-white/8 bg-background/90 backdrop-blur-xl">
        <div className="flex items-end justify-between px-6 pb-4 pt-8">
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.3em] text-muted-foreground">
              {'OLÁ, FÃ!'}
            </p>
            <h1 className="mt-1 font-serif text-[28px] font-extrabold leading-none tracking-tight">
              DESCUBRA <span className="text-gradient-brand">ARTISTAS</span>
            </h1>
          </div>
          <Link
            href="/notifications"
            aria-label="Notificações"
            className="relative flex size-12 items-center justify-center rounded-full border border-white/8 bg-card"
          >
            <Bell className="size-5 text-foreground" aria-hidden="true" />
            <span
              className="absolute right-3 top-3 size-2 rounded-full bg-brand"
              aria-hidden="true"
            />
          </Link>
        </div>
      </header>

      <main className="px-6 pt-32">
        {/* Search */}
        <Link
          href="/search"
          className="flex h-14 items-center gap-3 rounded-2xl border border-white/8 bg-card px-4"
        >
          <Search className="size-5 text-muted-foreground" aria-hidden="true" />
          <span className="flex-1 text-sm text-muted-foreground">
            Buscar artistas, músicas, eventos...
          </span>
          <SlidersHorizontal className="size-5 text-muted-foreground" aria-hidden="true" />
        </Link>

        {/* Genre filters */}
        <div className="scrollbar-none -mx-6 mt-6 flex gap-3 overflow-x-auto px-6">
          {GENRES.map((g, i) => (
            <span
              key={g}
              className={
                i === 0
                  ? 'gradient-brand shrink-0 rounded-full px-6 py-3 text-[11px] font-extrabold tracking-[0.15em] text-white'
                  : 'shrink-0 rounded-full border border-white/8 bg-card px-6 py-3 text-[11px] font-extrabold tracking-[0.15em] text-muted-foreground'
              }
            >
              {g}
            </span>
          ))}
        </div>

        {/* Em destaque */}
        <section aria-labelledby="destaque" className="mt-10">
          <div className="flex items-center justify-between">
            <h2 id="destaque" className="text-lg font-extrabold tracking-[0.2em]">
              EM DESTAQUE
            </h2>
            <Link
              href="/search"
              className="text-xs font-extrabold tracking-[0.1em] text-brand"
            >
              VER TODOS
            </Link>
          </div>

          <div className="scrollbar-none -mx-6 mt-5 flex gap-4 overflow-x-auto px-6">
            {featured.map((a) => {
              const t = resolveTheme(a.theme)
              return (
                <Link
                  key={a.id}
                  href={`/artist/${a.slug}`}
                  className="relative w-[290px] shrink-0 overflow-hidden rounded-[32px] border"
                  style={{
                    borderColor: `color-mix(in srgb, ${t.primary} 45%, transparent)`,
                    boxShadow: `0 0 40px -12px color-mix(in srgb, ${t.primary} 60%, transparent)`,
                  }}
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
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="flex items-center gap-2 font-serif text-2xl font-extrabold tracking-tight">
                      {a.name.toUpperCase()}
                      <BadgeCheck className="size-5" style={{ color: t.primary }} aria-hidden="true" />
                    </p>
                    <p
                      className="mt-1 text-xs font-extrabold tracking-[0.2em]"
                      style={{ color: t.primary }}
                    >
                      {formatFans(a.followers_count)} FÃS
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Top do mês */}
        <section aria-labelledby="top-mes" className="mt-12">
          <div className="flex items-center justify-between">
            <h2 id="top-mes" className="text-lg font-extrabold tracking-[0.2em]">
              TOP DO MÊS
            </h2>
            <Link href="/search" className="text-xs font-extrabold tracking-[0.1em] text-brand">
              VER TODOS
            </Link>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            {top.map((a) => {
              const t = resolveTheme(a.theme)
              return (
              <Link key={a.id} href={`/artist/${a.slug}`} className="flex items-center gap-4">
                <span className="relative shrink-0">
                  <Image
                    src={a.avatar_url || '/placeholder.svg?height=56&width=56'}
                    alt=""
                    width={56}
                    height={56}
                    className="size-14 rounded-2xl border-2 object-cover"
                    style={{ borderColor: t.primary }}
                  />
                  <span
                    className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full"
                    style={{ backgroundColor: t.primary }}
                    aria-hidden="true"
                  >
                    <Check className="size-3 text-white" />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold tracking-[0.15em]">
                    {a.name.toUpperCase()}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {a.genre?.toUpperCase()} • {formatFans(a.followers_count)} FÃS
                  </span>
                </span>
                <span
                  className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-card text-muted-foreground"
                  aria-hidden="true"
                >
                  <Star className="size-5" />
                </span>
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
