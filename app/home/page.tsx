import Link from 'next/link'
import Image from 'next/image'
import { getArtists, getCurrentUser } from '@/lib/data'
import { Logo } from '@/components/wordfan/logo'
import { ArtistCard } from '@/components/wordfan/artist-card'
import { BottomNav } from '@/components/wordfan/bottom-nav'
import { Search } from 'lucide-react'

export default async function HomePage() {
  const [artists, user] = await Promise.all([getArtists(), getCurrentUser()])
  const featured = artists.filter((a) => a.is_featured)
  const liveNow = artists.filter((a) => a.is_live)
  const others = artists.filter((a) => !a.is_featured)

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-28 md:max-w-lg">
      <header className="flex items-center justify-between px-5 pt-6">
        <Logo className="text-2xl" />
        <Link
          href="/search"
          aria-label="Pesquisar artistas"
          className="glass flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
        >
          <Search className="size-5" aria-hidden="true" />
        </Link>
      </header>

      <main className="px-5">
        <p className="mt-6 text-sm text-muted-foreground">
          {user ? 'Bem-vindo de volta' : 'Descubra fan clubs'}
        </p>
        <h1 className="mt-1 font-serif text-2xl font-bold text-balance">
          Seus artistas, mais perto do que nunca
        </h1>

        {liveNow.length > 0 && (
          <section aria-labelledby="live-heading" className="mt-6">
            <h2 id="live-heading" className="sr-only">
              Ao vivo agora
            </h2>
            {liveNow.map((a) => (
              <Link
                key={a.id}
                href={`/artist/${a.slug}/live`}
                className="glass relative flex items-center gap-4 overflow-hidden rounded-2xl p-4"
              >
                <Image
                  src={a.avatar_url || '/placeholder.svg?height=56&width=56'}
                  alt=""
                  width={56}
                  height={56}
                  className="size-14 rounded-full object-cover ring-2 ring-destructive"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-xs font-semibold text-destructive">
                    <span className="size-1.5 animate-pulse rounded-full bg-destructive" aria-hidden="true" />
                    AO VIVO AGORA
                  </p>
                  <p className="mt-0.5 truncate font-medium">{a.name}</p>
                </div>
                <span className="gradient-brand rounded-full px-4 py-1.5 text-xs font-semibold text-black">
                  Assistir
                </span>
              </Link>
            ))}
          </section>
        )}

        <section aria-labelledby="featured-heading" className="mt-8">
          <h2 id="featured-heading" className="font-serif text-lg font-semibold">
            Em destaque
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {featured.map((a, i) => (
              <ArtistCard key={a.id} artist={a} size={i === 0 ? 'lg' : 'md'} />
            ))}
          </div>
        </section>

        <section aria-labelledby="all-heading" className="mt-8">
          <h2 id="all-heading" className="font-serif text-lg font-semibold">
            Todos os artistas
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {others.map((a) => (
              <ArtistCard key={a.id} artist={a} />
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
