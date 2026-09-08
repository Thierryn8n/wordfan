import Link from 'next/link'
import Image from 'next/image'
import { getArtists, getLiveNow, getUpcomingShows, getActiveAds } from '@/lib/data'
import { resolveTheme } from '@/lib/artist-theme'
import { AdBanner } from '@/components/wordfan/ad-banner'
import {
  Bell,
  Search,
  SlidersHorizontal,
  Star,
  BadgeCheck,
  Check,
  Radio,
  CalendarDays,
  MapPin,
} from 'lucide-react'

function formatFans(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default async function HomePage() {
  const [artists, lives, shows, heroAds, inlineAds] = await Promise.all([
    getArtists(),
    getLiveNow(),
    getUpcomingShows(8),
    getActiveAds('home_hero'),
    getActiveAds('home_inline'),
  ])

  const featured = artists.filter((a) => a.is_featured)
  const top = [...artists].sort((a, b) => b.followers_count - a.followers_count).slice(0, 5)
  // Gêneros derivados dos artistas cadastrados — nada hardcoded.
  const genres = Array.from(new Set(artists.map((a) => a.genre).filter(Boolean) as string[]))

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background pb-40">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-40 mx-auto w-full max-w-md border-b border-white/8 bg-background/85 backdrop-blur-xl">
        <div className="flex items-end justify-between px-6 pb-4 pt-8">
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.3em] text-muted-foreground">
              {'OLÁ, FÃ!'}
            </p>
            <h1 className="mt-1 font-serif text-[26px] font-extrabold leading-none tracking-tight">
              DESCUBRA <span className="text-gradient-brand">ARTISTAS</span>
            </h1>
          </div>
          <Link
            href="/notifications"
            aria-label="Notificações"
            className="surface elev-1 relative flex size-12 items-center justify-center rounded-full"
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
        {/* Search — navega para /search já com o termo digitado */}
        <form
          action="/search"
          method="GET"
          className="surface elev-1 flex h-14 items-center gap-3 rounded-2xl px-4"
        >
          <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            name="q"
            placeholder="Buscar artistas, músicas, eventos..."
            aria-label="Buscar artistas, músicas, eventos"
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            aria-label="Pesquisar"
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          >
            <SlidersHorizontal className="size-5" aria-hidden="true" />
          </button>
        </form>

        {/* Filtros de gênero (vindos dos artistas reais) */}
        {genres.length > 0 && (
          <div className="scrollbar-none -mx-6 mt-6 flex gap-3 overflow-x-auto px-6">
            <Link
              href="/search"
              className="gradient-brand shrink-0 rounded-full px-6 py-3 text-[11px] font-extrabold tracking-[0.15em] text-white"
            >
              TODOS
            </Link>
            {genres.map((g) => (
              <Link
                key={g}
                href={`/search?g=${encodeURIComponent(g)}`}
                className="surface shrink-0 rounded-full px-6 py-3 text-[11px] font-extrabold tracking-[0.15em] text-muted-foreground uppercase"
              >
                {g}
              </Link>
            ))}
          </div>
        )}

        {/* Anúncio em destaque */}
        {heroAds.length > 0 && (
          <div className="mt-8">
            <AdBanner ad={heroAds[0]} variant="hero" />
          </div>
        )}

        {/* Ao vivo agora */}
        {lives.length > 0 && (
          <section aria-labelledby="live-now" className="mt-10">
            <div className="flex items-center justify-between">
              <h2 id="live-now" className="flex items-center gap-2 text-lg font-extrabold tracking-[0.2em]">
                <Radio className="size-4 text-brand" aria-hidden="true" />
                AO VIVO AGORA
              </h2>
              <span className="flex items-center gap-1.5 rounded-full bg-red-600/15 px-3 py-1 text-[9px] font-black tracking-[0.15em] text-red-500">
                <span className="size-1.5 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
                {lives.length} LIVE{lives.length > 1 ? 'S' : ''}
              </span>
            </div>
            <div className="scrollbar-none -mx-6 mt-5 flex gap-4 overflow-x-auto px-6">
              {lives.map((l) => (
                <Link
                  key={l.id}
                  href={`/artist/${l.artist.slug}/live`}
                  className="surface elev-1 relative w-[220px] shrink-0 overflow-hidden rounded-[26px]"
                >
                  <div className="relative h-[130px]">
                    <Image
                      src={l.artist.banner_url || l.artist.avatar_url || '/placeholder.svg?height=130&width=220'}
                      alt=""
                      fill
                      sizes="220px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" aria-hidden="true" />
                    <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[8px] font-black tracking-[0.15em] text-white">
                      <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
                      AO VIVO
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="truncate text-xs font-extrabold tracking-[0.1em]">
                      {l.artist.name.toUpperCase()}
                    </p>
                    <p className="mt-1 line-clamp-1 text-[11px] font-bold text-muted-foreground">
                      {l.title}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Em destaque */}
        <section aria-labelledby="destaque" className="mt-10">
          <div className="flex items-center justify-between">
            <h2 id="destaque" className="text-lg font-extrabold tracking-[0.2em]">
              EM DESTAQUE
            </h2>
            <Link href="/search" className="text-xs font-extrabold tracking-[0.1em] text-brand">
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
                  className="elev-2 relative w-[290px] shrink-0 overflow-hidden rounded-[32px] border"
                  style={{ borderColor: `color-mix(in srgb, ${t.primary} 40%, transparent)` }}
                >
                  <Image
                    src={a.avatar_url || '/placeholder.svg?height=380&width=290'}
                    alt={a.name}
                    width={290}
                    height={380}
                    className="h-[380px] w-full object-cover"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent"
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

        {/* Próximos eventos */}
        {shows.length > 0 && (
          <section aria-labelledby="eventos" className="mt-12">
            <div className="flex items-center justify-between">
              <h2 id="eventos" className="flex items-center gap-2 text-lg font-extrabold tracking-[0.2em]">
                <CalendarDays className="size-4 text-brand" aria-hidden="true" />
                PRÓXIMOS EVENTOS
              </h2>
              <Link href="/events" className="text-xs font-extrabold tracking-[0.1em] text-brand">
                VER AGENDA
              </Link>
            </div>
            <div className="scrollbar-none -mx-6 mt-5 flex gap-4 overflow-x-auto px-6">
              {shows.map((s) => {
                const d = new Date(s.starts_at)
                return (
                  <Link
                    key={s.id}
                    href={`/artist/${s.artist.slug}`}
                    className="surface elev-1 flex w-[260px] shrink-0 gap-4 rounded-[26px] p-4"
                  >
                    <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-white/5">
                      <span className="font-numeric text-xl font-black leading-none">
                        {d.getDate()}
                      </span>
                      <span className="mt-1 text-[8px] font-black tracking-[0.15em] text-muted-foreground">
                        {d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-xs font-extrabold tracking-[0.05em]">
                        {s.title}
                      </p>
                      <p className="mt-1 line-clamp-1 text-[11px] font-bold text-muted-foreground">
                        {s.artist.name}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-zinc-500">
                        <MapPin className="size-2.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          {s.city || s.venue || 'A definir'}
                          {s.state ? `, ${s.state}` : ''}
                        </span>
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Anúncio em faixa */}
        {inlineAds.length > 0 && (
          <div className="mt-12">
            <AdBanner ad={inlineAds[0]} variant="inline" />
          </div>
        )}

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

          <div className="mt-5 flex flex-col gap-3">
            {top.map((a, i) => {
              const t = resolveTheme(a.theme)
              return (
                <Link
                  key={a.id}
                  href={`/artist/${a.slug}`}
                  className="surface elev-1 flex items-center gap-4 rounded-3xl p-3"
                >
                  <span className="w-5 shrink-0 text-center font-numeric text-sm font-black text-zinc-600">
                    {i + 1}
                  </span>
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
                    className="surface flex size-11 shrink-0 items-center justify-center rounded-2xl text-muted-foreground"
                    aria-hidden="true"
                  >
                    <Star className="size-5" />
                  </span>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Todos os artistas */}
        <section aria-labelledby="todos" className="mt-12">
          <div className="flex items-center justify-between">
            <h2 id="todos" className="text-lg font-extrabold tracking-[0.2em]">
              TODOS OS ARTISTAS
            </h2>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            {artists.map((a) => {
              const t = resolveTheme(a.theme)
              return (
                <Link
                  key={a.id}
                  href={`/artist/${a.slug}`}
                  className="elev-1 group relative overflow-hidden rounded-3xl border border-white/8"
                >
                  <div className="relative aspect-[4/5]">
                    <Image
                      src={a.avatar_url || '/placeholder.svg?height=240&width=192'}
                      alt={a.name}
                      fill
                      sizes="(max-width: 448px) 45vw, 200px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" aria-hidden="true" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="flex items-center gap-1 truncate text-xs font-extrabold tracking-[0.1em]">
                      {a.name.toUpperCase()}
                      <BadgeCheck className="size-3.5 shrink-0" style={{ color: t.primary }} aria-hidden="true" />
                    </p>
                    <p className="mt-0.5 truncate text-[9px] font-bold text-muted-foreground">
                      {a.genre?.toUpperCase()} • {formatFans(a.followers_count)} FÃS
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
