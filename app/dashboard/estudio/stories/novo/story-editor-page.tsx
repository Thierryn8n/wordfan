'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  ArrowLeft, Sparkles, Loader2, CheckCircle2,
  Clock, ImageIcon, AlertCircle, Info,
} from 'lucide-react'
import { uploadContentImage, saveStory } from '@/app/actions/content'
import type { Story } from '@/lib/types'

// ── Lazy-load do editor (usa fabric.js, client-only) ─────────────────────────
const StoryCanvasEditor = dynamic(
  () => import('@/components/wordfan/story-canvas-editor').then((m) => ({ default: m.StoryCanvasEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-[#090909]">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-white/8 bg-primary/10">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
        <p className="text-[10px] font-black tracking-[0.2em] text-zinc-500">
          CARREGANDO EDITOR…
        </p>
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

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'agora há pouco'
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `há ${d}d`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  artistId: string
  artistName: string
  artistSlug: string
  existingStories: Story[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StoryEditorPage({ artistId, artistName, artistSlug, existingStories }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [caption, setCaption] = useState('')
  const [phase, setPhase] = useState<'editing' | 'uploading' | 'done' | 'error'>('editing')
  const [errorMsg, setErrorMsg] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // ── onSave from canvas ────────────────────────────────────────────────────
  function handleSave(imageDataUrl: string) {
    setPreviewUrl(imageDataUrl)
    setPhase('uploading')
    startTransition(async () => {
      // 1. convert dataURL → File
      const file = dataUrlToFile(imageDataUrl, `story-${Date.now()}.png`)

      // 2. upload to Supabase Storage
      const fd = new FormData()
      fd.set('file', file)
      fd.set('artistId', artistId)
      fd.set('kind', 'story')
      const upload = await uploadContentImage(fd)
      if (upload.error) {
        setErrorMsg(upload.error)
        setPhase('error')
        return
      }

      // 3. save story record
      const save = await saveStory({
        artistId,
        mediaUrl: upload.url!,
        caption: caption.trim(),
      })
      if (save.error) {
        setErrorMsg(save.error)
        setPhase('error')
        return
      }

      setPhase('done')
      // redirect after short delay so user sees the success state
      setTimeout(() => router.push('/dashboard/estudio?tab=stories'), 1800)
    })
  }

  // ── Uploading overlay ─────────────────────────────────────────────────────
  if (phase === 'uploading' || phase === 'done' || phase === 'error') {
    return (
      <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center gap-6 px-6">
        {phase === 'uploading' && (
          <>
            <div className="relative">
              {previewUrl && (
                <Image
                  src={previewUrl} alt="Preview do story"
                  width={180} height={320}
                  className="rounded-2xl object-cover opacity-40"
                  style={{ aspectRatio: '9/16' }}
                  unoptimized
                />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="flex size-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 backdrop-blur-sm">
                  <Loader2 className="size-7 animate-spin text-primary" />
                </div>
                <p className="text-[10px] font-black tracking-[0.2em] text-white">PUBLICANDO…</p>
              </div>
            </div>
            <p className="text-[9px] font-bold text-zinc-500">
              Enviando imagem e salvando o story
            </p>
          </>
        )}

        {phase === 'done' && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
              <CheckCircle2 className="size-10 text-primary" />
            </div>
            <div>
              <p className="font-serif text-2xl font-black tracking-tight text-white">Story publicado!</p>
              <p className="mt-1 text-xs font-bold text-zinc-500">
                Já aparece no perfil de {artistName}.
              </p>
            </div>
            <p className="flex items-center gap-2 text-[9px] font-bold text-zinc-600">
              <Loader2 className="size-3 animate-spin" />
              Redirecionando para o estúdio…
            </p>
          </div>
        )}

        {phase === 'error' && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-20 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10">
              <AlertCircle className="size-10 text-destructive" />
            </div>
            <div>
              <p className="font-serif text-xl font-black tracking-tight text-white">Ops, algo deu errado</p>
              <p className="mt-2 max-w-xs text-xs font-bold leading-relaxed text-zinc-500">{errorMsg}</p>
            </div>
            <button
              type="button"
              onClick={() => { setPhase('editing'); setErrorMsg('') }}
              className="gradient-brand rounded-2xl px-8 py-3 text-[10px] font-black tracking-[0.2em] text-white shadow-[0_8px_20px_-8px_rgba(255,106,0,0.6)]"
            >
              TENTAR NOVAMENTE
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Main editing view ─────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-0 overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/8 bg-[var(--artist-bg)] px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/estudio"
            className="flex size-9 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-[var(--artist-muted)] transition-colors hover:border-white/15 hover:text-[var(--artist-text)]"
            aria-label="Voltar ao estúdio"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="flex items-center gap-1.5 text-[8px] font-black tracking-[0.24em] text-[var(--artist-muted)]">
              <span className="size-1.5 rounded-full bg-[var(--artist-primary)]" />
              ESTÚDIO · STORIES
            </p>
            <h1 className="font-serif text-base font-black tracking-tight text-[var(--artist-text)]">
              Criar novo story
            </h1>
          </div>
        </div>

        {/* Caption input — in topbar for easy access */}
        <div className="hidden flex-1 items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 sm:flex">
          <ImageIcon className="size-3.5 shrink-0 text-[var(--artist-muted)]" />
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Legenda do story (opcional) — aparece abaixo da imagem"
            maxLength={140}
            className="flex-1 bg-transparent text-[11px] font-medium text-[var(--artist-text)] outline-none placeholder:text-[var(--artist-muted)]/60"
          />
          <span className={`font-numeric shrink-0 text-[9px] font-bold ${caption.length > 120 ? 'text-amber-400' : 'text-[var(--artist-muted)]'}`}>
            {caption.length}/140
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-[8px] font-black tracking-[0.1em] text-zinc-500">
            <Info className="size-3 text-[var(--artist-primary)]" />
            1080×1920px
          </div>
        </div>
      </div>

      {/* Caption mobile */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/8 bg-[var(--artist-bg)] px-4 py-2.5 sm:hidden">
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Legenda (opcional)"
          maxLength={140}
          className="flex-1 bg-transparent text-[11px] font-medium text-[var(--artist-text)] outline-none placeholder:text-[var(--artist-muted)]/60"
        />
        <span className="font-numeric text-[9px] font-bold text-zinc-600">{caption.length}/140</span>
      </div>

      {/* ── Editor + sidebar ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* Editor — takes all available space */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <StoryCanvasEditor
            onSave={handleSave}
            onCancel={() => router.push('/dashboard/estudio')}
          />
        </div>

        {/* Right sidebar — tips + existing stories */}
        <aside className="scrollbar-none hidden w-64 shrink-0 overflow-y-auto border-l border-white/8 bg-[var(--artist-bg)] p-4 xl:flex xl:flex-col xl:gap-5">

          {/* Tips */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
            <p className="mb-3 flex items-center gap-2 text-[8px] font-black tracking-[0.18em] text-[var(--artist-primary)]">
              <Sparkles className="size-3" />
              DICAS DE CRIAÇÃO
            </p>
            <ul className="flex flex-col gap-2.5">
              {[
                { icon: '🎨', text: 'Escolha um gradiente vibrante para chamar atenção' },
                { icon: '✍️', text: 'Use texto grande com sombra para melhor legibilidade' },
                { icon: '⚡', text: 'Emojis e stickers aumentam o engajamento' },
                { icon: '📐', text: 'Formato 9:16 — ideal para celulares' },
                { icon: '🎬', text: 'Vídeo de fundo cria stories dinâmicos' },
                { icon: '💾', text: 'Ctrl+Z desfaz, Delete remove objetos' },
              ].map((tip) => (
                <li key={tip.icon} className="flex items-start gap-2 text-[9px] font-bold leading-relaxed text-zinc-500">
                  <span className="mt-0.5 shrink-0 text-base leading-none">{tip.icon}</span>
                  {tip.text}
                </li>
              ))}
            </ul>
          </div>

          {/* Existing stories */}
          {existingStories.length > 0 && (
            <div>
              <p className="mb-3 flex items-center gap-2 text-[8px] font-black tracking-[0.18em] text-zinc-500">
                <Clock className="size-3" />
                STORIES ATIVOS ({existingStories.length})
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {existingStories.slice(0, 9).map((s) => (
                  <div key={s.id} className="group relative aspect-[9/16] overflow-hidden rounded-xl">
                    <Image
                      src={s.media_url || '/placeholder.svg'}
                      alt={s.caption ?? 'Story'}
                      fill
                      sizes="80px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                      <p className="text-[6px] font-black text-white/80">{timeAgo(s.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
              {existingStories.length > 9 && (
                <p className="mt-2 text-center text-[8px] font-bold text-zinc-600">
                  +{existingStories.length - 9} mais
                </p>
              )}
            </div>
          )}

          {existingStories.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/8 p-5 text-center">
              <p className="text-[8px] font-black tracking-[0.12em] text-zinc-600">NENHUM STORY ATIVO</p>
              <p className="mt-1 text-[8px] font-bold leading-relaxed text-zinc-700">
                Este será o primeiro story de {artistName}!
              </p>
            </div>
          )}

          {/* Format info */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.015] p-4">
            <p className="mb-2 text-[8px] font-black tracking-[0.15em] text-zinc-600">ESPECIFICAÇÕES</p>
            <dl className="flex flex-col gap-1.5">
              {[
                ['Formato', '1080 × 1920 px'],
                ['Proporção', '9:16 (vertical)'],
                ['Exportação', 'PNG de alta qualidade'],
                ['Duração', '24h após publicação'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <dt className="text-[8px] font-bold text-zinc-600">{k}</dt>
                  <dd className="font-numeric text-[8px] font-bold text-zinc-400">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

        </aside>
      </div>
    </div>
  )
}
