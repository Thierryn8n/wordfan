'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, MapPin, ChevronRight } from 'lucide-react'
import type { Artist } from '@/lib/types'
import { cn } from '@/lib/utils'

export function SearchClient({ artists }: { artists: Artist[] }) {
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState<string | null>(null)

  const genres = useMemo(
    () => Array.from(new Set(artists.map((a) => a.genre).filter(Boolean))) as string[],
    [artists],
  )

  const states = useMemo(
    () => Array.from(new Set(artists.map((a) => a.state).filter(Boolean))) as string[],
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
    <main className="px-4 pt-16">
      <h1 className="ios-large-title">Explorar</h1>

      {/* Campo de busca iOS */}
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-[color:var(--ios-fill-2)] px-3 py-2.5">
        <Search className="size-[18px] shrink-0 text-[color:var(--label-secondary)]" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Artistas, cidades, eventos"
          className="w-full bg-transparent text-[17px] outline-none placeholder:text-[color:var(--label-secondary)]"
          aria-label="Pesquisar artistas"
        />
      </div>

      {/* Categorias */}
      <section aria-labelledby="cats-heading" className="mt-7">
        <h2 id="cats-heading" className="px-1 text-[13px] font-normal uppercase text-[color:var(--label-secondary)]">
          Categorias
        </h2>
        <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label="Filtrar por gênero">
          <button
            type="button"
            onClick={() => setGenre(null)}
            className={cn(
              'rounded-full px-4 py-1.5 text-[15px] transition-colors',
              genre === null
                ? 'bg-primary font-semibold text-primary-foreground'
                : 'bg-[color:var(--ios-fill-2)] font-medium text-foreground',
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
                'rounded-full px-4 py-1.5 text-[15px] transition-colors',
                genre === g
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : 'bg-[color:var(--ios-fill-2)] font-medium text-foreground',
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </section>

      {/* Estados */}
      {states.length > 0 && (
        <section aria-labelledby="states-heading" className="mt-6">
          <h2 id="states-heading" className="px-1 text-[13px] font-normal uppercase text-[color:var(--label-secondary)]">
            Estados
          </h2>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {states.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setQuery(s === query ? '' : s)}
                className="flex items-center gap-1.5 rounded-full bg-[color:var(--ios-fill-2)] px-4 py-1.5 text-[15px] font-medium text-foreground"
              >
                <MapPin className="size-3.5" aria-hidden="true" />
                {s}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Resultados */}
      <section aria-labelledby="results-heading" className="mt-7">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 id="results-heading" className="text-[13px] font-normal uppercase text-[color:var(--label-secondary)]">
            Resultados
          </h2>
          <span className="text-[13px] text-[color:var(--label-secondary)]">
            {filtered.length} {filtered.length === 1 ? 'artista' : 'artistas'}
          </span>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-12 text-center text-[15px] text-[color:var(--label-secondary)]">
            Nenhum artista encontrado.
          </p>
        ) : (
          <ul className="ios-list">
            {filtered.map((a) => (
              <li key={a.id}>
                <Link href={`/artist/${a.slug}`} className="ios-row ios-row-inset active:bg-[color:var(--ios-fill-2)]">
                  <Image
                    src={a.avatar_url || '/placeholder.svg?height=48&width=48'}
                    alt=""
                    width={48}
                    height={48}
                    className="size-12 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[17px] font-semibold">{a.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-[color:var(--label-secondary)]">
                      {a.genre}
                      <span aria-hidden="true">·</span>
                      <MapPin className="size-3 shrink-0" aria-hidden="true" />
                      {a.city}, {a.state}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-[color:var(--label-tertiary)]" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
