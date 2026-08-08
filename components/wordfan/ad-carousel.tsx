import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, Megaphone } from 'lucide-react'
import type { Ad } from '@/lib/types'

function AdShell({ ad, children }: { ad: Ad; children: React.ReactNode }) {
  const className =
    'group relative block w-[300px] shrink-0 snap-start overflow-hidden rounded-[28px] skeu-raised'
  return ad.cta_url ? (
    <Link href={ad.cta_url} className={className}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  )
}

export function AdCarousel({ ads }: { ads: Ad[] }) {
  if (ads.length === 0) return null

  return (
    <section aria-labelledby="ads-heading" className="mt-10">
      <div className="flex items-center justify-between">
        <h2
          id="ads-heading"
          className="flex items-center gap-2 text-lg font-extrabold tracking-[0.2em]"
        >
          <Megaphone className="size-4 text-brand" aria-hidden="true" />
          PATROCINADO
        </h2>
      </div>

      <div className="scrollbar-none -mx-6 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6">
        {ads.map((ad) => (
          <AdShell key={ad.id} ad={ad}>
            <div className="relative h-40 w-full">
              <Image
                src={ad.image_url || '/placeholder.svg?height=160&width=300'}
                alt={ad.title}
                width={300}
                height={160}
                className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"
                aria-hidden="true"
              />
              <span className="glass-soft absolute left-3 top-3 rounded-full px-2.5 py-1 text-[8px] font-black tracking-[0.2em] text-white">
                ADS
              </span>
            </div>
            <div className="glass-panel sheen relative -mt-8 mx-3 mb-3 rounded-[22px] px-4 py-3.5">
              <p className="truncate font-serif text-base font-extrabold">{ad.title}</p>
              {ad.subtitle && (
                <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                  {ad.subtitle}
                </p>
              )}
              {ad.cta_label && (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1.5 text-[9px] font-black tracking-[0.15em] text-brand">
                  {ad.cta_label.toUpperCase()}
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                </span>
              )}
            </div>
          </AdShell>
        ))}
      </div>
    </section>
  )
}
