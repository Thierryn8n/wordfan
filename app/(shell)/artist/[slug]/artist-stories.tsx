'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react'
import type { Artist, Story } from '@/lib/types'

const DEFAULT_IMAGE_DURATION = 5000

// Um story é vídeo quando marcado no banco OU quando a URL termina em extensão de vídeo.
function isVideoStory(s: Story): boolean {
  if (s.media_type === 'video') return true
  const u = (s.media_url || '').toLowerCase()
  return u.endsWith('.mp4') || u.endsWith('.webm') || u.endsWith('.mov')
}

// Duração (ms) usada para o auto-advance de cada story.
function storyDuration(s: Story): number {
  if (isVideoStory(s) && s.duration_ms && s.duration_ms > 0) return s.duration_ms
  return DEFAULT_IMAGE_DURATION
}

export function ArtistStories({ artist, stories }: { artist: Artist; stories: Story[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const startRef = useRef<number>(0)
  const elapsedRef = useRef<number>(0)
  const rafRef = useRef<number>(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const close = useCallback(() => {
    setOpenIndex(null)
    setProgress(0)
  }, [])

  const goNext = useCallback(() => {
    setOpenIndex((i) => {
      if (i === null) return i
      if (i >= stories.length - 1) return null
      return i + 1
    })
    setProgress(0)
    elapsedRef.current = 0
  }, [stories.length])

  const goPrev = useCallback(() => {
    setOpenIndex((i) => (i === null || i === 0 ? i : i - 1))
    setProgress(0)
    elapsedRef.current = 0
  }, [])

  // Auto-advance timer — respeita a duração de cada story (vídeo usa duration_ms).
  useEffect(() => {
    if (openIndex === null) return
    const duration = storyDuration(stories[openIndex])
    elapsedRef.current = 0
    startRef.current = performance.now()

    function tick(now: number) {
      if (paused) {
        startRef.current = now - elapsedRef.current
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      elapsedRef.current = now - startRef.current
      const pct = Math.min(1, elapsedRef.current / duration)
      setProgress(pct)
      if (pct >= 1) {
        goNext()
      } else {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [openIndex, goNext, paused, stories])

  // Controla o elemento de vídeo ao abrir/pausar.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (paused) { v.pause(); return }
    v.currentTime = 0
    v.play().catch(() => {})
  }, [openIndex, paused])

  // Keyboard controls + scroll lock
  useEffect(() => {
    if (openIndex === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === ' ') { e.preventDefault(); setPaused((p) => !p) }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [openIndex, close, goNext, goPrev])

  if (stories.length === 0) return null

  const active = openIndex !== null ? stories[openIndex] : null
  const activeIsVideo = active ? isVideoStory(active) : false

  return (
    <>
      {/* Barra de stories */}
      <div className="scrollbar-none flex gap-4 overflow-x-auto px-6 py-5">
        {stories.map((s, i) => {
          const video = isVideoStory(s)
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setOpenIndex(i)
                setProgress(0)
                setPaused(false)
              }}
              className="flex shrink-0 flex-col items-center gap-2"
              aria-label={`Ver story ${i + 1} de ${artist.name}`}
            >
              <span className="gradient-club rounded-full p-[3px]">
                <span className="relative block overflow-hidden rounded-full border-2 border-background">
                  {video ? (
                    <span className="flex size-16 items-center justify-center rounded-full bg-black">
                      <video
                        src={s.media_url}
                        muted
                        playsInline
                        preload="metadata"
                        className="size-16 rounded-full object-cover"
                      />
                      <Play className="absolute size-5 fill-white text-white drop-shadow" aria-hidden="true" />
                    </span>
                  ) : (
                    <Image
                      src={s.media_url || '/placeholder.svg'}
                      alt=""
                      width={68}
                      height={68}
                      className="size-16 rounded-full object-cover"
                    />
                  )}
                </span>
              </span>
              <span className="max-w-[68px] truncate text-[9px] font-bold text-muted-foreground">
                {s.caption || artist.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* Visualizador em tela cheia */}
      {active && openIndex !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black"
          role="dialog"
          aria-modal="true"
          aria-label={`Story de ${artist.name}`}
        >
          <div className="relative mx-auto flex h-dvh w-full max-w-md flex-col">
            {/* Barras de progresso */}
            <div className="absolute inset-x-0 top-0 z-10 flex gap-1 px-3 pt-3">
              {stories.map((s, i) => (
                <span key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                  <span
                    className="block h-full rounded-full bg-white"
                    style={{
                      width: i < openIndex ? '100%' : i === openIndex ? `${progress * 100}%` : '0%',
                    }}
                  />
                </span>
              ))}
            </div>

            {/* Cabeçalho */}
            <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 px-4 pt-6">
              <Image
                src={artist.avatar_url || '/placeholder.svg'}
                alt=""
                width={36}
                height={36}
                className="size-9 rounded-full border border-white/40 object-cover"
              />
              <p className="flex-1 text-sm font-extrabold tracking-[0.1em] text-white">
                {artist.name.toUpperCase()}
              </p>
              <button
                type="button"
                onClick={close}
                aria-label="Fechar stories"
                className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            {/* Mídia */}
            <div className="relative flex-1">
              {activeIsVideo ? (
                <video
                  ref={videoRef}
                  key={active.id}
                  src={active.media_url}
                  className="absolute inset-0 size-full object-contain"
                  autoPlay
                  playsInline
                  onEnded={goNext}
                />
              ) : (
                <Image
                  src={active.media_url || '/placeholder.svg'}
                  alt={active.caption ?? 'Story'}
                  fill
                  sizes="(max-width: 768px) 100vw, 448px"
                  className="object-contain"
                  priority
                />
              )}
              {active.caption && (
                <p className="absolute inset-x-0 bottom-16 px-8 text-center text-base font-bold leading-relaxed text-white text-pretty drop-shadow-lg">
                  {active.caption}
                </p>
              )}
            </div>

            {/* Zonas de toque */}
            <button
              type="button"
              onClick={goPrev}
              aria-label="Story anterior"
              className="absolute inset-y-0 left-0 flex w-1/3 items-center justify-start pl-2 text-white/0 focus:text-white/80"
            >
              <ChevronLeft className="size-6" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Próximo story"
              className="absolute inset-y-0 right-0 flex w-1/3 items-center justify-end pr-2 text-white/0 focus:text-white/80"
            >
              <ChevronRight className="size-6" aria-hidden="true" />
            </button>

            {/* Pausar / retomar (centro) */}
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? 'Retomar' : 'Pausar'}
              className="absolute inset-x-1/3 inset-y-0"
            />
          </div>
        </div>
      )}
    </>
  )
}
