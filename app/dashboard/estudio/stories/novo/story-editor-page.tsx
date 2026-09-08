'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import {
  ArrowLeft, Sparkles, Loader2, CheckCircle2,
  AlertCircle, Film, ImageIcon, Pencil,
  Upload, Info, Play,
} from 'lucide-react'
import { uploadContentImage, saveStory, createDirectUploadUrl } from '@/app/actions/content'
import type { Story } from '@/lib/types'

// ── Editor (fabric.js, client-only) ──────────────────────────────────────────
const StoryCanvasEditor = dynamic(
  () => import('@/components/wordfan/story-canvas-editor').then((m) => ({ default: m.StoryCanvasEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#090909]">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-white/8 bg-primary/10">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
        <p className="text-[10px] font-black tracking-[0.2em] text-zinc-500">CARREGANDO EDITOR…</p>
      </div>
    ),
  },
)


// ── Helpers ───────────────────────────────────────────────────────────────────

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png'
  const bytes = atob(base64)
  const buf = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i)
  return new File([buf], filename, { type: mime })
}

function fmtBytes(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode    = 'choose' | 'canvas' | 'video'
type Phase   = 'editing' | 'uploading' | 'done' | 'error'

interface Props {
  artistId: string
  artistName: string
  artistSlug: string
  existingStories: Story[]
}

const MAX_VIDEO_MB = 200
const ACCEPTED_VIDEO = 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov'

// ── Component ─────────────────────────────────────────────────────────────────

export function StoryEditorPage({ artistId, artistName, existingStories }: Props) {
  const router   = useRouter()
  const videoRef = useRef<HTMLInputElement>(null)

  const [, startTransition] = useTransition()
  const [mode,      setMode]      = useState<Mode>('choose')
  const [phase,     setPhase]     = useState<Phase>('editing')
  const [caption,   setCaption]   = useState('')
  const [errorMsg,  setErrorMsg]  = useState('')
  const [previewUrl,setPreviewUrl]= useState<string | null>(null)

  // video upload state
  const [videoFile,    setVideoFile]    = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [uploading,    setUploading]    = useState(false)
  const [uploadPct,    setUploadPct]    = useState(0)
  const [videoError,   setVideoError]   = useState('')

  // ── Save from canvas ────────────────────────────────────────────────────
  function handleCanvasSave(imageDataUrl: string) {
    setPreviewUrl(imageDataUrl)
    setPhase('uploading')
    startTransition(async () => {
      const file = dataUrlToFile(imageDataUrl, `story-${Date.now()}.png`)
      const fd   = new FormData()
      fd.set('file', file)
      fd.set('artistId', artistId)
      fd.set('kind', 'story')
      const upload = await uploadContentImage(fd)
      if (upload.error) { setErrorMsg(upload.error); setPhase('error'); return }

      const save = await saveStory({ artistId, mediaUrl: upload.url!, caption: caption.trim() })
      if (save.error) { setErrorMsg(save.error); setPhase('error'); return }

      setPhase('done')
      setTimeout(() => router.push('/dashboard/estudio'), 1800)
    })
  }

  // ── Video file selection ────────────────────────────────────────────────
  function handleVideoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setVideoError('')

    const isVideo = ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)
    if (!isVideo) {
      setVideoError('Formato inválido. Use MP4, WebM ou MOV.')
      return
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setVideoError(`Vídeo muito grande. Máximo: ${MAX_VIDEO_MB}MB. Seu arquivo: ${fmtBytes(file.size)}.`)
      return
    }

    setVideoFile(file)
    const url = URL.createObjectURL(file)
    setVideoPreview(url)
    e.target.value = ''
  }

  // ── Video publish — upload direto ao Supabase (sem passar pelo servidor) ──
  async function handleVideoPublish() {
    if (!videoFile) return
    setUploading(true)
    setUploadPct(0)
    setVideoError('')

    // 1. Pede ao servidor uma URL assinada — só metadados, sem o arquivo
    const signed = await createDirectUploadUrl({
      artistId,
      kind:          'story',
      fileType:      videoFile.type,
      fileSizeBytes: videoFile.size,
    })

    if (signed.error || !signed.signedUrl) {
      setVideoError(signed.error ?? 'Erro ao gerar link de upload.')
      setUploading(false)
      setUploadPct(0)
      return
    }

    // 2. Upload direto do browser para o Supabase usando XHR (tem onprogress)
    const publicUrl = await new Promise<string | null>((resolve) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          // reservamos 0–90% para o upload, 90–100% para salvar no banco
          setUploadPct(Math.round((e.loaded / e.total) * 90))
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(signed.publicUrl!)
        } else {
          // tenta extrair mensagem do Supabase
          let detail = ''
          try {
            const body = JSON.parse(xhr.responseText)
            if (body.error === 'EntityTooLarge' || body.code === 'EntityTooLarge') {
              detail = 'TAMANHO_EXCEDIDO'
            } else {
              detail = body.message ?? body.error ?? ''
            }
          } catch { /* ignore */ }
          console.log('[xhr-upload] status:', xhr.status, xhr.responseText)
          resolve(detail === 'TAMANHO_EXCEDIDO' ? 'TAMANHO_EXCEDIDO' : null)
        }
      }

      xhr.onerror = () => resolve(null)

      // Supabase signed upload endpoint
      xhr.open('PUT', signed.signedUrl)
      xhr.setRequestHeader('Content-Type', videoFile.type)
      xhr.send(videoFile)
    })

    if (!publicUrl || publicUrl === 'TAMANHO_EXCEDIDO') {
      const isTooLarge = publicUrl === 'TAMANHO_EXCEDIDO'
      setVideoError(
        isTooLarge
          ? `O Supabase Storage rejeitou o arquivo por exceder o limite configurado no bucket "artist-media".\n\nPara resolver: acesse o painel Supabase → Storage → Buckets → artist-media → Edit → aumente o "Max file size" para pelo menos ${MAX_VIDEO_MB}MB (${MAX_VIDEO_MB * 1024 * 1024} bytes).`
          : 'Falha no envio do vídeo. Verifique sua conexão e tente novamente.',
      )
      setUploading(false)
      setUploadPct(0)
      return
    }

    // 3. Salvar registro no banco — arquivo já está no Supabase
    setUploadPct(95)
    const save = await saveStory({ artistId, mediaUrl: publicUrl, caption: caption.trim() })
    setUploadPct(100)

    if (save.error) {
      setVideoError(save.error)
      setUploading(false)
      setUploadPct(0)
      return
    }

    setPhase('done')
    setTimeout(() => router.push('/dashboard/estudio'), 1800)
  }

  // ── Status overlays ────────────────────────────────────────────────────
  if (phase === 'uploading' || phase === 'done' || phase === 'error') {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 px-6">
        {phase === 'uploading' && (
          <>
            {previewUrl && (
              <div className="relative h-40 w-24 overflow-hidden rounded-2xl border border-white/8">
                <Image src={previewUrl} alt="" fill className="object-cover opacity-50" unoptimized />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="size-8 animate-spin text-primary" />
                </div>
              </div>
            )}
            <div className="w-full max-w-xs">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-black tracking-[0.2em] text-white">PUBLICANDO STORY…</p>
                <span className="font-numeric text-[9px] font-bold text-primary">100%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                <div className="h-full animate-pulse rounded-full bg-primary" style={{ width: '100%' }} />
              </div>
            </div>
          </>
        )}

        {phase === 'done' && (
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex size-20 items-center justify-center rounded-3xl border border-primary/30 bg-primary/10 shadow-[0_0_40px_-10px_rgba(255,106,0,0.4)]">
              <CheckCircle2 className="size-10 text-primary" />
            </div>
            <div>
              <p className="font-serif text-2xl font-black tracking-tight text-white">Story publicado!</p>
              <p className="mt-1.5 text-xs font-bold text-zinc-500">
                Já aparece no perfil de <span className="text-zinc-300">{artistName}</span>.
              </p>
            </div>
            <p className="flex items-center gap-2 text-[9px] font-bold text-zinc-600">
              <Loader2 className="size-3 animate-spin" />
              Voltando ao estúdio…
            </p>
          </div>
        )}

        {phase === 'error' && (
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex size-20 items-center justify-center rounded-3xl border border-destructive/30 bg-destructive/10">
              <AlertCircle className="size-10 text-destructive" />
            </div>
            <div>
              <p className="font-serif text-xl font-black tracking-tight text-white">Algo deu errado</p>
              <p className="mt-2 max-w-sm text-xs font-bold leading-relaxed text-zinc-500">{errorMsg}</p>
            </div>
            <button type="button"
              onClick={() => { setPhase('editing'); setErrorMsg('') }}
              className="gradient-brand rounded-2xl px-8 py-3 text-[10px] font-black tracking-[0.2em] text-white shadow-[0_8px_20px_-8px_rgba(255,106,0,0.6)]">
              TENTAR NOVAMENTE
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Topbar (shared across modes) ────────────────────��────────────────────
  const Topbar = (
    <div className="flex shrink-0 items-center gap-3 border-b border-white/8 bg-[var(--artist-bg)] px-5 py-3">
      <Link href="/dashboard/estudio"
        className="flex size-8 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-[var(--artist-muted)] transition-colors hover:border-white/15 hover:text-[var(--artist-text)]"
        aria-label="Voltar">
        <ArrowLeft className="size-3.5" />
      </Link>
      <div className="flex-1">
        <p className="flex items-center gap-1.5 text-[7px] font-black tracking-[0.25em] text-[var(--artist-muted)]">
          <span className="size-1 rounded-full bg-[var(--artist-primary)]" />
          ESTÚDIO · STORIES
        </p>
        <h1 className="font-serif text-sm font-black tracking-tight text-[var(--artist-text)]">
          {mode === 'canvas' ? 'Editor visual' : mode === 'video' ? 'Upload de vídeo' : 'Criar novo story'}
        </h1>
      </div>

      {/* Caption — always visible in topbar */}
      <div className="hidden flex-1 items-center gap-2 rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2 sm:flex">
        <Pencil className="size-3 shrink-0 text-zinc-600" />
        <input
          type="text" value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Legenda do story (opcional)"
          maxLength={140}
          className="flex-1 bg-transparent text-[10px] font-medium text-[var(--artist-text)] outline-none placeholder:text-zinc-600"
        />
        <span className={`font-numeric shrink-0 text-[8px] font-bold ${caption.length > 120 ? 'text-amber-400' : 'text-zinc-600'}`}>
          {caption.length}/140
        </span>
      </div>

      {mode !== 'choose' && (
        <button type="button" onClick={() => setMode('choose')}
          className="rounded-xl border border-white/8 px-3 py-2 text-[8px] font-black tracking-[0.1em] text-zinc-500 transition-colors hover:border-white/15 hover:text-white">
          TROCAR MODO
        </button>
      )}
    </div>
  )

  // ── MODE: choose ─────────────────────────────────────────────────────────
  if (mode === 'choose') {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
        {Topbar}
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10">

          <div className="text-center">
            <p className="font-serif text-2xl font-black tracking-tight text-white">
              Como você quer criar o story?
            </p>
            <p className="mt-2 text-sm font-bold text-zinc-500">
              Escolha o modo de criação abaixo.
            </p>
          </div>

          <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">

            {/* Timeline video editor — página dedicada em tela cheia */}
            <button type="button" onClick={() => router.push('/estudio/editor-video')}
              className="group relative overflow-hidden rounded-3xl border border-primary/30 bg-primary/[0.06] p-7 text-left transition-all hover:border-primary/60 hover:bg-primary/[0.1] hover:shadow-[0_0_36px_-8px_rgba(255,106,0,0.45)]">
              <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-primary/15 blur-2xl transition-all group-hover:bg-primary/25" />
              <div className="relative">
                <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-primary/40 bg-primary/15">
                  <Film className="size-7 text-primary" />
                </div>
                <p className="font-serif text-lg font-black tracking-tight text-white">Editor de Vídeo</p>
                <p className="mt-1.5 text-[11px] font-bold leading-relaxed text-zinc-400">
                  Timeline estilo CapCut. Junte vários clipes, corte, ajuste a duração e as animações de entrada e saída.
                </p>
                <ul className="mt-4 flex flex-col gap-1.5">
                  {['Timeline multi-clipe', 'Cortar, dividir e reordenar', 'Trim por arrasto', 'Animações in / out', 'Preview em tempo real', 'Exporta MP4 real'].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[9px] font-bold text-zinc-400">
                      <span className="size-1.5 rounded-full bg-primary/70" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex items-center justify-between">
                  <span className="rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-[8px] font-black tracking-[0.1em] text-primary">
                    NOVO
                  </span>
                  <span className="text-[8px] font-bold text-zinc-600">Export MP4 1080×1920</span>
                </div>
              </div>
            </button>

            {/* Canvas editor */}
            <button type="button" onClick={() => setMode('canvas')}
              className="group relative overflow-hidden rounded-3xl border border-white/8 bg-white/[0.025] p-7 text-left transition-all hover:border-primary/40 hover:bg-primary/[0.06] hover:shadow-[0_0_30px_-8px_rgba(255,106,0,0.3)]">
              <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-primary/10 blur-2xl transition-all group-hover:bg-primary/20" />
              <div className="relative">
                <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
                  <Sparkles className="size-7 text-primary" />
                </div>
                <p className="font-serif text-lg font-black tracking-tight text-white">Editor Visual</p>
                <p className="mt-1.5 text-[11px] font-bold leading-relaxed text-zinc-500">
                  Crie do zero com gradientes, textos, fontes, emojis, stickers, formas e vídeo no canvas.
                </p>
                <ul className="mt-4 flex flex-col gap-1.5">
                  {['Fundos gradientes (12 presets)', 'Textos com 6 fontes + estilos', 'Stickers e emojis', 'Formas e linhas', 'Vídeo de fundo (loop)', 'Undo/redo ilimitado'].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[9px] font-bold text-zinc-400">
                      <span className="size-1.5 rounded-full bg-primary/60" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex items-center justify-between">
                  <span className="rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[8px] font-black tracking-[0.1em] text-primary">
                    RECOMENDADO
                  </span>
                  <span className="text-[8px] font-bold text-zinc-600">Exporta PNG 1080×1920</span>
                </div>
              </div>
            </button>

            {/* Video upload */}
            <button type="button" onClick={() => setMode('video')}
              className="group relative overflow-hidden rounded-3xl border border-white/8 bg-white/[0.025] p-7 text-left transition-all hover:border-blue-500/40 hover:bg-blue-500/[0.05] hover:shadow-[0_0_30px_-8px_rgba(59,130,246,0.25)]">
              <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-blue-500/10 blur-2xl transition-all group-hover:bg-blue-500/20" />
              <div className="relative">
                <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10">
                  <Film className="size-7 text-blue-400" />
                </div>
                <p className="font-serif text-lg font-black tracking-tight text-white">Upload de Vídeo</p>
                <p className="mt-1.5 text-[11px] font-bold leading-relaxed text-zinc-500">
                  Envie um vídeo diretamente do seu computador. Ideal para clipes e trechos de shows.
                </p>
                <ul className="mt-4 flex flex-col gap-1.5">
                  {['MP4, WebM e MOV aceitos', `Até ${MAX_VIDEO_MB}MB por arquivo`, 'Vídeo nativo — sem conversão', 'Publicação direta e rápida', 'Legenda opcional'].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[9px] font-bold text-zinc-400">
                      <span className="size-1.5 rounded-full bg-blue-400/60" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex items-center justify-between">
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/8 px-3 py-1 text-[8px] font-black tracking-[0.1em] text-blue-400">
                    MP4 · WEBM · MOV
                  </span>
                  <span className="text-[8px] font-bold text-zinc-600">Máx. {MAX_VIDEO_MB}MB</span>
                </div>
              </div>
            </button>
          </div>

          {/* existing count */}
          {existingStories.length > 0 && (
            <p className="text-[9px] font-bold text-zinc-600">
              {existingStories.length} {existingStories.length === 1 ? 'story ativo' : 'stories ativos'} no perfil de {artistName}
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── MODE: video upload ───────────────────────────────────────────────────
  if (mode === 'video') {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
        {Topbar}

        <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-8">
          <div className="w-full max-w-lg">

            {/* Info banner */}
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/[0.07] p-4">
              <Info className="mt-0.5 size-4 shrink-0 text-blue-400" />
              <div>
                <p className="text-[10px] font-black tracking-[0.1em] text-blue-300">UPLOAD DIRETO DE VÍDEO</p>
                <p className="mt-1 text-[9px] font-bold leading-relaxed text-blue-300/70">
                  Formatos aceitos: <strong>MP4, WebM, MOV</strong>.
                  Tamanho máximo: <strong>{MAX_VIDEO_MB}MB</strong>.
                  O vídeo será publicado como story no seu perfil.
                </p>
              </div>
            </div>

            {/* Drop zone / preview */}
            {!videoFile ? (
              <label
                className="flex cursor-pointer flex-col items-center gap-5 rounded-3xl border-2 border-dashed border-white/15 bg-white/[0.02] px-8 py-14 text-center transition-all hover:border-blue-500/40 hover:bg-blue-500/[0.04]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const f = e.dataTransfer.files[0]
                  if (f) {
                    const synth = { target: { files: e.dataTransfer.files, value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>
                    handleVideoSelect(synth)
                  }
                }}
              >
                <input
                  ref={videoRef}
                  type="file"
                  accept={ACCEPTED_VIDEO}
                  onChange={handleVideoSelect}
                  className="sr-only"
                />
                <div className="flex size-16 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10">
                  <Upload className="size-8 text-blue-400" />
                </div>
                <div>
                  <p className="font-serif text-base font-black text-white">
                    Clique ou arraste o vídeo aqui
                  </p>
                  <p className="mt-1.5 text-[10px] font-bold text-zinc-500">
                    MP4 · WebM · MOV — máximo <strong className="text-zinc-300">{MAX_VIDEO_MB}MB</strong>
                  </p>
                </div>
                <span className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-6 py-3 text-[10px] font-black tracking-[0.15em] text-blue-300 transition-colors hover:bg-blue-500/20">
                  ESCOLHER ARQUIVO
                </span>
              </label>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Video preview */}
                <div className="overflow-hidden rounded-2xl border border-white/8 bg-black">
                  <video
                    src={videoPreview!}
                    controls
                    className="max-h-72 w-full object-contain"
                    playsInline
                  />
                </div>

                {/* File info */}
                <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3">
                  <Film className="size-5 shrink-0 text-blue-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-black text-white">{videoFile.name}</p>
                    <p className="text-[8px] font-bold text-zinc-500">{fmtBytes(videoFile.size)}</p>
                  </div>
                  <button type="button"
                    onClick={() => { setVideoFile(null); setVideoPreview(null); setVideoError('') }}
                    className="text-[8px] font-black tracking-[0.1em] text-zinc-500 transition-colors hover:text-destructive">
                    TROCAR
                  </button>
                </div>

                {/* Caption mobile */}
                <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5 sm:hidden">
                  <Pencil className="size-3 shrink-0 text-zinc-600" />
                  <input type="text" value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Legenda (opcional)"
                    maxLength={140}
                    className="flex-1 bg-transparent text-[10px] font-medium text-white outline-none placeholder:text-zinc-600"
                  />
                </div>

                {/* Progress bar during upload */}
                {uploading && (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[9px] font-black tracking-[0.12em] text-white">
                        {uploadPct < 90 ? 'ENVIANDO VÍDEO…' : uploadPct < 100 ? 'SALVANDO…' : 'CONCLUÍDO'}
                      </p>
                      <span className="font-numeric text-[10px] font-bold text-primary">{uploadPct}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${uploadPct}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[8px] font-bold text-zinc-600">
                      {uploadPct < 90
                        ? `Enviando diretamente para o servidor de mídia — ${fmtBytes(Math.round(videoFile.size * uploadPct / 100))} de ${fmtBytes(videoFile.size)}`
                        : 'Registrando story no seu perfil…'
                      }
                    </p>
                  </div>
                )}

                {videoError && (
                  <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/8 p-4">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <div className="flex flex-col gap-1.5">
                      {videoError.split('\n\n').map((line, i) => (
                        <p key={i} className={`text-[10px] font-bold leading-relaxed ${i === 0 ? 'text-destructive' : 'text-zinc-400'}`}>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <button type="button"
                  onClick={handleVideoPublish}
                  disabled={uploading}
                  className="gradient-brand flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl text-[10px] font-black tracking-[0.18em] text-white shadow-[0_8px_24px_-8px_rgba(255,106,0,0.6)] disabled:opacity-60">
                  {uploading
                    ? <><Loader2 className="size-4 animate-spin" />ENVIANDO…</>
                    : <><Play className="size-4 fill-white" />PUBLICAR STORY EM VÍDEO</>
                  }
                </button>
              </div>
            )}

            {videoError && !videoFile && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <p className="text-[10px] font-bold leading-relaxed text-destructive">{videoError}</p>
              </div>
            )}

          </div>
        </div>
      </div>
    )
  }

  // ── MODE: canvas editor ──────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
      {Topbar}
      {/* Caption mobile strip */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/8 bg-[var(--artist-bg)] px-4 py-2 sm:hidden">
        <ImageIcon className="size-3 shrink-0 text-zinc-600" />
        <input type="text" value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Legenda (opcional)" maxLength={140}
          className="flex-1 bg-transparent text-[10px] font-medium text-[var(--artist-text)] outline-none placeholder:text-zinc-600"
        />
        <span className="font-numeric text-[8px] font-bold text-zinc-600">{caption.length}/140</span>
      </div>
      {/* Editor takes 100% remaining height — no sidebar */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <StoryCanvasEditor
          onSave={handleCanvasSave}
          onCancel={() => router.push('/dashboard/estudio')}
        />
      </div>
    </div>
  )
}
