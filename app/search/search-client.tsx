'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, MapPin, ChevronRight, X, BadgeCheck, Flame } from 'lucide-react'
import type { Artist } from '@/lib/types'
import { resolveTheme } from '@/lib/artist-theme'
import { cn } from '@/lib/utils'

function formatFans(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function SearchClient({
  artists,
  initialGenre = null,
  initialQuery = '',
}: {
  artists: Artist[]
  initialGenre?: string | null
  initialQuery?: string
}) {
  const [query, setQuery] = useState(initialQuery)
  const [genre, setGenre] = useState<string | null>(initialGenre)

  const genres = useMemo(
    () => Array.from(new Set(artists.map((a) => a.genre).filter(Boolean))) as string[],
    [artists],
  )

  const states = useMemo(
    () => Array.from(new Set(artists.map((a) => a.state).filter(Boolean))) as string[],
    [artists],
  )

  // Normaliza comparação de gênero (a home envia em caixa alta)
  const matchGenre = (a: Artist) =>
    !genre || (a.genre ?? '').toLowerCase() === genre.toLowerCase()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return artists.filter((a) => {
      const matchesQuery =
        !q ||
        a.name.toLowerCase().includes(q) ||
        (a.genre ?? '').toLowerCase().includes(q) ||
        (a.city ?? '').toLowerCase().includes(q)
      return matchesQuery && matchGenre(a)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artists, query, genre])

  const featured = useMemo(() => artists.filter((a) => a.is_featured).slice(0, 6), [artists])
  const hasFilter = Boolean(query.trim() || genre)

  return (
    <main className="px-6 pt-9">
      <p className="text-[10px] font-black tracking-[0.3em] text-primary">EXPLORAR</p>
      <h1 className="mt-1 font-serif text-3xl font-black tracking-tight">
        DESCUBRA SEU <span className="text-gradient-brand">ARTISTA</span>
      </h1>
      <p className="mt-2 text-xs font-medium text-muted-foreground">
        {artists.length} artistas em {states.length} estados esperando por você.
      </p>

      {/* Barra de busca */}
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/8 bg-card px-4 py-4">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Artista, cidade, evento ou música..."
          className="w-full bg-transparent text-xs font-bold outline-none placeholder:text-zinc-600"
          aria-label="Pesquisar artistas"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca">
            <X className="size-4 text-muted-foreground" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Sugestões em destaque (só quando não há filtro) */}
      {!hasFilter && featured.length > 0 && (
        <section aria-labelledby="feat-heading" className="mt-8">
          <h2 id="feat-heading" className="flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-muted-foreground">
            <Flame className="size-3.5 text-primary" aria-hidden="true" />
            EM ALTA
          </h2>
          <div className="scrollbar-none -mx-6 mt-3 flex gap-3 overflow-x-auto px-6">
            {featured.map((a) => {
              const t = resolveTheme(a.theme)
              return (
                <Link
                  key={a.id}
                  href={`/artist/${a.slug}`}
                  className="relative h-40 w-32 shrink-0 overflow-hidden rounded-3xl border"
                  style={{ borderColor: `color-mix(in srgb, ${t.primary} 45%, transparent)` }}
                >
                  <Image
                    src={a.avatar_url || '/placeholder.svg?height=160&width=128'}
                    alt={a.name}
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" aria-hidden="true" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="truncate text-xs font-extrabold text-white">{a.name}</p>
                    <p className="text-[9px] font-bold" style={{ color: t.primary }}>
                      {formatFans(a.followers_count)} FÃS
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Categorias */}
      <section aria-labelledby="cats-heading" className="mt-8">
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
              onClick={() => setGenre(g.toLowerCase() === (genre ?? '').toLowerCase() ? null : g)}
              className={cn(
                'rounded-full px-4 py-2 text-[9px] font-black tracking-[0.15em] uppercase transition-colors',
                (genre ?? '').toLowerCase() === g.toLowerCase()
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
            {hasFilter ? 'RESULTADOS' : 'TODOS OS ARTISTAS'}
          </h2>
          <span className="font-numeric text-[10px] font-bold text-zinc-600">
            {filtered.length} {filtered.length === 1 ? 'ARTISTA' : 'ARTISTAS'}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl border border-white/8 bg-card">
              <Search className="size-6 text-muted-foreground" aria-hidden="true" />
            </span>
            <p className="text-xs font-bold text-muted-foreground">Nenhum artista encontrado.</p>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setGenre(null)
              }}
              className="rounded-full border border-white/8 bg-card px-5 py-2.5 text-[9px] font-black tracking-[0.15em] text-primary"
            >
              LIMPAR FILTROS
            </button>
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {filtered.map((a) => {
              const t = resolveTheme(a.theme)
              return (
                <li key={a.id}>
                  <Link
                    href={`/artist/${a.slug}`}
                    className="flex items-center gap-4 rounded-3xl border border-white/8 bg-card p-3"
                  >
                    <span className="relative shrink-0">
                      <Image
                        src={a.avatar_url || '/placeholder.svg?height=56&width=56'}
                        alt=""
                        width={56}
                        height={56}
                        className="size-14 rounded-2xl object-cover"
                      />
                      {a.is_live && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-red-600 px-2 py-0.5 text-[7px] font-black tracking-[0.1em] text-white">
                          LIVE
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate font-serif text-sm font-extrabold">
                        {a.name}
                        {a.is_featured && (
                          <BadgeCheck className="size-3.5 shrink-0" style={{ color: t.primary }} aria-hidden="true" />
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-[9px] font-black tracking-[0.15em] uppercase" style={{ color: t.primary }}>
                        {a.genre}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[9px] font-bold text-zinc-500">
                        <MapPin className="size-2.5 shrink-0" aria-hidden="true" />
                        {a.city}, {a.state} • {formatFans(a.followers_count)} fãs
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-zinc-600" aria-hidden="true" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
