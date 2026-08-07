import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { Artist } from '@/lib/types'

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.0', '')}K`
  return String(n)
}

export function ArtistCard({ artist, size = 'md' }: { artist: Artist; size?: 'md' | 'lg' }) {
  return (
    <Link
      href={`/artist/${artist.slug}`}
      className={cn(
        'group relative block overflow-hidden rounded-2xl',
        size === 'lg' ? 'aspect-[4/5]' : 'aspect-square',
      )}
    >
      <Image
        src={artist.avatar_url || '/placeholder.svg?height=400&width=400'}
        alt={artist.name}
        fill
        sizes="(max-width: 768px) 50vw, 25vw"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      {artist.is_live && (
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-semibold text-white">
          <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
          AO VIVO
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="font-serif text-lg font-semibold leading-tight text-white text-balance">{artist.name}</p>
        <p className="mt-0.5 text-xs text-white/70">
          {artist.genre} · {formatFollowers(artist.followers_count)} fãs
        </p>
      </div>
    </Link>
  )
}
