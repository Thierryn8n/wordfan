import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Radio, Trophy, ImageIcon, Sparkles } from 'lucide-react'
import {
  getArtistBySlug,
  getArtistPosts,
  getArtistLives,
  getArtistGallery,
  getUserSubscription,
  getCurrentUser,
} from '@/lib/data'
import { PostCard } from '@/components/wordfan/post-card'
import { TierBadge } from '@/components/wordfan/tier-badge'
import { BottomNav } from '@/components/wordfan/bottom-nav'
import { TIER_LABELS } from '@/lib/types'

export default async function ClubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const artist = await getArtistBySlug(slug)
  if (!artist) notFound()

  const user = await getCurrentUser()
  if (!user) redirect(`/auth/login?next=/artist/${slug}/club`)

  const subscription = await getUserSubscription(artist.id)
  if (!subscription) redirect(`/artist/${slug}/plans`)

  const [posts, lives, gallery] = await Promise.all([
    getArtistPosts(artist.id),
    getArtistLives(artist.id),
    getArtistGallery(artist.id),
  ])

  const liveNow = lives.find((l) => l.status === 'live')
  const upcoming = lives.filter((l) => l.status === 'scheduled')

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-28 md:max-w-lg">
      <header className="relative">
        <div className="gradient-brand h-28 opacity-90" />
        <Link
          href={`/artist/${slug}`}
          aria-label="Voltar para o perfil do artista"
          className="glass absolute left-4 top-5 flex size-10 items-center justify-center rounded-full"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <div className="-mt-10 flex items-end gap-4 px-5">
          <Image
            src={artist.avatar_url || '/placeholder.svg?height=80&width=80'}
            alt=""
            width={80}
            height={80}
            className="size-20 rounded-2xl border-4 border-background object-cover"
          />
          <div className="pb-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
              <Sparkles className="size-3.5" aria-hidden="true" />
              FAN CLUB OFICIAL
            </p>
            <h1 className="font-serif text-xl font-bold leading-tight">{artist.name}</h1>
          </div>
        </div>
      </header>

      <main className="px-5">
        <div className="glass mt-5 flex items-center justify-between rounded-2xl p-4">
          <div>
            <p className="text-xs text-muted-foreground">Seu nível de fã</p>
            <p className="mt-0.5 flex items-center gap-2 font-medium">
              Plano {TIER_LABELS[subscription.plan.tier]}
              <TierBadge tier={subscription.plan.tier} />
            </p>
          </div>
          <Link
            href={`/artist/${slug}/plans`}
            className="text-xs font-medium text-primary hover:underline"
          >
            Mudar plano
          </Link>
        </div>

        {liveNow && (
          <Link
            href={`/artist/${slug}/live`}
            className="mt-4 flex items-center gap-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-4"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-destructive">
              <Radio className="size-5 text-white" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-xs font-semibold text-destructive">
                <span className="size-1.5 animate-pulse rounded-full bg-destructive" aria-hidden="true" />
                ACONTECENDO AGORA
              </p>
              <p className="mt-0.5 truncate text-sm font-medium">{liveNow.title}</p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-destructive">Entrar</span>
          </Link>
        )}

        {upcoming.length > 0 && (
          <section aria-labelledby="lives-heading" className="mt-6">
            <h2 id="lives-heading" className="flex items-center gap-2 font-serif text-lg font-semibold">
              <Radio className="size-4 text-primary" aria-hidden="true" />
              Próximas lives
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {upcoming.map((l) => (
                <li key={l.id} className="glass flex items-center justify-between gap-3 rounded-2xl p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{l.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(l.scheduled_at).toLocaleDateString('pt-BR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {l.min_tier && <TierBadge tier={l.min_tier} />}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="ranking-heading" className="mt-6">
          <h2 id="ranking-heading" className="flex items-center gap-2 font-serif text-lg font-semibold">
            <Trophy className="size-4 text-accent" aria-hidden="true" />
            Ranking de fãs
          </h2>
          <div className="glass mt-3 flex flex-col gap-3 rounded-2xl p-4">
            {[
              { pos: 1, name: 'Fernanda M.', xp: 12480 },
              { pos: 2, name: 'Carlos R.', xp: 11020 },
              { pos: 3, name: 'Julia S.', xp: 9870 },
            ].map((fan) => (
              <div key={fan.pos} className="flex items-center gap-3">
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    fan.pos === 1 ? 'gradient-brand text-black' : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {fan.pos}
                </span>
                <p className="flex-1 text-sm font-medium">{fan.name}</p>
                <p className="text-xs text-muted-foreground">{fan.xp.toLocaleString('pt-BR')} XP</p>
              </div>
            ))}
            <p className="border-t border-border pt-3 text-center text-xs text-muted-foreground">
              Interaja com posts e lives para subir no ranking
            </p>
          </div>
        </section>

        {gallery.length > 0 && (
          <section aria-labelledby="club-gallery-heading" className="mt-6">
            <h2 id="club-gallery-heading" className="flex items-center gap-2 font-serif text-lg font-semibold">
              <ImageIcon className="size-4 text-primary" aria-hidden="true" />
              Galeria exclusiva
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {gallery.map((g) => (
                <div key={g.id} className="relative aspect-square overflow-hidden rounded-xl">
                  <Image
                    src={g.url || "/placeholder.svg"}
                    alt={g.album ?? 'Foto exclusiva'}
                    fill
                    sizes="(max-width: 768px) 33vw, 170px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="feed-heading" className="mt-6">
          <h2 id="feed-heading" className="font-serif text-lg font-semibold">
            Feed do clube
          </h2>
          <div className="mt-3 flex flex-col gap-4">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} artist={artist} locked={Boolean(p.locked)} />
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
