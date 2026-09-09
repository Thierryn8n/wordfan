'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Play, Pause, SkipForward, SkipBack, Lock, Radio,
  Rocket, ChevronUp, X, Music, ListMusic, Crown,
} from 'lucide-react'
import type { Song, Tier } from '@/lib/types'
import { TIER_LABELS, TIER_ORDER } from '@/lib/types'

function tierRank(tier: Tier | null | undefined) {
  if (!tier) return 0
  return TIER_ORDER.indexOf(tier) + 1
}

function fmt(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Número de faixas públicas liberadas para quem não assina. */
const FREE_LIMIT = 2

export function ArtistFloatingPlayer({
  artistName,
  artistSlug,
  artistAvatar,
  songs,
  live,
  userTierRank,
  canManage,
  isLoggedIn,
}: {
  artistName: string
  artistSlug: string
  artistAvatar: string
  songs: Song[]
  live: { title: string } | null
  /** 0 = sem assinatura; 1..4 = bronze..platinum. */
  userTierRank: number
  /** Dono / manager / admin — ouve tudo. */
  canManage: boolean
  isLoggedIn: boolean
}) {
  // Estado do player
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [expanded, setExpanded] = useState(false)

  // Regras de acesso de cada faixa (memoizado).
  const lockInfo = useMemo(() => {
    const map = new Map<string, { locked: boolean; reason: 'tier' | 'free-limit' | null; needTier: Tier | null }>()
    // Conta as faixas públicas para liberar apenas as FREE_LIMIT primeiras a quem não assina.
    let publicSeen = 0
    songs.forEach((s) => {
      if (canManage) {
        map.set(s.id, { locked: false, reason: null, needTier: null })
        return
      }
      if (s.is_exclusive) {
        // Exclusiva / lançamento: exige tier mínimo (ou qualquer assinatura se min_tier nulo).
        const need = s.min_tier ? tierRank(s.min_tier) : 1
        const locked = userTierRank < need
        map.set(s.id, { locked, reason: locked ? 'tier' : null, needTier: s.min_tier })
        return
      }
      // Pública: assinante ouve tudo; grátis só as 2 primeiras públicas.
      const order = publicSeen
      publicSeen += 1
      if (userTierRank > 0) {
        map.set(s.id, { locked: false, reason: null, needTier: null })
        return
      }
      const locked = order >= FREE_LIMIT
      map.set(s.id, { locked, reason: locked ? 'free-limit' : null, needTier: null })
    })
    return map
  }, [songs, userTierRank, canManage])

  const newRelease = useMemo(() => songs.find((s) => s.is_new_release) ?? null, [songs])
  const current = useMemo(() => songs.find((s) => s.id === currentId) ?? null, [songs, currentId])
  const currentIndex = current ? songs.findIndex((s) => s.id === current.id) : -1

  // Sincroniza <audio> com estado.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !current) return
    if (playing) {
      audio.play().catch(() => setPlaying(false))
    } else {
      audio.pause()
    }
  }, [playing, current])

  function playSong(song: Song) {
    const info = lockInfo.get(song.id)
    if (info?.locked) return // bloqueada — o clique é tratado pelo Link de upsell
    if (song.id === currentId) {
      setPlaying((p) => !p)
      return
    }
    setCurrentId(song.id)
    setProgress(0)
    setDuration(song.duration_seconds || 0)
    setPlaying(true)
  }

  function playNext(dir: 1 | -1 = 1) {
    if (currentIndex < 0) return
    for (let i = currentIndex + dir; i >= 0 && i < songs.length; i += dir) {
      const s = songs[i]
      if (!lockInfo.get(s.id)?.locked) {
        playSong(s)
        return
      }
    }
  }

  // ===== LIVE tem prioridade absoluta =====
  if (live) {
    return (
      <Link
        href={`/artist/${artistSlug}/live`}
        aria-label={`Entrar na live: ${live.title}`}
        className="nav-float fixed inset-x-4 bottom-24 left-1/2 z-50 mx-auto flex w-full max-w-sm -translate-x-1/2 items-center gap-3 rounded-3xl p-3 transition-all duration-200 hover:scale-[1.02] active:scale-95"
      >
        <div className="relative shrink-0">
          <Image src={artistAvatar || '/placeholder.svg?height=56&width=56'} alt="" width={56} height={56} className="size-14 rounded-2xl object-cover" />
          <span className="absolute -right-1 -top-1 flex items-center gap-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[7px] font-black tracking-[0.1em] text-white" aria-hidden="true">
            <span className="size-1 animate-pulse rounded-full bg-white" />
            LIVE
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold tracking-[0.05em]">{live.title.toUpperCase()}</p>
          <p className="mt-0.5 text-[10px] font-extrabold tracking-[0.15em] text-muted-foreground">
            {artistName.toUpperCase()} • <span className="text-club">AO VIVO</span>
          </p>
        </div>
        <span className="gradient-club flex size-12 shrink-0 items-center justify-center rounded-2xl" aria-hidden="true">
          <Radio className="size-5 text-white" />
        </span>
      </Link>
    )
  }

  // Sem música cadastrada: não renderiza nada.
  if (songs.length === 0) return null

  // Faixa em foco no player recolhido: a atual, senão o lançamento, senão a Top 1.
  const featured = current ?? newRelease ?? songs[0]
  const featuredInfo = lockInfo.get(featured.id)
  const featuredLocked = Boolean(featuredInfo?.locked)
  const highlightRelease = !current && Boolean(newRelease)

  return (
    <>
      {current && (
        <audio
          ref={audioRef}
          src={current.audio_url}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || current.duration_seconds || 0)}
          onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
          onEnded={() => playNext(1)}
        >
          <track kind="captions" />
        </audio>
      )}

      {/* ===== BARRA RECOLHIDA (fixa acima do nav, acompanha o scroll) ===== */}
      <div
        className={`nav-float fixed inset-x-4 bottom-24 left-1/2 z-50 mx-auto w-full max-w-sm -translate-x-1/2 overflow-hidden rounded-3xl transition-all duration-200 ${
          highlightRelease ? 'ring-2 ring-club shadow-lg shadow-club/30' : ''
        }`}
      >
        {highlightRelease && (
          <div className="gradient-club flex items-center justify-center gap-1.5 py-1 text-[8px] font-black tracking-[0.2em] text-white">
            <Rocket className="size-2.5" aria-hidden="true" />
            LANÇAMENTO NOVO
          </div>
        )}
        <div className="flex items-center gap-3 p-3">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="Abrir playlist"
            className="relative shrink-0"
          >
            {featured.cover_url || artistAvatar ? (
              <Image
                src={featured.cover_url || artistAvatar || '/placeholder.svg?height=56&width=56'}
                alt=""
                width={56}
                height={56}
                className="size-14 rounded-2xl object-cover"
              />
            ) : (
              <span className="flex size-14 items-center justify-center rounded-2xl bg-white/5 text-muted-foreground">
                <Music className="size-5" aria-hidden="true" />
              </span>
            )}
          </button>

          <button type="button" onClick={() => setExpanded(true)} className="min-w-0 flex-1 text-left">
            <p className="flex items-center gap-1.5 truncate text-sm font-extrabold tracking-[0.03em]">
              {featured.title}
              {featuredLocked && <Lock className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] font-extrabold tracking-[0.12em] text-muted-foreground">
              {artistName.toUpperCase()} • <span className="text-club">TOP {songs.length}</span>
              <ChevronUp className="size-3" aria-hidden="true" />
            </p>
          </button>

          {featuredLocked ? (
            <Link
              href={`/artist/${artistSlug}/plans`}
              aria-label="Assinar para ouvir"
              className="gradient-club flex size-12 shrink-0 items-center justify-center rounded-2xl"
            >
              <Lock className="size-5 text-white" aria-hidden="true" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => playSong(featured)}
              aria-label={playing && current?.id === featured.id ? 'Pausar' : 'Tocar'}
              className="gradient-club flex size-12 shrink-0 items-center justify-center rounded-2xl transition-transform active:scale-90"
            >
              {playing && current?.id === featured.id ? (
                <Pause className="size-5 fill-white text-white" aria-hidden="true" />
              ) : (
                <Play className="size-5 fill-white text-white" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        {/* Barra de progresso */}
        {current && (
          <div className="h-1 w-full bg-white/10" aria-hidden="true">
            <div
              className="gradient-club h-full transition-[width] duration-300"
              style={{ width: duration > 0 ? `${Math.min(100, (progress / duration) * 100)}%` : '0%' }}
            />
          </div>
        )}
      </div>

      {/* ===== PLAYLIST EXPANDIDA ===== */}
      {expanded && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Playlist do artista">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setExpanded(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="relative mx-auto w-full max-w-md rounded-t-[32px] border-t border-white/10 bg-card p-5 pb-8 shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" aria-hidden="true" />
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListMusic className="size-4 text-club" aria-hidden="true" />
                <h2 className="text-[11px] font-black tracking-[0.2em]">TOP {songs.length} · {artistName.toUpperCase()}</h2>
              </div>
              <button type="button" onClick={() => setExpanded(false)} aria-label="Fechar playlist">
                <X className="size-5 text-muted-foreground" aria-hidden="true" />
              </button>
            </div>

            {userTierRank === 0 && !canManage && (
              <div className="mb-3 flex items-center gap-2 rounded-2xl bg-club/10 px-4 py-3">
                <Crown className="size-4 shrink-0 text-club" aria-hidden="true" />
                <p className="text-[10px] font-bold leading-snug text-muted-foreground">
                  Você ouve as <strong className="text-foreground">{FREE_LIMIT} primeiras</strong> faixas grátis.{' '}
                  <Link href={`/artist/${artistSlug}/plans`} className="font-black text-club underline">
                    Assine
                  </Link>{' '}
                  para liberar tudo.
                </p>
              </div>
            )}

            <ul className="scrollbar-none flex max-h-[50dvh] flex-col gap-1 overflow-y-auto">
              {songs.map((s, i) => {
                const info = lockInfo.get(s.id)
                const locked = Boolean(info?.locked)
                const isCurrent = s.id === currentId
                return (
                  <li key={s.id}>
                    {locked ? (
                      <Link
                        href={`/artist/${artistSlug}/plans`}
                        className="flex items-center gap-3 rounded-2xl px-2 py-2.5 opacity-60 transition-colors hover:bg-white/[0.04]"
                      >
                        <span className="w-5 shrink-0 text-center text-xs font-black tabular-nums text-muted-foreground">{i + 1}</span>
                        <SongCover song={s} fallback={artistAvatar} />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 truncate text-xs font-extrabold">
                            {s.title}
                            {s.is_new_release && <Rocket className="size-3 shrink-0 text-club" aria-hidden="true" />}
                          </p>
                          <p className="mt-0.5 text-[9px] font-black tracking-[0.1em] text-club">
                            {info?.reason === 'tier' && s.min_tier
                              ? `${TIER_LABELS[s.min_tier].toUpperCase()}+ EXCLUSIVO`
                              : 'ASSINE PARA OUVIR'}
                          </p>
                        </div>
                        <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => playSong(s)}
                        className={`flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-white/[0.04] ${
                          isCurrent ? 'bg-club/10' : ''
                        }`}
                      >
                        <span className={`w-5 shrink-0 text-center text-xs font-black tabular-nums ${isCurrent ? 'text-club' : 'text-muted-foreground'}`}>
                          {i + 1}
                        </span>
                        <SongCover song={s} fallback={artistAvatar} />
                        <div className="min-w-0 flex-1">
                          <p className={`flex items-center gap-1.5 truncate text-xs font-extrabold ${isCurrent ? 'text-club' : ''}`}>
                            {s.title}
                            {s.is_new_release && <Rocket className="size-3 shrink-0 text-club" aria-hidden="true" />}
                          </p>
                          <p className="mt-0.5 text-[9px] font-black tracking-[0.1em] text-muted-foreground">
                            {fmt(s.duration_seconds)}
                          </p>
                        </div>
                        {isCurrent && playing ? (
                          <Pause className="size-4 shrink-0 fill-club text-club" aria-hidden="true" />
                        ) : (
                          <Play className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        )}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>

            {/* Controles de transporte quando há faixa tocando */}
            {current && (
              <div className="mt-4 flex items-center justify-center gap-6 border-t border-white/8 pt-4">
                <button type="button" onClick={() => playNext(-1)} aria-label="Anterior">
                  <SkipBack className="size-5 fill-foreground text-foreground" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  aria-label={playing ? 'Pausar' : 'Tocar'}
                  className="gradient-club flex size-14 items-center justify-center rounded-full"
                >
                  {playing ? (
                    <Pause className="size-6 fill-white text-white" aria-hidden="true" />
                  ) : (
                    <Play className="size-6 fill-white text-white" aria-hidden="true" />
                  )}
                </button>
                <button type="button" onClick={() => playNext(1)} aria-label="Próxima">
                  <SkipForward className="size-5 fill-foreground text-foreground" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function SongCover({ song, fallback }: { song: Song; fallback: string }) {
  if (song.cover_url || fallback) {
    return (
      <Image
        src={song.cover_url || fallback || '/placeholder.svg?height=40&width=40'}
        alt=""
        width={40}
        height={40}
        className="size-10 shrink-0 rounded-lg object-cover"
      />
    )
  }
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-muted-foreground">
      <Music className="size-4" aria-hidden="true" />
    </span>
  )
}
