import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import type { Ad } from '@/lib/types'

function AdWrapper({
  ad,
  className,
  style,
  children,
}: {
  ad: Ad
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  if (ad.cta_url) {
    const external = /^https?:\/\//.test(ad.cta_url)
    return (
      <Link
        href={ad.cta_url}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={className}
        style={style}
      >
        {children}
      </Link>
    )
  }
  return (
    <div className={className} style={style}>
      {children}
    </div>
  )
}

export function AdBanner({ ad, variant = 'inline' }: { ad: Ad; variant?: 'hero' | 'inline' }) {
  const accent = ad.accent_color || undefined
  const label = (
    <span className="absolute right-3 top-3 z-10 rounded-full bg-black/60 px-2 py-0.5 text-[7px] font-black tracking-[0.2em] text-white/70 backdrop-blur-sm">
      PATROCINADO
    </span>
  )

  if (variant === 'hero') {
    return (
      <AdWrapper
        ad={ad}
        className="elev-2 group relative block overflow-hidden rounded-[32px] border"
        style={{
          borderColor: accent
            ? `color-mix(in srgb, ${accent} 45%, transparent)`
            : 'rgba(255,255,255,0.1)',
        }}
      >
        {label}
        <div className="relative aspect-[16/9]">
          <Image
            src={ad.image_url || '/placeholder.svg?height=240&width=420'}
            alt={ad.title}
            fill
            sizes="(max-width: 448px) 100vw, 420px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" aria-hidden="true" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-6">
          <h3 className="font-serif text-2xl font-extrabold leading-tight tracking-tight text-balance">
            {ad.title}
          </h3>
          {(ad.subtitle || ad.description) && (
            <p className="mt-1.5 line-clamp-2 text-sm font-medium text-white/75 text-pretty">
              {ad.subtitle || ad.description}
            </p>
          )}
          {ad.cta_label && (
            <span
              className="mt-4 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[11px] font-black tracking-[0.15em] text-black"
              style={{ backgroundColor: accent ?? '#ffffff' }}
            >
              {ad.cta_label}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </span>
          )}
        </div>
      </AdWrapper>
    )
  }

  return (
    <AdWrapper
      ad={ad}
      className="surface elev-1 group relative flex items-center gap-4 overflow-hidden rounded-[26px] p-3"
    >
      {label}
      <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl">
        <Image
          src={ad.image_url || '/placeholder.svg?height=80&width=80'}
          alt={ad.title}
          fill
          sizes="80px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1 pr-2">
        <h3 className="line-clamp-1 text-sm font-extrabold tracking-[0.05em]">{ad.title}</h3>
        {(ad.subtitle || ad.description) && (
          <p className="mt-1 line-clamp-2 text-[11px] font-medium text-muted-foreground text-pretty">
            {ad.subtitle || ad.description}
          </p>
        )}
        {ad.cta_label && (
          <span
            className="mt-2 inline-flex items-center gap-1 text-[10px] font-black tracking-[0.15em]"
            style={{ color: accent ?? 'var(--brand)' }}
          >
            {ad.cta_label}
            <ArrowUpRight className="size-3" aria-hidden="true" />
          </span>
        )}
      </div>
    </AdWrapper>
  )
}
