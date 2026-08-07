import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Radio, Users } from 'lucide-react'
import { getArtistBySlug, getArtistLives, getUserSubscription, getCurrentUser, canAccess } from '@/lib/data'
import { TierBadge } from '@/components/wordfan/tier-badge'
import { LiveChat } from './live-chat'

export default async function LivePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const artist = await getArtistBySlug(slug)
  if (!artist) notFound()

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
    <div className="mx-auto flex min-h-dvh max-w-md flex-col md:max-w-lg">
      <header className="flex items-center gap-3 px-5 pt-6">
        <Link
          href={`/artist/${slug}/club`}
          aria-label="Voltar para o fan club"
          className="glass flex size-10 items-center justify-center rounded-full"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif font-semibold leading-tight">{live.title}</p>
          <p className="text-xs text-muted-foreground">{artist.name}</p>
        </div>
        {live.status === 'live' && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-destructive px-3 py-1 text-[11px] font-semibold text-white">
            <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
            AO VIVO
          </span>
        )}
      </header>

      <main className="flex flex-1 flex-col px-5 pb-6 pt-4">
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-secondary">
          <Image
            src={artist.banner_url || '/placeholder.svg?height=300&width=530'}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 512px"
            className={hasAccess ? 'object-cover' : 'object-cover blur-lg'}
          />
          {hasAccess ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <span className="glass flex size-16 items-center justify-center rounded-full">
                <Radio className="size-7 text-destructive" aria-hidden="true" />
              </span>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 p-6 text-center">
              <p className="font-medium">Live exclusiva para assinantes</p>
              {live.min_tier && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  A partir do plano <TierBadge tier={live.min_tier} />
                </p>
              )}
              <Link
                href={`/artist/${slug}/plans`}
                className="gradient-brand mt-1 rounded-full px-6 py-2.5 text-sm font-semibold text-black"
              >
                Fazer upgrade
              </Link>
            </div>
          )}
          <p className="glass absolute left-3 top-3 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs">
            <Users className="size-3.5" aria-hidden="true" />
            1.284 assistindo
          </p>
        </div>

        {hasAccess && <LiveChat displayName={user.user_metadata?.display_name ?? 'Você'} />}
      </main>
    </div>
  )
}
