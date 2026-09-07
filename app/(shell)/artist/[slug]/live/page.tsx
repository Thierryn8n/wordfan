import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Play, Lock, CalendarClock } from 'lucide-react'
import {
  getArtistBySlug,
  getArtistLives,
  getUserSubscription,
  getCurrentUser,
  getLiveMessages,
} from '@/lib/data'
import { canAccess } from '@/lib/data'
import { TIER_LABELS } from '@/lib/types'
import { ArtistThemeScope } from '@/components/wordfan/artist-theme-provider'
import { hasEntitlement } from '@/lib/artist-theme'
import { LiveChat } from './live-chat'
import { LivePlayer } from './live-player'

function formatSchedule(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function LivePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const artist = await getArtistBySlug(slug)
  if (!artist) notFound()

  // Entitlement: lives requerem plano de ferramenta Premium
  if (!hasEntitlement(artist.tool_plan, 'lives')) redirect(`/artist/${slug}`)

  const user = await getCurrentUser()
  if (!user) redirect(`/auth/login?next=/artist/${slug}/live`)

  const [lives, subscription] = await Promise.all([
    getArtistLives(artist.id),
    getUserSubscription(artist.id),
  ])

  // Prioriza a live no ar; senão mostra a próxima agendada.
  const live = lives.find((l) => l.status === 'live') ?? lives[0]
  if (!live) redirect(`/artist/${slug}`)

  const isLive = live.status === 'live'
  const userTier = subscription?.plan?.tier ?? null
  const hasAccess = canAccess(userTier, live.min_tier)

  // Histórico do chat só é carregado para quem tem acesso e quando está no ar.
  const initialMessages = hasAccess && isLive ? await getLiveMessages(live.id) : []
  const displayName = (user.user_metadata?.display_name as string | undefined)?.trim() || 'Você'

  return (
    <ArtistThemeScope theme={artist.theme}>
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
        <header className="flex items-center gap-3 px-6 pt-7">
          <Link
            href={`/artist/${slug}/club`}
            aria-label="Voltar para o fan club"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/8 bg-card"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-sm font-extrabold leading-tight">{live.title}</p>
            <div className="flex items-center gap-2">
              <p className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">
                {artist.name.toUpperCase()}
              </p>
              {(artist as any).logo_url && (
                <Image
                  src={(artist as any).logo_url}
                  alt={`Logo de ${artist.name}`}
                  width={24}
                  height={24}
                  className="h-6 w-auto object-contain"
                />
              )}
            </div>
          </div>
          {isLive ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-destructive px-3 py-1.5 text-[9px] font-black tracking-[0.15em] text-white">
              <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
              AO VIVO
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-card px-3 py-1.5 text-[9px] font-black tracking-[0.15em] text-muted-foreground">
              <CalendarClock className="size-3" aria-hidden="true" />
              EM BREVE
            </span>
          )}
        </header>

        <main className="flex flex-1 flex-col px-6 pb-6 pt-5">
          <div className="relative aspect-video overflow-hidden rounded-3xl border border-white/8 bg-card">
            {/* Estado 1: sem acesso — teaser bloqueado */}
            {!hasAccess ? (
              <>
                <Image
                  src={artist.banner_url || '/placeholder.svg?height=300&width=530'}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 448px"
                  className="object-cover blur-lg"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-6 text-center">
                  <span className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
                    <Lock className="size-5 text-muted-foreground" aria-hidden="true" />
                  </span>
                  <p className="font-serif text-sm font-extrabold">LIVE EXCLUSIVA PARA ASSINANTES</p>
                  {live.min_tier && (
                    <p className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground">
                      A PARTIR DO PLANO {TIER_LABELS[live.min_tier].toUpperCase()}
                    </p>
                  )}
                  <Link
                    href={`/artist/${slug}/plans`}
                    className="gradient-brand mt-1 rounded-full px-7 py-3 text-[10px] font-black tracking-[0.2em] text-white"
                  >
                    FAZER UPGRADE
                  </Link>
                </div>
              </>
            ) : isLive && live.stream_url ? (
              /* Estado 2: no ar com transmissão configurada — player real */
              <LivePlayer streamUrl={live.stream_url} poster={artist.banner_url} />
            ) : isLive ? (
              /* Estado 3: no ar, mas sem URL de stream ainda */
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 p-6 text-center">
                <span className="gradient-brand elev-2 flex size-16 items-center justify-center rounded-full">
                  <Play className="size-6 fill-white text-white" aria-hidden="true" />
                </span>
                <p className="text-[11px] font-bold text-muted-foreground">
                  A transmissão vai começar a qualquer momento.
                </p>
              </div>
            ) : (
              /* Estado 4: agendada — countdown/poster */
              <>
                <Image
                  src={artist.banner_url || '/placeholder.svg?height=300&width=530'}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 448px"
                  className="object-cover opacity-60"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 p-6 text-center">
                  <CalendarClock className="size-7 text-white" aria-hidden="true" />
                  <p className="font-serif text-sm font-extrabold text-white">AGENDADA</p>
                  <p className="text-[11px] font-bold tracking-[0.05em] text-white/80">
                    {formatSchedule(live.scheduled_at)}
                  </p>
                </div>
              </>
            )}
          </div>

          {hasAccess && (
            <LiveChat
              liveId={live.id}
              userId={user.id}
              displayName={displayName}
              initialMessages={initialMessages}
              isLive={isLive}
            />
          )}
        </main>
      </div>
    </ArtistThemeScope>
  )
}
