'use client'

import Link from 'next/link'
import Image from 'next/image'
import { BadgeCheck } from 'lucide-react'
import { resolveTheme } from '@/lib/artist-theme'

export interface PremiumArtist {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  theme: string | null
  followers_count: number
}

interface PremiumArtistsCarouselProps {
  artists: PremiumArtist[]
  /** Segundos para uma volta completa da faixa. Menor = mais rápido. */
  speedSeconds?: number
}

export function PremiumArtistsCarousel({
  artists,
  speedSeconds = 30,
}: PremiumArtistsCarouselProps) {
  const formatFans = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
  }

  if (artists.length === 0) {
    return null
  }

  // Duplicamos a lista para o loop contínuo (marquee) parecer infinito.
  const loop = [...artists, ...artists]

  return (
    <section aria-labelledby="destaque" className="mt-10">
      <div className="flex items-center justify-between">
        <h2 id="destaque" className="text-lg font-extrabold tracking-[0.2em]">
          EM DESTAQUE
        </h2>
        <Link href="/search" className="text-xs font-extrabold tracking-[0.1em] text-brand">
          VER TODOS
        </Link>
      </div>

      <div className="marquee relative mt-5 overflow-hidden rounded-[32px] py-1">
        {/* Máscara suave nas laterais para reforçar a sensação de infinito */}
        <div
          className="marquee-track flex w-max gap-4"
          style={{ animationDuration: `${speedSeconds}s` }}
        >
          {loop.map((a, i) => {
            const t = resolveTheme(a.theme)
            return (
              <Link
                key={`${a.id}-${i}`}
                href={`/artist/${a.slug}`}
                aria-hidden={i >= artists.length ? true : undefined}
                tabIndex={i >= artists.length ? -1 : undefined}
                className="elev-2 relative w-[290px] shrink-0 overflow-hidden rounded-[32px] border transition-transform duration-300 hover:scale-105"
                style={{ borderColor: `color-mix(in srgb, ${t.primary} 40%, transparent)` }}
              >
                <Image
                  src={a.avatar_url || '/placeholder.svg?height=380&width=290'}
                  alt={a.name}
                  width={290}
                  height={380}
                  className="h-[380px] w-full object-cover"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent"
                  aria-hidden="true"
                />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <p className="flex items-center gap-2 font-serif text-2xl font-extrabold tracking-tight">
                    {a.name.toUpperCase()}
                    <BadgeCheck className="size-5" style={{ color: t.primary }} aria-hidden="true" />
                  </p>
                  <p
                    className="mt-1 text-xs font-extrabold tracking-[0.2em]"
                    style={{ color: t.primary }}
                  >
                    {formatFans(a.followers_count)} FÃS
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <style jsx>{`
        .marquee-track {
          animation-name: marquee-scroll;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform;
        }
        /* Metade da faixa é uma cópia; deslocar -50% cria o loop perfeito */
        @keyframes marquee-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        /* Pausa ao passar o mouse para o usuário conseguir clicar */
        .marquee:hover .marquee-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track {
            animation: none;
          }
        }
      `}</style>
    </section>
  )
}
