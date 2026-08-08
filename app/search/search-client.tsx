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
    <main className="px-6 pt-10">
      <p className="text-[10px] font-black tracking-[0.3em] text-brand">EXPLORAR</p>
      <h1 className="mt-1 font-serif text-4xl font-black tracking-tight">
        <span className="text-gradient-brand">DESCOBRIR</span>
      </h1>
      <p className="mt-2 text-sm font-medium text-muted-foreground text-pretty">
        Encontre novos artistas por gênero, cidade ou nome.
      </p>

      <div className="surface elev-1 mt-5 flex items-center gap-3 rounded-2xl px-4 py-3.5">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Artista, cidade, evento ou música..."
          className="w-full bg-transparent text-xs font-bold outline-none placeholder:text-zinc-600"
          aria-label="Pesquisar artistas"
        />
      </div>

      {/* Categorias */}
      <section aria-labelledby="cats-heading" className="mt-7">
        <h2 id="cats-heading" className="text-[10px] font-black tracking-[0.2em] text-muted-foreground">
          CATEGORIAS
        </h2>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar por gênero">
          <button
            type="button"
            onClick={() => setGenre(null)}
            className={cn(
              'rounded-full px-4 py-2 text-[9px] font-black tracking-[0.15em] transition-colors',
              genre === null
                ? 'gradient-brand text-white'
                : 'border border-white/8 bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            TODOS
          </button>
          {genres.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenre(g === genre ? null : g)}
              className={cn(
                'rounded-full px-4 py-2 text-[9px] font-black tracking-[0.15em] uppercase transition-colors',
                genre === g
                  ? 'gradient-brand text-white'
                  : 'border border-white/8 bg-card text-muted-foreground hover:text-foreground',
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
          <h2 id="states-heading" className="text-[10px] font-black tracking-[0.2em] text-muted-foreground">
            ESTADOS
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {states.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setQuery(s === query ? '' : s)}
                className="flex items-center gap-1 rounded-full border border-white/8 bg-card px-4 py-2 text-[9px] font-black tracking-[0.15em] text-muted-foreground hover:text-foreground"
              >
                <MapPin className="size-3" aria-hidden="true" />
                {s}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Resultados */}
      <section aria-labelledby="results-heading" className="mt-8">
        <div className="flex items-center justify-between">
          <h2 id="results-heading" className="text-[10px] font-black tracking-[0.2em] text-muted-foreground">
            RESULTADOS
          </h2>
          <span className="font-numeric text-[10px] font-bold text-zinc-600">
            {filtered.length} {filtered.length === 1 ? 'ARTISTA' : 'ARTISTAS'}
          </span>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-12 text-center text-xs font-bold text-muted-foreground">
            Nenhum artista encontrado.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {filtered.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/artist/${a.slug}`}
                  className="surface elev-1 flex items-center gap-4 rounded-3xl p-3"
                >
                  <Image
                    src={a.avatar_url || '/placeholder.svg?height=56&width=56'}
                    alt=""
                    width={56}
                    height={56}
                    className="size-14 rounded-2xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-sm font-extrabold">{a.name}</p>
                    <p className="mt-0.5 truncate text-[9px] font-black tracking-[0.15em] text-primary uppercase">
                      {a.genre}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[9px] font-bold text-zinc-500">
                      <MapPin className="size-2.5 shrink-0" aria-hidden="true" />
                      {a.city}, {a.state}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-zinc-600" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
