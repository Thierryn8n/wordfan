'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { MapPin, Search, Ticket, X } from 'lucide-react'
import type { Artist, Show } from '@/lib/types'

const MONTHS = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
]

export function EventsAgenda({ shows }: { shows: (Show & { artist: Artist })[] }) {
  const [query, setQuery] = useState('')
  const [city, setCity] = useState<string | null>(null)

  const cities = useMemo(() => {
    const set = new Set<string>()
    for (const s of shows) if (s.city) set.add(s.city)
    return Array.from(set).sort()
  }, [shows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return shows.filter((s) => {
      if (city && s.city !== city) return false
      if (!q) return true
      return (
        s.title.toLowerCase().includes(q) ||
        s.artist.name.toLowerCase().includes(q) ||
        (s.venue ?? '').toLowerCase().includes(q) ||
        (s.city ?? '').toLowerCase().includes(q)
      )
    })
  }, [shows, query, city])

  const groups = useMemo(() => {
    const map = new Map<string, (Show & { artist: Artist })[]>()
    for (const s of filtered) {
      const d = new Date(s.starts_at)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const arr = map.get(key) ?? []
      arr.push(s)
      map.set(key, arr)
    }
    return map
  }, [filtered])

  return (
    <>
      <div className="surface elev-1 flex h-12 items-center gap-2.5 rounded-2xl px-4">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por artista, cidade ou local..."
          aria-label="Buscar eventos"
          className="flex-1 bg-transparent text-xs font-bold outline-none placeholder:text-muted-foreground placeholder:font-medium"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Limpar busca"
            className="text-muted-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {cities.length > 1 && (
        <div
          className="scrollbar-none mt-3 flex gap-2 overflow-x-auto"
          role="group"
          aria-label="Filtrar por cidade"
        >
          <button
            type="button"
            onClick={() => setCity(null)}
            aria-pressed={city === null}
            className={
              city === null
                ? 'gradient-brand shrink-0 rounded-full px-4 py-2 text-[10px] font-black tracking-[0.15em] text-white'
                : 'surface elev-1 shrink-0 rounded-full px-4 py-2 text-[10px] font-black tracking-[0.15em] text-muted-foreground'
            }
          >
            TODAS
          </button>
          {cities.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCity(c)}
              aria-pressed={city === c}
              className={
                city === c
                  ? 'gradient-brand shrink-0 rounded-full px-4 py-2 text-[10px] font-black tracking-[0.15em] text-white'
                  : 'surface elev-1 shrink-0 rounded-full px-4 py-2 text-[10px] font-black tracking-[0.15em] text-muted-foreground'
              }
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="surface mt-6 flex flex-col items-center gap-3 rounded-[28px] p-10 text-center">
          <Ticket className="size-7 text-muted-foreground" aria-hidden="true" />
          <p className="text-xs font-bold text-muted-foreground text-pretty">
            Nenhum evento encontrado com esse filtro.
          </p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-8">
          {Array.from(groups.entries()).map(([key, items]) => {
            const [, monthIdx] = key.split('-').map(Number)
            return (
              <div key={key}>
                <div className="flex items-center gap-3">
                  <p className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
                    {MONTHS[monthIdx]}
                  </p>
                  <span className="hairline flex-1" aria-hidden="true" />
                </div>
                <ul className="mt-4 flex flex-col gap-3">
                  {items.map((s) => {
                    const d = new Date(s.starts_at)
                    return (
                      <li key={s.id}>
                        <Link
                          href={`/artist/${s.artist.slug}`}
                          className="surface elev-1 flex items-center gap-4 rounded-[26px] p-4"
                        >
                          <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-white/5">
                            <span className="font-numeric text-2xl font-black leading-none">
                              {d.getDate()}
                            </span>
                            <span className="mt-1 text-[8px] font-black tracking-[0.15em] text-muted-foreground">
                              {d.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-extrabold tracking-[0.05em]">
                              {s.title}
                            </p>
                            <p className="mt-1 text-[11px] font-bold text-brand">
                              {s.artist.name}
                            </p>
                            <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-zinc-500">
                              <MapPin className="size-2.5 shrink-0" aria-hidden="true" />
                              <span className="truncate">
                                {s.venue ? `${s.venue} • ` : ''}
                                {s.city || 'A definir'}
                                {s.state ? `, ${s.state}` : ''}
                              </span>
                            </p>
                          </div>
                          <span className="font-numeric text-[11px] font-bold text-muted-foreground">
                            {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
