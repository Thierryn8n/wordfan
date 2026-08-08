import Link from 'next/link'
import Image from 'next/image'
import { getArtists, getAds, getUpcomingShows } from '@/lib/data'
import { resolveTheme } from '@/lib/artist-theme'
import { BottomNav } from '@/components/wordfan/bottom-nav'
import { AdCarousel } from '@/components/wordfan/ad-carousel'
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
  ArrowUpRight,
  Flame,
} from 'lucide-react'

function formatFans(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const GENRES = ['TODOS', 'SERTANEJO', 'FORRÓ', 'POP', 'HIP HOP', 'SAMBA', 'ROCK']

export default async function HomePage() {
  const [artists, heroAds, feedAds, shows] = await Promise.all([
    getArtists(),
    getAds('home_hero'),
    getAds('home_feed'),
    getUpcomingShows(6),
  ])
  const featured = artists.filter((a) => a.is_featured)
  const live = artists.filter((a) => a.is_live)
  const top = [...artists].sort((a, b) => b.followers_count - a.followers_count).slice(0, 5)
  const hero = heroAds[0] ?? null

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background pb-40">
      {/* Header de vidro flutuante */}
      <header className="fixed inset-x-0 top-0 z-40 mx-auto w-full max-w-md px-4 pt-4">
        <div className="glass-panel sheen relative flex items-end justify-between rounded-[26px] px-5 py-4">
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
            className="skeu-raised relative flex size-11 items-center justify-center rounded-2xl"
          >
            <Bell className="size-5 text-foreground" aria-hidden="true" />
            <span
              className="absolute right-2.5 top-2.5 size-2 rounded-full bg-brand"
              aria-hidden="true"
            />
          </Link>
        </div>
      </header>

      <main className="px-6 pt-32">
        {/* Busca skeuomórfica */}
        <Link
          href="/search"
          className="skeu-inset flex h-14 items-center gap-3 rounded-2xl px-4"
        >
          <Search className="size-5 text-muted-foreground" aria-hidden="true" />
          <span className="flex-1 text-sm text-muted-foreground">
            Buscar artistas, músicas, eventos...
          </span>
          <span className="skeu-raised flex size-9 items-center justify-center rounded-xl">
            <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />
          </span>
        </Link>

        {/* Filtros de gênero */}
        <div className="scrollbar-none -mx-6 mt-6 flex gap-3 overflow-x-auto px-6">
          {GENRES.map((g, i) => (
            <span
              key={g}
              className={
                i === 0
                  ? 'skeu-btn sheen relative shrink-0 rounded-full px-6 py-3 text-[11px] font-extrabold tracking-[0.15em] text-white'
                  : 'skeu shrink-0 rounded-full px-6 py-3 text-[11px] font-extrabold tracking-[0.15em] text-muted-foreground'
              }
            >
              {g}
            </span>
          ))}
        </div>

        {/* Banner de anúncio em destaque */}
        {hero && (
          <Link
            href={hero.cta_url || '#'}
            className="skeu-raised sheen group relative mt-8 block overflow-hidden rounded-[30px]"
          >
            <div className="relative h-44 w-full">
              <Image
                src={hero.image_url || '/placeholder.svg?height=176&width=420'}
                alt={hero.title}
                width={420}
                height={176}
                className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div
                className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent"
                aria-hidden="true"
              />
            </div>
            <div className="absolute inset-y-0 left-0 flex max-w-[70%] flex-col justify-center p-6">
              <span className="glass-soft w-fit rounded-full px-2.5 py-1 text-[8px] font-black tracking-[0.25em] text-white">
                PATROCINADO
              </span>
              <p className="mt-2 font-serif text-2xl font-black leading-tight text-balance">
                {hero.title}
              </p>
              {hero.subtitle && (
                <p className="mt-1 text-xs font-medium text-white/70 text-pretty">{hero.subtitle}</p>
              )}
              {hero.cta_label && (
                <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-[9px] font-black tracking-[0.15em] text-white">
                  {hero.cta_label.toUpperCase()}
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                </span>
              )}
            </div>
          </Link>
        )}

        {/* Ao vivo agora */}
        {live.length > 0 && (
          <section aria-labelledby="live-heading" className="mt-10">
            <h2
              id="live-heading"
              className="flex items-center gap-2 text-lg font-extrabold tracking-[0.2em]"
            >
              <Radio className="size-4 text-brand" aria-hidden="true" />
              AO VIVO AGORA
            </h2>
            <div className="scrollbar-none -mx-6 mt-5 flex gap-4 overflow-x-auto px-6">
              {live.map((a) => (
                <Link
                  key={a.id}
                  href={`/artist/${a.slug}/live`}
                  className="flex w-20 shrink-0 flex-col items-center gap-2"
                >
                  <span className="skeu-raised relative rounded-full p-1">
                    <Image
                      src={a.avatar_url || '/placeholder.svg?height=64&width=64'}
                      alt={a.name}
                      width={64}
                      height={64}
                      className="size-16 rounded-full object-cover"
                    />
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-brand px-2 py-0.5 text-[7px] font-black tracking-[0.1em] text-white">
                      LIVE
                    </span>
                  </span>
                  <span className="w-full truncate text-center text-[9px] font-bold text-muted-foreground">
                    {a.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Em destaque */}
        <section aria-labelledby="destaque" className="mt-10">
          <div className="flex items-center justify-between">
            <h2
              id="destaque"
              className="flex items-center gap-2 text-lg font-extrabold tracking-[0.2em]"
            >
              <Flame className="size-4 text-brand" aria-hidden="true" />
              EM DESTAQUE
            </h2>
            <Link href="/search" className="text-xs font-extrabold tracking-[0.1em] text-brand">
              VER TODOS
            </Link>
          </div>

          <div className="scrollbar-none -mx-6 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6">
            {featured.map((a) => {
              const t = resolveTheme(a.theme)
              return (
                <Link
                  key={a.id}
                  href={`/artist/${a.slug}`}
                  className="skeu-raised sheen relative w-[290px] shrink-0 snap-start overflow-hidden rounded-[32px] p-1.5"
                >
                  <div className="relative overflow-hidden rounded-[26px]">
                    <Image
                      src={a.avatar_url || '/placeholder.svg?height=380&width=290'}
                      alt={a.name}
                      width={290}
                      height={380}
                      className="h-[360px] w-full object-cover"
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent"
                      aria-hidden="true"
                    />
                    <div className="glass-panel sheen absolute inset-x-3 bottom-3 rounded-[22px] px-5 py-4">
                      <p className="flex items-center gap-2 font-serif text-xl font-extrabold tracking-tight">
                        {a.name.toUpperCase()}
                        <BadgeCheck
                          className="size-5"
                          style={{ color: t.primary }}
                          aria-hidden="true"
                        />
                      </p>
                      <p
                        className="mt-1 text-xs font-extrabold tracking-[0.2em]"
                        style={{ color: t.primary }}
                      >
                        {formatFans(a.followers_count)} FÃS
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Anúncios do feed */}
        <AdCarousel ads={feedAds} />

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
                  className="skeu flex items-center gap-4 rounded-3xl p-3"
                >
                  <span className="skeu-inset flex size-8 shrink-0 items-center justify-center rounded-xl font-numeric text-sm font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="relative shrink-0">
                    <Image
                      src={a.avatar_url || '/placeholder.svg?height=56&width=56'}
                      alt=""
                      width={56}
                      height={56}
                      className="size-14 rounded-2xl object-cover"
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
                    className="skeu-raised flex size-11 shrink-0 items-center justify-center rounded-2xl text-muted-foreground"
                    aria-hidden="true"
                  >
                    <Star className="size-5" />
                  </span>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Próximos eventos */}
        {shows.length > 0 && (
          <section aria-labelledby="events-home" className="mt-12">
            <div className="flex items-center justify-between">
              <h2
                id="events-home"
                className="flex items-center gap-2 text-lg font-extrabold tracking-[0.2em]"
              >
                <CalendarDays className="size-4 text-brand" aria-hidden="true" />
                PRÓXIMOS EVENTOS
              </h2>
              <Link
                href="/notifications"
                className="text-xs font-extrabold tracking-[0.1em] text-brand"
              >
                VER AGENDA
              </Link>
            </div>
            <div className="mt-5 flex flex-col gap-3">
              {shows.map((s) => {
                const date = new Date(s.starts_at)
                return (
                  <Link
                    key={s.id}
                    href={s.artist ? `/artist/${s.artist.slug}` : '/notifications'}
                    className="skeu flex items-center gap-4 rounded-3xl p-3"
                  >
                    <span className="skeu-inset flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl">
                      <span className="font-numeric text-lg font-black leading-none text-brand">
                        {date.getDate()}
                      </span>
                      <span className="mt-0.5 text-[8px] font-black tracking-[0.15em] text-muted-foreground">
                        {date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold">{s.title}</span>
                      <span className="mt-1 flex items-center gap-1 truncate text-[10px] font-bold text-muted-foreground">
                        <MapPin className="size-3 shrink-0" aria-hidden="true" />
                        {s.venue || s.city || 'A definir'}
                        {s.state ? `, ${s.state}` : ''}
                      </span>
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
