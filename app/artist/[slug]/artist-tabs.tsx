'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  BadgeCheck,
  Bookmark,
  ChevronRight,
  Clock,
  Gem,
  Heart,
  Lock,
  LogIn,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Play,
  Star,
  Ticket,
  Trophy,
  Disc3,
  X,
} from 'lucide-react'
import type { Artist, GalleryItem, Post, Show, Video, ArtistAbout } from '@/lib/types'
import { TIER_LABELS, VIDEO_CATEGORY_LABELS, formatPrice } from '@/lib/types'

type TabKey = 'feed' | 'agenda' | 'galeria' | 'videos' | 'sobre' | 'fanclub'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'feed', label: 'FEED' },
  { key: 'agenda', label: 'AGENDA' },
  { key: 'galeria', label: 'GALERIA' },
  { key: 'videos', label: 'VÍDEOS' },
  { key: 'sobre', label: 'SOBRE' },
  { key: 'fanclub', label: 'FAN CLUB' },
]

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

function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

const LOGIN_GATED: TabKey[] = ['galeria', 'videos', 'fanclub']

export function ArtistTabs({
  artist,
  posts,
  shows,
  gallery,
  videos,
  isSubscriber,
  isLoggedIn,
  cheapestPriceCents,
}: {
  artist: Artist
  posts: (Post & { locked?: boolean })[]
  shows: Show[]
  gallery: GalleryItem[]
  videos: Video[]
  isSubscriber: boolean
  isLoggedIn: boolean
  cheapestPriceCents: number | null
}) {
  const [tab, setTab] = useState<TabKey>('feed')
  const [videoFilter, setVideoFilter] = useState<Video['category'] | 'all'>('all')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const about = (artist.about ?? {}) as ArtistAbout

  const filteredVideos =
    videoFilter === 'all' ? videos : videos.filter((v) => v.category === videoFilter)

  const gateActive = LOGIN_GATED.includes(tab) && !isLoggedIn
  const loginHref = `/auth/login?next=/artist/${artist.slug}`
  const gateLabel: Record<string, string> = {
    galeria: 'Entre para ver a galeria completa',
    videos: 'Entre para assistir aos vídeos',
    fanclub: 'Entre para acessar o Fan Club',
  }

  return (
    <div>
      {/* Barra de abas */}
      <div
        role="tablist"
        aria-label="Seções do perfil"
        className="scrollbar-none glass-soft sticky top-0 z-40 flex gap-7 overflow-x-auto px-6"
      >
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={
              tab === key
                ? 'shrink-0 whitespace-nowrap border-b-2 border-club py-4 text-xs font-extrabold tracking-[0.1em] text-club'
                : 'shrink-0 whitespace-nowrap border-b-2 border-transparent py-4 text-xs font-extrabold tracking-[0.1em] text-muted-foreground'
            }
          >
            {label}
          </button>
        ))}
      </div>

      <main className="flex flex-col gap-8 px-6 pt-8">
        {/* ============ GATE DE LOGIN ============ */}
        {gateActive && (
          <section
            aria-label="Login necessário"
            className="glass-panel sheen relative mt-6 overflow-hidden rounded-[40px] p-10 text-center"
          >
            <div className="skeu-raised mx-auto flex size-16 items-center justify-center rounded-full text-club">
              <Lock className="size-7" aria-hidden="true" />
            </div>
            <h2 className="mt-6 font-serif text-2xl font-extrabold tracking-tight text-balance">
              {gateLabel[tab] ?? 'Entre para continuar'}
            </h2>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground text-pretty">
              Este conteúdo é reservado para membros. Faça login ou crie sua conta gratuita para
              desbloquear.
            </p>
            <Link
              href={loginHref}
              className="skeu-btn sheen relative mt-7 flex h-14 items-center justify-center gap-2 rounded-2xl text-[11px] font-extrabold tracking-[0.2em] text-white"
            >
              <LogIn className="size-4" aria-hidden="true" />
              ENTRAR
            </Link>
            <Link
              href={`/auth/sign-up?next=/artist/${artist.slug}`}
              className="mt-3 inline-block text-[11px] font-extrabold tracking-[0.15em] text-club"
            >
              CRIAR CONTA GRÁTIS
            </Link>
          </section>
        )}

        {/* ============ FEED ============ */}
        {!gateActive && tab === 'feed' && (
          <>
            {!isSubscriber && (
              <section
                aria-label="Experiência ultra-exclusiva"
              className="glass-panel sheen relative overflow-hidden rounded-[40px] border border-club/50 p-8 text-center"
            >
              <div className="skeu-btn sheen relative mx-auto flex size-16 items-center justify-center rounded-full">
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
                  className="skeu-btn sheen relative mt-6 flex h-14 items-center justify-center rounded-2xl text-[11px] font-extrabold tracking-[0.25em] text-white"
                >
                  VER PLANOS VIP
                </Link>
              </section>
            )}

            {posts.map((p) =>
              p.locked ? (
                <Link
                  key={p.id}
                  href={`/artist/${artist.slug}/plans`}
                  className="glass-panel sheen relative flex items-center gap-4 overflow-hidden rounded-3xl p-3"
                >
                  {/* Miniatura desfocada */}
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl">
                    <Image
                      src={artist.banner_url || artist.avatar_url || '/placeholder.svg?height=160&width=160'}
                      alt=""
                      fill
                      sizes="80px"
                      className="scale-110 object-cover opacity-50 blur-lg"
                    />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="skeu-btn sheen relative flex size-10 items-center justify-center rounded-full">
                        <Lock className="size-4 text-white" aria-hidden="true" />
                      </span>
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black tracking-[0.2em] text-club">
                      {p.min_tier ? `EXCLUSIVO ${TIER_LABELS[p.min_tier].toUpperCase()}` : 'CONTEÚDO VIP'}
                    </p>
                    <p className="mt-1 truncate font-serif text-base font-extrabold">
                      Conteúdo bloqueado
                    </p>
                    <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">
                      {timeAgo(p.created_at)} • Assine para liberar
                    </p>
                  </div>
                  <span className="skeu-raised flex size-9 shrink-0 items-center justify-center rounded-xl text-club">
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </span>
                </Link>
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
                        <span className="text-club">
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
          </>
        )}

        {/* ============ AGENDA ============ */}
        {!gateActive && tab === 'agenda' && (
          <section aria-label="Agenda de shows">
            {shows.length === 0 ? (
              <p className="py-10 text-center text-sm font-bold text-muted-foreground">
                Nenhum show agendado no momento.
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {shows.map((s) => {
                  const date = new Date(s.starts_at)
                  return (
                    <li
                      key={s.id}
                      className="skeu overflow-hidden rounded-[28px]"
                    >
                      <div className="flex items-center gap-4 p-5">
                        <div className="skeu-inset flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl text-club">
                          <span className="font-numeric text-2xl font-bold leading-none">
                            {date.getDate()}
                          </span>
                          <span className="mt-1 text-[9px] font-extrabold uppercase tracking-widest">
                            {date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold tracking-wide">{s.title}</p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3 shrink-0" aria-hidden="true" />
                            <span className="truncate">
                              {s.venue} • {s.city}/{s.state}
                            </span>
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3 shrink-0" aria-hidden="true" />
                            {date.toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="skeu-btn sheen relative flex h-12 w-full items-center justify-center gap-2 text-[10px] font-extrabold tracking-[0.2em] text-white"
                      >
                        <Ticket className="size-4" aria-hidden="true" />
                        COMPRAR INGRESSO
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}

        {/* ============ GALERIA (estilo Instagram) ============ */}
        {!gateActive && tab === 'galeria' && (
          <section aria-label="Galeria de fotos" className="-mx-6">
            {gallery.length === 0 ? (
              <p className="py-10 text-center text-sm font-bold text-muted-foreground">
                A galeria ainda está vazia.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {gallery.map((g, i) => {
                  const isPremium = !isSubscriber && i >= 6
                  const isVideo = g.type === 'video'
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() =>
                        isPremium ? undefined : setLightboxIndex(i)
                      }
                      className="group relative aspect-square overflow-hidden"
                      aria-label={isPremium ? 'Desbloquear no Fan Club' : `Abrir foto ${i + 1}`}
                    >
                      <Image
                        src={g.url || '/placeholder.svg'}
                        alt={g.album ?? 'Foto da galeria'}
                        fill
                        sizes="(max-width: 768px) 33vw, 150px"
                        className={
                          isPremium
                            ? 'object-cover blur-lg brightness-50'
                            : 'object-cover transition-transform duration-300 group-hover:scale-105'
                        }
                      />
                      {isPremium && (
                        <Link
                          href={`/artist/${artist.slug}/plans`}
                          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
                          aria-label="Desbloquear foto no Fan Club"
                        >
                          <span className="flex size-9 items-center justify-center rounded-full bg-club">
                            <Lock className="size-3.5 text-white" aria-hidden="true" />
                          </span>
                          <span className="text-[7px] font-black tracking-[0.2em] text-white">
                            FAN CLUB
                          </span>
                        </Link>
                      )}
                      {!isPremium && isVideo && (
                        <span
                          className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm"
                          aria-hidden="true"
                        >
                          <Play className="size-3 fill-white text-white" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Lightbox */}
            {lightboxIndex !== null && gallery[lightboxIndex] && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Visualizador de foto"
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4"
                onClick={() => setLightboxIndex(null)}
              >
                <button
                  type="button"
                  onClick={() => setLightboxIndex(null)}
                  className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
                  aria-label="Fechar"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
                <div
                  className="relative w-full max-w-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-3xl">
                    <Image
                      src={gallery[lightboxIndex].url || '/placeholder.svg'}
                      alt={gallery[lightboxIndex].album ?? 'Foto da galeria'}
                      fill
                      sizes="(max-width: 768px) 100vw, 512px"
                      className="object-contain"
                    />
                  </div>
                  {gallery[lightboxIndex].album && (
                    <p className="mt-4 text-center text-sm font-bold tracking-wide text-white/90">
                      {gallery[lightboxIndex].album}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-center gap-6 text-white">
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxIndex(
                          (lightboxIndex - 1 + gallery.length) % gallery.length,
                        )
                      }
                      className="rounded-full bg-white/10 px-5 py-2 text-[10px] font-black tracking-[0.2em]"
                    >
                      ANTERIOR
                    </button>
                    <button
                      type="button"
                      onClick={() => setLightboxIndex((lightboxIndex + 1) % gallery.length)}
                      className="rounded-full bg-white/10 px-5 py-2 text-[10px] font-black tracking-[0.2em]"
                    >
                      PRÓXIMA
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ============ VÍDEOS ============ */}
        {!gateActive && tab === 'videos' && (
          <section aria-label="Vídeos">
            <div className="scrollbar-none -mx-6 flex gap-2 overflow-x-auto px-6">
              <button
                type="button"
                onClick={() => setVideoFilter('all')}
                aria-pressed={videoFilter === 'all'}
                className={
                  videoFilter === 'all'
                    ? 'skeu-btn sheen relative shrink-0 rounded-full px-5 py-2.5 text-[9px] font-black tracking-[0.15em] text-white'
                    : 'skeu shrink-0 rounded-full px-5 py-2.5 text-[9px] font-black tracking-[0.15em] text-muted-foreground'
                }
              >
                TODOS
              </button>
              {(Object.keys(VIDEO_CATEGORY_LABELS) as Video['category'][]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setVideoFilter(c)}
                  aria-pressed={videoFilter === c}
                  className={
                    videoFilter === c
                      ? 'skeu-btn sheen relative shrink-0 rounded-full px-5 py-2.5 text-[9px] font-black tracking-[0.15em] text-white'
                      : 'skeu shrink-0 rounded-full px-5 py-2.5 text-[9px] font-black tracking-[0.15em] text-muted-foreground'
                  }
                >
                  {VIDEO_CATEGORY_LABELS[c].toUpperCase()}
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-5">
              {filteredVideos.length === 0 && (
                <p className="py-10 text-center text-sm font-bold text-muted-foreground">
                  Nenhum vídeo nesta categoria.
                </p>
              )}
              {filteredVideos.map((v) => {
                const blocked = v.is_exclusive && !isSubscriber
                return (
                  <div key={v.id}>
                    <div className="skeu relative aspect-video overflow-hidden rounded-3xl">
                      <Image
                        src={v.thumbnail_url || '/placeholder.svg?height=200&width=360'}
                        alt={v.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 448px"
                        className={blocked ? 'object-cover blur-md brightness-50' : 'object-cover'}
                      />
                      {blocked ? (
                        <Link
                          href={`/artist/${artist.slug}/plans`}
                          className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                          aria-label={`Desbloquear ${v.title} no Fan Club`}
                        >
                          <span className="flex size-14 items-center justify-center rounded-full bg-club">
                            <Lock className="size-5 text-white" aria-hidden="true" />
                          </span>
                          <span className="text-[9px] font-black tracking-[0.2em] text-white">
                            {v.min_tier ? `PLANO ${TIER_LABELS[v.min_tier].toUpperCase()} +` : 'FAN CLUB'}
                          </span>
                        </Link>
                      ) : (
                        <span
                          className="absolute inset-0 flex items-center justify-center"
                          aria-hidden="true"
                        >
                          <span className="flex size-14 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
                            <Play className="size-6 fill-white text-white" />
                          </span>
                        </span>
                      )}
                      {v.duration && (
                        <span className="absolute bottom-2 right-2 rounded-lg bg-black/70 px-2 py-1 font-numeric text-[10px] font-bold">
                          {v.duration}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-sm font-extrabold leading-snug">{v.title}</p>
                    <p className="mt-1 text-[10px] font-bold tracking-[0.1em] text-muted-foreground">
                      {VIDEO_CATEGORY_LABELS[v.category].toUpperCase()} •{' '}
                      <span className="font-numeric">{formatViews(v.views_count)}</span> VISUALIZAÇÕES
                    </p>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ============ SOBRE ============ */}
        {!gateActive && tab === 'sobre' && (
          <section aria-label="Sobre o artista" className="flex flex-col gap-7">
            {about.history && (
              <div>
                <h2 className="text-[10px] font-black tracking-[0.25em] text-club">HISTÓRIA</h2>
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">{about.history}</p>
              </div>
            )}

            {about.influences && about.influences.length > 0 && (
              <div>
                <h2 className="text-[10px] font-black tracking-[0.25em] text-club">INFLUÊNCIAS</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {about.influences.map((inf) => (
                    <span
                      key={inf}
                      className="skeu rounded-full px-4 py-2 text-[10px] font-bold"
                    >
                      {inf}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {about.discography && about.discography.length > 0 && (
              <div>
                <h2 className="text-[10px] font-black tracking-[0.25em] text-club">DISCOGRAFIA</h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {about.discography.map((d) => (
                    <li
                      key={`${d.title}-${d.year}`}
                      className="skeu flex items-center gap-3 rounded-2xl px-4 py-3"
                    >
                      <Disc3 className="size-4 shrink-0 text-club" aria-hidden="true" />
                      <span className="flex-1 text-sm font-extrabold">{d.title}</span>
                      <span className="font-numeric text-xs font-bold text-muted-foreground">
                        {d.year}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {about.awards && about.awards.length > 0 && (
              <div>
                <h2 className="text-[10px] font-black tracking-[0.25em] text-club">
                  PRÊMIOS E CONQUISTAS
                </h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {about.awards.map((a) => (
                    <li
                      key={a}
                      className="skeu flex items-center gap-3 rounded-2xl px-4 py-3"
                    >
                      <Trophy className="size-4 shrink-0 text-club" aria-hidden="true" />
                      <span className="text-sm font-bold leading-snug">{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!about.history &&
              (!about.influences || about.influences.length === 0) &&
              (!about.discography || about.discography.length === 0) && (
                <p className="py-10 text-center text-sm font-bold text-muted-foreground">
                  {artist.bio ?? 'Em breve mais informações sobre o artista.'}
                </p>
              )}
          </section>
        )}

        {/* ============ FAN CLUB ============ */}
        {!gateActive && tab === 'fanclub' && (
          <section aria-label="Fan Club" className="flex flex-col items-center gap-6 text-center">
            <div className="skeu-btn sheen relative flex size-20 items-center justify-center rounded-full">
              <Star className="size-8 fill-white text-white" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-serif text-3xl font-extrabold tracking-tight">
                FAN CLUB {artist.name.toUpperCase()}
              </h2>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {isSubscriber
                  ? 'Você já faz parte! Acesse o feed exclusivo, lives e muito mais.'
                  : `Conteúdo exclusivo, lives privadas, bastidores e benefícios reais${
                      cheapestPriceCents ? ` a partir de ${formatPrice(cheapestPriceCents)}/mês` : ''
                    }.`}
              </p>
            </div>
            <Link
              href={
                isSubscriber ? `/artist/${artist.slug}/club` : `/artist/${artist.slug}/plans`
              }
              className="skeu-btn sheen relative flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[11px] font-extrabold tracking-[0.25em] text-white"
            >
              <Star className="size-4 fill-white" aria-hidden="true" />
              {isSubscriber ? 'ACESSAR MEU FAN CLUB' : 'VER PLANOS E ASSINAR'}
            </Link>
            <div className="grid w-full grid-cols-2 gap-3">
              {[
                { icon: Lock, label: 'POSTS EXCLUSIVOS' },
                { icon: Play, label: 'LIVES PRIVADAS' },
                { icon: Heart, label: 'BASTIDORES' },
                { icon: Trophy, label: 'RANKING DE FÃS' },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="skeu flex flex-col items-center gap-2 rounded-3xl p-5"
                >
                  <Icon className="size-5 text-club" aria-hidden="true" />
                  <span className="text-[9px] font-black tracking-[0.15em] text-muted-foreground">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Contexto extra para leitores de tela */}
      <p className="sr-only">
        Perfil de {artist.name}, artista de {artist.genre} de {artist.city}/{artist.state}.
      </p>
    </div>
  )
}
