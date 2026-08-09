'use client'

import { useEffect, useRef, useState } from 'react'
import { fabric } from 'fabric'
import EmojiPicker from 'emoji-picker-react'
import { X, Type, Image as ImageIcon, Smile, Square, Circle, Layers, Trash2, Download } from 'lucide-react'

interface StoryCanvasEditorProps {
  onSave?: (canvasData: string) => void
  onCancel?: () => void
  initialData?: string
  backgroundImage?: string
}

export function StoryCanvasEditor({ onSave, onCancel, initialData, backgroundImage }: StoryCanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedTool, setSelectedTool] = useState<string>('select')
  const [textColor, setTextColor] = useState('#ffffff')
  const [backgroundColor, setBackgroundColor] = useState('#000000')

  useEffect(() => {
    if (!canvasRef.current) return

    // Initialize Fabric canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 1080,
      height: 1920,
      backgroundColor: backgroundColor,
      preserveObjectStacking: true,
    })

    fabricCanvasRef.current = canvas

    // Load initial data if provided
    if (initialData) {
      canvas.loadFromJSON(initialData, () => {
        canvas.renderAll()
      })
    } else if (backgroundImage) {
      fabric.Image.fromURL(backgroundImage, (img) => {
        img.scaleToWidth(1080)
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
          scaleX: canvas.width / img.width!,
          scaleY: canvas.height / img.height!,
        })
      })
    }

    // Handle keyboard delete
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObjects = canvas.getActiveObjects()
        if (activeObjects.length) {
          canvas.discardActiveObject()
          activeObjects.forEach((obj) => canvas.remove(obj))
          canvas.requestRenderAll()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      canvas.dispose()
    }
  }, [initialData, backgroundImage, backgroundColor])

  const addText = () => {
    if (!fabricCanvasRef.current) return
    const text = new fabric.IText('Digite aqui', {
      left: 540,
      top: 960,
      originX: 'center',
      originY: 'center',
      fontFamily: 'Arial',
      fontSize: 60,
      fill: textColor,
      editable: true,
    })
    fabricCanvasRef.current.add(text)
    fabricCanvasRef.current.setActiveObject(text)
    fabricCanvasRef.current.requestRenderAll()
  }

  const addEmoji = (emoji: string) => {
    if (!fabricCanvasRef.current) return
    const text = new fabric.Text(emoji, {
      left: 540,
      top: 960,
      originX: 'center',
      originY: 'center',
      fontSize: 120,
    })
    fabricCanvasRef.current.add(text)
    fabricCanvasRef.current.setActiveObject(text)
    fabricCanvasRef.current.requestRenderAll()
    setShowEmojiPicker(false)
  }

  const addRectangle = () => {
    if (!fabricCanvasRef.current) return
    const rect = new fabric.Rect({
      left: 440,
      top: 860,
      width: 200,
      height: 200,
      fill: 'rgba(255,255,255,0.5)',
      stroke: '#ffffff',
      strokeWidth: 2,
    })
    fabricCanvasRef.current.add(rect)
    fabricCanvasRef.current.setActiveObject(rect)
    fabricCanvasRef.current.requestRenderAll()
  }

  const addCircle = () => {
    if (!fabricCanvasRef.current) return
    const circle = new fabric.Circle({
      left: 540,
      top: 960,
      radius: 100,
      fill: 'rgba(255,255,255,0.5)',
      stroke: '#ffffff',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center',
    })
    fabricCanvasRef.current.add(circle)
    fabricCanvasRef.current.setActiveObject(circle)
    fabricCanvasRef.current.requestRenderAll()
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !fabricCanvasRef.current) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const imgObj = new Image()
      imgObj.src = event.target?.result as string
      imgObj.onload = () => {
        const img = new fabric.Image(imgObj)
        img.scaleToWidth(400)
        img.set({
          left: 540,
          top: 960,
          originX: 'center',
          originY: 'center',
        })
        fabricCanvasRef.current?.add(img)
        fabricCanvasRef.current?.setActiveObject(img)
        fabricCanvasRef.current?.requestRenderAll()
      }
    }
    reader.readAsDataURL(file)
  }

  const deleteSelected = () => {
    if (!fabricCanvasRef.current) return
    const activeObjects = fabricCanvasRef.current.getActiveObjects()
    if (activeObjects.length) {
      fabricCanvasRef.current.discardActiveObject()
      activeObjects.forEach((obj) => fabricCanvasRef.current?.remove(obj))
      fabricCanvasRef.current.requestRenderAll()
    }
  }

  const handleSave = () => {
    if (!fabricCanvasRef.current) return
    const json = JSON.stringify(fabricCanvasRef.current.toJSON())
    onSave?.(json)
  }

  const handleDownload = () => {
    if (!fabricCanvasRef.current) return
    const dataURL = fabricCanvasRef.current.toDataURL({
      format: 'png',
      quality: 1,
    })
    const link = document.createElement('a')
    link.download = 'story.png'
    link.href = dataURL
    link.click()
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-black tracking-[0.2em] text-primary">EDITOR DE STORIES</p>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Fechar editor"
          className="flex size-8 items-center justify-center rounded-full border border-white/10 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-background/50 p-3">
        <button
          type="button"
          onClick={() => setSelectedTool('select')}
          className={`flex size-10 items-center justify-center rounded-xl transition-colors ${
            selectedTool === 'select' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-white/[0.05]'
          }`}
          title="Selecionar"
        >
          <Layers className="size-4" />
        </button>
        
        <div className="w-px h-6 bg-white/10" />
        
        <button
          type="button"
          onClick={addText}
          className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/[0.05]"
          title="Adicionar texto"
        >
          <Type className="size-4" />
        </button>
        
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/[0.05]"
            title="Adicionar emoji"
          >
            <Smile className="size-4" />
          </button>
          {showEmojiPicker && (
            <div className="absolute top-full left-0 z-50 mt-2">
              <EmojiPicker onEmojiClick={(emoji) => addEmoji(emoji.emoji)} />
            </div>
          )}
        </div>
        
        <label className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/[0.05] cursor-pointer" title="Adicionar imagem">
          <input type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" />
          <ImageIcon className="size-4" />
        </label>
        
        <button
          type="button"
          onClick={addRectangle}
          className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/[0.05]"
          title="Adicionar retângulo"
        >
          <Square className="size-4" />
        </button>
        
        <button
          type="button"
          onClick={addCircle}
          className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/[0.05]"
          title="Adicionar círculo"
        >
          <Circle className="size-4" />
        </button>
        
        <div className="w-px h-6 bg-white/10" />
        
        <button
          type="button"
          onClick={deleteSelected}
          className="flex size-10 items-center justify-center rounded-xl text-red-400 transition-colors hover:bg-red-500/10"
          title="Excluir selecionado"
        >
          <Trash2 className="size-4" />
        </button>
        
        <button
          type="button"
          onClick={handleDownload}
          className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/[0.05]"
          title="Baixar imagem"
        >
          <Download className="size-4" />
        </button>
        
        <div className="flex items-center gap-2 ml-auto">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Cor do texto:
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="size-6 rounded cursor-pointer"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Fundo:
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => {
                setBackgroundColor(e.target.value)
                fabricCanvasRef.current?.setBackgroundColor(e.target.value)
                fabricCanvasRef.current?.renderAll()
              }}
              className="size-6 rounded cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 overflow-auto rounded-3xl border border-white/8 bg-black/50 p-4">
        <div className="mx-auto" style={{ width: 'fit-content' }}>
          <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto' }} />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-white/10 bg-background px-6 py-3 text-[9px] font-black tracking-[0.15em] text-muted-foreground hover:bg-white/[0.05]"
        >
          CANCELAR
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="gradient-brand flex items-center gap-2 rounded-full px-6 py-3 text-[9px] font-black tracking-[0.2em] text-white"
        >
          SALVAR STORY
        </button>
      </div>
    </div>
  )
}
