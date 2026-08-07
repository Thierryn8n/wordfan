import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Share2,
  MoreHorizontal,
  Star,
  BadgeCheck,
  Gem,
  Music2,
  AudioLines,
  Heart,
  MessageCircle,
  Bookmark,
  Lock,
  Pause,
  Check,
  Calendar,
} from 'lucide-react'
import {
  getArtistBySlug,
  getArtistPosts,
  getArtistShows,
  getArtistGallery,
  getArtistLives,
  getUserSubscription,
} from '@/lib/data'
import { BottomNav } from '@/components/wordfan/bottom-nav'
import { ArtistThemeScope } from '@/components/wordfan/artist-theme-provider'
import { TIER_LABELS } from '@/lib/types'

function formatFans(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return 'AGORA HÁ POUCO'
  if (hours < 24) return `HÁ ${hours} HORAS`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'HÁ 1 DIA' : `HÁ ${days} DIAS`
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  )
}

const SOCIALS = [
  { key: 'instagram', label: 'INSTAGRAM', icon: InstagramIcon },
  { key: 'tiktok', label: 'TIKTOK', icon: Music2 },
  { key: 'spotify', label: 'SPOTIFY', icon: AudioLines },
  { key: 'youtube', label: 'YOUTUBE', icon: YoutubeIcon },
]

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const artist = await getArtistBySlug(slug)
  if (!artist) notFound()

  const [posts, shows, gallery, lives, subscription] = await Promise.all([
    getArtistPosts(artist.id),
    getArtistShows(artist.id),
    getArtistGallery(artist.id),
    getArtistLives(artist.id),
    getUserSubscription(artist.id),
  ])

  const liveNow = lives.find((l) => l.status === 'live')

  return (
    <ArtistThemeScope theme={artist.theme}>
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background pb-44">
      {/* Hero banner */}
      <div className="relative h-[500px]">
        <Image
          src={artist.banner_url || artist.avatar_url || '/placeholder.svg?height=500&width=375'}
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 448px"
          className="object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"
          aria-hidden="true"
        />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5 pt-8">
          <Link
            href="/home"
            aria-label="Voltar"
            className="flex size-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-md"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <div className="flex gap-3">
            <button
              aria-label="Compartilhar"
              className="flex size-11 items-center justify-center rounded-full bg-club/80 backdrop-blur-md"
            >
              <Share2 className="size-5" aria-hidden="true" />
            </button>
            <button
              aria-label="Mais opções"
              className="flex size-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-md"
            >
              <MoreHorizontal className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Identity */}
        <div className="absolute inset-x-0 bottom-0 px-6 pb-6">
          <div className="relative inline-block">
            <Image
              src={artist.avatar_url || '/placeholder.svg?height=96&width=96'}
              alt=""
              width={96}
              height={96}
              className="size-24 rounded-full border-4 border-club object-cover"
            />
            <span
              className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-club"
              aria-hidden="true"
            >
              <Check className="size-4 text-white" />
            </span>
          </div>
          <h1 className="mt-4 flex items-center gap-2 font-serif text-[40px] font-extrabold leading-none tracking-tight">
            {artist.name.toUpperCase()}
            <BadgeCheck className="size-7 text-club" aria-hidden="true" />
          </h1>
          <p className="mt-2 text-sm">
            <span className="text-muted-foreground">@{artist.slug}</span>
            <span className="mx-2 text-muted-foreground">•</span>
            <span className="font-extrabold tracking-[0.15em] text-club">
              {formatFans(artist.followers_count)} FÃS
            </span>
          </p>

          <div className="mt-5 flex gap-3">
            <Link
              href={subscription ? `/artist/${artist.slug}/club` : `/artist/${artist.slug}/plans`}
              className="gradient-club flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-[11px] font-extrabold tracking-[0.2em] text-white"
            >
              <Star className="size-4 fill-white" aria-hidden="true" />
              {subscription ? 'ACESSAR FAN CLUB' : 'ENTRAR NO FAN CLUB'}
            </Link>
            <button className="h-14 rounded-2xl border border-white/8 bg-card px-6 text-[11px] font-extrabold tracking-[0.2em]">
              SEGUIR
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex border-y border-white/8 bg-card/30 px-6 py-8">
        {[
          { value: `${posts.length * 4 + 12}.4k`, label: 'POSTS' },
          { value: '852', label: 'VÍDEOS' },
          { value: String(lives.length + 140), label: 'LIVES' },
          { value: formatFans(artist.followers_count), label: 'FÃS' },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`flex flex-1 flex-col items-center gap-1 ${i > 0 ? 'border-l border-white/8' : ''}`}
          >
            <span className="font-numeric text-sm font-bold">{s.value}</span>
            <span className="text-[8px] font-extrabold tracking-[0.1em] text-muted-foreground">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Social links */}
      <div className="flex justify-center gap-6 px-6 py-8">
        {SOCIALS.map(({ key, label, icon: Icon }) => (
          <a
            key={key}
            href={artist.social_links?.[key] ?? '#'}
            className="flex flex-col items-center gap-2"
            aria-label={label}
          >
            <span className="flex size-14 items-center justify-center rounded-2xl border border-white/8 bg-card text-muted-foreground">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="text-[8px] font-extrabold tracking-[0.15em] text-muted-foreground">
              {label}
            </span>
          </a>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-8 border-b border-white/8 px-6" role="tablist" aria-label="Seções do perfil">
        {['FEED VIP', 'GALERIA', 'AGENDA', 'FAN SHOP'].map((t, i) => (
          <a
            key={t}
            href={`#${t.toLowerCase().replace(' ', '-')}`}
            role="tab"
            aria-selected={i === 0}
            className={
              i === 0
                ? 'border-b-2 border-club pb-4 text-sm font-extrabold tracking-[0.1em]'
                : 'pb-4 text-sm font-extrabold tracking-[0.1em] text-muted-foreground'
            }
          >
            {t}
          </a>
        ))}
      </div>

      <main id="feed-vip" className="flex flex-col gap-8 px-6 pt-8">
        {/* VIP promo card */}
        {!subscription && (
          <section
            aria-label="Experiência ultra-exclusiva"
            className="relative overflow-hidden rounded-[40px] border-2 border-club bg-black p-8 text-center shadow-[0_0_60px_-15px_var(--club)]"
          >
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-club">
              <Gem className="size-7 text-white" aria-hidden="true" />
            </div>
            <h2 className="mt-6 font-serif text-2xl font-extrabold leading-tight tracking-tight">
              EXPERIÊNCIA
              <br />
              ULTRA-EXCLUSIVA
            </h2>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Assine o Fan Club e tenha acesso a conteúdos que ninguém mais vê.
            </p>
            <Link
              href={`/artist/${artist.slug}/plans`}
              className="mt-6 flex h-14 items-center justify-center rounded-2xl bg-white text-[11px] font-extrabold tracking-[0.25em] text-black"
            >
              VER PLANOS VIP
            </Link>
          </section>
        )}

        {/* Feed */}
        {posts.map((p) =>
          p.locked ? (
            <article key={p.id}>
              <header className="flex items-center gap-3">
                <Image
                  src={artist.avatar_url || '/placeholder.svg?height=40&width=40'}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 rounded-full object-cover opacity-60"
                />
                <div className="flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-extrabold tracking-[0.1em]">
                    {artist.name.toUpperCase()}
                    <BadgeCheck className="size-4 text-club" aria-hidden="true" />
                  </p>
                  <p className="text-[10px] font-extrabold tracking-[0.1em] text-muted-foreground">
                    {timeAgo(p.created_at)} •{' '}
                    <span className="text-club">
                      {p.min_tier ? `${TIER_LABELS[p.min_tier].toUpperCase()} +` : 'VIP'}
                    </span>
                  </p>
                </div>
              </header>
              <div className="mt-4 flex flex-col items-center rounded-[40px] border border-white/8 bg-card/60 px-8 py-14 text-center backdrop-blur-xl">
                <div className="flex size-20 items-center justify-center rounded-full bg-club/90">
                  <Lock className="size-8 text-white" aria-hidden="true" />
                </div>
                <h3 className="mt-8 font-serif text-2xl font-extrabold tracking-tight">
                  CONTEÚDO PROTEGIDO
                </h3>
                <p className="mt-3 max-w-[240px] text-sm leading-relaxed text-muted-foreground">
                  Assine o Plano {p.min_tier ? TIER_LABELS[p.min_tier] : 'VIP'} para liberar este e
                  outros 150+ conteúdos exclusivos.
                </p>
                <Link
                  href={`/artist/${artist.slug}/plans`}
                  className="mt-8 rounded-2xl bg-zinc-200 px-10 py-4 text-[11px] font-extrabold tracking-[0.2em] text-black"
                >
                  ASSINAR PARA VER
                </Link>
              </div>
            </article>
          ) : (
            <article key={p.id}>
              <header className="flex items-center gap-3">
                <Image
                  src={artist.avatar_url || '/placeholder.svg?height=40&width=40'}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 rounded-full border-2 border-club object-cover"
                />
                <div className="flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-extrabold tracking-[0.1em]">
                    {artist.name.toUpperCase()}
                    <BadgeCheck className="size-4 text-club" aria-hidden="true" />
                  </p>
                  <p className="text-[10px] font-extrabold tracking-[0.1em] text-muted-foreground">
                    {timeAgo(p.created_at)} •{' '}
                    <span className={p.is_exclusive ? 'text-club' : 'text-club'}>
                      {p.is_exclusive && p.min_tier
                        ? `${TIER_LABELS[p.min_tier].toUpperCase()} +`
                        : 'PÚBLICO'}
                    </span>
                  </p>
                </div>
                <MoreHorizontal className="size-5 text-muted-foreground" aria-hidden="true" />
              </header>

              {p.media_url && (
                <div className="mt-4 overflow-hidden rounded-[32px]">
                  <Image
                    src={p.media_url || "/placeholder.svg"}
                    alt={p.title ?? 'Mídia do post'}
                    width={620}
                    height={620}
                    className="aspect-square w-full object-cover"
                  />
                </div>
              )}

              <footer className="mt-4 flex items-center gap-6">
                <span className="flex items-center gap-2 text-sm font-bold">
                  <Heart className="size-6 fill-club text-club" aria-hidden="true" />
                  <span className="font-numeric">{formatFans(p.likes_count)}</span>
                </span>
                <span className="flex items-center gap-2 text-sm font-bold">
                  <MessageCircle className="size-6" aria-hidden="true" />
                  <span className="font-numeric">{Math.round(p.likes_count / 15)}</span>
                </span>
                <Bookmark className="ml-auto size-6" aria-hidden="true" />
              </footer>
              {(p.content || p.title) && (
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                  {p.content ?? p.title}
                </p>
              )}
            </article>
          ),
        )}

        {/* Galeria */}
        {gallery.length > 0 && (
          <section id="galeria" aria-labelledby="galeria-h">
            <h2 id="galeria-h" className="text-lg font-extrabold tracking-[0.2em]">
              GALERIA
            </h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {gallery.slice(0, 6).map((g) => (
                <div key={g.id} className="relative aspect-square overflow-hidden rounded-2xl">
                  <Image
                    src={g.url || "/placeholder.svg"}
                    alt={g.album ?? 'Foto da galeria'}
                    fill
                    sizes="(max-width: 768px) 33vw, 150px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Agenda */}
        {shows.length > 0 && (
          <section id="agenda" aria-labelledby="agenda-h">
            <h2 id="agenda-h" className="text-lg font-extrabold tracking-[0.2em]">
              AGENDA
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {shows.map((s) => {
                const date = new Date(s.starts_at)
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-4 rounded-3xl border border-white/8 bg-card p-4"
                  >
                    <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-club/10 text-club">
                      <span className="font-numeric text-xl font-bold leading-none">
                        {date.getDate()}
                      </span>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest">
                        {date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold tracking-wide">{s.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="size-3" aria-hidden="true" />
                        {s.venue} • {s.city}/{s.state}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </main>

      {/* Mini player flutuante */}
      {liveNow && (
        <Link
          href={`/artist/${artist.slug}/live`}
          className="fixed inset-x-6 bottom-24 z-50 mx-auto flex max-w-sm items-center gap-4 rounded-3xl border border-club/50 bg-black/90 p-3 backdrop-blur-xl"
        >
          <Image
            src={artist.avatar_url || '/placeholder.svg?height=56&width=56'}
            alt=""
            width={56}
            height={56}
            className="size-14 rounded-2xl object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold tracking-[0.1em]">
              {liveNow.title.toUpperCase()}
            </p>
            <p className="mt-0.5 text-[10px] font-extrabold tracking-[0.15em] text-muted-foreground">
              {artist.name.toUpperCase()} • <span className="text-club">AO VIVO</span>
            </p>
          </div>
          <span
            className="gradient-club flex size-12 shrink-0 items-center justify-center rounded-2xl"
            aria-hidden="true"
          >
            <Pause className="size-5 fill-white text-white" />
          </span>
        </Link>
      )}

      <BottomNav accent="club" />
    </div>
    </ArtistThemeScope>
  )
}
