'use client'

// ─────────────────────────────────────────────────────────────────────────────
// StoryStudio — editor de stories em tela cheia, estilo CapCut, com CAMADAS.
// Composição em camadas (vídeo, imagem, texto) sobrepostas: cada camada tem
// posição no canvas, janela de tempo na timeline (multi-trilha) e animações de
// entrada/saída próprias. Layout: rail + painel à esquerda, preview no centro,
// timeline embaixo. Engine de composição/export: @/lib/story-video/engine.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Play, Pause, Trash2, ZoomIn, ZoomOut, Film, Image as ImageIcon,
  Type, Check, Loader2, Sparkles, X, AlertCircle, Clapperboard, Clock, Upload,
  ChevronUp, ChevronDown, Layers,
} from 'lucide-react'
import {
  ANIMATIONS, EXPORT_W, EXPORT_H, compositionDuration, composeFrame, layerActiveAt,
  loadVideo, loadImage, exportComposition,
  type AnimId, type LayerSpec, type ExportProgress,
} from '@/lib/story-video/engine'
import { createDirectUploadUrl, saveStory } from '@/app/actions/content'

interface Asset {
  id: string
  kind: 'video' | 'image'
  url: string
  name: string
  duration: number
  thumb: string | null
}

interface Layer extends LayerSpec {
  name: string
  thumb: string | null
}

interface Props {
  artistId: string
  artistName: string
  artistSlug: string
}

type Panel = 'media' | 'element' | 'caption'
type Phase = 'editing' | 'exporting' | 'done'

const MIN_DUR = 0.4
const MAX_STORY = 60
const IMG_DEFAULT_DUR = 4
const TXT_DEFAULT_DUR = 4

const TEXT_COLORS = ['#ffffff', '#000000', '#ff6a00', '#ffd93d', '#22c55e', '#3b82f6', '#ec4899']

const ANIM_ICON: Record<string, string> = {
  none: '∅', fade: '◐', 'slide-up': '↑', 'slide-down': '↓',
  'slide-left': '←', 'slide-right': '→', 'zoom-in': '⊕', 'zoom-out': '⊖',
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  const cs = Math.floor((s * 100) % 100)
  return `${m}:${sec.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

async function captureVideoThumb(url: string): Promise<string | null> {
  try {
    const v = await loadVideo(url, true)
    await new Promise<void>((res) => {
      v.addEventListener('seeked', () => res(), { once: true })
      v.currentTime = Math.min(0.1, (v.duration || 1) - 0.05)
    })
    const c = document.createElement('canvas')
    c.width = 120; c.height = 200
    const ctx = c.getContext('2d')!
    const vw = v.videoWidth || 120, vh = v.videoHeight || 200
    const scale = Math.max(c.width / vw, c.height / vh)
    ctx.drawImage(v, (c.width - vw * scale) / 2, (c.height - vh * scale) / 2, vw * scale, vh * scale)
    return c.toDataURL('image/jpeg', 0.6)
  } catch {
    return null
  }
}

export function StoryStudio({ artistId }: Props) {
  const router = useRouter()

  const [assets, setAssets]           = useState<Asset[]>([])
  const [layers, setLayers]           = useState<Layer[]>([])
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying]         = useState(false)
  const [pxPerSec, setPxPerSec]       = useState(80)
  const [panel, setPanel]             = useState<Panel>('media')
  const [caption, setCaption]         = useState('')
  const [loadingAdd, setLoadingAdd]   = useState(false)

  const [phase, setPhase]             = useState<Phase>('editing')
  const [exportLabel, setExportLabel] = useState('')
  const [exportPct, setExportPct]     = useState(0)
  const [error, setError]             = useState('')

  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)
  const imageInput = useRef<HTMLInputElement>(null)
  const trackRef   = useRef<HTMLDivElement>(null)
  const mediaEls    = useRef<Map<string, HTMLVideoElement | HTMLImageElement>>(new Map())
  const rafRef      = useRef<number>(0)
  const layersRef   = useRef<Layer[]>([])
  const timeRef     = useRef(0)

  layersRef.current = layers
  timeRef.current = currentTime

  const total    = useMemo(() => compositionDuration(layers), [layers])
  const selected = layers.find((l) => l.id === selectedId) ?? null
  const hasBackground = layers.some((l) => l.cover)

  const mediaFor = useCallback((id: string) => mediaEls.current.get(id) ?? null, [])

  // ── Compor um frame no tempo t ──────────────────────────────────────────────
  const composeNow = useCallback((t: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    composeFrame(canvas.getContext('2d')!, canvas.width, canvas.height, layersRef.current, mediaFor, t)
  }, [mediaFor])

  // ── Preload da mídia das camadas ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    for (const l of layers) {
      if (l.kind === 'text' || !l.url || mediaEls.current.has(l.id)) continue
      const loader = l.kind === 'video' ? loadVideo(l.url, true) : loadImage(l.url)
      loader.then((el) => {
        if (cancelled) return
        mediaEls.current.set(l.id, el)
        composeNow(timeRef.current)
      }).catch(() => {})
    }
    for (const [id, el] of mediaEls.current) {
      if (!layers.find((l) => l.id === id)) {
        if ('pause' in el) (el as HTMLVideoElement).pause()
        mediaEls.current.delete(id)
      }
    }
    composeNow(timeRef.current)
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers])

  // ── Scrub: ao mudar o tempo parado, sincroniza os vídeos e recompõe ──────────
  useEffect(() => {
    if (playing) return
    for (const l of layersRef.current) {
      if (l.kind !== 'video') continue
      const v = mediaEls.current.get(l.id) as HTMLVideoElement | undefined
      if (!v) continue
      if (layerActiveAt(l, currentTime)) {
        const localT = (l.trimStart ?? 0) + (currentTime - l.start)
        v.addEventListener('seeked', () => composeNow(timeRef.current), { once: true })
        try { v.currentTime = Math.max(0, Math.min(localT, (l.srcDuration ?? v.duration) - 0.02)) } catch { /* noop */ }
      }
    }
    composeNow(currentTime)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, layers, playing])

  // ── Playback ────────────────────────────────────────────────────────────────
  const stopLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    for (const el of mediaEls.current.values()) if ('pause' in el) (el as HTMLVideoElement).pause()
  }, [])

  const play = useCallback(() => {
    const ls = layersRef.current
    const tot = compositionDuration(ls)
    if (tot <= 0) return
    setPlaying(true)
    const startAt = timeRef.current >= tot - 0.05 ? 0 : timeRef.current
    const base = performance.now() - startAt * 1000
    const activated = new Set<string>()

    const loop = () => {
      const t = (performance.now() - base) / 1000
      if (t >= tot) {
        setPlaying(false)
        setCurrentTime(tot)
        stopLoop()
        composeNow(Math.max(0, tot - 0.001))
        return
      }
      for (const l of layersRef.current) {
        if (l.kind !== 'video') continue
        const v = mediaEls.current.get(l.id) as HTMLVideoElement | undefined
        if (!v) continue
        if (layerActiveAt(l, t)) {
          if (!activated.has(l.id)) {
            activated.add(l.id)
            v.currentTime = (l.trimStart ?? 0) + (t - l.start)
            v.play().catch(() => {})
          }
        } else if (activated.has(l.id)) {
          activated.delete(l.id)
          v.pause()
        }
      }
      composeNow(t)
      setCurrentTime(t)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [composeNow, stopLoop])

  const pause = useCallback(() => { setPlaying(false); stopLoop() }, [stopLoop])
  useEffect(() => () => stopLoop(), [stopLoop])

  // ── Importar arquivos → biblioteca + camada ─────────────────────────────────
  async function importFiles(files: FileList | File[], kind: 'video' | 'image') {
    const list = Array.from(files).filter((f) => f.type.startsWith(kind + '/'))
    if (!list.length) return
    setLoadingAdd(true); setError('')
    for (const f of list) {
      const url = URL.createObjectURL(f)
      let duration = IMG_DEFAULT_DUR
      let thumb: string | null = null
      if (kind === 'video') {
        const v = await loadVideo(url, true).catch(() => null)
        duration = v?.duration && isFinite(v.duration) ? v.duration : 5
        thumb = await captureVideoThumb(url)
      } else {
        await loadImage(url).catch(() => null)
        thumb = url
      }
      const asset: Asset = { id: uid('a'), kind, url, name: f.name, duration, thumb }
      setAssets((prev) => [...prev, asset])
      addLayerFromAsset(asset)
    }
    setLoadingAdd(false)
  }

  function addLayerFromAsset(asset: Asset) {
    const prev = layersRef.current
    const isBg = !prev.some((l) => l.cover) // primeira mídia vira fundo (cover)
    const dur = asset.kind === 'video' ? Math.min(asset.duration, MAX_STORY) : IMG_DEFAULT_DUR
    const layer: Layer = {
      id: uid('l'),
      kind: asset.kind,
      url: asset.url,
      srcDuration: asset.duration,
      trimStart: 0,
      cover: isBg,
      cx: 0.5, cy: isBg ? 0.5 : 0.42,
      scale: isBg ? 1 : 0.55,
      start: isBg ? 0 : Math.min(timeRef.current, Math.max(0, compositionDuration(prev) - 0.5)),
      duration: dur,
      inAnim: 'fade', outAnim: 'fade',
      name: asset.name, thumb: asset.thumb,
    }
    setLayers((p) => [...p, layer])
    setSelectedId(layer.id)
    setPanel('element')
    if (playing) pause()
    setCurrentTime(layer.start + Math.min(0.8, layer.duration / 2))
  }

  function addTextLayer() {
    const prev = layersRef.current
    const layer: Layer = {
      id: uid('l'),
      kind: 'text',
      text: 'Toque para editar',
      color: '#ffffff',
      fontScale: 0.07,
      cover: false,
      cx: 0.5, cy: 0.5,
      scale: 0.8,
      start: Math.min(timeRef.current, Math.max(0, compositionDuration(prev) - 0.5)),
      duration: TXT_DEFAULT_DUR,
      inAnim: 'fade', outAnim: 'fade',
      name: 'Texto', thumb: null,
    }
    setLayers((p) => [...p, layer])
    setSelectedId(layer.id)
    setPanel('element')
    if (playing) pause()
    setCurrentTime(layer.start + Math.min(0.8, layer.duration / 2))
  }

  // ── Mutações de camada ───────────────────────────────────────────────────────
  const patchLayer = useCallback((id: string, patch: Partial<Layer>) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }, [])

  function deleteLayer(id: string) {
    const el = mediaEls.current.get(id)
    if (el && 'pause' in el) (el as HTMLVideoElement).pause()
    mediaEls.current.delete(id)
    setLayers((prev) => prev.filter((l) => l.id !== id))
    setSelectedId((s) => (s === id ? null : s))
  }

  // Reordena z: dir -1 = para trás (fundo), +1 = para frente.
  function reorderLayer(id: string, dir: -1 | 1) {
    setLayers((prev) => {
      const i = prev.findIndex((l) => l.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  // ── Arraste do overlay no preview ────────────────────────────────────────────
  function overlayBox(l: Layer, W: number, H: number) {
    const w = l.scale * W
    const h = l.kind === 'text' ? Math.max((l.fontScale ?? 0.06) * H * 1.6, 0.12 * H) : w * (H / W)
    return { x: l.cx * W - w / 2, y: l.cy * H - h / 2, w, h }
  }

  function onPreviewPointerDown(e: React.PointerEvent) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    // hit-test dos overlays (frente → trás), ignorando o fundo cover
    const hit = [...layersRef.current].reverse().find((l) => {
      if (l.cover || !layerActiveAt(l, timeRef.current)) return false
      const b = overlayBox(l, 1, 1)
      return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h
    })
    if (!hit) return
    e.preventDefault()
    setSelectedId(hit.id)
    setPanel('element')
    let lastX = e.clientX, lastY = e.clientY
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - lastX) / rect.width
      const dy = (ev.clientY - lastY) / rect.height
      lastX = ev.clientX; lastY = ev.clientY
      setLayers((prev) => prev.map((l) => l.id === hit.id
        ? { ...l, cx: Math.max(0, Math.min(1, l.cx + dx)), cy: Math.max(0, Math.min(1, l.cy + dy)) }
        : l))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // ── Timeline: mover / redimensionar / seek ────────────────────────────────────
  function seekFromClientX(clientX: number) {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const x = clientX - rect.left + track.scrollLeft
    setCurrentTime(Math.max(0, Math.min(x / pxPerSec, total)))
  }

  function startBlockDrag(e: React.PointerEvent, id: string, mode: 'move' | 'start' | 'end') {
    e.stopPropagation(); e.preventDefault()
    setSelectedId(id); setPanel('element')
    let lastX = e.clientX
    const onMove = (ev: PointerEvent) => {
      const d = (ev.clientX - lastX) / pxPerSec
      lastX = ev.clientX
      setLayers((prev) => prev.map((l) => {
        if (l.id !== id) return l
        if (mode === 'move') {
          return { ...l, start: Math.max(0, l.start + d) }
        }
        if (mode === 'start') {
          const maxStartShift = l.duration - MIN_DUR
          const shift = Math.max(-l.start, Math.min(d, maxStartShift))
          const newStart = l.start + shift
          let newDur = l.duration - shift
          let newTrim = (l.trimStart ?? 0) + (l.kind === 'video' ? shift : 0)
          if (l.kind === 'video') newTrim = Math.max(0, newTrim)
          return { ...l, start: newStart, duration: newDur, trimStart: newTrim }
        }
        // end
        let newDur = Math.max(MIN_DUR, l.duration + d)
        if (l.kind === 'video') {
          const maxDur = (l.srcDuration ?? newDur) - (l.trimStart ?? 0)
          newDur = Math.min(newDur, maxDur)
        } else {
          newDur = Math.min(newDur, MAX_STORY)
        }
        return { ...l, duration: newDur }
      }))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // ── Export ────────────────────────────────────────────────────────────────────
  const canExport = layers.length > 0 && total > 0.2 && phase === 'editing'

  async function handleExport() {
    if (!canExport) return
    if (playing) pause()
    setPhase('exporting'); setExportLabel('Preparando…'); setExportPct(0); setError('')
    try {
      const { blob } = await exportComposition(layers as LayerSpec[], (p: ExportProgress) => {
        const label = p.phase === 'preparing' ? 'Preparando mídia…'
          : p.phase === 'recording' ? 'Renderizando vídeo…'
          : 'Finalizando MP4…'
        setExportLabel(label)
        const pct = p.phase === 'transcoding' ? 70 + p.pct * 30 : p.phase === 'recording' ? p.pct * 65 : p.pct * 5
        setExportPct(Math.round(pct))
      })

      setExportLabel('Enviando para o servidor…'); setExportPct(0)
      const file = new File([blob], `story-${Date.now()}.mp4`, { type: 'video/mp4' })
      const signed = await createDirectUploadUrl({ artistId, kind: 'story', fileType: file.type, fileSizeBytes: file.size })
      if (signed.error || !signed.signedUrl) { setError(signed.error ?? 'Erro ao gerar link de upload.'); setPhase('editing'); return }

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

  // ── Done ────────────────────────────────────────────────────────────────────
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
    { id: 'media',   label: 'Mídia',    icon: Layers },
    { id: 'element', label: 'Elemento', icon: Sparkles },
    { id: 'caption', label: 'Legenda',  icon: Type },
  ]

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#070707] text-white">
      <input ref={videoInput} type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" multiple className="sr-only"
        onChange={(e) => { if (e.target.files) importFiles(e.target.files, 'video'); e.target.value = '' }} />
      <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" multiple className="sr-only"
        onChange={(e) => { if (e.target.files) importFiles(e.target.files, 'image'); e.target.value = '' }} />

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
            <p className="text-[8px] font-bold tracking-[0.12em] text-zinc-600">STORY · 9:16 · MP4 · CAMADAS</p>
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

      {/* ── Corpo ── */}
      <div className="flex min-h-0 flex-1">
        {/* Rail */}
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
                <p className="text-[9px] font-black tracking-[0.15em] text-zinc-500">ADICIONAR CAMADA</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => videoInput.current?.click()}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/[0.06] py-3 text-primary transition-colors hover:bg-primary/[0.12]">
                    {loadingAdd ? <Loader2 className="size-4 animate-spin" /> : <Film className="size-4" />}
                    <span className="text-[8px] font-black tracking-[0.06em]">VÍDEO</span>
                  </button>
                  <button type="button" onClick={() => imageInput.current?.click()}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-zinc-300 transition-colors hover:bg-white/[0.07]">
                    <ImageIcon className="size-4" />
                    <span className="text-[8px] font-black tracking-[0.06em]">IMAGEM</span>
                  </button>
                  <button type="button" onClick={addTextLayer}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-zinc-300 transition-colors hover:bg-white/[0.07]">
                    <Type className="size-4" />
                    <span className="text-[8px] font-black tracking-[0.06em]">TEXTO</span>
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <p className="mb-2.5 text-[9px] font-black tracking-[0.15em] text-zinc-500">BIBLIOTECA</p>
                {assets.length === 0 ? (
                  <p className="mt-4 text-center text-[10px] font-bold leading-relaxed text-zinc-600">
                    Nenhuma mídia ainda.<br />Adicione vídeos ou imagens acima.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {assets.map((a) => (
                      <button key={a.id} type="button" onClick={() => addLayerFromAsset(a)}
                        className="group relative aspect-[9/16] overflow-hidden rounded-xl border border-white/8 bg-black transition-colors hover:border-primary/60"
                        style={{ backgroundImage: a.thumb ? `url(${a.thumb})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}
                        title={`Adicionar "${a.name}"`}>
                        <span className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/5" />
                        <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded bg-black/70 px-1 py-0.5 text-[7px] font-bold text-white">
                          {a.kind === 'video' ? <Film className="size-2.5" /> : <ImageIcon className="size-2.5" />}
                        </span>
                        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-white"><Plus className="size-4" /></span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {panel === 'element' && (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {!selected ? (
                <div className="mt-6 flex flex-col items-center gap-3 text-center">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-white/5 text-zinc-600"><Sparkles className="size-5" /></span>
                  <p className="text-[10px] font-bold leading-relaxed text-zinc-500">
                    Selecione um elemento na timeline ou no preview para editar suas propriedades e animações.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      {selected.kind === 'video' ? <Film className="size-4" /> : selected.kind === 'image' ? <ImageIcon className="size-4" /> : <Type className="size-4" />}
                    </span>
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-[11px] font-black text-white">{selected.name}</p>
                      <p className="text-[8px] font-bold tracking-[0.12em] text-zinc-600">{selected.kind.toUpperCase()} · {selected.duration.toFixed(1)}s</p>
                    </div>
                  </div>

                  {/* Camada (z-order) */}
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => reorderLayer(selected.id, 1)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-[8px] font-black tracking-[0.08em] text-zinc-300 hover:bg-white/10">
                      <ChevronUp className="size-3" /> FRENTE
                    </button>
                    <button type="button" onClick={() => reorderLayer(selected.id, -1)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-[8px] font-black tracking-[0.08em] text-zinc-300 hover:bg-white/10">
                      <ChevronDown className="size-3" /> ATRÁS
                    </button>
                  </div>

                  {/* Texto */}
                  {selected.kind === 'text' && (
                    <>
                      <div>
                        <p className="mb-1.5 text-[9px] font-black tracking-[0.12em] text-zinc-400">CONTEÚDO</p>
                        <textarea value={selected.text ?? ''} rows={2}
                          onChange={(e) => patchLayer(selected.id, { text: e.target.value })}
                          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[12px] font-bold text-white outline-none focus:border-primary/50" />
                      </div>
                      <div>
                        <p className="mb-1.5 text-[9px] font-black tracking-[0.12em] text-zinc-400">COR</p>
                        <div className="flex flex-wrap gap-2">
                          {TEXT_COLORS.map((c) => (
                            <button key={c} type="button" onClick={() => patchLayer(selected.id, { color: c })}
                              className={`size-6 rounded-full border-2 transition-transform hover:scale-110 ${selected.color === c ? 'border-primary' : 'border-white/20'}`}
                              style={{ backgroundColor: c }} aria-label={`Cor ${c}`} />
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mb-1.5 text-[9px] font-black tracking-[0.12em] text-zinc-400">TAMANHO</p>
                        <input type="range" min={0.03} max={0.16} step={0.005} value={selected.fontScale ?? 0.07}
                          onChange={(e) => patchLayer(selected.id, { fontScale: parseFloat(e.target.value) })}
                          className="w-full accent-[var(--primary)]" />
                      </div>
                    </>
                  )}

                  {/* Tamanho do overlay (imagem/vídeo não-fundo) */}
                  {selected.kind !== 'text' && !selected.cover && (
                    <div>
                      <p className="mb-1.5 text-[9px] font-black tracking-[0.12em] text-zinc-400">TAMANHO</p>
                      <input type="range" min={0.2} max={1} step={0.02} value={selected.scale}
                        onChange={(e) => patchLayer(selected.id, { scale: parseFloat(e.target.value) })}
                        className="w-full accent-[var(--primary)]" />
                    </div>
                  )}

                  {/* Preencher tela (fundo) */}
                  {selected.kind !== 'text' && (
                    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                      <span className="text-[10px] font-bold text-zinc-300">Preencher a tela (fundo)</span>
                      <input type="checkbox" checked={!!selected.cover}
                        onChange={(e) => patchLayer(selected.id, { cover: e.target.checked, cx: 0.5, cy: e.target.checked ? 0.5 : 0.42, scale: e.target.checked ? 1 : 0.55 })}
                        className="accent-[var(--primary)]" />
                    </label>
                  )}

                  {/* Animações do elemento */}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="size-3 text-primary" />
                      <p className="text-[9px] font-black tracking-[0.12em] text-zinc-400">ANIMAÇÃO DE ENTRADA</p>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {ANIMATIONS.map((a) => (
                        <button key={a.id} type="button" onClick={() => patchLayer(selected.id, { inAnim: a.id as AnimId })}
                          className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                            selected.inAnim === a.id ? 'border-primary/60 bg-primary/12 text-white' : 'border-white/8 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]'
                          }`}>
                          <span className={`text-sm ${selected.inAnim === a.id ? 'text-primary' : 'text-zinc-600'}`}>{ANIM_ICON[a.id]}</span>
                          <span className="text-[9px] font-bold">{a.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="size-3 text-primary" />
                      <p className="text-[9px] font-black tracking-[0.12em] text-zinc-400">ANIMAÇÃO DE SAÍDA</p>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {ANIMATIONS.map((a) => (
                        <button key={a.id} type="button" onClick={() => patchLayer(selected.id, { outAnim: a.id as AnimId })}
                          className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                            selected.outAnim === a.id ? 'border-primary/60 bg-primary/12 text-white' : 'border-white/8 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]'
                          }`}>
                          <span className={`text-sm ${selected.outAnim === a.id ? 'text-primary' : 'text-zinc-600'}`}>{ANIM_ICON[a.id]}</span>
                          <span className="text-[9px] font-bold">{a.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button type="button" onClick={() => deleteLayer(selected.id)}
                    className="mt-1 flex items-center justify-center gap-1.5 rounded-xl border border-destructive/25 bg-destructive/10 py-2.5 text-[9px] font-black tracking-[0.1em] text-destructive transition-colors hover:bg-destructive/20">
                    <Trash2 className="size-3.5" /> EXCLUIR ELEMENTO
                  </button>
                </div>
              )}
            </div>
          )}

          {panel === 'caption' && (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <p className="text-[9px] font-black tracking-[0.15em] text-zinc-500">LEGENDA</p>
              <p className="mt-1.5 text-[9px] font-bold leading-relaxed text-zinc-600">Texto que acompanha o story no feed (opcional).</p>
              <textarea value={caption} onChange={(e) => setCaption(e.target.value.slice(0, 140))} rows={4} placeholder="Escreva uma legenda…"
                className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[11px] font-bold text-white outline-none placeholder:text-zinc-600 focus:border-primary/50" />
              <p className="mt-1.5 text-right text-[8px] font-bold text-zinc-600">{caption.length}/140</p>
            </div>
          )}
        </aside>

        {/* Preview */}
        <section className="relative flex min-w-0 flex-1 items-center justify-center bg-[#070707] p-6">
          {layers.length === 0 ? (
            <button type="button" onClick={() => videoInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files) importFiles(e.dataTransfer.files, 'video') }}
              className="flex aspect-[9/16] h-full max-h-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-white/12 bg-white/[0.02] px-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/[0.04]">
              <div className="flex size-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10"><Plus className="size-8 text-primary" /></div>
              <div>
                <p className="font-serif text-base font-black text-white">Comece sua composição</p>
                <p className="mt-1 text-[10px] font-bold text-zinc-500">Adicione vídeos, imagens e textos em camadas.</p>
              </div>
              {loadingAdd && <p className="text-[9px] font-bold text-primary">Carregando…</p>}
            </button>
          ) : (
            <div className="relative flex h-full items-center justify-center">
              <canvas ref={canvasRef} width={EXPORT_W} height={EXPORT_H}
                onPointerDown={onPreviewPointerDown}
                className="h-full max-h-full touch-none rounded-2xl border border-white/10 bg-black shadow-2xl"
                style={{ aspectRatio: '9 / 16' }} />
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
        <div className="flex items-center gap-2 px-4 py-2">
          <button type="button" onClick={() => (playing ? pause() : play())} disabled={!layers.length}
            className="flex size-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 disabled:opacity-30" aria-label={playing ? 'Pausar' : 'Reproduzir'}>
            {playing ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 translate-x-px fill-current" />}
          </button>
          <span className="text-[8px] font-bold text-zinc-600">
            {layers.length} camada{layers.length === 1 ? '' : 's'} · arraste os blocos para mover / aparar
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={() => setPxPerSec((z) => Math.max(30, z - 20))}
              className="flex size-6 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10" aria-label="Reduzir zoom"><ZoomOut className="size-3" /></button>
            <button type="button" onClick={() => setPxPerSec((z) => Math.min(200, z + 20))}
              className="flex size-6 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10" aria-label="Aumentar zoom"><ZoomIn className="size-3" /></button>
          </div>
        </div>

        <div className="relative max-h-[230px] overflow-auto px-4 pb-4" ref={trackRef}>
          {/* ruler */}
          <div className="relative mb-1 h-4 cursor-pointer" style={{ width: Math.max(total * pxPerSec, 240) }}
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

          {/* tracks — front (topo) → back (base) */}
          <div className="relative flex flex-col gap-1" style={{ width: Math.max(total * pxPerSec, 240) }}>
            {[...layers].reverse().map((l) => {
              const isSel = l.id === selectedId
              return (
                <div key={l.id} className="relative h-11">
                  <div
                    onPointerDown={(e) => startBlockDrag(e, l.id, 'move')}
                    onClick={() => { setSelectedId(l.id); setPanel('element') }}
                    className={`group absolute top-0 flex h-full cursor-grab items-center overflow-hidden rounded-lg border-2 active:cursor-grabbing ${
                      isSel ? 'border-primary' : 'border-white/12'
                    } ${l.kind === 'text' ? 'bg-primary/15' : ''}`}
                    style={{
                      left: l.start * pxPerSec,
                      width: Math.max(l.duration * pxPerSec, 26),
                      backgroundImage: l.kind !== 'text' && l.thumb ? `url(${l.thumb})` : undefined,
                      backgroundSize: 'cover', backgroundPosition: 'center',
                    }}>
                    <div className="absolute inset-0 bg-black/45" />
                    <span className="pointer-events-none absolute left-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1 truncate pr-4 text-[8px] font-bold text-white">
                      {l.kind === 'video' ? <Film className="size-2.5 shrink-0" /> : l.kind === 'image' ? <ImageIcon className="size-2.5 shrink-0" /> : <Type className="size-2.5 shrink-0" />}
                      <span className="truncate">{l.kind === 'text' ? (l.text || 'Texto') : l.name}</span>
                    </span>
                    {l.cover && <span className="pointer-events-none absolute right-1 top-1 rounded bg-black/70 px-1 text-[6px] font-black tracking-wider text-zinc-300">FUNDO</span>}
                    <div onPointerDown={(e) => startBlockDrag(e, l.id, 'start')}
                      className="absolute inset-y-0 left-0 w-2 cursor-ew-resize bg-primary/70 opacity-0 group-hover:opacity-100" />
                    <div onPointerDown={(e) => startBlockDrag(e, l.id, 'end')}
                      className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-primary/70 opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
              )
            })}
          </div>

          {/* playhead */}
          {layers.length > 0 && (
            <div className="pointer-events-none absolute top-0 z-10 w-0.5 bg-primary" style={{ left: 16 + currentTime * pxPerSec, height: '100%' }}>
              <span className="absolute -top-0.5 left-1/2 size-2 -translate-x-1/2 rounded-full bg-primary" />
            </div>
          )}
        </div>
      </div>

      {/* ── Export overlay ── */}
      {phase === 'exporting' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-black/85 px-6 backdrop-blur-sm">
          <div className="flex size-16 items-center justify-center rounded-3xl border border-primary/30 bg-primary/10"><Film className="size-8 text-primary" /></div>
          <div className="w-full max-w-sm text-center">
            <p className="text-[11px] font-black tracking-[0.18em] text-white">{exportLabel.toUpperCase()}</p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${exportPct}%` }} />
            </div>
            <p className="font-numeric mt-2 text-[10px] font-bold text-primary">{exportPct}%</p>
            <p className="mt-3 text-[9px] font-bold leading-relaxed text-zinc-500">Renderizando o vídeo no seu navegador. Mantenha esta aba aberta.</p>
          </div>
        </div>
      )}

      {/* ── Erro ── */}
      {error && phase === 'editing' && (
        <div className="absolute inset-x-4 bottom-4 z-30 flex items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 backdrop-blur-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="whitespace-pre-line text-[10px] font-bold leading-relaxed text-destructive">{error}</p>
          <button type="button" onClick={() => setError('')} className="ml-auto text-zinc-400 hover:text-white" aria-label="Fechar"><X className="size-4" /></button>
        </div>
      )}
    </div>
  )
}
