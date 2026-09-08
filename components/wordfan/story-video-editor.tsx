'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Editor de vídeo de stories no estilo CapCut: timeline multi-clipe com trim,
// divisão, reordenação, playhead, zoom, duração e animações de entrada/saída.
// Preview real em canvas; o export MP4 vive em ./engine e é acionado por onExport.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus, Play, Pause, Scissors, Trash2, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, Film, Wand2, ArrowRightLeft,
} from 'lucide-react'
import {
  ANIMATIONS, EXPORT_W, EXPORT_H, clipLen, layoutClips, totalDuration,
  activeIndexAt, computeAnimation, drawFrame, loadVideo,
  type AnimId, type ClipSpec, type StorySettings,
} from '@/lib/story-video/engine'

interface EditorClip {
  id: string
  url: string
  name: string
  duration: number
  trimStart: number
  trimEnd: number
  thumb: string | null
}

interface Props {
  onExport: (clips: ClipSpec[], settings: StorySettings, totalSec: number) => void
  exporting: boolean
}

const MIN_CLIP = 0.4 // duração mínima de um clipe (s)
const MAX_STORY = 60 // limite de duração do story (s)

function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  const cs = Math.floor((s * 100) % 100)
  return `${m}:${sec.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`
}

async function captureThumb(url: string, at: number): Promise<string | null> {
  try {
    const v = await loadVideo(url, true)
    await new Promise<void>((res) => {
      const onSeek = () => res()
      v.addEventListener('seeked', onSeek, { once: true })
      v.currentTime = Math.min(at, (v.duration || 1) - 0.05)
    })
    const c = document.createElement('canvas')
    c.width = 120; c.height = 200
    const ctx = c.getContext('2d')!
    const vw = v.videoWidth || 120, vh = v.videoHeight || 200
    const scale = Math.max(c.width / vw, c.height / vh)
    const dw = vw * scale, dh = vh * scale
    ctx.drawImage(v, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh)
    return c.toDataURL('image/jpeg', 0.6)
  } catch {
    return null
  }
}

export function StoryVideoEditor({ onExport, exporting }: Props) {
  const [clips, setClips] = useState<EditorClip[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [pxPerSec, setPxPerSec] = useState(80)
  const [inAnim, setInAnim] = useState<AnimId>('fade')
  const [outAnim, setOutAnim] = useState<AnimId>('fade')
  const [loadingAdd, setLoadingAdd] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const videoEls = useRef<Map<string, HTMLVideoElement>>(new Map())
  const rafRef = useRef<number>(0)
  const trackRef = useRef<HTMLDivElement>(null)

  const layout = useMemo(() => layoutClips(clips), [clips])
  const total = useMemo(() => totalDuration(clips), [clips])
  const settings: StorySettings = useMemo(() => ({ inAnim, outAnim }), [inAnim, outAnim])

  // ── Preload de vídeos do preview (mudos p/ o canvas; áudio real no export) ──
  useEffect(() => {
    let cancelled = false
    for (const c of clips) {
      if (videoEls.current.has(c.id)) continue
      loadVideo(c.url, true).then((v) => {
        if (cancelled) return
        videoEls.current.set(c.id, v)
        drawAt(currentTime)
      }).catch(() => {})
    }
    // limpeza dos que saíram
    for (const [id, v] of videoEls.current) {
      if (!clips.find((c) => c.id === id)) { v.pause(); videoEls.current.delete(id) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips])

  // ── Adicionar clipes ────────────────────────────────────────────────────
  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('video/'))
    if (!list.length) return
    setLoadingAdd(true)
    const created: EditorClip[] = []
    for (const f of list) {
      const url = URL.createObjectURL(f)
      const v = await loadVideo(url, true).catch(() => null)
      const dur = v?.duration && isFinite(v.duration) ? v.duration : 5
      const thumb = await captureThumb(url, 0.1)
      created.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        url, name: f.name, duration: dur, trimStart: 0,
        trimEnd: Math.min(dur, MAX_STORY), thumb,
      })
    }
    setClips((prev) => [...prev, ...created])
    if (!selectedId && created[0]) setSelectedId(created[0].id)
    setLoadingAdd(false)
  }

  // ── Desenhar um instante da timeline no canvas ────────────────────────────
  const drawAt = useCallback((t: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    if (!clips.length) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      return
    }
    const lay = layoutClips(clips)
    const tot = totalDuration(clips)
    const idx = activeIndexAt(lay, Math.min(t, tot - 0.001))
    const clip = clips[idx]
    const v = videoEls.current.get(clip.id)
    if (!v) return
    const anim = computeAnimation(t, tot, { inAnim, outAnim })
    drawFrame(ctx, canvas.width, canvas.height, v, anim)
  }, [clips, inAnim, outAnim])

  // Redesenha quando o tempo/estado muda e não está tocando (scrub).
  useEffect(() => {
    if (!playing) {
      const idx = activeIndexAt(layout, Math.min(currentTime, Math.max(0, total - 0.001)))
      const clip = clips[idx]
      if (!clip) { drawAt(currentTime); return }
      const v = videoEls.current.get(clip.id)
      if (!v) { drawAt(currentTime); return }
      const localTime = clip.trimStart + (currentTime - (layout[idx]?.start ?? 0))
      const onSeek = () => drawAt(currentTime)
      v.addEventListener('seeked', onSeek, { once: true })
      try { v.currentTime = Math.max(0, Math.min(localTime, clip.duration - 0.02)) } catch { drawAt(currentTime) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, clips, inAnim, outAnim, playing])

  // ── Playback ──────────────────────────────────────────────────────────────
  const stopLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    for (const v of videoEls.current.values()) v.pause()
  }, [])

  const play = useCallback(() => {
    if (!clips.length) return
    setPlaying(true)
    const lay = layoutClips(clips)
    const tot = totalDuration(clips)
    let t = currentTime >= tot - 0.05 ? 0 : currentTime
    let idx = activeIndexAt(lay, t)
    const startClip = clips[idx]
    const v0 = videoEls.current.get(startClip.id)
    if (v0) { v0.currentTime = startClip.trimStart + (t - lay[idx].start); v0.play().catch(() => {}) }

    const loop = () => {
      const clip = clips[idx]
      const v = videoEls.current.get(clip.id)
      if (!v) { rafRef.current = requestAnimationFrame(loop); return }
      // avança de clipe ao passar do ponto de corte
      if (v.currentTime >= clip.trimEnd - 0.02) {
        v.pause()
        if (idx >= clips.length - 1) { setPlaying(false); setCurrentTime(tot); drawAt(tot); return }
        idx += 1
        const next = clips[idx]
        const nv = videoEls.current.get(next.id)
        if (nv) { nv.currentTime = next.trimStart; nv.play().catch(() => {}) }
      }
      t = lay[idx].start + (v.currentTime - clip.trimStart)
      setCurrentTime(t)
      const anim = computeAnimation(t, tot, { inAnim, outAnim })
      drawFrame(canvasRef.current!.getContext('2d')!, EXPORT_W, EXPORT_H, videoEls.current.get(clips[idx].id)!, anim)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [clips, currentTime, inAnim, outAnim, drawAt])

  const pause = useCallback(() => { setPlaying(false); stopLoop() }, [stopLoop])
  useEffect(() => () => stopLoop(), [stopLoop])

  // ── Operações de clipe ──────────────────────────────────────────────────
  function splitAtPlayhead() {
    if (!clips.length) return
    const idx = activeIndexAt(layout, currentTime)
    const clip = clips[idx]
    const local = clip.trimStart + (currentTime - layout[idx].start)
    if (local <= clip.trimStart + MIN_CLIP || local >= clip.trimEnd - MIN_CLIP) return
    const left: EditorClip = { ...clip, id: `${clip.id}-a-${Date.now()}`, trimEnd: local }
    const right: EditorClip = { ...clip, id: `${clip.id}-b-${Date.now()}`, trimStart: local }
    setClips((prev) => [...prev.slice(0, idx), left, right, ...prev.slice(idx + 1)])
    setSelectedId(right.id)
  }

  function deleteClip(id: string) {
    const v = videoEls.current.get(id)
    if (v) { v.pause(); videoEls.current.delete(id) }
    setClips((prev) => prev.filter((c) => c.id !== id))
    setSelectedId((s) => (s === id ? null : s))
    setCurrentTime(0)
  }

  function moveClip(id: string, dir: -1 | 1) {
    setClips((prev) => {
      const i = prev.findIndex((c) => c.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  function trimClip(id: string, edge: 'start' | 'end', deltaSec: number) {
    setClips((prev) => prev.map((c) => {
      if (c.id !== id) return c
      if (edge === 'start') {
        const ns = Math.max(0, Math.min(c.trimStart + deltaSec, c.trimEnd - MIN_CLIP))
        return { ...c, trimStart: ns }
      }
      const ne = Math.min(c.duration, Math.max(c.trimEnd + deltaSec, c.trimStart + MIN_CLIP))
      return { ...c, trimEnd: ne }
    }))
  }

  // ── Playhead / ruler drag ───────────────────────────────────────────────
  function seekFromClientX(clientX: number) {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const x = clientX - rect.left + track.scrollLeft
    const t = Math.max(0, Math.min(x / pxPerSec, total))
    setCurrentTime(t)
  }

  const selected = clips.find((c) => c.id === selectedId) ?? null

  // ── Trim handle drag (pointer) ────────────────────────────────────────────
  function startTrimDrag(e: React.PointerEvent, id: string, edge: 'start' | 'end') {
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    let lastX = startX
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - lastX
      lastX = ev.clientX
      trimClip(id, edge, dx / pxPerSec)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const canExport = clips.length > 0 && total > 0.2 && !exporting

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a]">
      <input
        ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
        multiple className="sr-only"
        onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
      />

      {/* ── Toolbar superior ── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/8 bg-[#101010] px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-[9px] font-black tracking-[0.15em] text-primary">
          <Film className="size-3.5" /> EDITOR DE VÍDEO
        </span>
        <button type="button" onClick={() => fileRef.current?.click()}
          className="ml-2 flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-[9px] font-black tracking-[0.1em] text-primary transition-colors hover:bg-primary/20">
          <Plus className="size-3.5" /> ADICIONAR MÍDIA
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="font-numeric rounded-md bg-white/5 px-2 py-1 text-[9px] font-bold text-zinc-400">
            {fmtTime(currentTime)} / {fmtTime(total)}
          </span>
        </div>
      </div>

      {/* ── Preview ── */}
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#070707] p-4">
        {clips.length === 0 ? (
          <button type="button" onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files) addFiles(e.dataTransfer.files) }}
            className="flex aspect-[9/16] h-full max-h-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-white/12 bg-white/[0.02] px-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/[0.04]">
            <div className="flex size-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
              <Plus className="size-8 text-primary" />
            </div>
            <div>
              <p className="font-serif text-base font-black text-white">Adicione seus vídeos</p>
              <p className="mt-1 text-[10px] font-bold text-zinc-500">Clique ou arraste. MP4, WebM ou MOV.</p>
            </div>
            {loadingAdd && <p className="text-[9px] font-bold text-primary">Carregando…</p>}
          </button>
        ) : (
          <div className="relative flex h-full items-center justify-center">
            <canvas
              ref={canvasRef} width={EXPORT_W} height={EXPORT_H}
              className="h-full max-h-full rounded-2xl border border-white/10 bg-black shadow-2xl"
              style={{ aspectRatio: '9 / 16' }}
            />
            <button type="button" onClick={() => (playing ? pause() : play())}
              className="absolute bottom-4 left-1/2 flex size-12 -translate-x-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-transform hover:scale-105">
              {playing ? <Pause className="size-5 fill-white" /> : <Play className="size-5 fill-white translate-x-0.5" />}
            </button>
          </div>
        )}
      </div>

      {/* ── Animações + export ── */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-white/8 bg-[#101010] px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <Wand2 className="size-3.5 text-zinc-500" />
          <label className="text-[8px] font-black tracking-[0.12em] text-zinc-500">ENTRADA</label>
          <select value={inAnim} onChange={(e) => setInAnim(e.target.value as AnimId)}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-bold text-white outline-none">
            {ANIMATIONS.map((a) => <option key={a.id} value={a.id} className="bg-[#101010]">{a.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowRightLeft className="size-3.5 text-zinc-500" />
          <label className="text-[8px] font-black tracking-[0.12em] text-zinc-500">SAÍDA</label>
          <select value={outAnim} onChange={(e) => setOutAnim(e.target.value as AnimId)}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-bold text-white outline-none">
            {ANIMATIONS.map((a) => <option key={a.id} value={a.id} className="bg-[#101010]">{a.label}</option>)}
          </select>
        </div>

        <button type="button" onClick={() => canExport && onExport(clips as ClipSpec[], settings, total)}
          disabled={!canExport}
          className="gradient-brand ml-auto flex items-center gap-2 rounded-xl px-5 py-2 text-[9px] font-black tracking-[0.15em] text-white shadow-[0_6px_18px_-6px_rgba(255,106,0,0.6)] disabled:opacity-40">
          {exporting ? 'EXPORTANDO…' : 'EXPORTAR E PUBLICAR'}
        </button>
      </div>

      {/* ── Timeline ── */}
      <div className="shrink-0 border-t border-white/8 bg-[#0d0d0d]">
        {/* controls */}
        <div className="flex items-center gap-1.5 px-4 py-2">
          <button type="button" onClick={splitAtPlayhead} disabled={!clips.length}
            className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[8px] font-black tracking-[0.1em] text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-30">
            <Scissors className="size-3" /> DIVIDIR
          </button>
          {selected && (
            <>
              <button type="button" onClick={() => moveClip(selected.id, -1)}
                className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-zinc-300 transition-colors hover:bg-white/10" aria-label="Mover para a esquerda">
                <ChevronLeft className="size-3" />
              </button>
              <button type="button" onClick={() => moveClip(selected.id, 1)}
                className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-zinc-300 transition-colors hover:bg-white/10" aria-label="Mover para a direita">
                <ChevronRight className="size-3" />
              </button>
              <button type="button" onClick={() => deleteClip(selected.id)}
                className="flex items-center gap-1 rounded-md border border-destructive/25 bg-destructive/10 px-2.5 py-1.5 text-[8px] font-black tracking-[0.1em] text-destructive transition-colors hover:bg-destructive/20">
                <Trash2 className="size-3" /> EXCLUIR
              </button>
            </>
          )}
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={() => setPxPerSec((z) => Math.max(30, z - 20))}
              className="flex size-6 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10" aria-label="Reduzir zoom">
              <ZoomOut className="size-3" />
            </button>
            <button type="button" onClick={() => setPxPerSec((z) => Math.min(200, z + 20))}
              className="flex size-6 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10" aria-label="Aumentar zoom">
              <ZoomIn className="size-3" />
            </button>
          </div>
        </div>

        {/* track */}
        <div className="relative overflow-x-auto px-4 pb-4" ref={trackRef}>
          {/* ruler */}
          <div className="relative mb-1 h-4 cursor-pointer"
            style={{ width: Math.max(total * pxPerSec, 200) }}
            onPointerDown={(e) => { seekFromClientX(e.clientX)
              const onMove = (ev: PointerEvent) => seekFromClientX(ev.clientX)
              const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
              window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp) }}>
            {Array.from({ length: Math.ceil(total) + 1 }).map((_, i) => (
              <div key={i} className="absolute top-0 flex flex-col items-center" style={{ left: i * pxPerSec }}>
                <span className="h-1.5 w-px bg-white/20" />
                <span className="font-numeric text-[7px] font-bold text-zinc-600">{i}s</span>
              </div>
            ))}
          </div>

          {/* clips row */}
          <div className="relative flex h-20 gap-0.5" style={{ width: Math.max(total * pxPerSec, 200) }}>
            {clips.map((c) => {
              const w = clipLen(c) * pxPerSec
              const isSel = c.id === selectedId
              return (
                <div key={c.id} onClick={() => setSelectedId(c.id)}
                  className={`group relative h-full shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-colors ${isSel ? 'border-primary' : 'border-white/10'}`}
                  style={{ width: Math.max(w, 24), backgroundImage: c.thumb ? `url(${c.thumb})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                  <div className="absolute inset-0 bg-black/40" />
                  <span className="absolute left-1 top-1 max-w-[80%] truncate rounded bg-black/60 px-1 py-0.5 text-[7px] font-bold text-white">
                    {c.name}
                  </span>
                  <span className="font-numeric absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[7px] font-bold text-white">
                    {clipLen(c).toFixed(1)}s
                  </span>
                  {/* trim handles */}
                  <div onPointerDown={(e) => startTrimDrag(e, c.id, 'start')}
                    className="absolute inset-y-0 left-0 w-2 cursor-ew-resize bg-primary/70 opacity-0 group-hover:opacity-100" />
                  <div onPointerDown={(e) => startTrimDrag(e, c.id, 'end')}
                    className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-primary/70 opacity-0 group-hover:opacity-100" />
                </div>
              )
            })}
          </div>

          {/* playhead */}
          {clips.length > 0 && (
            <div className="pointer-events-none absolute top-0 z-10 w-0.5 bg-primary"
              style={{ left: 16 + currentTime * pxPerSec, height: '100%' }}>
              <span className="absolute -top-0.5 left-1/2 size-2 -translate-x-1/2 rounded-full bg-primary" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
