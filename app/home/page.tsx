import Link from 'next/link'
import Image from 'next/image'
import {
  getArtists,
  getActiveBanners,
  getUpcomingShows,
  getUpcomingLives,
  getRecentStories,
} from '@/lib/data'
import { resolveTheme } from '@/lib/artist-theme'
import { BottomNav } from '@/components/wordfan/bottom-nav'
import { HeroBannerCarousel, InlineBanner, FooterBanner } from '@/components/wordfan/ad-banners'
import {
  Bell,
  Search,
  SlidersHorizontal,
  Star,
  BadgeCheck,
  Check,
  Radio,
  CalendarClock,
  MapPin,
  Users,
  Mic2,
  Flame,
  ChevronRight,
} from 'lucide-react'

function formatFans(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const GENRES = ['TODOS', 'SERTANEJO', 'FORRÓ', 'POP', 'HIP HOP', 'SAMBA', 'ROCK']

export default async function HomePage() {
  const [artists, heroBanners, inlineBanners, footerBanners, shows, lives, stories] =
    await Promise.all([
      getArtists(),
      getActiveBanners('home_hero'),
      getActiveBanners('home_inline'),
      getActiveBanners('home_footer'),
      getUpcomingShows(5),
      getUpcomingLives(5),
      getRecentStories(12),
    ])

  const featured = artists.filter((a) => a.is_featured)
  const top = [...artists].sort((a, b) => b.followers_count - a.followers_count).slice(0, 5)
  const liveNow = lives.filter((l) => l.status === 'live')
  const totalFans = artists.reduce((acc, a) => acc + a.followers_count, 0)

  const platformStats = [
    { value: formatFans(totalFans), label: 'FÃS', icon: Users },
    { value: String(artists.length), label: 'ARTISTAS', icon: Mic2 },
    { value: String(shows.length), label: 'SHOWS', icon: CalendarClock },
    { value: String(lives.length), label: 'LIVES', icon: Radio },
  ]

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
            <Link
              key={g}
              href={g === 'TODOS' ? '/search' : `/search?g=${encodeURIComponent(g)}`}
              className={
                i === 0
                  ? 'gradient-brand shrink-0 rounded-full px-6 py-3 text-[11px] font-extrabold tracking-[0.15em] text-white'
                  : 'shrink-0 rounded-full border border-white/8 bg-card px-6 py-3 text-[11px] font-extrabold tracking-[0.15em] text-muted-foreground'
              }
            >
              {g}
            </Link>
          ))}
        </div>

        {/* Banner de anúncio em destaque */}
        <HeroBannerCarousel banners={heroBanners} />

        {/* Estatísticas da plataforma */}
        <section aria-label="Números da WordFan" className="mt-6 grid grid-cols-4 gap-2.5">
          {platformStats.map(({ value, label, icon: Icon }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/8 bg-card py-4"
            >
              <Icon className="size-4 text-brand" aria-hidden="true" />
              <span className="font-numeric text-base font-bold leading-none">{value}</span>
              <span className="text-[7px] font-black tracking-[0.15em] text-muted-foreground">{label}</span>
            </div>
          ))}
        </section>

        {/* Stories */}
        {stories.length > 0 && (
          <section aria-labelledby="stories" className="mt-8">
            <h2 id="stories" className="text-[11px] font-black tracking-[0.25em] text-muted-foreground">
              ACONTECENDO AGORA
            </h2>
            <div className="scrollbar-none -mx-6 mt-4 flex gap-4 overflow-x-auto px-6">
              {stories.map((s) => (
                <Link
                  key={s.id}
                  href={s.artist ? `/artist/${s.artist.slug}` : '/search'}
                  className="flex w-16 shrink-0 flex-col items-center gap-2"
                >
                  <span className="gradient-brand rounded-full p-[2.5px]">
                    <span className="block rounded-full border-2 border-background">
                      <Image
                        src={s.artist?.avatar_url || s.media_url || '/placeholder.svg?height=60&width=60'}
                        alt={s.artist?.name || ''}
                        width={60}
                        height={60}
                        className="size-14 rounded-full object-cover"
                      />
                    </span>
                  </span>
                  <span className="w-full truncate text-center text-[9px] font-bold text-muted-foreground">
                    {s.artist?.name?.split(' ')[0] ?? 'Artista'}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Ao vivo agora */}
        {liveNow.length > 0 && (
          <section aria-labelledby="ao-vivo" className="mt-10">
            <div className="flex items-center justify-between">
              <h2 id="ao-vivo" className="flex items-center gap-2 text-lg font-extrabold tracking-[0.2em]">
                <span className="flex size-2.5 items-center justify-center">
                  <span className="size-2.5 animate-ping rounded-full bg-red-600 opacity-75" aria-hidden="true" />
                  <span className="absolute size-2 rounded-full bg-red-600" aria-hidden="true" />
                </span>
                AO VIVO
              </h2>
            </div>
            <div className="scrollbar-none -mx-6 mt-4 flex gap-4 overflow-x-auto px-6">
              {liveNow.map((l) => (
                <Link
                  key={l.id}
                  href={l.artist ? `/artist/${l.artist.slug}/live` : '/home'}
                  className="relative w-[220px] shrink-0 overflow-hidden rounded-3xl border border-red-600/40"
                >
                  <Image
                    src={l.artist?.avatar_url || '/placeholder.svg?height=260&width=220'}
                    alt=""
                    width={220}
                    height={260}
                    className="h-[260px] w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" aria-hidden="true" />
                  <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-[9px] font-black tracking-[0.15em] text-white">
                    <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
                    AO VIVO
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="truncate font-serif text-base font-extrabold">{l.artist?.name}</p>
                    <p className="mt-0.5 truncate text-[11px] font-bold text-white/70">{l.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Em destaque */}
        {featured.length > 0 && (
          <section aria-labelledby="destaque" className="mt-10">
            <div className="flex items-center justify-between">
              <h2 id="destaque" className="flex items-center gap-2 text-lg font-extrabold tracking-[0.2em]">
                <Flame className="size-5 text-brand" aria-hidden="true" />
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
        )}

        {/* Banner inline */}
        {inlineBanners[0] && (
          <div className="mt-8">
            <InlineBanner banner={inlineBanners[0]} />
          </div>
        )}

        {/* Top do mês */}
        <section aria-labelledby="top-mes" className="mt-10">
          <div className="flex items-center justify-between">
            <h2 id="top-mes" className="text-lg font-extrabold tracking-[0.2em]">
              TOP DO MÊS
            </h2>
            <Link href="/search" className="text-xs font-extrabold tracking-[0.1em] text-brand">
              VER TODOS
            </Link>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            {top.map((a, i) => {
              const t = resolveTheme(a.theme)
              return (
                <Link key={a.id} href={`/artist/${a.slug}`} className="flex items-center gap-4">
                  <span className="w-5 shrink-0 text-center font-numeric text-lg font-bold text-muted-foreground">
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

        {/* Próximos shows */}
        {shows.length > 0 && (
          <section aria-labelledby="shows" className="mt-12">
            <div className="flex items-center justify-between">
              <h2 id="shows" className="text-lg font-extrabold tracking-[0.2em]">
                PRÓXIMOS SHOWS
              </h2>
            </div>
            <div className="mt-5 flex flex-col gap-3">
              {shows.map((s) => {
                const date = new Date(s.starts_at)
                return (
                  <Link
                    key={s.id}
                    href={s.artist ? `/artist/${s.artist.slug}` : '/search'}
                    className="flex items-center gap-4 rounded-3xl border border-white/8 bg-card p-3.5"
                  >
                    <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand/10">
                      <span className="font-numeric text-lg font-bold leading-none text-brand">
                        {date.getDate()}
                      </span>
                      <span className="mt-0.5 text-[8px] font-black tracking-[0.1em] text-brand">
                        {date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold">{s.title}</span>
                      <span className="mt-1 flex items-center gap-1 truncate text-[11px] font-bold text-muted-foreground">
                        <MapPin className="size-3 shrink-0" aria-hidden="true" />
                        {s.venue ? `${s.venue} • ` : ''}
                        {s.city}/{s.state}
                      </span>
                      {s.artist && (
                        <span className="mt-0.5 block truncate text-[10px] font-black tracking-[0.1em] text-brand">
                          {s.artist.name.toUpperCase()}
                        </span>
                      )}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Agenda de lives */}
        {lives.filter((l) => l.status === 'scheduled').length > 0 && (
          <section aria-labelledby="lives" className="mt-12">
            <h2 id="lives" className="text-lg font-extrabold tracking-[0.2em]">
              AGENDA DE LIVES
            </h2>
            <div className="mt-5 flex flex-col gap-3">
              {lives
                .filter((l) => l.status === 'scheduled')
                .map((l) => {
                  const date = new Date(l.scheduled_at)
                  return (
                    <Link
                      key={l.id}
                      href={l.artist ? `/artist/${l.artist.slug}` : '/search'}
                      className="flex items-center gap-4 rounded-3xl border border-club/30 bg-club/5 p-3.5"
                    >
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-club/15 text-club">
                        <Radio className="size-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold">{l.title}</span>
                        <span className="mt-0.5 block truncate text-[11px] font-bold text-muted-foreground">
                          {l.artist?.name} •{' '}
                          {date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às{' '}
                          {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </span>
                      <span className="rounded-full bg-club/15 px-3 py-1.5 text-[8px] font-black tracking-[0.15em] text-club">
                        LEMBRAR
                      </span>
                    </Link>
                  )
                })}
            </div>
          </section>
        )}

        {/* Banner de rodapé */}
        {footerBanners[0] && (
          <div className="mt-12">
            <FooterBanner banner={footerBanners[0]} />
          </div>
        )}

        {/* CTA final */}
        <section className="mt-12 overflow-hidden rounded-[32px] border border-white/8 bg-card p-7 text-center">
          <p className="text-[10px] font-black tracking-[0.3em] text-brand">WORDFAN CLUB</p>
          <h2 className="mt-3 font-serif text-2xl font-extrabold leading-tight tracking-tight text-balance">
            SEJA MAIS QUE UM FÃ
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-xs font-medium leading-relaxed text-muted-foreground text-pretty">
            Entre nos fan clubs dos seus artistas favoritos e desbloqueie conteúdo exclusivo, lives e
            experiências únicas.
          </p>
          <Link
            href="/search"
            className="gradient-brand mx-auto mt-5 flex w-fit items-center gap-2 rounded-full px-7 py-3.5 text-[10px] font-black tracking-[0.2em] text-white"
          >
            EXPLORAR ARTISTAS
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
