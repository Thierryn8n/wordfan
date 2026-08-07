'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import type { AdBanner } from '@/lib/types'
import { trackBannerClick, trackBannerImpressions } from '@/app/actions/banners'

function useImpressions(banners: AdBanner[]) {
  const done = useRef(false)
  useEffect(() => {
    if (done.current || banners.length === 0) return
    done.current = true
    trackBannerImpressions(banners.map((b) => b.id)).catch(() => {})
  }, [banners])
}

function useBannerClick() {
  const router = useRouter()
  return (banner: AdBanner) => {
    trackBannerClick(banner.id).catch(() => {})
    if (banner.cta_url) {
      if (banner.cta_url.startsWith('http')) {
        window.open(banner.cta_url, '_blank', 'noopener,noreferrer')
      } else {
        router.push(banner.cta_url)
      }
    }
  }
}

export function HeroBannerCarousel({ banners }: { banners: AdBanner[] }) {
  const [index, setIndex] = useState(0)
  const onClick = useBannerClick()
  useImpressions(banners)

  useEffect(() => {
    if (banners.length <= 1) return
    const id = setInterval(() => setIndex((i) => (i + 1) % banners.length), 5000)
    return () => clearInterval(id)
  }, [banners.length])

  if (banners.length === 0) return null
  const banner = banners[index]
  const accent = banner.accent_color ?? '#ff6b00'

  return (
    <section aria-label="Anúncios em destaque" className="mt-6">
      <button
        type="button"
        onClick={() => onClick(banner)}
        className="group relative block h-56 w-full overflow-hidden rounded-[32px] border text-left transition-transform active:scale-[0.99]"
        style={{ borderColor: `color-mix(in srgb, ${accent} 40%, transparent)` }}
      >
        {banner.image_url && (
          <Image
            key={banner.id}
            src={banner.image_url || '/placeholder.svg'}
            alt=""
            fill
            sizes="448px"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" aria-hidden="true" />
        <div className="absolute inset-0 flex flex-col justify-end p-6">
          <span
            className="flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-black tracking-[0.2em] text-white"
            style={{ backgroundColor: accent }}
          >
            <Sparkles className="size-3" aria-hidden="true" />
            PATROCINADO
          </span>
          <h2 className="mt-3 max-w-[80%] font-serif text-2xl font-extrabold leading-tight tracking-tight text-white text-balance">
            {banner.title}
          </h2>
          {banner.subtitle && (
            <p className="mt-1 max-w-[85%] text-xs font-bold text-white/80 text-pretty">{banner.subtitle}</p>
          )}
          {banner.cta_label && (
            <span
              className="mt-4 flex w-fit items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-[10px] font-black tracking-[0.15em] text-black"
            >
              {banner.cta_label}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </span>
          )}
        </div>
      </button>

      {banners.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2" role="tablist" aria-label="Selecionar anúncio">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Anúncio ${i + 1}`}
              onClick={() => setIndex(i)}
              className={i === index ? 'h-1.5 w-6 rounded-full bg-brand transition-all' : 'size-1.5 rounded-full bg-white/20 transition-all'}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export function InlineBanner({ banner }: { banner: AdBanner }) {
  const onClick = useBannerClick()
  useImpressions([banner])
  const accent = banner.accent_color ?? '#ff6b00'

  return (
    <button
      type="button"
      onClick={() => onClick(banner)}
      className="group relative flex w-full items-center gap-4 overflow-hidden rounded-3xl border p-4 text-left transition-transform active:scale-[0.99]"
      style={{
        borderColor: `color-mix(in srgb, ${accent} 35%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${accent} 10%, var(--card))`,
      }}
    >
      {banner.image_url && (
        <span className="relative size-16 shrink-0 overflow-hidden rounded-2xl">
          <Image src={banner.image_url || '/placeholder.svg'} alt="" fill sizes="64px" className="object-cover" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="text-[8px] font-black tracking-[0.2em]" style={{ color: accent }}>
          PATROCINADO
        </span>
        <span className="mt-0.5 block truncate font-serif text-sm font-extrabold">{banner.title}</span>
        {banner.subtitle && (
          <span className="mt-0.5 block truncate text-[11px] font-bold text-muted-foreground">{banner.subtitle}</span>
        )}
      </span>
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: accent }}
        aria-hidden="true"
      >
        <ArrowUpRight className="size-4" />
      </span>
    </button>
  )
}

export function FooterBanner({ banner }: { banner: AdBanner }) {
  const onClick = useBannerClick()
  useImpressions([banner])
  const accent = banner.accent_color ?? '#ff6b00'

  return (
    <button
      type="button"
      onClick={() => onClick(banner)}
      className="relative block w-full overflow-hidden rounded-[28px] border p-6 text-center transition-transform active:scale-[0.99]"
      style={{
        borderColor: `color-mix(in srgb, ${accent} 40%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${accent} 14%, var(--card))`,
      }}
    >
      <span className="text-[9px] font-black tracking-[0.25em]" style={{ color: accent }}>
        PATROCINADO
      </span>
      <h3 className="mt-2 font-serif text-xl font-extrabold tracking-tight text-balance">{banner.title}</h3>
      {banner.description && (
        <p className="mx-auto mt-2 max-w-xs text-xs font-medium leading-relaxed text-muted-foreground text-pretty">
          {banner.description}
        </p>
      )}
      {banner.cta_label && (
        <span
          className="mx-auto mt-4 flex w-fit items-center gap-1.5 rounded-full px-6 py-3 text-[10px] font-black tracking-[0.15em] text-white"
          style={{ backgroundColor: accent }}
        >
          {banner.cta_label}
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </span>
      )}
    </button>
  )
}
