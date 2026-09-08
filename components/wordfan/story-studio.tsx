'use client'

// ─────────────────────────────────────────────────────────────────────────────
// StoryStudio — editor de vídeo de stories em tela cheia, no estilo CapCut.
// Layout de três zonas: rail de navegação + painel à esquerda, preview no centro
// e timeline embaixo. Toda a lógica de edição (trim, split, reorder, playback,
// animações) e o export MP4 + publicação vivem aqui. Engine: @/lib/story-video.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Play, Pause, Scissors, Trash2, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, Film, Wand2, Captions, Check, Loader2, Sparkles, X,
  AlertCircle, Clapperboard, Clock, Upload,
} from 'lucide-react'
import {
  ANIMATIONS, EXPORT_W, EXPORT_H, clipLen, layoutClips, totalDuration,
  activeIndexAt, computeAnimation, drawFrame, loadVideo, exportTimeline,
  type AnimId, type ClipSpec, type StorySettings, type ExportProgress,
} from '@/lib/story-video/engine'
import { createDirectUploadUrl, saveStory } from '@/app/actions/content'

interface Asset {
  id: string
  url: string
  name: string
  duration: number
  thumb: string | null
}

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
  artistId: string
  artistName: string
  artistSlug: string
}

type Panel = 'media' | 'anim' | 'caption'
type Phase = 'editing' | 'exporting' | 'done'

const MIN_CLIP = 0.4
const MAX_STORY = 60

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
      v.addEventListener('seeked', () => res(), { once: true })
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

const ANIM_ICON: Record<string, string> = {
  none: '∅', fade: '◐', 'slide-up': '↑', 'slide-down': '↓',
  'slide-left': '←', 'slide-right': '→', 'zoom-in': '⊕', 'zoom-out': '⊖',
}

export function StoryStudio({ artistId }: Props) {
  const router = useRouter()

  const [assets, setAssets]         = useState<Asset[]>([])
  const [clips, setClips]           = useState<EditorClip[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying]       = useState(false)
  const [pxPerSec, setPxPerSec]     = useState(80)
  const [inAnim, setInAnim]         = useState<AnimId>('fade')
  const [outAnim, setOutAnim]       = useState<AnimId>('fade')
  const [loadingAdd, setLoadingAdd] = useState(false)
  const [panel, setPanel]           = useState<Panel>('media')
  const [caption, setCaption]       = useState('')

  const [phase, setPhase]           = useState<Phase>('editing')
  const [exportLabel, setExportLabel] = useState('')
  const [exportPct, setExportPct]   = useState(0)
  const [error, setError]           = useState('')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)
  const videoEls  = useRef<Map<string, HTMLVideoElement>>(new Map())
  const rafRef    = useRef<number>(0)
  const trackRef  = useRef<HTMLDivElement>(null)

  const layout   = useMemo(() => layoutClips(clips), [clips])
  const total    = useMemo(() => totalDuration(clips), [clips])
  const settings: StorySettings = useMemo(() => ({ inAnim, outAnim }), [inAnim, outAnim])
  const selected = clips.find((c) => c.id === selectedId) ?? null

  // ── Preload dos vídeos usados no preview (mudos no canvas) ──────────────────
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
    for (const [id, v] of videoEls.current) {
      if (!clips.find((c) => c.id === id)) { v.pause(); videoEls.current.delete(id) }
    }
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips])

  // ── Importar arquivos → biblioteca + timeline ──────────────────────────────
  async function importFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('video/'))
    if (!list.length) return
    setLoadingAdd(true)
    setError('')
    const newAssets: Asset[] = []
    const newClips: EditorClip[] = []
    for (const f of list) {
      const url = URL.createObjectURL(f)
      const v = await loadVideo(url, true).catch(() => null)
      const dur = v?.duration && isFinite(v.duration) ? v.duration : 5
      const thumb = await captureThumb(url, 0.1)
      const assetId = `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      newAssets.push({ id: assetId, url, name: f.name, duration: dur, thumb })
      newClips.push({
        id: `c-${assetId}`, url, name: f.name, duration: dur,
        trimStart: 0, trimEnd: Math.min(dur, MAX_STORY), thumb,
      })
    }
    setAssets((prev) => [...prev, ...newAssets])
    setClips((prev) => [...prev, ...newClips])
    if (!selectedId && newClips[0]) setSelectedId(newClips[0].id)
    setLoadingAdd(false)
  }

  function addAssetToTimeline(asset: Asset) {
    const clip: EditorClip = {
      id: `c-${asset.id}-${Date.now()}`, url: asset.url, name: asset.name,
      duration: asset.duration, trimStart: 0,
      trimEnd: Math.min(asset.duration, MAX_STORY), thumb: asset.thumb,
    }
    setClips((prev) => [...prev, clip])
    setSelectedId(clip.id)
  }

  // ── Desenhar um instante ────────────────────────────────────────────────────
  const drawAt = useCallback((t: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    if (!clips.length) {
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

  // Scrub: redesenha ao mudar tempo/estado quando parado.
  useEffect(() => {
    if (playing) return
    const idx = activeIndexAt(layout, Math.min(currentTime, Math.max(0, total - 0.001)))
    const clip = clips[idx]
    if (!clip) { drawAt(currentTime); return }
    const v = videoEls.current.get(clip.id)
    if (!v) { drawAt(currentTime); return }
    const localTime = clip.trimStart + (currentTime - (layout[idx]?.start ?? 0))
    v.addEventListener('seeked', () => drawAt(currentTime), { once: true })
    try { v.currentTime = Math.max(0, Math.min(localTime, clip.duration - 0.02)) } catch { drawAt(currentTime) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, clips, inAnim, outAnim, playing])

  // ── Playback ────────────────────────────────────────────────────────────────
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
      const cv = canvasRef.current
      const activeV = videoEls.current.get(clips[idx].id)
      if (cv && activeV) drawFrame(cv.getContext('2d')!, EXPORT_W, EXPORT_H, activeV, anim)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [clips, currentTime, inAnim, outAnim, drawAt])

  const pause = useCallback(() => { setPlaying(false); stopLoop() }, [stopLoop])
  useEffect(() => () => stopLoop(), [stopLoop])

  // ── Operações de clipe ───────────────────────────────────────────────────────
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

  function seekFromClientX(clientX: number) {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const x = clientX - rect.left + track.scrollLeft
    const t = Math.max(0, Math.min(x / pxPerSec, total))
    setCurrentTime(t)
  }

  function startTrimDrag(e: React.PointerEvent, id: string, edge: 'start' | 'end') {
    e.stopPropagation(); e.preventDefault()
    let lastX = e.clientX
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

  // ── Export MP4 real → upload direto → publicar ────────────────────────────────
  const canExport = clips.length > 0 && total > 0.2 && phase === 'editing'

  async function handleExport() {
    if (!canExport) return
    setPhase('exporting')
    setExportLabel('Preparando…')
    setExportPct(0)
    setError('')
    if (playing) pause()
    try {
      const { blob } = await exportTimeline(clips as ClipSpec[], settings, (p: ExportProgress) => {
        const label =
          p.phase === 'preparing'  ? 'Preparando clipes…' :
          p.phase === 'recording'  ? 'Renderizando vídeo…' :
                                      'Finalizando MP4…'
        setExportLabel(label)
        const pct = p.phase === 'transcoding' ? 70 + p.pct * 30 : p.phase === 'recording' ? p.pct * 65 : p.pct * 5
        setExportPct(Math.round(pct))
      })

      setExportLabel('Enviando para o servidor…')
      setExportPct(0)
      const file = new File([blob], `story-${Date.now()}.mp4`, { type: 'video/mp4' })

      const signed = await createDirectUploadUrl({
        artistId, kind: 'story', fileType: file.type, fileSizeBytes: file.size,
      })
      if (signed.error || !signed.signedUrl) {
        setError(signed.error ?? 'Erro ao gerar link de upload.')
        setPhase('editing'); return
      }

      const ok = await new Promise<boolean>((resolve) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setExportPct(Math.round(e.loaded / e.total * 100)) }
        xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300)
        xhr.onerror = () => resolve(false)
        xhr.open('PUT', signed.signedUrl!)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })
      if (!ok) { setError('Falha ao enviar o vídeo. Verifique sua conexão e tente novamente.'); setPhase('editing'); return }

      const save = await saveStory({
        artistId, mediaUrl: signed.publicUrl!, caption: caption.trim(),
        mediaType: 'video', durationMs: Math.round(total * 1000),
      })
      if (save.error) { setError(save.error); setPhase('editing'); return }

      setPhase('done')
      setTimeout(() => router.push('/dashboard/estudio'), 1800)
    } catch (err) {
      console.log('[v0] story export error:', (err as Error).message)
      setError((err as Error).message || 'Não foi possível exportar o vídeo.')
      setPhase('editing')
    }
  }

  // ── Done overlay ──────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-5 bg-[#070707]">
        <div className="flex size-16 items-center justify-center rounded-3xl bg-primary/15 text-primary">
          <Check className="size-8" />
        </div>
        <div className="text-center">
          <p className="font-serif text-xl font-black text-white">Story publicado!</p>
          <p className="mt-1.5 text-[11px] font-bold text-zinc-500">Redirecionando para o estúdio…</p>
        </div>
      </div>
    )
  }

  const RAIL: { id: Panel; label: string; icon: typeof Film }[] = [
    { id: 'media',   label: 'Mídia',     icon: Film },
    { id: 'anim',    label: 'Animações', icon: Wand2 },
    { id: 'caption', label: 'Legenda',   icon: Captions },
  ]

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#070707] text-white">
      <input
        ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
        multiple className="sr-only"
        onChange={(e) => { if (e.target.files) importFiles(e.target.files); e.target.value = '' }}
      />

      {/* ── Top bar ── */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/8 bg-[#0d0d0d] px-4">
        <button type="button" onClick={() => router.push('/dashboard/estudio')}
          className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/5 px-3 py-1.5 text-[9px] font-black tracking-[0.1em] text-zinc-300 transition-colors hover:bg-white/10">
          <ArrowLeft className="size-3.5" /> SAIR
        </button>
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Clapperboard className="size-4" />
          </span>
          <div className="leading-tight">
            <p className="text-[11px] font-black tracking-tight text-white">Editor de Vídeo</p>
            <p className="text-[8px] font-bold tracking-[0.12em] text-zinc-600">STORY · 9:16 · MP4</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="font-numeric flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-[9px] font-bold text-zinc-400">
            <Clock className="size-3 text-zinc-600" />
            {fmtTime(currentTime)} / {fmtTime(total)}
          </span>
          <button type="button" onClick={handleExport} disabled={!canExport}
            className="gradient-brand flex items-center gap-2 rounded-xl px-5 py-2 text-[9px] font-black tracking-[0.15em] text-white shadow-[0_6px_18px_-6px_rgba(255,106,0,0.6)] transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40">
            <Upload className="size-3.5" /> EXPORTAR E PUBLICAR
          </button>
        </div>
      </header>

      {/* ── Corpo: rail + painel + preview ── */}
      <div className="flex min-h-0 flex-1">
        {/* Rail de navegação */}
        <nav className="flex w-[68px] shrink-0 flex-col items-center gap-1 border-r border-white/8 bg-[#0d0d0d] py-3">
          {RAIL.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setPanel(id)}
              className={`flex w-14 flex-col items-center gap-1 rounded-xl py-2.5 transition-colors ${
                panel === id ? 'bg-primary/15 text-primary' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
              }`}>
              <Icon className="size-5" />
              <span className="text-[8px] font-black tracking-[0.06em]">{label}</span>
            </button>
          ))}
        </nav>

        {/* Painel contextual */}
        <aside className="flex w-[300px] shrink-0 flex-col border-r border-white/8 bg-[#0a0a0a]">
          {panel === 'media' && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-white/8 p-4">
                <p className="text-[9px] font-black tracking-[0.15em] text-zinc-500">MÍDIA</p>
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/[0.06] py-3 text-[10px] font-black tracking-[0.1em] text-primary transition-colors hover:bg-primary/[0.12]">
                  {loadingAdd ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  {loadingAdd ? 'CARREGANDO…' : 'ADICIONAR MÍDIA'}
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {assets.length === 0 ? (
                  <p className="mt-6 text-center text-[10px] font-bold leading-relaxed text-zinc-600">
                    Nenhuma mídia ainda.<br />Importe vídeos MP4, WebM ou MOV para começar.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {assets.map((a) => (
                      <button key={a.id} type="button" onClick={() => addAssetToTimeline(a)}
                        className="group relative aspect-[9/16] overflow-hidden rounded-xl border border-white/8 bg-black transition-colors hover:border-primary/60"
                        style={{ backgroundImage: a.thumb ? `url(${a.thumb})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}
                        title={`Adicionar "${a.name}" à timeline`}>
                        <span className="absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/10" />
                        <span className="font-numeric absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[7px] font-bold text-white">
                          {a.duration.toFixed(0)}s
                        </span>
                        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-white">
                            <Plus className="size-4" />
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {panel === 'anim' && (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <p className="text-[9px] font-black tracking-[0.15em] text-zinc-500">ANIMAÇÕES DO STORY</p>
              <p className="mt-1.5 text-[9px] font-bold leading-relaxed text-zinc-600">
                Como o story entra e sai. Aplicadas ao vídeo final.
              </p>

              <div className="mt-5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-3 text-primary" />
                  <p className="text-[9px] font-black tracking-[0.12em] text-zinc-400">ENTRADA</p>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  {ANIMATIONS.map((a) => (
                    <button key={a.id} type="button" onClick={() => setInAnim(a.id)}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                        inAnim === a.id ? 'border-primary/60 bg-primary/12 text-white' : 'border-white/8 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]'
                      }`}>
                      <span className={`text-sm ${inAnim === a.id ? 'text-primary' : 'text-zinc-600'}`}>{ANIM_ICON[a.id]}</span>
                      <span className="text-[9px] font-bold">{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-3 text-primary" />
                  <p className="text-[9px] font-black tracking-[0.12em] text-zinc-400">SAÍDA</p>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  {ANIMATIONS.map((a) => (
                    <button key={a.id} type="button" onClick={() => setOutAnim(a.id)}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                        outAnim === a.id ? 'border-primary/60 bg-primary/12 text-white' : 'border-white/8 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]'
                      }`}>
                      <span className={`text-sm ${outAnim === a.id ? 'text-primary' : 'text-zinc-600'}`}>{ANIM_ICON[a.id]}</span>
                      <span className="text-[9px] font-bold">{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {panel === 'caption' && (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <p className="text-[9px] font-black tracking-[0.15em] text-zinc-500">LEGENDA</p>
              <p className="mt-1.5 text-[9px] font-bold leading-relaxed text-zinc-600">
                Texto que acompanha o story no feed (opcional).
              </p>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 140))}
                rows={4}
                placeholder="Escreva uma legenda…"
                className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[11px] font-bold text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-primary/50"
              />
              <p className="mt-1.5 text-right text-[8px] font-bold text-zinc-600">{caption.length}/140</p>
            </div>
          )}
        </aside>

        {/* Preview central */}
        <section className="relative flex min-w-0 flex-1 items-center justify-center bg-[#070707] p-6">
          {clips.length === 0 ? (
            <button type="button" onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files) importFiles(e.dataTransfer.files) }}
              className="flex aspect-[9/16] h-full max-h-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-white/12 bg-white/[0.02] px-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/[0.04]">
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
                {playing ? <Pause className="size-5 fill-white" /> : <Play className="size-5 translate-x-0.5 fill-white" />}
              </button>
            </div>
          )}
        </section>
      </div>

      {/* ── Timeline ── */}
      <div className="shrink-0 border-t border-white/8 bg-[#0d0d0d]">
        <div className="flex items-center gap-1.5 px-4 py-2">
          <button type="button" onClick={splitAtPlayhead} disabled={!clips.length}
            className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[8px] font-black tracking-[0.1em] text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-30">
            <Scissors className="size-3" /> DIVIDIR
          </button>
          {selected && (
            <>
              <button type="button" onClick={() => moveClip(selected.id, -1)}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-zinc-300 transition-colors hover:bg-white/10" aria-label="Mover para a esquerda">
                <ChevronLeft className="size-3" />
              </button>
              <button type="button" onClick={() => moveClip(selected.id, 1)}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-zinc-300 transition-colors hover:bg-white/10" aria-label="Mover para a direita">
                <ChevronRight className="size-3" />
              </button>
              <button type="button" onClick={() => deleteClip(selected.id)}
                className="flex items-center gap-1 rounded-md border border-destructive/25 bg-destructive/10 px-2.5 py-1.5 text-[8px] font-black tracking-[0.1em] text-destructive transition-colors hover:bg-destructive/20">
                <Trash2 className="size-3" /> EXCLUIR
              </button>
            </>
          )}
          <span className="ml-2 text-[8px] font-bold text-zinc-600">
            {clips.length} clipe{clips.length === 1 ? '' : 's'} · arraste as bordas para aparar
          </span>
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

          {/* clips */}
          <div className="relative flex h-20 gap-0.5" style={{ width: Math.max(total * pxPerSec, 200) }}>
            {clips.map((c) => {
              const w = clipLen(c) * pxPerSec
              const isSel = c.id === selectedId
              return (
                <div key={c.id} onClick={() => setSelectedId(c.id)}
                  className={`group relative h-full shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-colors ${isSel ? 'border-primary' : 'border-white/10'}`}
                  style={{ width: Math.max(w, 24), backgroundImage: c.thumb ? `url(${c.thumb})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                  <div className="absolute inset-0 bg-black/40" />
                  <span className="absolute left-1 top-1 max-w-[80%] truncate rounded bg-black/60 px-1 py-0.5 text-[7px] font-bold text-white">{c.name}</span>
                  <span className="font-numeric absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[7px] font-bold text-white">{clipLen(c).toFixed(1)}s</span>
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
            <div className="pointer-events-none absolute top-0 z-10 w-0.5 bg-primary" style={{ left: 16 + currentTime * pxPerSec, height: '100%' }}>
              <span className="absolute -top-0.5 left-1/2 size-2 -translate-x-1/2 rounded-full bg-primary" />
            </div>
          )}
        </div>
      </div>

      {/* ── Export overlay ── */}
      {phase === 'exporting' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-black/85 px-6 backdrop-blur-sm">
          <div className="flex size-16 items-center justify-center rounded-3xl border border-primary/30 bg-primary/10">
            <Film className="size-8 text-primary" />
          </div>
          <div className="w-full max-w-sm text-center">
            <p className="text-[11px] font-black tracking-[0.18em] text-white">{exportLabel.toUpperCase()}</p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${exportPct}%` }} />
            </div>
            <p className="font-numeric mt-2 text-[10px] font-bold text-primary">{exportPct}%</p>
            <p className="mt-3 text-[9px] font-bold leading-relaxed text-zinc-500">
              Renderizando o vídeo no seu navegador. Mantenha esta aba aberta — pode levar alguns instantes.
            </p>
          </div>
        </div>
      )}

      {/* ── Erro ── */}
      {error && phase === 'editing' && (
        <div className="absolute inset-x-4 bottom-4 z-30 flex items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 backdrop-blur-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="whitespace-pre-line text-[10px] font-bold leading-relaxed text-destructive">{error}</p>
          <button type="button" onClick={() => setError('')} className="ml-auto text-zinc-400 hover:text-white" aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}
