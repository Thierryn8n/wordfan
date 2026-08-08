import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Radio, Trophy, Sparkles, Play } from 'lucide-react'
import {
  getArtistBySlug,
  getArtistPosts,
  getArtistLives,
  getArtistGallery,
  getUserSubscription,
  getCurrentUser,
} from '@/lib/data'
import { PostCard } from '@/components/wordfan/post-card'
import { BottomNav } from '@/components/wordfan/bottom-nav'
import { ArtistThemeScope } from '@/components/wordfan/artist-theme-provider'
import { hasEntitlement } from '@/lib/artist-theme'
import { TIER_LABELS } from '@/lib/types'

export default async function ClubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const artist = await getArtistBySlug(slug)
  if (!artist) notFound()

  // Entitlement: fan club requer plano de ferramenta Pro ou superior
  if (!hasEntitlement(artist.tool_plan, 'club')) redirect(`/artist/${slug}`)

  const user = await getCurrentUser()
  if (!user) redirect(`/auth/login?next=/artist/${slug}/club`)

  const subscription = await getUserSubscription(artist.id)
  if (!subscription) redirect(`/artist/${slug}/plans`)

  const [posts, lives, gallery] = await Promise.all([
    getArtistPosts(artist.id),
    getArtistLives(artist.id),
    getArtistGallery(artist.id),
  ])

  const canLives = hasEntitlement(artist.tool_plan, 'lives')
  const canRanking = hasEntitlement(artist.tool_plan, 'ranking')
  const liveNow = canLives ? lives.find((l) => l.status === 'live') : undefined
  const upcoming = canLives ? lives.filter((l) => l.status === 'scheduled') : []

  return (
    <ArtistThemeScope theme={artist.theme}>
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background pb-32">
      {/* Hero do clube */}
      <header className="relative h-56 overflow-hidden">
        <Image
          src={artist.banner_url || artist.avatar_url || '/placeholder.svg?height=224&width=375'}
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 448px"
          className="object-cover opacity-40"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-club/20 via-background/60 to-background"
          aria-hidden="true"
        />
        <Link
          href={`/artist/${slug}`}
          aria-label="Voltar para o perfil do artista"
          className="glass-soft absolute left-5 top-5 z-10 flex size-10 items-center justify-center rounded-full"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 px-6 pb-5">
          <Image
            src={artist.avatar_url || '/placeholder.svg?height=72&width=72'}
            alt=""
            width={72}
            height={72}
            className="size-18 rounded-2xl border-2 border-club object-cover"
          />
          <div className="pb-0.5">
            <p className="flex items-center gap-1.5 text-[9px] font-black tracking-[0.25em] text-club">
              <Sparkles className="size-3" aria-hidden="true" />
              FAN CLUB OFICIAL
            </p>
            <h1 className="mt-1 font-serif text-2xl font-black leading-none tracking-tight">
              {artist.name.toUpperCase()}
            </h1>
          </div>
        </div>
      </header>

      <main className="px-6">
        {/* Plano atual */}
        <div className="glass-panel sheen relative mt-5 flex items-center justify-between rounded-3xl p-5">
          <div>
            <p className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">SEU NÍVEL DE FÃ</p>
            <p className="mt-1 font-serif text-lg font-extrabold text-club">
              {TIER_LABELS[subscription.plan.tier].toUpperCase()}
            </p>
          </div>
          <Link
            href={`/artist/${slug}/plans`}
            className="skeu rounded-full px-4 py-2 text-[9px] font-black tracking-[0.15em] text-club"
          >
            MUDAR PLANO
          </Link>
        </div>

        {/* Live agora */}
        {liveNow && (
          <Link
            href={`/artist/${slug}/live`}
            className="skeu-btn sheen relative mt-4 flex items-center gap-3 rounded-3xl p-4"
          >
            <span className="glass-soft flex size-11 shrink-0 items-center justify-center rounded-full">
              <Play className="size-5 fill-white text-white" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 whitespace-nowrap text-[8px] font-black tracking-[0.15em] text-white">
                <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-white" aria-hidden="true" />
                AO VIVO AGORA
              </p>
              <p className="mt-1 truncate text-xs font-extrabold text-white">{liveNow.title}</p>
            </div>
            <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[8px] font-black tracking-[0.1em] text-club">
              ENTRAR
            </span>
          </Link>
        )}

        {/* Próximas lives */}
        {upcoming.length > 0 && (
          <section aria-labelledby="lives-heading" className="mt-8">
            <h2
              id="lives-heading"
              className="flex items-center gap-2 text-[10px] font-black tracking-[0.25em] text-muted-foreground"
            >
              <Radio className="size-3.5 text-club" aria-hidden="true" />
              PRÓXIMAS LIVES
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {upcoming.map((l) => (
                <li
                  key={l.id}
                  className="skeu flex items-center justify-between gap-3 rounded-3xl p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold">{l.title}</p>
                    <p className="mt-1 font-numeric text-[10px] font-bold text-zinc-500">
                      {new Date(l.scheduled_at)
                        .toLocaleDateString('pt-BR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                        .toUpperCase()}
                    </p>
                  </div>
                  {l.min_tier && (
                    <span className="shrink-0 rounded-full bg-club/10 px-3 py-1 text-[8px] font-black tracking-[0.15em] text-club">
                      {TIER_LABELS[l.min_tier].toUpperCase()}+
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Ranking */}
        {canRanking && (
        <section aria-labelledby="ranking-heading" className="mt-8">
          <h2
            id="ranking-heading"
            className="flex items-center gap-2 text-[10px] font-black tracking-[0.25em] text-muted-foreground"
          >
            <Trophy className="size-3.5 text-gold" aria-hidden="true" />
            RANKING DE FÃS
          </h2>
          <div className="skeu mt-3 flex flex-col gap-4 rounded-3xl p-5">
            {[
              { pos: 1, name: 'Fernanda M.', xp: 12480 },
              { pos: 2, name: 'Carlos R.', xp: 11020 },
              { pos: 3, name: 'Julia S.', xp: 9870 },
            ].map((fan) => (
              <div key={fan.pos} className="flex items-center gap-3">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full font-numeric text-xs font-bold ${
                    fan.pos === 1
                      ? 'skeu-btn sheen relative text-white'
                      : 'skeu-inset text-muted-foreground'
                  }`}
                >
                  {fan.pos}
                </span>
                <p className="flex-1 text-xs font-extrabold">{fan.name}</p>
                <p className="font-numeric text-[10px] font-bold text-zinc-500">
                  {fan.xp.toLocaleString('pt-BR')} XP
                </p>
              </div>
            ))}
            <p className="border-t border-white/8 pt-4 text-center text-[9px] font-bold tracking-[0.1em] text-zinc-600">
              INTERAJA COM POSTS E LIVES PARA SUBIR NO RANKING
            </p>
          </div>
        </section>
        )}

        {/* Galeria exclusiva */}
        {gallery.length > 0 && (
          <section aria-labelledby="club-gallery-heading" className="mt-8">
            <h2
              id="club-gallery-heading"
              className="text-[10px] font-black tracking-[0.25em] text-muted-foreground"
            >
              GALERIA EXCLUSIVA
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {gallery.map((g) => (
                <div key={g.id} className="relative aspect-square overflow-hidden rounded-2xl">
                  <Image
                    src={g.url || '/placeholder.svg'}
                    alt={g.album ?? 'Foto exclusiva'}
                    fill
                    sizes="(max-width: 768px) 33vw, 150px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Feed do clube */}
        <section aria-labelledby="feed-heading" className="mt-8">
          <h2 id="feed-heading" className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
            FEED DO CLUBE
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
    </ArtistThemeScope>
  )
}
