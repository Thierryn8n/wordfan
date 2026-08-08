import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Share2,
  UserPlus,
  Star,
  BadgeCheck,
  Music2,
  AudioLines,
  Globe,
  Pause,
  Check,
  Radio,
  CalendarClock,
} from 'lucide-react'
import {
  getArtistBySlug,
  getArtistPosts,
  getArtistShows,
  getArtistGallery,
  getArtistLives,
  getArtistVideos,
  getArtistStories,
  getArtistPlans,
  getUserSubscription,
  getCurrentUser,
} from '@/lib/data'
import { BottomNav } from '@/components/wordfan/bottom-nav'
import { ArtistThemeScope } from '@/components/wordfan/artist-theme-provider'
import { ArtistTabs } from './artist-tabs'
import { ArtistStories } from './artist-stories'

function formatFans(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
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

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

const SOCIALS = [
  { key: 'instagram', label: 'INSTAGRAM', icon: InstagramIcon },
  { key: 'tiktok', label: 'TIKTOK', icon: Music2 },
  { key: 'spotify', label: 'SPOTIFY', icon: AudioLines },
  { key: 'youtube', label: 'YOUTUBE', icon: YoutubeIcon },
  { key: 'facebook', label: 'FACEBOOK', icon: FacebookIcon },
  { key: 'site', label: 'SITE', icon: Globe },
]

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const artist = await getArtistBySlug(slug)
  if (!artist) notFound()

  const [posts, shows, gallery, lives, videos, stories, plans, subscription, user] = await Promise.all([
    getArtistPosts(artist.id),
    getArtistShows(artist.id),
    getArtistGallery(artist.id),
    getArtistLives(artist.id),
    getArtistVideos(artist.id),
    getArtistStories(artist.id),
    getArtistPlans(artist.id),
    getUserSubscription(artist.id),
    getCurrentUser(),
  ])
  const isLoggedIn = Boolean(user)

  const liveNow = lives.find((l) => l.status === 'live')
  const nextLive = lives.find((l) => l.status === 'scheduled')
  const cheapest = plans.length > 0 ? Math.min(...plans.map((p) => p.price_cents)) : null
  const activeSocials = SOCIALS.filter((s) => artist.social_links?.[s.key])

  return (
    <ArtistThemeScope theme={artist.theme}>
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background pb-44">
      {/* ===== HERO ===== */}
      <div className="relative h-[340px]">
        <Image
          src={artist.banner_url || artist.avatar_url || '/placeholder.svg?height=340&width=375'}
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 448px"
          className="object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-background/10"
          aria-hidden="true"
        />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5 pt-8">
          <Link
            href="/home"
            aria-label="Voltar"
            className="glass-soft flex size-11 items-center justify-center rounded-full"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <div className="flex items-center gap-3">
            {liveNow && (
              <Link
                href={`/artist/${artist.slug}/live`}
                className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2.5 text-[9px] font-black tracking-[0.2em] text-white"
              >
                <span className="size-2 animate-pulse rounded-full bg-white" aria-hidden="true" />
                AO VIVO AGORA
              </Link>
            )}
            <button
              aria-label="Compartilhar"
              className="glass-soft flex size-11 items-center justify-center rounded-full"
            >
              <Share2 className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* ===== CARTÃO DE IDENTIDADE (sobrepõe o hero) ===== */}
      <div className="relative z-10 -mt-24 px-5">
        <div className="glass-panel sheen relative rounded-[34px] p-6 pt-0">
          <div className="flex items-end gap-4">
            <div className="relative -mt-12 shrink-0">
              <span className="skeu-raised sheen relative block rounded-[28px] p-1.5">
                <Image
                  src={artist.avatar_url || '/placeholder.svg?height=96&width=96'}
                  alt={`Foto de ${artist.name}`}
                  width={96}
                  height={96}
                  className="size-24 rounded-[22px] object-cover"
                />
              </span>
              <span
                className="skeu-btn sheen absolute -bottom-1.5 -right-1.5 flex size-8 items-center justify-center rounded-full"
                aria-hidden="true"
              >
                <Check className="size-4 text-white" />
              </span>
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-club">
                {artist.genre}
              </p>
              <p className="mt-1 truncate text-xs font-bold text-muted-foreground">
                {artist.city}/{artist.state}
              </p>
            </div>
          </div>

          <h1 className="mt-4 flex items-center gap-2 font-serif text-[38px] font-extrabold leading-[0.95] tracking-tight text-balance">
            {artist.name.toUpperCase()}
            <BadgeCheck className="size-6 shrink-0 text-club" aria-hidden="true" />
          </h1>
          {artist.bio && (
            <p className="mt-2.5 text-sm leading-relaxed text-foreground/75 text-pretty">
              {artist.bio}
            </p>
          )}

          {/* Faixa de estatísticas */}
          <div className="skeu-inset mt-5 flex rounded-2xl px-3 py-4">
            {[
              { value: String(posts.length), label: 'POSTS' },
              { value: String(videos.length), label: 'VÍDEOS' },
              { value: String(shows.length), label: 'SHOWS' },
              { value: formatFans(artist.followers_count), label: 'FÃS' },
            ].map((s, i) => (
              <div
                key={s.label}
                className={`flex flex-1 flex-col items-center gap-1 ${i > 0 ? 'border-l border-white/8' : ''}`}
              >
                <span className="font-numeric text-base font-bold">{s.value}</span>
                <span className="text-[8px] font-extrabold tracking-[0.1em] text-muted-foreground">
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Ações */}
          <div className="mt-5 flex gap-3">
            <Link
              href={subscription ? `/artist/${artist.slug}/club` : `/artist/${artist.slug}/plans`}
              className="skeu-btn sheen relative flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-[11px] font-extrabold tracking-[0.2em] text-white"
            >
              <Star className="size-4 fill-white" aria-hidden="true" />
              {subscription ? 'ACESSAR FAN CLUB' : 'ENTRAR NO FAN CLUB'}
            </Link>
            <button
              aria-label="Seguir"
              className="skeu flex size-14 shrink-0 items-center justify-center rounded-2xl"
            >
              <UserPlus className="size-5" aria-hidden="true" />
            </button>
          </div>

          {/* Redes sociais */}
          {activeSocials.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              {activeSocials.map(({ key, label, icon: Icon }) => (
                <a
                  key={key}
                  href={artist.social_links[key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="skeu-raised flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={label}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stories (estilo Instagram) */}
      {stories.length > 0 && <ArtistStories artist={artist} stories={stories} />}

      {/* Banner de live (dinâmico) */}
      {!liveNow && nextLive && (
        <Link
          href={`/artist/${artist.slug}/live`}
          className="glass-panel sheen relative mx-5 mt-6 flex items-center gap-4 rounded-3xl p-4"
        >
          <span className="skeu-raised flex size-12 shrink-0 items-center justify-center rounded-2xl text-club">
            <CalendarClock className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black tracking-[0.2em] text-club">PRÓXIMA LIVE</p>
            <p className="mt-0.5 truncate text-sm font-extrabold">{nextLive.title}</p>
            <p className="mt-0.5 text-[10px] font-bold text-muted-foreground">
              {new Date(nextLive.scheduled_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
              })}{' '}
              às{' '}
              {new Date(nextLive.scheduled_at).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <Radio className="size-4 shrink-0 text-club" aria-hidden="true" />
        </Link>
      )}

      {/* ===== ABAS ===== */}
      <ArtistTabs
        artist={artist}
        posts={posts}
        shows={shows}
        gallery={gallery}
        videos={videos}
        isSubscriber={Boolean(subscription)}
        isLoggedIn={isLoggedIn}
        cheapestPriceCents={cheapest}
      />

      {/* Mini player flutuante */}
      {liveNow && (
        <Link
          href={`/artist/${artist.slug}/live`}
          className="glass-panel sheen fixed inset-x-6 bottom-24 z-50 mx-auto flex max-w-sm items-center gap-4 rounded-3xl p-3"
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
