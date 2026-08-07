import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, Calendar, MapPin, Sparkles } from 'lucide-react'
import {
  getArtistBySlug,
  getArtistPosts,
  getArtistShows,
  getArtistGallery,
  getUserSubscription,
} from '@/lib/data'
import { PostCard } from '@/components/wordfan/post-card'
import { TierBadge } from '@/components/wordfan/tier-badge'
import { BottomNav } from '@/components/wordfan/bottom-nav'

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.0', '')}K`
  return String(n)
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const artist = await getArtistBySlug(slug)
  if (!artist) notFound()

  const [posts, shows, gallery, subscription] = await Promise.all([
    getArtistPosts(artist.id),
    getArtistShows(artist.id),
    getArtistGallery(artist.id),
    getUserSubscription(artist.id),
  ])

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-28 md:max-w-lg">
      <div className="relative h-64">
        <Image
          src={artist.banner_url || '/placeholder.svg?height=400&width=600'}
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 512px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <Link
          href="/home"
          aria-label="Voltar para a home"
          className="glass absolute left-4 top-5 flex size-10 items-center justify-center rounded-full"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        {artist.is_live && (
          <Link
            href={`/artist/${artist.slug}/live`}
            className="absolute right-4 top-5 inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-white"
          >
            <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
            AO VIVO
          </Link>
        )}
      </div>

      <main className="-mt-10 px-5">
        <div className="relative z-10">
          <h1 className="font-serif text-3xl font-bold text-balance">{artist.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{artist.genre}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              {artist.city}, {artist.state}
            </span>
            <span>{formatFollowers(artist.followers_count)} fãs</span>
          </p>
          {artist.bio && <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">{artist.bio}</p>}

          <div className="mt-5 flex gap-3">
            {subscription ? (
              <Link
                href={`/artist/${artist.slug}/club`}
                className="gradient-brand flex flex-1 items-center justify-center gap-2 rounded-full py-3 font-semibold text-black"
              >
                <Sparkles className="size-4" aria-hidden="true" />
                Entrar no Fan Club
              </Link>
            ) : (
              <Link
                href={`/artist/${artist.slug}/plans`}
                className="gradient-brand flex flex-1 items-center justify-center gap-2 rounded-full py-3 font-semibold text-black"
              >
                <Sparkles className="size-4" aria-hidden="true" />
                Virar fã do clube
              </Link>
            )}
          </div>
          {subscription && (
            <p className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              Você é assinante <TierBadge tier={subscription.plan.tier} />
            </p>
          )}
        </div>

        {shows.length > 0 && (
          <section aria-labelledby="agenda-heading" className="mt-8">
            <h2 id="agenda-heading" className="font-serif text-lg font-semibold">
              Agenda de shows
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {shows.map((s) => {
                const date = new Date(s.starts_at)
                return (
                  <li key={s.id} className="glass flex items-center gap-4 rounded-2xl p-4">
                    <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary text-center">
                      <span className="text-lg font-bold leading-none">{date.getDate()}</span>
                      <span className="text-[10px] uppercase text-muted-foreground">
                        {date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.title}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="size-3" aria-hidden="true" />
                        {s.venue} · {s.city}/{s.state}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {gallery.length > 0 && (
          <section aria-labelledby="gallery-heading" className="mt-8">
            <h2 id="gallery-heading" className="font-serif text-lg font-semibold">
              Galeria
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {gallery.slice(0, 6).map((g) => (
                <div key={g.id} className="relative aspect-square overflow-hidden rounded-xl">
                  <Image
                    src={g.url || "/placeholder.svg"}
                    alt={g.album ?? 'Foto da galeria'}
                    fill
                    sizes="(max-width: 768px) 33vw, 170px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="posts-heading" className="mt-8">
          <h2 id="posts-heading" className="font-serif text-lg font-semibold">
            Publicações
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
