'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Gif = { id: string; preview: string; full: string; title: string }

export function GifPicker({
  onSelect,
  onClose,
  className,
}: {
  onSelect: (url: string) => void
  onClose: () => void
  className?: string
}) {
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState<Gif[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/gifs?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
        const json = await res.json()
        if (!active) return
        if (!res.ok) {
          setError(json.error ?? 'Não foi possível carregar os GIFs')
          setGifs([])
        } else {
          setGifs(json.gifs ?? [])
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError' && active) {
          setError('Erro ao carregar os GIFs')
        }
      } finally {
        if (active) setLoading(false)
      }
    }, 350)

    return () => {
      active = false
      controller.abort()
      clearTimeout(timer)
    }
  }, [query])

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card p-3 shadow-xl',
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar GIFs..."
            className="w-full rounded-full border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Fechar seletor de GIFs"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="h-64 overflow-y-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{error}</p>
        ) : gifs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum GIF encontrado
          </p>
        ) : (
          <div className="columns-2 gap-2 sm:columns-3">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => onSelect(gif.full)}
                className="mb-2 block w-full overflow-hidden rounded-lg transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={gif.preview || '/placeholder.svg'}
                  alt={gif.title}
                  loading="lazy"
                  className="w-full"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="mt-2 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
        Powered by GIPHY
      </p>
    </div>
  )
}
