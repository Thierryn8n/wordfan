import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Play, Users, Lock } from 'lucide-react'
import { getArtistBySlug, getArtistLives, getUserSubscription, getCurrentUser, canAccess } from '@/lib/data'
import { TIER_LABELS } from '@/lib/types'
import { ArtistThemeScope } from '@/components/wordfan/artist-theme-provider'
import { hasEntitlement } from '@/lib/artist-theme'
import { LiveChat } from './live-chat'

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

  const live = lives.find((l) => l.status === 'live') ?? lives[0]
  if (!live) redirect(`/artist/${slug}`)

  const userTier = subscription?.plan?.tier ?? null
  const hasAccess = canAccess(userTier, live.min_tier)

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
        {live.status === 'live' && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-destructive px-3 py-1.5 text-[9px] font-black tracking-[0.15em] text-white">
            <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
            AO VIVO
          </span>
        )}
      </header>

      <main className="flex flex-1 flex-col px-6 pb-6 pt-5">
        <div className="relative aspect-video overflow-hidden rounded-3xl border border-white/8 bg-card">
          <Image
            src={artist.banner_url || '/placeholder.svg?height=300&width=530'}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 448px"
            className={hasAccess ? 'object-cover' : 'object-cover blur-lg'}
          />
          {hasAccess ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <span className="gradient-brand elev-2 flex size-16 items-center justify-center rounded-full">
                <Play className="size-6 fill-white text-white" aria-hidden="true" />
              </span>
            </div>
          ) : (
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
          )}
          <p className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 font-numeric text-[10px] font-bold backdrop-blur-sm">
            <Users className="size-3" aria-hidden="true" />
            1.284
          </p>
        </div>

        {hasAccess && <LiveChat displayName={user.user_metadata?.display_name ?? 'Você'} />}
      </main>
    </div>
    </ArtistThemeScope>
  )
}
