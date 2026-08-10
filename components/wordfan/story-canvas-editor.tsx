'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fabric } from 'fabric'
import EmojiPicker from 'emoji-picker-react'
import {
  X, Type, ImageIcon, Smile, Square, Circle as CircleIcon,
  Trash2, Download, Undo2, Redo2, AlignLeft, AlignCenter,
  AlignRight, Bold, Italic, Layers, ZoomIn, ZoomOut,
  Palette, Sparkles, Move,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoryCanvasEditorProps {
  onSave?: (imageDataUrl: string) => void
  onCancel?: () => void
  backgroundImage?: string
}

type BgType = 'solid' | 'gradient' | 'image'

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS_W = 1080
const CANVAS_H = 1920

const PRESET_GRADIENTS = [
  { label: 'Laranja', stops: ['#FF8A00', '#FF4D00'] },
  { label: 'Rosa', stops: ['#F953C6', '#B91D73'] },
  { label: 'Roxo', stops: ['#7F00FF', '#E100FF'] },
  { label: 'Azul', stops: ['#0072FF', '#00C6FF'] },
  { label: 'Verde', stops: ['#11998e', '#38ef7d'] },
  { label: 'Escuro', stops: ['#0f0c29', '#302b63'] },
  { label: 'Dourado', stops: ['#F7971E', '#FFD200'] },
  { label: 'Neon', stops: ['#00F260', '#0575E6'] },
]

const PRESET_FONTS = [
  { label: 'Sora', value: 'Sora, sans-serif' },
  { label: 'Impact', value: 'Impact, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Courier', value: 'Courier New, monospace' },
]

const STICKER_GROUPS: { label: string; items: string[] }[] = [
  { label: 'Fogo', items: ['🔥', '⚡', '💥', '✨', '🌟', '💫', '🎆', '🎇'] },
  { label: 'Amor', items: ['❤️', '💖', '💜', '🖤', '💛', '🤍', '💞', '💝'] },
  { label: 'Música', items: ['🎵', '🎶', '🎸', '🎤', '🎧', '🥁', '🎹', '🎼'] },
  { label: 'Gestos', items: ['🤟', '👏', '🙌', '🤙', '✌️', '👊', '🤘', '💪'] },
  { label: 'Rostos', items: ['😍', '🥰', '🤩', '😎', '🤯', '🥺', '😤', '🔥'] },
]

const TEXT_STYLES = [
  { label: 'Normal', shadow: false, stroke: false },
  { label: 'Sombra', shadow: true, stroke: false },
  { label: 'Contorno', shadow: false, stroke: true },
  { label: 'Neon', shadow: true, stroke: true },
]

// ─── Small UI helpers ─────────────────────────────────────────────────────────

function ToolBtn({
  onClick, active, title, children, danger,
}: {
  onClick: () => void; active?: boolean; title: string
  children: React.ReactNode; danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={[
        'flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors',
        active
          ? 'bg-primary/20 text-primary'
          : danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-zinc-400 hover:bg-white/[0.07] hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 rounded-full bg-white/10" />
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[8px] font-black tracking-[0.2em] text-zinc-500">
      {children}
    </p>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function StoryCanvasEditor({ onSave, onCancel, backgroundImage }: StoryCanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fc = useRef<fabric.Canvas | null>(null)
  const historyRef = useRef<string[]>([])
  const histIdxRef = useRef(-1)
  const fileRef = useRef<HTMLInputElement>(null)

  // sidebar panel
  const [panel, setPanel] = useState<'bg' | 'text' | 'stickers' | 'shapes' | null>('bg')

  // background
  const [bgType, setBgType] = useState<BgType>('gradient')
  const [bgSolid, setBgSolid] = useState('#0f0c29')
  const [bgGrad, setBgGrad] = useState(PRESET_GRADIENTS[0])
  const [customGradA, setCustomGradA] = useState('#FF8A00')
  const [customGradB, setCustomGradB] = useState('#FF4D00')

  // text options
  const [textColor, setTextColor] = useState('#ffffff')
  const [fontSize, setFontSize] = useState(72)
  const [fontFamily, setFontFamily] = useState(PRESET_FONTS[0].value)
  const [textStyleIdx, setTextStyleIdx] = useState(0)
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('center')

  // stickers
  const [showEmoji, setShowEmoji] = useState(false)
  const [stickerTab, setStickerTab] = useState(0)

  // canvas view
  const [zoom, setZoom] = useState(0.25)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [activeObj, setActiveObj] = useState<fabric.Object | null>(null)

  // ── Save history snapshot ───────────────────────────────────────────────────
  const snapshot = useCallback(() => {
    if (!fc.current) return
    const json = JSON.stringify(fc.current.toJSON())
    const list = historyRef.current.slice(0, histIdxRef.current + 1)
    list.push(json)
    historyRef.current = list.slice(-40)
    histIdxRef.current = historyRef.current.length - 1
    setCanUndo(histIdxRef.current > 0)
    setCanRedo(false)
  }, [])

  const undo = useCallback(() => {
    if (!fc.current || histIdxRef.current <= 0) return
    histIdxRef.current--
    fc.current.loadFromJSON(historyRef.current[histIdxRef.current], () => {
      fc.current!.renderAll()
      setCanUndo(histIdxRef.current > 0)
      setCanRedo(true)
    })
  }, [])

  const redo = useCallback(() => {
    if (!fc.current || histIdxRef.current >= historyRef.current.length - 1) return
    histIdxRef.current++
    fc.current.loadFromJSON(historyRef.current[histIdxRef.current], () => {
      fc.current!.renderAll()
      setCanUndo(true)
      setCanRedo(histIdxRef.current < historyRef.current.length - 1)
    })
  }, [])

  // ── Apply background ────────────────────────────────────────────────────────
  const applyBackground = useCallback(() => {
    if (!fc.current) return
    const c = fc.current
    if (bgType === 'solid') {
      c.setBackgroundColor(bgSolid, c.renderAll.bind(c))
      c.setBackgroundImage('', c.renderAll.bind(c))
    } else if (bgType === 'gradient') {
      const [a, b] = bgGrad.label === 'custom'
        ? [customGradA, customGradB]
        : [bgGrad.stops[0], bgGrad.stops[1]]
      const grad = new fabric.Gradient({
        type: 'linear',
        gradientUnits: 'pixels',
        coords: { x1: 0, y1: 0, x2: 0, y2: CANVAS_H },
        colorStops: [{ offset: 0, color: a }, { offset: 1, color: b }],
      })
      c.setBackgroundImage('', c.renderAll.bind(c))
      c.setBackgroundColor(grad as unknown as string, c.renderAll.bind(c))
    }
  }, [bgType, bgSolid, bgGrad, customGradA, customGradB])

  // ── Initialise Fabric ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_W,
      height: CANVAS_H,
      preserveObjectStacking: true,
      selection: true,
    })
    fc.current = canvas

    // Load bg image if provided
    if (backgroundImage) {
      setBgType('image')
      fabric.Image.fromURL(backgroundImage, (img) => {
        img.set({
          scaleX: CANVAS_W / (img.width ?? CANVAS_W),
          scaleY: CANVAS_H / (img.height ?? CANVAS_H),
          originX: 'left', originY: 'top',
          left: 0, top: 0,
          selectable: false, evented: false,
        })
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas))
      }, { crossOrigin: 'anonymous' })
    } else {
      // default gradient
      const grad = new fabric.Gradient({
        type: 'linear',
        gradientUnits: 'pixels',
        coords: { x1: 0, y1: 0, x2: 0, y2: CANVAS_H },
        colorStops: [
          { offset: 0, color: PRESET_GRADIENTS[0].stops[0] },
          { offset: 1, color: PRESET_GRADIENTS[0].stops[1] },
        ],
      })
      canvas.setBackgroundColor(grad as unknown as string, canvas.renderAll.bind(canvas))
    }

    // Events
    canvas.on('object:added', snapshot)
    canvas.on('object:modified', snapshot)
    canvas.on('object:removed', snapshot)
    canvas.on('selection:created', (e) => setActiveObj(e.selected?.[0] ?? null))
    canvas.on('selection:updated', (e) => setActiveObj(e.selected?.[0] ?? null))
    canvas.on('selection:cleared', () => setActiveObj(null))

    // Keyboard
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const objs = canvas.getActiveObjects()
        if (objs.length) { canvas.discardActiveObject(); objs.forEach((o) => canvas.remove(o)); canvas.requestRenderAll() }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.shiftKey ? redo() : undo() }
    }
    window.addEventListener('keydown', onKey)

    // first snapshot
    snapshot()

    return () => {
      window.removeEventListener('keydown', onKey)
      canvas.dispose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // re-apply background when settings change (not on mount — handled above)
  useEffect(() => {
    if (!fc.current) return
    if (bgType !== 'image') applyBackground()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgType, bgSolid, bgGrad, customGradA, customGradB])

  // ── Canvas actions ──────────────────────────────────────────────────────────

  function addText() {
    if (!fc.current) return
    const style = TEXT_STYLES[textStyleIdx]
    const txt = new fabric.IText('ESCREVA AQUI', {
      left: CANVAS_W / 2,
      top: CANVAS_H / 2,
      originX: 'center',
      originY: 'center',
      fontFamily,
      fontSize,
      fill: textColor,
      textAlign: align,
      editable: true,
      ...(style.stroke ? { stroke: '#000000', strokeWidth: 6, paintFirst: 'stroke' } : {}),
      ...(style.shadow
        ? { shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.6)', blur: 18, offsetX: 3, offsetY: 3 }) }
        : {}),
    })
    fc.current.add(txt)
    fc.current.setActiveObject(txt)
    fc.current.requestRenderAll()
    setPanel(null)
  }

  function addEmoji(emoji: string) {
    if (!fc.current) return
    const t = new fabric.Text(emoji, {
      left: CANVAS_W / 2,
      top: CANVAS_H / 2,
      originX: 'center',
      originY: 'center',
      fontSize: 180,
    })
    fc.current.add(t)
    fc.current.setActiveObject(t)
    fc.current.requestRenderAll()
    setShowEmoji(false)
  }

  function addRect() {
    if (!fc.current) return
    fc.current.add(new fabric.Rect({
      left: 340, top: 760, width: 400, height: 400,
      fill: 'rgba(255,255,255,0.15)',
      stroke: 'rgba(255,255,255,0.5)', strokeWidth: 4,
      rx: 40, ry: 40,
    }))
    fc.current.requestRenderAll()
  }

  function addCircle() {
    if (!fc.current) return
    fc.current.add(new fabric.Circle({
      left: CANVAS_W / 2, top: CANVAS_H / 2,
      originX: 'center', originY: 'center',
      radius: 200,
      fill: 'rgba(255,255,255,0.15)',
      stroke: 'rgba(255,255,255,0.5)', strokeWidth: 4,
    }))
    fc.current.requestRenderAll()
  }

  function addLine() {
    if (!fc.current) return
    fc.current.add(new fabric.Line([160, CANVAS_H / 2, CANVAS_W - 160, CANVAS_H / 2], {
      stroke: 'rgba(255,255,255,0.7)', strokeWidth: 8,
    }))
    fc.current.requestRenderAll()
  }

  function deleteSelected() {
    if (!fc.current) return
    const objs = fc.current.getActiveObjects()
    if (!objs.length) return
    fc.current.discardActiveObject()
    objs.forEach((o) => fc.current!.remove(o))
    fc.current.requestRenderAll()
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !fc.current) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.src = ev.target!.result as string
      img.onload = () => {
        const fImg = new fabric.Image(img)
        fImg.scaleToWidth(600)
        fImg.set({ left: CANVAS_W / 2, top: CANVAS_H / 2, originX: 'center', originY: 'center' })
        fc.current!.add(fImg)
        fc.current!.setActiveObject(fImg)
        fc.current!.requestRenderAll()
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleSave() {
    if (!fc.current) return
    fc.current.discardActiveObject()
    fc.current.renderAll()
    const url = fc.current.toDataURL({ format: 'png', quality: 1, multiplier: 1 })
    onSave?.(url)
  }

  function handleDownload() {
    if (!fc.current) return
    fc.current.discardActiveObject()
    fc.current.renderAll()
    const url = fc.current.toDataURL({ format: 'png', quality: 1 })
    const a = document.createElement('a')
    a.download = `story-${Date.now()}.png`
    a.href = url
    a.click()
  }

  function bringForward() { if (!fc.current) return; const o = fc.current.getActiveObject(); if (o) fc.current.bringForward(o, true) }
  function sendBackward() { if (!fc.current) return; const o = fc.current.getActiveObject(); if (o) fc.current.sendBackwards(o, true) }

  // ── Update selected text props live ─────────────────────────────────────────
  function updateSelectedText(props: Record<string, unknown>) {
    if (!fc.current) return
    const o = fc.current.getActiveObject()
    if (o && (o.type === 'i-text' || o.type === 'text')) {
      o.set(props as Partial<fabric.IText>)
      fc.current.requestRenderAll()
      snapshot()
    }
  }

  // ── Computed preview scale ───────────────────────────────────────────────────
  const canvasStyle = {
    width: CANVAS_W * zoom,
    height: CANVAS_H * zoom,
    transform: `scale(${zoom})`,
    transformOrigin: 'top left',
  } as React.CSSProperties

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-[700px] flex-col gap-0 overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a]">

      {/* ── Top bar ── */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/8 bg-black/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <span className="text-[10px] font-black tracking-[0.2em] text-white">EDITOR DE STORIES</span>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1">
          <ToolBtn onClick={undo} active={canUndo} title="Desfazer (Ctrl+Z)"><Undo2 className="size-4" /></ToolBtn>
          <ToolBtn onClick={redo} active={canRedo} title="Refazer (Ctrl+Shift+Z)"><Redo2 className="size-4" /></ToolBtn>
          <Divider />
          <ToolBtn onClick={() => setPanel(p => p === 'text' ? null : 'text')} active={panel === 'text'} title="Texto"><Type className="size-4" /></ToolBtn>
          <ToolBtn onClick={() => setPanel(p => p === 'stickers' ? null : 'stickers')} active={panel === 'stickers'} title="Stickers & Emojis"><Smile className="size-4" /></ToolBtn>
          <ToolBtn onClick={() => setPanel(p => p === 'shapes' ? null : 'shapes')} active={panel === 'shapes'} title="Formas"><Square className="size-4" /></ToolBtn>
          <ToolBtn onClick={() => setPanel(p => p === 'bg' ? null : 'bg')} active={panel === 'bg'} title="Fundo"><Palette className="size-4" /></ToolBtn>
          <label className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-white" title="Adicionar imagem">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" />
            <ImageIcon className="size-4" />
          </label>
          <Divider />
          {activeObj && (
            <>
              <ToolBtn onClick={bringForward} title="Trazer à frente"><Layers className="size-4" /></ToolBtn>
              <ToolBtn onClick={sendBackward} title="Enviar para trás"><Move className="size-4" /></ToolBtn>
              <ToolBtn onClick={deleteSelected} title="Excluir selecionado" danger><Trash2 className="size-4" /></ToolBtn>
              <Divider />
            </>
          )}
          <ToolBtn onClick={() => setZoom(z => Math.min(0.5, +(z + 0.05).toFixed(2)))} title="Zoom +"><ZoomIn className="size-4" /></ToolBtn>
          <span className="min-w-[36px] text-center text-[9px] font-black text-zinc-500">{Math.round(zoom * 100)}%</span>
          <ToolBtn onClick={() => setZoom(z => Math.max(0.1, +(z - 0.05).toFixed(2)))} title="Zoom -"><ZoomOut className="size-4" /></ToolBtn>
          <Divider />
          <ToolBtn onClick={handleDownload} title="Baixar PNG"><Download className="size-4" /></ToolBtn>
        </div>

        <button type="button" onClick={onCancel} className="flex size-8 items-center justify-center rounded-xl border border-white/10 text-zinc-500 hover:text-white" aria-label="Fechar">
          <X className="size-4" />
        </button>
      </div>

      {/* ── Body: sidebar + canvas ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* Sidebar panel */}
        {panel && (
          <aside className="scrollbar-none w-64 shrink-0 overflow-y-auto border-r border-white/8 bg-black/30 p-4">

            {/* BACKGROUND */}
            {panel === 'bg' && (
              <div className="flex flex-col gap-4">
                <SectionLabel>FUNDO</SectionLabel>
                <div className="flex gap-1.5">
                  {(['solid', 'gradient'] as BgType[]).map((t) => (
                    <button key={t} type="button" onClick={() => setBgType(t)}
                      className={`flex-1 rounded-xl py-2 text-[8px] font-black tracking-[0.1em] transition-colors ${bgType === t ? 'bg-primary/20 text-primary' : 'border border-white/8 text-zinc-500 hover:bg-white/[0.05]'}`}>
                      {t === 'solid' ? 'SÓLIDO' : 'GRADIENTE'}
                    </button>
                  ))}
                </div>

                {bgType === 'solid' && (
                  <div>
                    <SectionLabel>COR DO FUNDO</SectionLabel>
                    <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/20 p-3">
                      <input type="color" value={bgSolid} onChange={(e) => setBgSolid(e.target.value)}
                        className="size-10 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
                      <span className="font-mono text-[10px] font-bold text-zinc-400">{bgSolid.toUpperCase()}</span>
                    </div>
                  </div>
                )}

                {bgType === 'gradient' && (
                  <>
                    <SectionLabel>GRADIENTES PRONTOS</SectionLabel>
                    <div className="grid grid-cols-4 gap-1.5">
                      {PRESET_GRADIENTS.map((g) => (
                        <button key={g.label} type="button" onClick={() => setBgGrad(g)}
                          title={g.label}
                          className={`aspect-square rounded-xl transition-all ${bgGrad.label === g.label ? 'ring-2 ring-primary ring-offset-1 ring-offset-black' : 'ring-1 ring-white/10'}`}
                          style={{ background: `linear-gradient(135deg, ${g.stops[0]}, ${g.stops[1]})` }}
                        />
                      ))}
                    </div>
                    <SectionLabel>PERSONALIZADO</SectionLabel>
                    <div className="flex items-center gap-2">
                      <input type="color" value={customGradA}
                        onChange={(e) => { setCustomGradA(e.target.value); setBgGrad({ label: 'custom', stops: [e.target.value, customGradB] }) }}
                        className="size-9 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0.5" />
                      <div className="h-2 flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${customGradA}, ${customGradB})` }} />
                      <input type="color" value={customGradB}
                        onChange={(e) => { setCustomGradB(e.target.value); setBgGrad({ label: 'custom', stops: [customGradA, e.target.value] }) }}
                        className="size-9 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0.5" />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TEXT */}
            {panel === 'text' && (
              <div className="flex flex-col gap-4">
                <SectionLabel>TEXTO</SectionLabel>
                <div>
                  <SectionLabel>COR</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {['#ffffff', '#000000', '#FF6B00', '#F953C6', '#00C6FF', '#38ef7d', '#FFD200', '#FF4D00'].map((c) => (
                      <button key={c} type="button"
                        onClick={() => { setTextColor(c); updateSelectedText({ fill: c }) }}
                        className={`size-7 rounded-full border-2 transition-all ${textColor === c ? 'border-primary scale-110' : 'border-white/20'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                    <input type="color" value={textColor}
                      onChange={(e) => { setTextColor(e.target.value); updateSelectedText({ fill: e.target.value }) }}
                      className="size-7 cursor-pointer rounded-full border-2 border-white/20 bg-transparent p-0" title="Cor personalizada" />
                  </div>
                </div>

                <div>
                  <SectionLabel>FONTE</SectionLabel>
                  <div className="flex flex-col gap-1.5">
                    {PRESET_FONTS.map((f) => (
                      <button key={f.value} type="button"
                        onClick={() => { setFontFamily(f.value); updateSelectedText({ fontFamily: f.value }) }}
                        className={`rounded-xl px-3 py-2 text-left text-[11px] font-bold transition-colors ${fontFamily === f.value ? 'bg-primary/20 text-primary' : 'border border-white/8 text-zinc-400 hover:bg-white/[0.05]'}`}
                        style={{ fontFamily: f.value }}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel>TAMANHO: {fontSize}px</SectionLabel>
                  <input type="range" min={24} max={320} step={8} value={fontSize}
                    onChange={(e) => { const v = Number(e.target.value); setFontSize(v); updateSelectedText({ fontSize: v }) }}
                    className="w-full accent-primary" />
                </div>

                <div>
                  <SectionLabel>ALINHAMENTO</SectionLabel>
                  <div className="flex gap-1.5">
                    {([['left', <AlignLeft key="l" className="size-4" />], ['center', <AlignCenter key="c" className="size-4" />], ['right', <AlignRight key="r" className="size-4" />]] as const).map(([a, icon]) => (
                      <button key={a} type="button"
                        onClick={() => { setAlign(a); updateSelectedText({ textAlign: a }) }}
                        className={`flex flex-1 items-center justify-center rounded-xl py-2 transition-colors ${align === a ? 'bg-primary/20 text-primary' : 'border border-white/8 text-zinc-500'}`}>
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel>ESTILO</SectionLabel>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TEXT_STYLES.map((s, i) => (
                      <button key={s.label} type="button" onClick={() => setTextStyleIdx(i)}
                        className={`rounded-xl py-2 text-[8px] font-black tracking-[0.1em] transition-colors ${textStyleIdx === i ? 'bg-primary/20 text-primary' : 'border border-white/8 text-zinc-500'}`}>
                        {s.label.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="button" onClick={addText}
                  className="gradient-brand w-full rounded-2xl py-3 text-[9px] font-black tracking-[0.2em] text-white">
                  + ADICIONAR TEXTO
                </button>
              </div>
            )}

            {/* STICKERS */}
            {panel === 'stickers' && (
              <div className="flex flex-col gap-3">
                <SectionLabel>STICKERS & EMOJIS</SectionLabel>

                {/* Category tabs */}
                <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
                  {STICKER_GROUPS.map((g, i) => (
                    <button key={g.label} type="button" onClick={() => setStickerTab(i)}
                      className={`shrink-0 rounded-xl px-3 py-1.5 text-[8px] font-black tracking-[0.1em] transition-colors ${stickerTab === i ? 'bg-primary/20 text-primary' : 'border border-white/8 text-zinc-500'}`}>
                      {g.label.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {STICKER_GROUPS[stickerTab].items.map((em) => (
                    <button key={em} type="button" onClick={() => addEmoji(em)}
                      className="flex aspect-square items-center justify-center rounded-xl border border-white/8 bg-black/20 text-2xl transition-colors hover:bg-white/[0.08]">
                      {em}
                    </button>
                  ))}
                </div>

                <div className="relative mt-1">
                  <button type="button" onClick={() => setShowEmoji(!showEmoji)}
                    className="w-full rounded-xl border border-white/8 py-2.5 text-[8px] font-black tracking-[0.15em] text-zinc-400 hover:bg-white/[0.05]">
                    MAIS EMOJIS…
                  </button>
                  {showEmoji && (
                    <div className="absolute left-0 top-full z-50 mt-2">
                      <EmojiPicker onEmojiClick={(e) => addEmoji(e.emoji)} height={350} width={240} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SHAPES */}
            {panel === 'shapes' && (
              <div className="flex flex-col gap-3">
                <SectionLabel>FORMAS</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Retângulo', icon: <Square className="size-5" />, fn: addRect },
                    { label: 'Círculo', icon: <CircleIcon className="size-5" />, fn: addCircle },
                    { label: 'Linha', icon: <span className="h-0.5 w-6 rounded-full bg-current" />, fn: addLine },
                  ].map((s) => (
                    <button key={s.label} type="button" onClick={s.fn}
                      className="flex flex-col items-center gap-2 rounded-2xl border border-white/8 bg-black/20 py-4 text-[8px] font-black tracking-[0.1em] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white">
                      {s.icon}
                      {s.label.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div>
                  <SectionLabel>COR DO TEXTO</SectionLabel>
                  <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-black/20 p-3">
                    <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)}
                      className="size-8 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
                    <div className="flex gap-2">
                      <button type="button"
                        onClick={() => updateSelectedText({ fontWeight: 'bold' })}
                        className="flex size-8 items-center justify-center rounded-lg border border-white/8 text-zinc-400 hover:text-white">
                        <Bold className="size-3.5" />
                      </button>
                      <button type="button"
                        onClick={() => updateSelectedText({ fontStyle: 'italic' })}
                        className="flex size-8 items-center justify-center rounded-lg border border-white/8 text-zinc-400 hover:text-white">
                        <Italic className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </aside>
        )}

        {/* Canvas area */}
        <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto bg-[#111] p-6">
          <div
            className="relative shrink-0 cursor-crosshair shadow-2xl shadow-black/80"
            style={{ width: CANVAS_W * zoom, height: CANVAS_H * zoom }}
          >
            <div style={canvasStyle}>
              <canvas ref={canvasRef} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/8 bg-black/40 px-5 py-3">
        <p className="text-[8px] font-bold text-zinc-600">
          {CANVAS_W}×{CANVAS_H}px · Clique duplo para editar texto · Delete para remover
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel}
            className="rounded-2xl border border-white/10 px-5 py-2.5 text-[9px] font-black tracking-[0.15em] text-zinc-400 hover:bg-white/[0.04] hover:text-white">
            CANCELAR
          </button>
          <button type="button" onClick={handleSave}
            className="gradient-brand flex items-center gap-2 rounded-2xl px-7 py-2.5 text-[9px] font-black tracking-[0.2em] text-white shadow-lg shadow-primary/25">
            <Sparkles className="size-3.5" />
            PUBLICAR STORY
          </button>
        </div>
      </div>

    </div>
  )
}
