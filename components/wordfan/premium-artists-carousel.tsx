'use client'

import { useEffect, useRef, useState } from 'react'
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
  autoScrollInterval?: number
}

export function PremiumArtistsCarousel({
  artists,
  autoScrollInterval = 5000,
}: PremiumArtistsCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const autoScrollTimerRef = useRef<NodeJS.Timeout | null>(null)

  const formatFans = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
  }

  const scrollToIndex = (index: number) => {
    if (scrollContainerRef.current && artists.length > 0) {
      const container = scrollContainerRef.current
      const cardWidth = 290 + 16 // card width + gap
      const scrollPosition = index * cardWidth
      
      container.scrollTo({
        left: scrollPosition,
        behavior: 'smooth',
      })
      setCurrentIndex(index)
    }
  }

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % artists.length
    scrollToIndex(nextIndex)
    resetAutoScroll()
  }

  const handlePrev = () => {
    const prevIndex = currentIndex === 0 ? artists.length - 1 : currentIndex - 1
    scrollToIndex(prevIndex)
    resetAutoScroll()
  }

  const resetAutoScroll = () => {
    if (autoScrollTimerRef.current) {
      clearTimeout(autoScrollTimerRef.current)
    }
    
    autoScrollTimerRef.current = setTimeout(() => {
      handleNext()
    }, autoScrollInterval)
  }

  useEffect(() => {
    if (artists.length === 0) return

    scrollToIndex(0)
    
    autoScrollTimerRef.current = setTimeout(() => {
      handleNext()
    }, autoScrollInterval)

    return () => {
      if (autoScrollTimerRef.current) {
        clearTimeout(autoScrollTimerRef.current)
      }
    }
  }, [artists.length])

  if (artists.length === 0) {
    return null
  }

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

      <div className="relative mt-5">
        {/* Carousel Container */}
        <div
          ref={scrollContainerRef}
          className="scrollbar-none flex gap-4 overflow-x-auto scroll-smooth rounded-[32px] px-1 py-1"
          style={{ scrollBehavior: 'smooth', scrollPaddingLeft: '4px' }}
        >
          {artists.map((a) => {
            const t = resolveTheme(a.theme)
            return (
              <Link
                key={a.id}
                href={`/artist/${a.slug}`}
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

        {/* Navigation Buttons */}
        {artists.length > 1 && (
          <div className="mt-5 flex items-center justify-between px-4">
            <button
              onClick={handlePrev}
              aria-label="Artista anterior"
              className="surface elev-1 flex size-10 items-center justify-center rounded-full transition-colors hover:bg-white/10"
            >
              <svg
                className="size-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Dots Indicator */}
            <div className="flex gap-2">
              {artists.map((_, index) => (
                <button
                  key={index}
                  onClick={() => scrollToIndex(index)}
                  aria-label={`Ir para artista ${index + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? 'w-8 bg-brand'
                      : 'w-2 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              aria-label="Próximo artista"
              className="surface elev-1 flex size-10 items-center justify-center rounded-full transition-colors hover:bg-white/10"
            >
              <svg
                className="size-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
