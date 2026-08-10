'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fabric } from 'fabric'
import EmojiPicker from 'emoji-picker-react'
import {
  X, Type, Smile, Square, Circle as CircleIcon,
  Trash2, Download, Undo2, Redo2, AlignLeft, AlignCenter,
  AlignRight, Layers, ZoomIn, ZoomOut, Sparkles, Move,
  Film, Play, Pause, ImageIcon, Palette, Bold, Italic,
  Minus,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoryCanvasEditorProps {
  onSave?: (imageDataUrl: string) => void
  onCancel?: () => void
  backgroundImage?: string
}

type BgType = 'solid' | 'gradient' | 'video'
type SidePanel = 'bg' | 'text' | 'stickers' | 'shapes' | null

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS_W = 1080
const CANVAS_H = 1920

const PRESET_GRADIENTS = [
  { label: 'Marca',    stops: ['#ff8a00', '#ff4d00'] },
  { label: 'Rosa',     stops: ['#F953C6', '#B91D73'] },
  { label: 'Roxo',     stops: ['#7F00FF', '#E100FF'] },
  { label: 'Azul',     stops: ['#0072FF', '#00C6FF'] },
  { label: 'Verde',    stops: ['#11998e', '#38ef7d'] },
  { label: 'Noite',    stops: ['#0f0c29', '#302b63'] },
  { label: 'Ouro',     stops: ['#F7971E', '#FFD200'] },
  { label: 'Neon',     stops: ['#00F260', '#0575E6'] },
  { label: 'Club',     stops: ['#ff00a2', '#ff80d5'] },
  { label: 'Cinza',    stops: ['#1a1a2e', '#16213e'] },
  { label: 'Coral',    stops: ['#FF416C', '#FF4B2B'] },
  { label: 'Teal',     stops: ['#2193b0', '#6dd5ed'] },
]

const PRESET_FONTS = [
  { label: 'Sora',        value: 'var(--font-display), Sora, sans-serif' },
  { label: 'Space Grotesk', value: 'var(--font-numeric), Space Grotesk, monospace' },
  { label: 'Impact',      value: 'Impact, Haettenschweiler, sans-serif' },
  { label: 'Georgia',     value: 'Georgia, Times New Roman, serif' },
  { label: 'Bebas Neue',  value: 'var(--font-bebas), Bebas Neue, Impact, sans-serif' },
  { label: 'Playfair',    value: 'var(--font-playfair), Playfair Display, Georgia, serif' },
]

const STICKER_GROUPS = [
  { label: '🔥 Fogo',   items: ['🔥','⚡','💥','✨','🌟','💫','🎆','🎇','☄️','🌈'] },
  { label: '❤️ Amor',   items: ['❤️','💖','💜','🖤','💛','🤍','💞','💝','🫶','💘'] },
  { label: '🎵 Música', items: ['🎵','🎶','🎸','🎤','🎧','🥁','🎹','🎼','🎺','🪗'] },
  { label: '🤟 Gestos', items: ['🤟','👏','🙌','🤙','✌️','👊','🤘','💪','🤌','🫰'] },
  { label: '😍 Rostos', items: ['😍','🥰','🤩','😎','🤯','🥺','😤','🤑','🫠','🤭'] },
]

const TEXT_PRESETS = [
  { label: 'Limpo',    shadow: null,   stroke: null },
  { label: 'Sombra',   shadow: 'rgba(0,0,0,0.7) 4px 4px 12px', stroke: null },
  { label: 'Contorno', shadow: null,   stroke: '#000000' },
  { label: 'Neon',     shadow: 'rgba(255,107,0,0.9) 0 0 20px, rgba(255,107,0,0.5) 0 0 40px', stroke: null },
]

const QUICK_COLORS = ['#ffffff','#000000','#ff6b00','#ff00a2','#ffc857','#00C6FF','#38ef7d','#F953C6','#7F00FF','#ff4d4d']

// ─── UI atoms ─────────────────────────────────────────────────────────────────

function ToolBtn({ onClick, active, title, children, danger }: {
  onClick: () => void; active?: boolean; title: string
  children: React.ReactNode; danger?: boolean
}) {
  return (
    <button type="button" onClick={onClick} title={title}
      className={[
        'flex size-8 shrink-0 items-center justify-center rounded-xl transition-all',
        active  ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
               : danger ? 'text-destructive/70 hover:bg-destructive/10 hover:text-destructive'
               : 'text-zinc-500 hover:bg-white/[0.06] hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <span className="mx-0.5 h-4 w-px shrink-0 bg-white/[0.07]" />
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return <p className="admin-eyebrow mb-2">{children}</p>
}

function PanelSection({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3">{children}</div>
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function StoryCanvasEditor({ onSave, onCancel, backgroundImage }: StoryCanvasEditorProps) {
  const canvasRef        = useRef<HTMLCanvasElement>(null)
  const fc               = useRef<fabric.Canvas | null>(null)
  const histRef          = useRef<string[]>([])
  const histIdx          = useRef(-1)
  const imgInputRef      = useRef<HTMLInputElement>(null)
  const bgVideoRef       = useRef<HTMLVideoElement | null>(null)
  const bgVideoRaf       = useRef(0)
  const vidObjsRef       = useRef<Map<fabric.Image, HTMLVideoElement>>(new Map())
  const vidObjsRaf       = useRef(0)

  const [panel,       setPanel]       = useState<SidePanel>('bg')
  const [bgType,      setBgType]      = useState<BgType>('gradient')
  const [bgSolid,     setBgSolid]     = useState('#0f0c29')
  const [bgGrad,      setBgGrad]      = useState(PRESET_GRADIENTS[0])
  const [gradA,       setGradA]       = useState('#ff8a00')
  const [gradB,       setGradB]       = useState('#ff4d00')
  const [bgVideoSrc,  setBgVideoSrc]  = useState<string | null>(null)
  const [vidPlaying,  setVidPlaying]  = useState(true)
  const [textColor,   setTextColor]   = useState('#ffffff')
  const [fontSize,    setFontSize]    = useState(96)
  const [fontFamily,  setFontFamily]  = useState(PRESET_FONTS[0].value)
  const [textPreset,  setTextPreset]  = useState(0)
  const [align,       setAlign]       = useState<'left'|'center'|'right'>('center')
  const [stickerTab,  setStickerTab]  = useState(0)
  const [showEmoji,   setShowEmoji]   = useState(false)
  const [zoom,        setZoom]        = useState(0.24)
  const [canUndo,     setCanUndo]     = useState(false)
  const [canRedo,     setCanRedo]     = useState(false)
  const [activeObj,   setActiveObj]   = useState<fabric.Object | null>(null)

  // ── History ────────────────────────────────────────────────────────────────
  const snap = useCallback(() => {
    if (!fc.current) return
    const json = JSON.stringify(fc.current.toJSON())
    const list = histRef.current.slice(0, histIdx.current + 1)
    list.push(json)
    histRef.current = list.slice(-40)
    histIdx.current = histRef.current.length - 1
    setCanUndo(histIdx.current > 0)
    setCanRedo(false)
  }, [])

  const undo = useCallback(() => {
    if (!fc.current || histIdx.current <= 0) return
    histIdx.current--
    fc.current.loadFromJSON(histRef.current[histIdx.current], () => {
      fc.current!.renderAll()
      setCanUndo(histIdx.current > 0)
      setCanRedo(true)
    })
  }, [])

  const redo = useCallback(() => {
    if (!fc.current || histIdx.current >= histRef.current.length - 1) return
    histIdx.current++
    fc.current.loadFromJSON(histRef.current[histIdx.current], () => {
      fc.current!.renderAll()
      setCanUndo(true)
      setCanRedo(histIdx.current < histRef.current.length - 1)
    })
  }, [])

  // ── Background helpers ─────────────────────────────────────────────────────
  const applyGradient = useCallback((a: string, b: string) => {
    const c = fc.current; if (!c) return
    c.setBackgroundImage('', c.renderAll.bind(c))
    c.setBackgroundColor(new fabric.Gradient({
      type: 'linear', gradientUnits: 'pixels',
      coords: { x1: 0, y1: 0, x2: 0, y2: CANVAS_H },
      colorStops: [{ offset: 0, color: a }, { offset: 1, color: b }],
    }) as unknown as string, c.renderAll.bind(c))
  }, [])

  const applySolid = useCallback((col: string) => {
    const c = fc.current; if (!c) return
    c.setBackgroundImage('', c.renderAll.bind(c))
    c.setBackgroundColor(col, c.renderAll.bind(c))
  }, [])

  // ── Video background ───────────────────────────────────────────────────────
  const stopBgLoop = useCallback(() => cancelAnimationFrame(bgVideoRaf.current), [])

  const startBgLoop = useCallback(() => {
    const canvas = fc.current; const video = bgVideoRef.current
    if (!canvas || !video) return
    function tick() {
      if (video && !video.paused && !video.ended) {
        const ctx = (canvas as unknown as { contextContainer: CanvasRenderingContext2D }).contextContainer
        if (ctx) { ctx.drawImage(video, 0, 0, CANVAS_W, CANVAS_H); canvas!.renderAll() }
      }
      bgVideoRaf.current = requestAnimationFrame(tick)
    }
    bgVideoRaf.current = requestAnimationFrame(tick)
  }, [])

  const applyBgVideo = useCallback((src: string) => {
    stopBgLoop()
    const canvas = fc.current; if (!canvas) return
    canvas.setBackgroundImage('', canvas.renderAll.bind(canvas))
    canvas.setBackgroundColor('', canvas.renderAll.bind(canvas))
    if (bgVideoRef.current) { bgVideoRef.current.pause(); bgVideoRef.current.src = '' }
    const v = document.createElement('video')
    v.src = src; v.loop = true; v.muted = true; v.playsInline = true; v.crossOrigin = 'anonymous'
    v.style.display = 'none'; document.body.appendChild(v)
    bgVideoRef.current = v
    v.addEventListener('loadeddata', () => {
      v.play().then(() => { setVidPlaying(true); startBgLoop() }).catch(() => {})
    }, { once: true })
  }, [startBgLoop, stopBgLoop])

  function toggleBgVideo() {
    const v = bgVideoRef.current; if (!v) return
    v.paused ? v.play().then(() => setVidPlaying(true)) : (v.pause(), setVidPlaying(false))
  }

  // ── Video objects loop ─────────────────────────────────────────────────────
  const stopVidObjs  = useCallback(() => cancelAnimationFrame(vidObjsRaf.current), [])
  const startVidObjs = useCallback(() => {
    function tick() {
      vidObjsRef.current.forEach((v, img) => {
        if (!v.paused && !v.ended) { img.setElement(v as unknown as HTMLImageElement); img.dirty = true }
      })
      if (vidObjsRef.current.size > 0 && fc.current) fc.current.renderAll()
      vidObjsRaf.current = requestAnimationFrame(tick)
    }
    vidObjsRaf.current = requestAnimationFrame(tick)
  }, [])

  function addVideoObject(src: string) {
    const canvas = fc.current; if (!canvas) return
    const v = document.createElement('video')
    v.src = src; v.loop = true; v.muted = true; v.playsInline = true
    v.crossOrigin = 'anonymous'; v.style.display = 'none'; document.body.appendChild(v)
    v.addEventListener('loadeddata', () => {
      v.play().catch(() => {})
      const fImg = new fabric.Image(v as unknown as HTMLImageElement, {
        left: CANVAS_W / 2, top: CANVAS_H / 2, originX: 'center', originY: 'center', objectCaching: false,
      })
      if ((v.videoWidth || 800) > 800) fImg.scaleToWidth(800)
      canvas.add(fImg); canvas.setActiveObject(fImg); canvas.requestRenderAll()
      vidObjsRef.current.set(fImg, v)
      if (vidObjsRef.current.size === 1) startVidObjs()
      canvas.on('object:removed', (e) => {
        if (e.target !== fImg) return
        vidObjsRef.current.delete(fImg); v.pause()
        if (document.body.contains(v)) document.body.removeChild(v)
        if (vidObjsRef.current.size === 0) stopVidObjs()
      })
    }, { once: true })
  }

  // ── Init canvas ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_W, height: CANVAS_H, preserveObjectStacking: true,
    })
    fc.current = canvas

    if (backgroundImage) {
      setBgType('gradient')
      fabric.Image.fromURL(backgroundImage, (img) => {
        img.set({ scaleX: CANVAS_W/(img.width??CANVAS_W), scaleY: CANVAS_H/(img.height??CANVAS_H),
          originX:'left', originY:'top', left:0, top:0, selectable:false, evented:false })
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas))
      }, { crossOrigin: 'anonymous' })
    } else {
      applyGradient(PRESET_GRADIENTS[0].stops[0], PRESET_GRADIENTS[0].stops[1])
    }

    canvas.on('object:added',    snap)
    canvas.on('object:modified', snap)
    canvas.on('object:removed',  snap)
    canvas.on('selection:created', (e) => setActiveObj(e.selected?.[0] ?? null))
    canvas.on('selection:updated', (e) => setActiveObj(e.selected?.[0] ?? null))
    canvas.on('selection:cleared', ()  => setActiveObj(null))

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const objs = canvas.getActiveObjects()
        if (objs.length) { canvas.discardActiveObject(); objs.forEach((o) => canvas.remove(o)); canvas.requestRenderAll() }
      }
      if ((e.metaKey||e.ctrlKey) && e.key === 'z') e.shiftKey ? redo() : undo()
    }
    window.addEventListener('keydown', onKey)
    snap()

    return () => {
      window.removeEventListener('keydown', onKey)
      stopBgLoop(); stopVidObjs()
      if (bgVideoRef.current) {
        bgVideoRef.current.pause()
        if (document.body.contains(bgVideoRef.current)) document.body.removeChild(bgVideoRef.current)
      }
      vidObjsRef.current.forEach((v) => { v.pause(); if (document.body.contains(v)) document.body.removeChild(v) })
      vidObjsRef.current.clear()
      canvas.dispose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!fc.current || bgType === 'video') return
    if (bgType === 'solid') { stopBgLoop(); applySolid(bgSolid) }
    else { stopBgLoop(); applyGradient(bgGrad.label === 'custom' ? gradA : bgGrad.stops[0], bgGrad.label === 'custom' ? gradB : bgGrad.stops[1]) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgType, bgSolid, bgGrad, gradA, gradB])

  // ── Canvas actions ────────────────────────────────────────────────────────
  function addText() {
    if (!fc.current) return
    const p = TEXT_PRESETS[textPreset]
    const txt = new fabric.IText('ESCREVA AQUI', {
      left: CANVAS_W/2, top: CANVAS_H/2, originX:'center', originY:'center',
      fontFamily, fontSize, fill: textColor, textAlign: align, editable: true,
      ...(p.stroke ? { stroke: p.stroke, strokeWidth: Math.max(2, fontSize*0.06), paintFirst:'stroke' } : {}),
      ...(p.shadow ? { shadow: new fabric.Shadow({ color: p.shadow.split(' ')[0], blur: 20, offsetX: p.shadow.includes('4px') ? 4 : 0, offsetY: p.shadow.includes('4px') ? 4 : 0 }) } : {}),
    })
    fc.current.add(txt); fc.current.setActiveObject(txt); fc.current.requestRenderAll()
    setPanel(null)
  }

  function addEmoji(e: string) {
    if (!fc.current) return
    fc.current.add(new fabric.Text(e, {
      left: CANVAS_W/2, top: CANVAS_H/2, originX:'center', originY:'center', fontSize: 200,
    }))
    fc.current.requestRenderAll(); setShowEmoji(false)
  }

  function addRect() {
    if (!fc.current) return
    fc.current.add(new fabric.Rect({ left:340, top:760, width:400, height:400,
      fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.35)', strokeWidth:4, rx:48, ry:48 }))
    fc.current.requestRenderAll()
  }

  function addCircle() {
    if (!fc.current) return
    fc.current.add(new fabric.Circle({ left:CANVAS_W/2, top:CANVAS_H/2, originX:'center', originY:'center',
      radius:200, fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.35)', strokeWidth:4 }))
    fc.current.requestRenderAll()
  }

  function addLine() {
    if (!fc.current) return
    fc.current.add(new fabric.Line([160, CANVAS_H/2, CANVAS_W-160, CANVAS_H/2],
      { stroke:'rgba(255,255,255,0.5)', strokeWidth:8 }))
    fc.current.requestRenderAll()
  }

  function handleImgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !fc.current) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image(); img.src = ev.target!.result as string
      img.onload = () => {
        const fImg = new fabric.Image(img)
        fImg.scaleToWidth(700)
        fImg.set({ left:CANVAS_W/2, top:CANVAS_H/2, originX:'center', originY:'center' })
        fc.current!.add(fImg); fc.current!.setActiveObject(fImg); fc.current!.requestRenderAll()
      }
    }
    reader.readAsDataURL(file); e.target.value = ''
  }

  function handleVidUpload(e: React.ChangeEvent<HTMLInputElement>, mode: 'bg'|'object') {
    const file = e.target.files?.[0]; if (!file) return
    const src = URL.createObjectURL(file)
    if (mode === 'bg') { setBgVideoSrc(src); setBgType('video'); applyBgVideo(src) }
    else addVideoObject(src)
    e.target.value = ''
  }

  function deleteSelected() {
    if (!fc.current) return
    const objs = fc.current.getActiveObjects()
    if (!objs.length) return
    fc.current.discardActiveObject(); objs.forEach((o) => fc.current!.remove(o)); fc.current.requestRenderAll()
  }

  function updateText(props: Record<string, unknown>) {
    if (!fc.current) return
    const o = fc.current.getActiveObject()
    if (o && (o.type === 'i-text' || o.type === 'text')) {
      o.set(props as Partial<fabric.IText>); fc.current.requestRenderAll(); snap()
    }
  }

  function handleSave() {
    if (!fc.current) return
    fc.current.discardActiveObject(); fc.current.renderAll()
    onSave?.(fc.current.toDataURL({ format:'png', quality:1, multiplier:1 }))
  }

  function handleDownload() {
    if (!fc.current) return
    fc.current.discardActiveObject(); fc.current.renderAll()
    const a = document.createElement('a'); a.download = `story-${Date.now()}.png`
    a.href = fc.current.toDataURL({ format:'png', quality:1 }); a.click()
  }

  const PANEL_TABS: { key: SidePanel; label: string; icon: React.ReactNode }[] = [
    { key:'bg',       label:'FUNDO',    icon:<Palette className="size-3.5" /> },
    { key:'text',     label:'TEXTO',    icon:<Type    className="size-3.5" /> },
    { key:'stickers', label:'STICKERS', icon:<Smile   className="size-3.5" /> },
    { key:'shapes',   label:'FORMAS',   icon:<Square  className="size-3.5" /> },
  ]

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-[640px] flex-col overflow-hidden rounded-[1.5rem] border border-white/8 bg-[#090909]"
         style={{ boxShadow:'inset 0 1px 0 rgba(255,255,255,0.025)' }}>

      {/* ── Topbar ── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/8 bg-[#050505] px-4 py-2.5">
        <Sparkles className="size-3.5 text-primary" />
        <span className="font-serif text-xs font-black tracking-[0.15em] text-white">EDITOR DE STORIES</span>

        <div className="mx-3 h-4 w-px bg-white/[0.07]" />

        {/* undo/redo */}
        <ToolBtn onClick={undo} active={canUndo} title="Desfazer Ctrl+Z"><Undo2 className="size-3.5"/></ToolBtn>
        <ToolBtn onClick={redo} active={canRedo} title="Refazer Ctrl+Shift+Z"><Redo2 className="size-3.5"/></ToolBtn>
        <Sep/>

        {/* image / video inputs */}
        <label className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-xl text-zinc-500 transition-all hover:bg-white/[0.06] hover:text-white" title="Adicionar imagem">
          <input ref={imgInputRef} type="file" accept="image/*" onChange={handleImgUpload} className="sr-only"/>
          <ImageIcon className="size-3.5"/>
        </label>
        <label className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-xl text-zinc-500 transition-all hover:bg-white/[0.06] hover:text-white" title="Inserir vídeo no canvas">
          <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => handleVidUpload(e,'object')} className="sr-only"/>
          <Film className="size-3.5"/>
        </label>
        <Sep/>

        {/* object controls — only when something is selected */}
        {activeObj && (<>
          <ToolBtn onClick={() => { const o=fc.current?.getActiveObject(); if(o&&fc.current) fc.current.bringForward(o,true) }} title="Trazer à frente"><Layers className="size-3.5"/></ToolBtn>
          <ToolBtn onClick={() => { const o=fc.current?.getActiveObject(); if(o&&fc.current) fc.current.sendBackwards(o,true) }} title="Enviar para trás"><Move className="size-3.5"/></ToolBtn>
          <ToolBtn onClick={deleteSelected} title="Excluir selecionado" danger><Trash2 className="size-3.5"/></ToolBtn>
          <Sep/>
        </>)}

        {/* zoom */}
        <ToolBtn onClick={() => setZoom(z=>Math.max(0.1,+(z-0.04).toFixed(2)))} title="Zoom -"><ZoomOut className="size-3.5"/></ToolBtn>
        <span className="font-numeric min-w-[32px] text-center text-[9px] font-bold text-zinc-600">
          {Math.round(zoom*100)}%
        </span>
        <ToolBtn onClick={() => setZoom(z=>Math.min(0.55,+(z+0.04).toFixed(2)))} title="Zoom +"><ZoomIn className="size-3.5"/></ToolBtn>
        <Sep/>
        <ToolBtn onClick={handleDownload} title="Baixar PNG"><Download className="size-3.5"/></ToolBtn>

        <div className="flex-1"/>
        <button type="button" onClick={onCancel}
          className="flex size-7 items-center justify-center rounded-lg border border-white/8 text-zinc-600 transition-colors hover:border-white/15 hover:text-white">
          <X className="size-3.5"/>
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* Left: panel tabs */}
        <div className="flex w-14 shrink-0 flex-col gap-1 border-r border-white/8 bg-[#050505] py-3 px-1.5">
          {PANEL_TABS.map(({ key, label, icon }) => (
            <button key={key} type="button" onClick={() => setPanel(p => p===key ? null : key)}
              title={label}
              className={[
                'flex flex-col items-center gap-1 rounded-xl py-2.5 text-[6px] font-black tracking-[0.1em] transition-all',
                panel===key
                  ? 'bg-primary/15 text-primary ring-1 ring-inset ring-primary/20'
                  : 'text-zinc-600 hover:bg-white/[0.04] hover:text-zinc-300',
              ].join(' ')}>
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Panel content */}
        {panel && (
          <aside className="scrollbar-none w-56 shrink-0 overflow-y-auto border-r border-white/8 bg-[#070707] p-4">

            {/* ── BACKGROUND ── */}
            {panel === 'bg' && (
              <PanelSection>
                <PanelLabel>FUNDO</PanelLabel>

                {/* type selector */}
                <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/8 bg-black/30 p-1">
                  {(['solid','gradient','video'] as BgType[]).map((t) => (
                    <button key={t} type="button"
                      onClick={() => { if (t!=='video') setBgType(t) }}
                      className={`rounded-lg py-1.5 text-[7px] font-black tracking-[0.08em] transition-all ${bgType===t ? 'bg-primary/15 text-primary' : 'text-zinc-600 hover:text-zinc-300'}`}>
                      {t==='solid' ? 'SÓLIDO' : t==='gradient' ? 'GRADIENTE' : 'VÍDEO'}
                    </button>
                  ))}
                </div>

                {bgType === 'solid' && (
                  <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/20 p-3">
                    <input type="color" value={bgSolid}
                      onChange={(e) => setBgSolid(e.target.value)}
                      className="size-9 cursor-pointer rounded-lg border-0 bg-transparent p-0"/>
                    <span className="font-mono text-[9px] font-bold text-zinc-500">{bgSolid.toUpperCase()}</span>
                  </div>
                )}

                {bgType === 'gradient' && (<>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PRESET_GRADIENTS.map((g) => (
                      <button key={g.label} type="button" onClick={() => setBgGrad(g)} title={g.label}
                        className={`aspect-square rounded-xl transition-all ${bgGrad.label===g.label ? 'ring-2 ring-primary ring-offset-1 ring-offset-[#070707]' : 'ring-1 ring-white/10 hover:ring-white/20'}`}
                        style={{ background:`linear-gradient(135deg,${g.stops[0]},${g.stops[1]})` }}/>
                    ))}
                  </div>
                  <PanelLabel>PERSONALIZADO</PanelLabel>
                  <div className="flex items-center gap-2">
                    <input type="color" value={gradA}
                      onChange={(e)=>{ setGradA(e.target.value); setBgGrad({label:'custom',stops:[e.target.value,gradB]}) }}
                      className="size-8 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0.5"/>
                    <div className="h-1.5 flex-1 rounded-full" style={{background:`linear-gradient(90deg,${gradA},${gradB})`}}/>
                    <input type="color" value={gradB}
                      onChange={(e)=>{ setGradB(e.target.value); setBgGrad({label:'custom',stops:[gradA,e.target.value]}) }}
                      className="size-8 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0.5"/>
                  </div>
                </>)}

                {bgType === 'video' && (
                  <div className="flex flex-col gap-3">
                    <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-primary/30 bg-primary/[0.05] p-5 transition-colors hover:border-primary/50 hover:bg-primary/[0.08]">
                      <input type="file" accept="video/mp4,video/webm,video/quicktime"
                        onChange={(e) => handleVidUpload(e,'bg')} className="sr-only"/>
                      <Film className="size-6 text-primary"/>
                      <p className="text-[9px] font-black tracking-[0.1em] text-primary">
                        {bgVideoSrc ? 'TROCAR VÍDEO' : 'ESCOLHER VÍDEO'}
                      </p>
                      <p className="text-[7px] font-bold text-zinc-600">MP4 · WebM · MOV</p>
                    </label>
                    {bgVideoSrc && (
                      <>
                        <button type="button" onClick={toggleBgVideo}
                          className="flex items-center gap-2 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5 text-[9px] font-black text-zinc-300 transition-colors hover:bg-white/[0.06]">
                          {vidPlaying ? <Pause className="size-3.5 text-primary"/> : <Play className="size-3.5 text-primary"/>}
                          {vidPlaying ? 'PAUSAR' : 'REPRODUZIR'}
                        </button>
                        <p className="rounded-xl border border-amber-500/15 bg-amber-500/8 px-3 py-2 text-[7px] font-bold leading-relaxed text-amber-300/80">
                          Ao salvar, o frame atual é capturado como imagem PNG.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </PanelSection>
            )}

            {/* ── TEXT ── */}
            {panel === 'text' && (
              <PanelSection>
                <PanelLabel>TEXTO</PanelLabel>

                <div>
                  <p className="admin-eyebrow mb-1.5">COR</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_COLORS.map((c) => (
                      <button key={c} type="button"
                        onClick={() => { setTextColor(c); updateText({fill:c}) }}
                        className={`size-6 rounded-full border-2 transition-all ${textColor===c ? 'border-primary scale-110' : 'border-white/15 hover:border-white/30'}`}
                        style={{backgroundColor:c}}/>
                    ))}
                    <label className="size-6 cursor-pointer rounded-full border-2 border-dashed border-white/20" title="Personalizada">
                      <input type="color" value={textColor}
                        onChange={(e)=>{ setTextColor(e.target.value); updateText({fill:e.target.value}) }}
                        className="sr-only"/>
                    </label>
                  </div>
                </div>

                <div>
                  <p className="admin-eyebrow mb-1.5">FONTE</p>
                  <div className="flex flex-col gap-1">
                    {PRESET_FONTS.map((f) => (
                      <button key={f.label} type="button"
                        onClick={() => { setFontFamily(f.value); updateText({fontFamily:f.value}) }}
                        className={`rounded-xl px-3 py-2 text-left text-[11px] font-bold transition-all ${fontFamily===f.value ? 'bg-primary/12 text-primary ring-1 ring-inset ring-primary/20' : 'border border-white/[0.065] text-zinc-400 hover:bg-white/[0.04] hover:text-white'}`}
                        style={{fontFamily:f.value}}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="admin-eyebrow">TAMANHO</p>
                    <span className="font-numeric text-[9px] font-bold text-primary">{fontSize}px</span>
                  </div>
                  <input type="range" min={24} max={360} step={8} value={fontSize}
                    onChange={(e)=>{ const v=Number(e.target.value); setFontSize(v); updateText({fontSize:v}) }}
                    className="w-full" style={{accentColor:'var(--primary)'}}/>
                </div>

                <div>
                  <p className="admin-eyebrow mb-1.5">ALINHAMENTO</p>
                  <div className="flex gap-1">
                    {([['left',<AlignLeft key="l" className="size-3.5"/>],['center',<AlignCenter key="c" className="size-3.5"/>],['right',<AlignRight key="r" className="size-3.5"/>]] as const).map(([a,icon])=>(
                      <button key={a} type="button"
                        onClick={()=>{ setAlign(a); updateText({textAlign:a}) }}
                        className={`flex flex-1 items-center justify-center rounded-xl py-2 transition-all ${align===a ? 'bg-primary/15 text-primary' : 'border border-white/8 text-zinc-500 hover:text-white'}`}>
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="admin-eyebrow mb-1.5">FORMATAÇÃO</p>
                  <div className="flex gap-1">
                    <button type="button" onClick={()=>updateText({fontWeight:'bold'})}
                      className="flex flex-1 items-center justify-center rounded-xl border border-white/8 py-2 text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-white">
                      <Bold className="size-3.5"/>
                    </button>
                    <button type="button" onClick={()=>updateText({fontStyle:'italic'})}
                      className="flex flex-1 items-center justify-center rounded-xl border border-white/8 py-2 text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-white">
                      <Italic className="size-3.5"/>
                    </button>
                    <button type="button" onClick={()=>updateText({underline:true})}
                      className="flex flex-1 items-center justify-center rounded-xl border border-white/8 py-2 text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-white">
                      <Minus className="size-3.5"/>
                    </button>
                  </div>
                </div>

                <div>
                  <p className="admin-eyebrow mb-1.5">ESTILO</p>
                  <div className="grid grid-cols-2 gap-1">
                    {TEXT_PRESETS.map((p,i) => (
                      <button key={p.label} type="button" onClick={()=>setTextPreset(i)}
                        className={`rounded-xl py-2 text-[8px] font-black tracking-[0.08em] transition-all ${textPreset===i ? 'bg-primary/15 text-primary ring-1 ring-inset ring-primary/20' : 'border border-white/8 text-zinc-500 hover:text-white'}`}>
                        {p.label.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="button" onClick={addText}
                  className="gradient-brand w-full rounded-2xl py-3 text-[9px] font-black tracking-[0.18em] text-white shadow-[0_8px_20px_-8px_rgba(255,106,0,0.6)]">
                  + ADICIONAR TEXTO
                </button>
              </PanelSection>
            )}

            {/* ── STICKERS ── */}
            {panel === 'stickers' && (
              <PanelSection>
                <PanelLabel>STICKERS & EMOJIS</PanelLabel>
                <div className="scrollbar-none flex gap-1 overflow-x-auto pb-1">
                  {STICKER_GROUPS.map((g,i) => (
                    <button key={g.label} type="button" onClick={()=>setStickerTab(i)}
                      className={`shrink-0 rounded-xl px-2.5 py-1.5 text-[7px] font-black tracking-[0.08em] transition-all ${stickerTab===i ? 'bg-primary/15 text-primary' : 'border border-white/8 text-zinc-500'}`}>
                      {g.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {STICKER_GROUPS[stickerTab].items.map((em) => (
                    <button key={em} type="button" onClick={()=>addEmoji(em)}
                      className="flex aspect-square items-center justify-center rounded-xl border border-white/[0.065] bg-black/20 text-xl transition-all hover:border-primary/20 hover:bg-primary/[0.06]">
                      {em}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <button type="button" onClick={()=>setShowEmoji(!showEmoji)}
                    className="w-full rounded-xl border border-white/8 py-2.5 text-[8px] font-black tracking-[0.1em] text-zinc-500 transition-colors hover:border-white/15 hover:text-zinc-300">
                    TODOS OS EMOJIS…
                  </button>
                  {showEmoji && (
                    <div className="absolute left-0 top-full z-50 mt-1">
                      <EmojiPicker onEmojiClick={(e)=>addEmoji(e.emoji)} height={320} width={224}/>
                    </div>
                  )}
                </div>
              </PanelSection>
            )}

            {/* ── SHAPES ── */}
            {panel === 'shapes' && (
              <PanelSection>
                <PanelLabel>FORMAS</PanelLabel>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label:'Retângulo', icon:<Square className="size-5"/>, fn:addRect },
                    { label:'Círculo',   icon:<CircleIcon className="size-5"/>, fn:addCircle },
                    { label:'Linha',     icon:<Minus className="size-5"/>, fn:addLine },
                  ].map((s) => (
                    <button key={s.label} type="button" onClick={s.fn}
                      className="flex flex-col items-center gap-2 rounded-2xl border border-white/[0.065] bg-black/20 py-4 text-[7px] font-black tracking-[0.1em] text-zinc-500 transition-all hover:border-primary/20 hover:bg-primary/[0.05] hover:text-white">
                      {s.icon}
                      {s.label.toUpperCase()}
                    </button>
                  ))}
                </div>
                <PanelLabel>VÍDEO COMO OBJETO</PanelLabel>
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-3.5 transition-colors hover:border-primary/30 hover:bg-primary/[0.05]">
                  <input type="file" accept="video/mp4,video/webm,video/quicktime"
                    onChange={(e)=>handleVidUpload(e,'object')} className="sr-only"/>
                  <Film className="size-4 text-zinc-500"/>
                  <div>
                    <p className="text-[8px] font-black tracking-[0.1em] text-zinc-300">INSERIR VÍDEO</p>
                    <p className="text-[7px] font-bold text-zinc-600">Posicionável no canvas</p>
                  </div>
                </label>
              </PanelSection>
            )}

          </aside>
        )}

        {/* ── Canvas area ── */}
        <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto bg-[#111] p-5">
          <div className="relative shrink-0 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.9)]"
               style={{ width: CANVAS_W*zoom, height: CANVAS_H*zoom }}>
            <div style={{ width:CANVAS_W*zoom, height:CANVAS_H*zoom, transform:`scale(${zoom})`, transformOrigin:'top left' }}>
              <canvas ref={canvasRef}/>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/8 bg-[#050505] px-5 py-3">
        <p className="font-mono text-[8px] font-bold text-zinc-700">
          {CANVAS_W}×{CANVAS_H}px · Duplo clique edita texto · Delete remove
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel}
            className="h-9 rounded-xl border border-white/8 px-5 text-[8px] font-black tracking-[0.15em] text-zinc-500 transition-colors hover:border-white/15 hover:text-white">
            CANCELAR
          </button>
          <button type="button" onClick={handleSave}
            className="gradient-brand flex h-9 items-center gap-2 rounded-xl px-6 text-[8px] font-black tracking-[0.18em] text-white shadow-[0_8px_20px_-8px_rgba(255,106,0,0.7)]">
            <Sparkles className="size-3"/>
            PUBLICAR STORY
          </button>
        </div>
      </div>
    </div>
  )
}
