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
  Play,
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
      <div className="relative h-[480px]">
        <Image
          src={artist.banner_url || artist.avatar_url || '/placeholder.svg?height=480&width=375'}
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
              className="flex size-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-md"
            >
              <Share2 className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Identidade */}
        <div className="absolute inset-x-0 bottom-0 px-6 pb-6">
          <div className="relative inline-block">
            <Image
              src={artist.avatar_url || '/placeholder.svg?height=96&width=96'}
              alt={`Foto de ${artist.name}`}
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
          {artist.bio && (
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-foreground/80">{artist.bio}</p>
          )}
          <p className="mt-2 text-sm">
            <span className="text-muted-foreground">
              {artist.city}/{artist.state} • {artist.genre}
            </span>
            <span className="mx-2 text-muted-foreground">•</span>
            <span className="font-extrabold tracking-[0.15em] text-club">
              {formatFans(artist.followers_count)} FÃS
            </span>
          </p>

          <div className="mt-5 flex gap-3">
            <Link
              href={subscription ? `/artist/${artist.slug}/club` : `/artist/${artist.slug}/plans`}
              className="gradient-club elev-2 flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-[11px] font-extrabold tracking-[0.2em] text-white transition-transform active:scale-[0.98]"
            >
              <Star className="size-4 fill-white" aria-hidden="true" />
              {subscription ? 'ACESSAR FAN CLUB' : 'ENTRAR NO FAN CLUB'}
            </Link>
            <button className="surface elev-1 flex h-14 items-center gap-2 rounded-2xl px-5 text-[11px] font-extrabold tracking-[0.2em] transition-transform active:scale-[0.98]">
              <UserPlus className="size-4" aria-hidden="true" />
              SEGUIR
            </button>
          </div>
        </div>
      </div>

      {/* Stories (estilo Instagram) */}
      {stories.length > 0 && <ArtistStories artist={artist} stories={stories} />}

      {/* Banner de live (dinâmico) */}
      {!liveNow && nextLive && (
        <Link
          href={`/artist/${artist.slug}/live`}
          className="mx-6 mt-6 flex items-center gap-4 rounded-3xl border border-club/40 bg-club/10 p-4"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-club/20 text-club">
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

      {/* Stats */}
      <div className="surface elev-1 mx-6 mt-6 flex rounded-3xl px-2 py-6">
        {[
          { value: String(posts.length), label: 'POSTS' },
          { value: String(videos.length), label: 'VÍDEOS' },
          { value: String(shows.length), label: 'SHOWS' },
          { value: formatFans(artist.followers_count), label: 'FÃS' },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`flex flex-1 flex-col items-center gap-1.5 ${i > 0 ? 'border-l border-white/8' : ''}`}
          >
            <span className="font-numeric text-lg font-black">{s.value}</span>
            <span className="text-[8px] font-extrabold tracking-[0.15em] text-muted-foreground">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Redes sociais */}
      {activeSocials.length > 0 && (
        <div className="flex justify-center gap-5 px-6 py-7">
          {activeSocials.map(({ key, label, icon: Icon }) => (
            <a
              key={key}
              href={artist.social_links[key]}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2"
              aria-label={label}
            >
              <span className="surface elev-1 flex size-13 items-center justify-center rounded-2xl p-4 text-foreground/80 transition-colors group-hover:text-club">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="text-[8px] font-extrabold tracking-[0.15em] text-muted-foreground">
                {label}
              </span>
            </a>
          ))}
        </div>
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

      {/* Mini player flutuante — só aparece se estiver AO VIVO de verdade */}
      {liveNow && (
        <Link
          href={`/artist/${artist.slug}/live`}
          aria-label={`Entrar na live: ${liveNow.title}`}
          className="nav-float fixed inset-x-6 bottom-40 z-40 mx-auto flex max-w-sm items-center gap-3 rounded-3xl p-3"
        >
          <div className="relative shrink-0">
            <Image
              src={artist.avatar_url || '/placeholder.svg?height=56&width=56'}
              alt=""
              width={56}
              height={56}
              className="size-14 rounded-2xl object-cover"
            />
            <span
              className="absolute -right-1 -top-1 flex items-center gap-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[7px] font-black tracking-[0.1em] text-white"
              aria-hidden="true"
            >
              <span className="size-1 animate-pulse rounded-full bg-white" />
              LIVE
            </span>
          </div>
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
            <Play className="size-5 fill-white text-white" />
          </span>
        </Link>
      )}
    </div>
    </ArtistThemeScope>
  )
}
