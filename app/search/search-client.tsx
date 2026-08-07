'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { ArtistCard } from '@/components/wordfan/artist-card'
import type { Artist } from '@/lib/types'
import { cn } from '@/lib/utils'

export function SearchClient({ artists }: { artists: Artist[] }) {
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState<string | null>(null)

  const genres = useMemo(
    () => Array.from(new Set(artists.map((a) => a.genre).filter(Boolean))) as string[],
    [artists],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return artists.filter((a) => {
      const matchesQuery =
        !q ||
        a.name.toLowerCase().includes(q) ||
        (a.genre ?? '').toLowerCase().includes(q) ||
        (a.city ?? '').toLowerCase().includes(q)
      const matchesGenre = !genre || a.genre === genre
      return matchesQuery && matchesGenre
    })
  }, [artists, query, genre])

  return (
    <main className="px-5 pt-6">
      <h1 className="font-serif text-2xl font-bold">Pesquisar</h1>

      <div className="glass mt-4 flex items-center gap-3 rounded-2xl px-4 py-3">
        <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Artista, gênero ou cidade..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Pesquisar artistas"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por gênero">
        <button
          type="button"
          onClick={() => setGenre(null)}
          className={cn(
            'rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
            genre === null ? 'gradient-brand text-black' : 'glass text-muted-foreground hover:text-foreground',
          )}
        >
          Todos
        </button>
        {genres.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGenre(g === genre ? null : g)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
              genre === g ? 'gradient-brand text-black' : 'glass text-muted-foreground hover:text-foreground',
            )}
          >
            {g}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-12 text-center text-sm text-muted-foreground">Nenhum artista encontrado.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {filtered.map((a) => (
            <ArtistCard key={a.id} artist={a} />
          ))}
        </div>
      )}
    </main>
  )
}
