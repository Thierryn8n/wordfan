'use client'

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Loader2,
  X,
  Lock,
  Globe,
  CalendarDays,
  ImageIcon,
  FileText,
  PlaySquare,
  Circle,
  Star,
  Check,
  Radio,
  Sparkles,
  ExternalLink,
  Clock,
  Music,
  Music2,
  Rocket,
} from 'lucide-react'
import type { GalleryItem, Live, Plan, Post, Show, Song, Story, Video, Tier } from '@/lib/types'
import { TIER_LABELS, TIER_ORDER, VIDEO_CATEGORY_LABELS, formatPrice } from '@/lib/types'
import {
  savePost,
  deletePost,
  saveShow,
  deleteShow,
  saveGalleryItem,
  deleteGalleryItem,
  saveVideo,
  deleteVideo,
  saveStory,
  deleteStory,
  saveLive,
  deleteLive,
  savePlan,
  deletePlan,
  uploadContentImage,
  saveSong,
  deleteSong,
  uploadContentAudio,
} from '@/app/actions/content'

type Section = 'feed' | 'stories' | 'agenda' | 'galeria' | 'videos' | 'musicas' | 'lives' | 'fanclub'

const SECTIONS: { key: Section; label: string; icon: typeof FileText }[] = [
  { key: 'feed', label: 'FEED', icon: FileText },
  { key: 'stories', label: 'STORIES', icon: Circle },
  { key: 'agenda', label: 'AGENDA', icon: CalendarDays },
  { key: 'galeria', label: 'GALERIA', icon: ImageIcon },
  { key: 'videos', label: 'VÍDEOS', icon: PlaySquare },
  { key: 'musicas', label: 'MÚSICAS', icon: Music },
  { key: 'lives', label: 'LIVES', icon: Radio },
  { key: 'fanclub', label: 'FAN CLUB', icon: Star },
]

const LIVE_STATUS_LABELS: Record<Live['status'], string> = {
  scheduled: 'AGENDADA',
  live: 'AO VIVO',
  ended: 'ENCERRADA',
}

const inputCls =
  'w-full rounded-2xl border border-white/8 bg-background px-4 py-3 text-xs font-bold outline-none transition-colors focus:border-primary'
const labelCls = 'text-[8px] font-black tracking-[0.2em] text-muted-foreground'

function TierPicker({
  isExclusive,
  minTier,
  onChange,
}: {
  isExclusive: boolean
  minTier: string
  onChange: (excl: boolean, tier: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(false, minTier)}
        className={
          !isExclusive
            ? 'flex items-center gap-1.5 rounded-full bg-primary/15 px-4 py-2 text-[8px] font-black tracking-[0.15em] text-primary'
            : 'flex items-center gap-1.5 rounded-full border border-white/8 bg-background px-4 py-2 text-[8px] font-black tracking-[0.15em] text-muted-foreground'
        }
      >
        <Globe className="size-3" aria-hidden="true" />
        PÚBLICO
      </button>
      {(['bronze', 'silver', 'gold', 'platinum'] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(true, t)}
          className={
            isExclusive && minTier === t
              ? 'flex items-center gap-1.5 rounded-full bg-primary/15 px-4 py-2 text-[8px] font-black tracking-[0.15em] text-primary'
              : 'flex items-center gap-1.5 rounded-full border border-white/8 bg-background px-4 py-2 text-[8px] font-black tracking-[0.15em] text-muted-foreground'
          }
        >
          <Lock className="size-3" aria-hidden="true" />
          {TIER_LABELS[t].toUpperCase()}+
        </button>
      ))}
    </div>
  )
}

function MediaUpload({
  artistId,
  kind,
  value,
  onChange,
  acceptVideo = false,
}: {
  artistId: string
  kind: string
  value: string
  onChange: (url: string) => void
  acceptVideo?: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    setUploading(true)
    setError('')
    const fd = new FormData()
    fd.set('file', file)
    fd.set('artistId', artistId)
    fd.set('kind', kind)
    const res = await uploadContentImage(fd)
    setUploading(false)
    if (res.error) setError(res.error)
    else if (res.url) onChange(res.url)
  }

  const accept = acceptVideo 
    ? 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime'
    : 'image/png,image/jpeg,image/webp,image/gif'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative size-18 shrink-0 overflow-hidden rounded-2xl border border-white/8">
            {value.match(/\.(mp4|webm|mov)$/i) ? (
              <video src={value} className="size-full object-cover" controls />
            ) : (
              <Image
                src={value || "/placeholder.svg"}
                alt=""
                width={72}
                height={72}
                className="size-full object-cover"
              />
            )}
          </div>
        ) : (
          <span className="flex size-18 shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/15 text-muted-foreground">
            {acceptVideo ? <PlaySquare className="size-5" aria-hidden="true" /> : <ImageIcon className="size-5" aria-hidden="true" />}
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex w-fit items-center gap-2 rounded-full border border-white/8 bg-background px-4 py-2 text-[8px] font-black tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="size-3" aria-hidden="true" />
            )}
            {uploading ? 'ENVIANDO...' : acceptVideo ? 'ENVIAR MÍDIA' : 'ENVIAR IMAGEM'}
          </button>
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="ou cole uma URL"
            className={inputCls}
          />
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />
      {error && <p className="text-[9px] font-bold text-red-400">{error}</p>}
    </div>
  )
}

// Upload de áudio para o bucket 'artist-audio'. Também extrai a duração do
// arquivo no cliente (via <audio> temporário) para preencher o formulário.
function AudioUpload({
  artistId,
  value,
  onChange,
  onDuration,
}: {
  artistId: string
  value: string
  onChange: (url: string) => void
  onDuration?: (seconds: number) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    setUploading(true)
    setError('')

    if (onDuration) {
      const url = URL.createObjectURL(file)
      const audio = document.createElement('audio')
      audio.preload = 'metadata'
      audio.src = url
      audio.addEventListener('loadedmetadata', () => {
        if (Number.isFinite(audio.duration)) onDuration(Math.round(audio.duration))
        URL.revokeObjectURL(url)
      })
    }

    const fd = new FormData()
    fd.set('file', file)
    fd.set('artistId', artistId)
    const res = await uploadContentAudio(fd)
    setUploading(false)
    if (res.error) setError(res.error)
    else if (res.url) onChange(res.url)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/15 text-muted-foreground">
          <Music2 className="size-5" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex w-fit items-center gap-2 rounded-full border border-white/8 bg-background px-4 py-2 text-[8px] font-black tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="size-3" aria-hidden="true" />
            )}
            {uploading ? 'ENVIANDO...' : 'ENVIAR ÁUDIO'}
          </button>
          {value && (
            <audio src={value} controls className="h-9 w-full max-w-[240px]">
              <track kind="captions" />
            </audio>
          )}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/aac,audio/mp4,audio/x-m4a,audio/wav,audio/ogg"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />
      {error && <p className="text-[9px] font-bold text-red-400">{error}</p>}
    </div>
  )
}

export function ContentManager({
  artistId,
  posts,
  shows,
  gallery,
  videos,
  stories = [],
  lives = [],
  plans = [],
  songs = [],
}: {
  artistId: string
  posts: Post[]
  shows: Show[]
  gallery: GalleryItem[]
  videos: Video[]
  stories?: Story[]
  lives?: Live[]
  plans?: Plan[]
  songs?: Song[]
}) {
  const router = useRouter()
  const [section, setSection] = useState<Section>('feed')
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [status, setStatus] = useState<{ ok?: string; error?: string }>({})
  const [isPending, startTransition] = useTransition()

  // Form states
  const [postForm, setPostForm] = useState({
    type: 'text' as 'text' | 'image' | 'video',
    title: '',
    content: '',
    mediaUrl: '',
    isExclusive: false,
    minTier: 'bronze',
  })
  const [showForm, setShowForm] = useState({
    title: '',
    venue: '',
    city: '',
    state: '',
    startsAt: '',
    status: 'scheduled' as 'scheduled' | 'done' | 'canceled',
  })
  const [galleryForm, setGalleryForm] = useState({ url: '', album: '' })
  const [videoForm, setVideoForm] = useState({
    title: '',
    category: 'clipe' as Video['category'],
    thumbnailUrl: '',
    duration: '',
    isExclusive: false,
    minTier: 'bronze',
  })
  const [storyForm, setStoryForm] = useState({ mediaUrl: '', caption: '' })
  const [liveForm, setLiveForm] = useState({
    title: '',
    scheduledAt: '',
    status: 'scheduled' as Live['status'],
    isExclusive: false,
    minTier: 'bronze',
    streamUrl: '',
  })
  const [planForm, setPlanForm] = useState({
    tier: 'bronze' as Tier,
    name: '',
    priceReais: '',
    benefits: [''],
  })
  const [songForm, setSongForm] = useState({
    title: '',
    audioUrl: '',
    coverUrl: '',
    durationSeconds: 0,
    rank: 0,
    isNewRelease: false,
    isExclusive: false,
    minTier: 'gold',
  })

  function resetForms() {
    setPostForm({ type: 'text', title: '', content: '', mediaUrl: '', isExclusive: false, minTier: 'bronze' })
    setShowForm({ title: '', venue: '', city: '', state: '', startsAt: '', status: 'scheduled' })
    setGalleryForm({ url: '', album: '' })
    setVideoForm({ title: '', category: 'clipe', thumbnailUrl: '', duration: '', isExclusive: false, minTier: 'bronze' })
    setStoryForm({ mediaUrl: '', caption: '' })
    setLiveForm({ title: '', scheduledAt: '', status: 'scheduled', isExclusive: false, minTier: 'bronze', streamUrl: '' })
    setPlanForm({ tier: 'bronze', name: '', priceReais: '', benefits: [''] })
    setSongForm({ title: '', audioUrl: '', coverUrl: '', durationSeconds: 0, rank: 0, isNewRelease: false, isExclusive: false, minTier: 'gold' })
    setEditing(null)
    setStatus({})
  }

  function run(action: () => Promise<{ error?: string; success?: boolean }>, okMsg: string) {
    startTransition(async () => {
      const res = await action()
      if (res.error) setStatus({ error: res.error })
      else {
        setStatus({ ok: okMsg })
        resetForms()
        router.refresh()
      }
    })
  }

  function confirmDelete(fn: () => Promise<{ error?: string; success?: boolean }>) {
    if (typeof window !== 'undefined' && !window.confirm('Tem certeza que deseja excluir? Esta ação não pode ser desfeita.')) {
      return
    }
    run(fn, 'Excluído com sucesso.')
  }

  const btnPrimary =
    'gradient-brand flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[9px] font-black tracking-[0.2em] text-white disabled:opacity-50'
  const btnGhost =
    'flex items-center gap-2 rounded-full border border-white/8 bg-background px-5 py-3 text-[9px] font-black tracking-[0.15em] text-muted-foreground'

  return (
    <div className="rounded-[32px] border border-white/8 bg-card p-6 shadow-2xl">
      {/* Abas */}
      <div className="scrollbar-none -mx-2 flex gap-2 overflow-x-auto px-2 pb-6" role="tablist" aria-label="Gerenciar conteúdo">
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={section === key}
            onClick={() => {
              setSection(key)
              resetForms()
            }}
            className={
              section === key
                ? 'gradient-brand flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-[9px] font-black tracking-[0.2em] text-white shadow-lg shadow-primary/20'
                : 'flex shrink-0 items-center gap-2 rounded-full border border-white/8 bg-background px-5 py-2.5 text-[9px] font-black tracking-[0.2em] text-muted-foreground hover:bg-white/[0.05] hover:text-foreground transition-all duration-200'
            }
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {status.error && (
        <p role="alert" className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-[10px] font-bold text-red-400">
          {status.error}
        </p>
      )}
      {status.ok && (
        <p role="status" className="mt-4 rounded-2xl bg-primary/10 px-4 py-3 text-[10px] font-bold text-primary">
          {status.ok}
        </p>
      )}

      {/* ============ FEED ============ */}
      {section === 'feed' && (
        <div className="mt-5">
          {editing === null && (
            <button type="button" onClick={() => setEditing('new')} className={btnPrimary}>
              <Plus className="size-3.5" aria-hidden="true" />
              NOVA PUBLICAÇÃO
            </button>
          )}

          {editing !== null && (
            <form
              className="flex flex-col gap-4 rounded-3xl border border-white/8 bg-background/50 p-5"
              onSubmit={(e) => {
                e.preventDefault()
                run(
                  () =>
                    savePost({
                      id: editing === 'new' ? undefined : editing,
                      artistId,
                      ...postForm,
                    }),
                  editing === 'new' ? 'Publicação criada!' : 'Publicação atualizada!',
                )
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black tracking-[0.2em] text-primary">
                  {editing === 'new' ? 'NOVA PUBLICAÇÃO' : 'EDITAR PUBLICAÇÃO'}
                </p>
                <button type="button" onClick={resetForms} aria-label="Fechar formulário">
                  <X className="size-4 text-muted-foreground" aria-hidden="true" />
                </button>
              </div>
              <div className="flex gap-2">
                {(['text', 'image'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPostForm((f) => ({ ...f, type: t }))}
                    className={
                      postForm.type === t
                        ? 'rounded-full bg-primary/15 px-4 py-2 text-[8px] font-black tracking-[0.15em] text-primary'
                        : 'rounded-full border border-white/8 px-4 py-2 text-[8px] font-black tracking-[0.15em] text-muted-foreground'
                    }
                  >
                    {t === 'text' ? 'TEXTO' : 'IMAGEM'}
                  </button>
                ))}
              </div>
              <div>
                <label className={labelCls} htmlFor="cm-post-title">TÍTULO *</label>
                <input
                  id="cm-post-title"
                  className={`mt-1.5 ${inputCls}`}
                  value={postForm.title}
                  onChange={(e) => setPostForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  maxLength={140}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="cm-post-content">CONTEÚDO</label>
                <textarea
                  id="cm-post-content"
                  rows={3}
                  className={`mt-1.5 ${inputCls} resize-none leading-relaxed`}
                  value={postForm.content}
                  onChange={(e) => setPostForm((f) => ({ ...f, content: e.target.value }))}
                  maxLength={2000}
                />
              </div>
              {postForm.type === 'image' && (
                <div>
                  <span className={labelCls}>IMAGEM DO POST</span>
                  <div className="mt-1.5">
                    <MediaUpload
                      artistId={artistId}
                      kind="post"
                      value={postForm.mediaUrl}
                      onChange={(url) => setPostForm((f) => ({ ...f, mediaUrl: url }))}
                    />
                  </div>
                </div>
              )}
              <div>
                <span className={labelCls}>VISIBILIDADE</span>
                <div className="mt-1.5">
                  <TierPicker
                    isExclusive={postForm.isExclusive}
                    minTier={postForm.minTier}
                    onChange={(excl, tier) => setPostForm((f) => ({ ...f, isExclusive: excl, minTier: tier }))}
                  />
                </div>
              </div>
              <button type="submit" disabled={isPending} className={btnPrimary}>
                {isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                {editing === 'new' ? 'PUBLICAR' : 'SALVAR ALTERAÇÕES'}
              </button>
            </form>
          )}

          <ul className="mt-4 flex flex-col gap-2">
            {posts.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-background/40 p-3.5">
                {p.media_url && (
                  <Image src={p.media_url || "/placeholder.svg"} alt="" width={40} height={40} className="size-10 shrink-0 rounded-xl object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-extrabold">{p.title ?? 'Sem título'}</p>
                  <p className="mt-0.5 text-[8px] font-black tracking-[0.1em] text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString('pt-BR')} ·{' '}
                    {p.is_exclusive && p.min_tier ? `${TIER_LABELS[p.min_tier].toUpperCase()}+` : 'PÚBLICO'}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Editar ${p.title}`}
                  className="flex size-8 items-center justify-center rounded-full border border-white/8 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => {
                    setEditing(p.id)
                    setPostForm({
                      type: (p.type === 'image' ? 'image' : 'text') as 'text' | 'image',
                      title: p.title ?? '',
                      content: p.content ?? '',
                      mediaUrl: p.media_url ?? '',
                      isExclusive: p.is_exclusive,
                      minTier: p.min_tier ?? 'bronze',
                    })
                  }}
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Excluir ${p.title}`}
                  disabled={isPending}
                  className="flex size-8 items-center justify-center rounded-full border border-red-500/20 text-red-400 transition-colors hover:bg-red-500/10"
                  onClick={() => confirmDelete(() => deletePost(p.id, artistId))}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
            {posts.length === 0 && (
              <li className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-[10px] font-bold text-muted-foreground">
                Nenhuma publicação ainda.
              </li>
            )}
          </ul>
        </div>
      )}

      {/* ============ AGENDA ============ */}
      {section === 'agenda' && (
        <div className="mt-5">
          {editing === null && (
            <button type="button" onClick={() => setEditing('new')} className={btnPrimary}>
              <Plus className="size-3.5" aria-hidden="true" />
              NOVO SHOW
            </button>
          )}

          {editing !== null && (
            <form
              className="flex flex-col gap-4 rounded-3xl border border-white/8 bg-background/50 p-5"
              onSubmit={(e) => {
                e.preventDefault()
                run(
                  () => saveShow({ id: editing === 'new' ? undefined : editing, artistId, ...showForm }),
                  editing === 'new' ? 'Show adicionado!' : 'Show atualizado!',
                )
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black tracking-[0.2em] text-primary">
                  {editing === 'new' ? 'NOVO SHOW' : 'EDITAR SHOW'}
                </p>
                <button type="button" onClick={resetForms} aria-label="Fechar formulário">
                  <X className="size-4 text-muted-foreground" aria-hidden="true" />
                </button>
              </div>
              <div>
                <label className={labelCls} htmlFor="cm-show-title">TÍTULO *</label>
                <input
                  id="cm-show-title"
                  className={`mt-1.5 ${inputCls}`}
                  value={showForm.title}
                  onChange={(e) => setShowForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  maxLength={140}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="cm-show-venue">LOCAL</label>
                  <input
                    id="cm-show-venue"
                    className={`mt-1.5 ${inputCls}`}
                    value={showForm.venue}
                    onChange={(e) => setShowForm((f) => ({ ...f, venue: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="cm-show-date">DATA E HORA *</label>
                  <input
                    id="cm-show-date"
                    type="datetime-local"
                    className={`mt-1.5 ${inputCls}`}
                    value={showForm.startsAt}
                    onChange={(e) => setShowForm((f) => ({ ...f, startsAt: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="cm-show-city">CIDADE</label>
                  <input
                    id="cm-show-city"
                    className={`mt-1.5 ${inputCls}`}
                    value={showForm.city}
                    onChange={(e) => setShowForm((f) => ({ ...f, city: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="cm-show-state">UF</label>
                  <input
                    id="cm-show-state"
                    className={`mt-1.5 ${inputCls}`}
                    value={showForm.state}
                    onChange={(e) => setShowForm((f) => ({ ...f, state: e.target.value }))}
                    maxLength={2}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {(
                  [
                    ['scheduled', 'AGENDADO'],
                    ['done', 'REALIZADO'],
                    ['canceled', 'CANCELADO'],
                  ] as const
                ).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setShowForm((f) => ({ ...f, status: v }))}
                    className={
                      showForm.status === v
                        ? 'rounded-full bg-primary/15 px-4 py-2 text-[8px] font-black tracking-[0.15em] text-primary'
                        : 'rounded-full border border-white/8 px-4 py-2 text-[8px] font-black tracking-[0.15em] text-muted-foreground'
                    }
                  >
                    {l}
                  </button>
                ))}
              </div>
              <button type="submit" disabled={isPending} className={btnPrimary}>
                {isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                {editing === 'new' ? 'ADICIONAR SHOW' : 'SALVAR ALTERAÇÕES'}
              </button>
            </form>
          )}

          <ul className="mt-4 flex flex-col gap-2">
            {shows.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-background/40 p-3.5">
                <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <span className="font-numeric text-sm font-bold leading-none">
                    {new Date(s.starts_at).getDate()}
                  </span>
                  <span className="text-[7px] font-black tracking-[0.1em] uppercase">
                    {new Date(s.starts_at).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-extrabold">{s.title}</p>
                  <p className="mt-0.5 truncate text-[8px] font-black tracking-[0.1em] text-muted-foreground">
                    {[s.venue, s.city && `${s.city}/${s.state}`].filter(Boolean).join(' · ')} ·{' '}
                    {s.status === 'scheduled' ? 'AGENDADO' : s.status === 'done' ? 'REALIZADO' : 'CANCELADO'}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Editar ${s.title}`}
                  className="flex size-8 items-center justify-center rounded-full border border-white/8 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => {
                    setEditing(s.id)
                    setShowForm({
                      title: s.title,
                      venue: s.venue ?? '',
                      city: s.city ?? '',
                      state: s.state ?? '',
                      startsAt: new Date(s.starts_at).toISOString().slice(0, 16),
                      status: s.status,
                    })
                  }}
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Excluir ${s.title}`}
                  disabled={isPending}
                  className="flex size-8 items-center justify-center rounded-full border border-red-500/20 text-red-400 transition-colors hover:bg-red-500/10"
                  onClick={() => confirmDelete(() => deleteShow(s.id, artistId))}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
            {shows.length === 0 && (
              <li className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-[10px] font-bold text-muted-foreground">
                Nenhum show na agenda.
              </li>
            )}
          </ul>
        </div>
      )}

      {/* ============ GALERIA ============ */}
      {section === 'galeria' && (
        <div className="mt-5">
          {editing === null && (
            <button type="button" onClick={() => setEditing('new')} className={btnPrimary}>
              <Plus className="size-3.5" aria-hidden="true" />
              ADICIONAR FOTO
            </button>
          )}

          {editing !== null && (
            <form
              className="flex flex-col gap-4 rounded-3xl border border-white/8 bg-background/50 p-5"
              onSubmit={(e) => {
                e.preventDefault()
                run(
                  () => saveGalleryItem({ id: editing === 'new' ? undefined : editing, artistId, ...galleryForm }),
                  editing === 'new' ? 'Foto adicionada!' : 'Foto atualizada!',
                )
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black tracking-[0.2em] text-primary">
                  {editing === 'new' ? 'NOVA FOTO' : 'EDITAR FOTO'}
                </p>
                <button type="button" onClick={resetForms} aria-label="Fechar formulário">
                  <X className="size-4 text-muted-foreground" aria-hidden="true" />
                </button>
              </div>
              <MediaUpload
                artistId={artistId}
                kind="gallery"
                value={galleryForm.url}
                onChange={(url) => setGalleryForm((f) => ({ ...f, url }))}
              />
              <div>
                <label className={labelCls} htmlFor="cm-gal-album">ÁLBUM</label>
                <input
                  id="cm-gal-album"
                  className={`mt-1.5 ${inputCls}`}
                  value={galleryForm.album}
                  onChange={(e) => setGalleryForm((f) => ({ ...f, album: e.target.value }))}
                  placeholder="ex: Bastidores, Turnê 2026..."
                  maxLength={80}
                />
              </div>
              <button type="submit" disabled={isPending || !galleryForm.url} className={btnPrimary}>
                {isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                {editing === 'new' ? 'ADICIONAR À GALERIA' : 'SALVAR ALTERAÇÕES'}
              </button>
            </form>
          )}

          {/* Grid estilo Instagram */}
          <div className="mt-4 grid grid-cols-3 gap-1.5">
            {gallery.map((g) => (
              <div key={g.id} className="group relative aspect-square overflow-hidden rounded-lg">
                <Image
                  src={g.url || "/placeholder.svg"}
                  alt={g.album ?? 'Foto da galeria'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 33vw, 200px"
                />
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    type="button"
                    aria-label="Editar foto"
                    className="flex size-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm"
                    onClick={() => {
                      setEditing(g.id)
                      setGalleryForm({ url: g.url, album: g.album ?? '' })
                    }}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Excluir foto"
                    disabled={isPending}
                    className="flex size-9 items-center justify-center rounded-full bg-red-500/80 text-white backdrop-blur-sm"
                    onClick={() => confirmDelete(() => deleteGalleryItem(g.id, artistId))}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
                {g.album && (
                  <span className="absolute bottom-1 left-1 rounded-full bg-black/70 px-2 py-0.5 text-[7px] font-black tracking-[0.1em] text-white">
                    {g.album.toUpperCase()}
                  </span>
                )}
              </div>
            ))}
          </div>
          {gallery.length === 0 && (
            <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-6 text-center text-[10px] font-bold text-muted-foreground">
              Nenhuma foto na galeria.
            </p>
          )}
        </div>
      )}

      {/* ============ VÍDEOS ============ */}
      {section === 'videos' && (
        <div className="mt-5">
          {editing === null && (
            <button type="button" onClick={() => setEditing('new')} className={btnPrimary}>
              <Plus className="size-3.5" aria-hidden="true" />
              NOVO VÍDEO
            </button>
          )}

          {editing !== null && (
            <form
              className="flex flex-col gap-4 rounded-3xl border border-white/8 bg-background/50 p-5"
              onSubmit={(e) => {
                e.preventDefault()
                run(
                  () => saveVideo({ id: editing === 'new' ? undefined : editing, artistId, ...videoForm }),
                  editing === 'new' ? 'Vídeo adicionado!' : 'Vídeo atualizado!',
                )
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black tracking-[0.2em] text-primary">
                  {editing === 'new' ? 'NOVO VÍDEO' : 'EDITAR VÍDEO'}
                </p>
                <button type="button" onClick={resetForms} aria-label="Fechar formulário">
                  <X className="size-4 text-muted-foreground" aria-hidden="true" />
                </button>
              </div>
              <div>
                <label className={labelCls} htmlFor="cm-video-title">TÍTULO *</label>
                <input
                  id="cm-video-title"
                  className={`mt-1.5 ${inputCls}`}
                  value={videoForm.title}
                  onChange={(e) => setVideoForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  maxLength={140}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(VIDEO_CATEGORY_LABELS) as Video['category'][]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setVideoForm((f) => ({ ...f, category: c }))}
                    className={
                      videoForm.category === c
                        ? 'rounded-full bg-primary/15 px-4 py-2 text-[8px] font-black tracking-[0.15em] text-primary'
                        : 'rounded-full border border-white/8 px-4 py-2 text-[8px] font-black tracking-[0.15em] text-muted-foreground'
                    }
                  >
                    {VIDEO_CATEGORY_LABELS[c].toUpperCase()}
                  </button>
                ))}
              </div>
              <div>
                <span className={labelCls}>THUMBNAIL</span>
                <div className="mt-1.5">
                  <MediaUpload
                    artistId={artistId}
                    kind="video-thumb"
                    value={videoForm.thumbnailUrl}
                    onChange={(url) => setVideoForm((f) => ({ ...f, thumbnailUrl: url }))}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="cm-video-dur">DURAÇÃO</label>
                <input
                  id="cm-video-dur"
                  className={`mt-1.5 ${inputCls}`}
                  value={videoForm.duration}
                  onChange={(e) => setVideoForm((f) => ({ ...f, duration: e.target.value }))}
                  placeholder="ex: 3:42"
                  maxLength={12}
                />
              </div>
              <div>
                <span className={labelCls}>VISIBILIDADE</span>
                <div className="mt-1.5">
                  <TierPicker
                    isExclusive={videoForm.isExclusive}
                    minTier={videoForm.minTier}
                    onChange={(excl, tier) => setVideoForm((f) => ({ ...f, isExclusive: excl, minTier: tier }))}
                  />
                </div>
              </div>
              <button type="submit" disabled={isPending} className={btnPrimary}>
                {isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                {editing === 'new' ? 'ADICIONAR VÍDEO' : 'SALVAR ALTERAÇÕES'}
              </button>
            </form>
          )}

          <ul className="mt-4 flex flex-col gap-2">
            {videos.map((v) => (
              <li key={v.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-background/40 p-3.5">
                {v.thumbnail_url && (
                  <Image
                    src={v.thumbnail_url || "/placeholder.svg"}
                    alt=""
                    width={56}
                    height={40}
                    className="h-10 w-14 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-extrabold">{v.title}</p>
                  <p className="mt-0.5 text-[8px] font-black tracking-[0.1em] text-muted-foreground">
                    {VIDEO_CATEGORY_LABELS[v.category].toUpperCase()} · {v.duration ?? '—'} ·{' '}
                    {v.is_exclusive && v.min_tier ? `${TIER_LABELS[v.min_tier].toUpperCase()}+` : 'PÚBLICO'}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Editar ${v.title}`}
                  className="flex size-8 items-center justify-center rounded-full border border-white/8 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => {
                    setEditing(v.id)
                    setVideoForm({
                      title: v.title,
                      category: v.category,
                      thumbnailUrl: v.thumbnail_url ?? '',
                      duration: v.duration ?? '',
                      isExclusive: v.is_exclusive,
                      minTier: v.min_tier ?? 'bronze',
                    })
                  }}
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Excluir ${v.title}`}
                  disabled={isPending}
                  className="flex size-8 items-center justify-center rounded-full border border-red-500/20 text-red-400 transition-colors hover:bg-red-500/10"
                  onClick={() => confirmDelete(() => deleteVideo(v.id, artistId))}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
            {videos.length === 0 && (
              <li className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-[10px] font-bold text-muted-foreground">
                Nenhum vídeo cadastrado.
              </li>
            )}
          </ul>
        </div>
      )}

      {/* ============ STORIES ============ */}
      {section === 'stories' && (
        <div className="mt-5 flex flex-col gap-5">

          {/* CTA hero — navega para a página dedicada do editor */}
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
            {/* decorative glow */}
            <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-primary/20 blur-[60px]" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
                  <Sparkles className="size-6 text-primary" />
                </span>
                <div>
                  <p className="font-serif text-base font-black tracking-tight text-foreground">
                    Editor visual de stories
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold leading-relaxed text-muted-foreground">
                    Crie stories com gradientes, textos, emojis, stickers, formas e vídeo.
                    Tudo em 1080×1920px, pronto para publicar.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {['Gradientes', 'Textos & fontes', 'Stickers', 'Vídeo de fundo', 'Formas'].map((f) => (
                      <span key={f} className="rounded-full border border-primary/20 bg-primary/8 px-2.5 py-0.5 text-[8px] font-black tracking-[0.1em] text-primary">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <Link
                  href="/estudio/editor-video"
                  className="gradient-brand flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-[10px] font-black tracking-[0.18em] text-white shadow-[0_8px_24px_-8px_rgba(255,106,0,0.6)] transition-transform hover:scale-[1.02]"
                >
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  CRIAR STORY
                  <ExternalLink className="size-3" aria-hidden="true" />
                </Link>
                {editing === null && (
                  <button
                    type="button"
                    onClick={() => setEditing('new')}
                    className={btnGhost}
                  >
                    <Upload className="size-3.5" aria-hidden="true" />
                    UPLOAD DIRETO
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Upload simples inline (mantido para quem só quer subir um arquivo) */}
          {editing !== null && editing !== 'canvas' && (
            <form
              className="flex flex-col gap-4 rounded-3xl border border-white/8 bg-background/50 p-5"
              onSubmit={(e) => {
                e.preventDefault()
                run(
                  () =>
                    saveStory({
                      id: editing === 'new' ? undefined : editing,
                      artistId,
                      ...storyForm,
                    }),
                  editing === 'new' ? 'Story publicado!' : 'Story atualizado!',
                )
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black tracking-[0.2em] text-primary">
                  {editing === 'new' ? 'UPLOAD DIRETO DE STORY' : 'EDITAR STORY'}
                </p>
                <button type="button" onClick={resetForms} aria-label="Fechar formulário">
                  <X className="size-4 text-muted-foreground" aria-hidden="true" />
                </button>
              </div>
              <div>
                <span className={labelCls}>MÍDIA (IMAGEM OU VÍDEO) *</span>
                <div className="mt-1.5">
                  <MediaUpload
                    artistId={artistId}
                    kind="story"
                    value={storyForm.mediaUrl}
                    acceptVideo={true}
                    onChange={(url) => setStoryForm((f) => ({ ...f, mediaUrl: url }))}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="cm-story-caption">LEGENDA</label>
                <input
                  id="cm-story-caption"
                  className={`mt-1.5 ${inputCls}`}
                  value={storyForm.caption}
                  onChange={(e) => setStoryForm((f) => ({ ...f, caption: e.target.value }))}
                  placeholder="Escreva algo (opcional)"
                  maxLength={140}
                />
              </div>
              <button type="submit" disabled={isPending || !storyForm.mediaUrl} className={btnPrimary}>
                {isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                {editing === 'new' ? 'PUBLICAR STORY' : 'SALVAR ALTERAÇÕES'}
              </button>
            </form>
          )}

          {/* Stories grid — cards visuais */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-[9px] font-black tracking-[0.18em] text-muted-foreground">
                <Clock className="size-3" aria-hidden="true" />
                STORIES ATIVOS
                <span className="rounded-full bg-white/8 px-2 py-0.5 text-[8px] font-black text-zinc-400">
                  {stories.length}
                </span>
              </p>
            </div>

            {stories.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-white/10 py-12 text-center">
                <span className="flex size-14 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03]">
                  <Circle className="size-6 text-zinc-600" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[11px] font-black text-zinc-400">Nenhum story publicado ainda</p>
                  <p className="mt-1 text-[9px] font-bold text-zinc-600">
                    Crie o primeiro com o editor visual acima!
                  </p>
                </div>
                <Link
                  href="/estudio/editor-video"
                  className="gradient-brand flex items-center gap-2 rounded-2xl px-6 py-3 text-[9px] font-black tracking-[0.18em] text-white shadow-[0_8px_20px_-8px_rgba(255,106,0,0.5)]"
                >
                  <Sparkles className="size-3.5" />
                  CRIAR PRIMEIRO STORY
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {stories.map((s) => (
                  <div key={s.id} className="group relative">
                    {/* card 9:16 */}
                    <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-white/8 bg-card">
                      <Image
                        src={s.media_url || '/placeholder.svg'}
                        alt={s.caption ?? 'Story'}
                        fill
                        sizes="(max-width: 640px) 30vw, 160px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {/* gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      {/* gradient brand ring on hover */}
                      <div className="absolute inset-0 rounded-2xl opacity-0 ring-2 ring-primary/60 transition-opacity group-hover:opacity-100" />

                      {/* caption */}
                      {s.caption && (
                        <div className="absolute inset-x-0 bottom-0 px-2 pb-2">
                          <p className="line-clamp-2 text-[7px] font-bold leading-tight text-white/90">
                            {s.caption}
                          </p>
                        </div>
                      )}

                      {/* date badge */}
                      <div className="absolute left-1.5 top-1.5">
                        <span className="rounded-full bg-black/60 px-1.5 py-0.5 text-[6px] font-black text-white/80 backdrop-blur-sm">
                          {new Date(s.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>

                      {/* action overlay */}
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 backdrop-blur-sm transition-all duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                        <button
                          type="button"
                          aria-label="Editar story"
                          className="flex size-9 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
                          onClick={() => {
                            setEditing(s.id)
                            setStoryForm({ mediaUrl: s.media_url, caption: s.caption ?? '' })
                          }}
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label="Excluir story"
                          disabled={isPending}
                          className="flex size-9 items-center justify-center rounded-xl bg-red-500/70 text-white backdrop-blur-sm transition-colors hover:bg-red-500/90 disabled:opacity-50"
                          onClick={() => confirmDelete(() => deleteStory(s.id, artistId))}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ MÚSICAS ============ */}
      {section === 'musicas' && (
        <div className="mt-5">
          {editing === null && (
            <>
              <button type="button" onClick={() => setEditing('new')} className={btnPrimary}>
                <Plus className="size-3.5" aria-hidden="true" />
                NOVA MÚSICA
              </button>
              <p className="mt-3 text-[10px] font-bold leading-relaxed text-muted-foreground">
                As faixas aparecem no player flutuante do perfil em ordem de <strong>ranking</strong> (Top 10).
                As 2 primeiras tocam livres; as demais exigem assinatura. Marque um{' '}
                <strong>lançamento</strong> para dar destaque e restringir a um plano exclusivo.
              </p>
            </>
          )}

          {editing !== null && (
            <form
              className="flex flex-col gap-4 rounded-3xl border border-white/8 bg-background/50 p-5"
              onSubmit={(e) => {
                e.preventDefault()
                run(
                  () => saveSong({ id: editing === 'new' ? undefined : editing, artistId, ...songForm }),
                  editing === 'new' ? 'Música adicionada!' : 'Música atualizada!',
                )
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black tracking-[0.2em] text-primary">
                  {editing === 'new' ? 'NOVA MÚSICA' : 'EDITAR MÚSICA'}
                </p>
                <button type="button" onClick={resetForms} aria-label="Fechar formulário">
                  <X className="size-4 text-muted-foreground" aria-hidden="true" />
                </button>
              </div>
              <div>
                <label className={labelCls} htmlFor="cm-song-title">TÍTULO *</label>
                <input
                  id="cm-song-title"
                  className={`mt-1.5 ${inputCls}`}
                  value={songForm.title}
                  onChange={(e) => setSongForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  maxLength={140}
                />
              </div>
              <div>
                <span className={labelCls}>ARQUIVO DE ÁUDIO *</span>
                <div className="mt-1.5">
                  <AudioUpload
                    artistId={artistId}
                    value={songForm.audioUrl}
                    onChange={(url) => setSongForm((f) => ({ ...f, audioUrl: url }))}
                    onDuration={(s) => setSongForm((f) => ({ ...f, durationSeconds: s }))}
                  />
                </div>
              </div>
              <div>
                <span className={labelCls}>CAPA</span>
                <div className="mt-1.5">
                  <MediaUpload
                    artistId={artistId}
                    kind="song-cover"
                    value={songForm.coverUrl}
                    onChange={(url) => setSongForm((f) => ({ ...f, coverUrl: url }))}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={labelCls} htmlFor="cm-song-rank">RANKING (TOP 10)</label>
                  <input
                    id="cm-song-rank"
                    type="number"
                    min={0}
                    max={999}
                    className={`mt-1.5 ${inputCls}`}
                    value={songForm.rank}
                    onChange={(e) => setSongForm((f) => ({ ...f, rank: Number(e.target.value) }))}
                    placeholder="1"
                  />
                </div>
                <div className="flex-1">
                  <label className={labelCls} htmlFor="cm-song-dur">DURAÇÃO (SEG)</label>
                  <input
                    id="cm-song-dur"
                    type="number"
                    min={0}
                    className={`mt-1.5 ${inputCls}`}
                    value={songForm.durationSeconds}
                    onChange={(e) => setSongForm((f) => ({ ...f, durationSeconds: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSongForm((f) => ({ ...f, isNewRelease: !f.isNewRelease }))}
                className={
                  songForm.isNewRelease
                    ? 'flex items-center gap-2 rounded-2xl bg-primary/15 px-4 py-3 text-[9px] font-black tracking-[0.15em] text-primary'
                    : 'flex items-center gap-2 rounded-2xl border border-white/8 bg-background px-4 py-3 text-[9px] font-black tracking-[0.15em] text-muted-foreground'
                }
              >
                <Rocket className="size-3.5" aria-hidden="true" />
                {songForm.isNewRelease ? 'LANÇAMENTO EM DESTAQUE' : 'MARCAR COMO LANÇAMENTO'}
              </button>
              <div>
                <span className={labelCls}>ACESSO</span>
                <div className="mt-1.5">
                  <TierPicker
                    isExclusive={songForm.isExclusive}
                    minTier={songForm.minTier}
                    onChange={(excl, tier) => setSongForm((f) => ({ ...f, isExclusive: excl, minTier: tier }))}
                  />
                </div>
                <p className="mt-2 text-[9px] font-bold text-muted-foreground">
                  Público = segue a regra das 2 grátis. Exclusivo = só assinantes do tier escolhido tocam.
                </p>
              </div>
              <button type="submit" disabled={isPending} className={btnPrimary}>
                {isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                {editing === 'new' ? 'ADICIONAR MÚSICA' : 'SALVAR ALTERAÇÕES'}
              </button>
            </form>
          )}

          <ul className="mt-4 flex flex-col gap-2">
            {songs.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-background/40 p-3.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-xs font-black tabular-nums text-muted-foreground">
                  {s.rank || i + 1}
                </span>
                {s.cover_url ? (
                  <Image
                    src={s.cover_url || "/placeholder.svg"}
                    alt=""
                    width={44}
                    height={44}
                    className="size-11 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/5 text-muted-foreground">
                    <Music className="size-4" aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-[11px] font-extrabold">
                    {s.title}
                    {s.is_new_release && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[7px] font-black tracking-[0.1em] text-primary">
                        <Rocket className="size-2.5" aria-hidden="true" />
                        NOVO
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[8px] font-black tracking-[0.1em] text-muted-foreground">
                    {s.is_exclusive && s.min_tier ? `${TIER_LABELS[s.min_tier].toUpperCase()}+` : 'PÚBLICO'}
                    {' · '}
                    {s.duration_seconds
                      ? `${Math.floor(s.duration_seconds / 60)}:${String(s.duration_seconds % 60).padStart(2, '0')}`
                      : '—'}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Editar ${s.title}`}
                  className="flex size-8 items-center justify-center rounded-full border border-white/8 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => {
                    setEditing(s.id)
                    setSongForm({
                      title: s.title,
                      audioUrl: s.audio_url,
                      coverUrl: s.cover_url ?? '',
                      durationSeconds: s.duration_seconds,
                      rank: s.rank,
                      isNewRelease: s.is_new_release,
                      isExclusive: s.is_exclusive,
                      minTier: s.min_tier ?? 'gold',
                    })
                  }}
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Excluir ${s.title}`}
                  disabled={isPending}
                  className="flex size-8 items-center justify-center rounded-full border border-red-500/20 text-red-400 transition-colors hover:bg-red-500/10"
                  onClick={() => confirmDelete(() => deleteSong(s.id, artistId))}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
            {songs.length === 0 && (
              <li className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-[10px] font-bold text-muted-foreground">
                Nenhuma música cadastrada.
              </li>
            )}
          </ul>
        </div>
      )}

      {/* ============ LIVES ============ */}
      {section === 'lives' && (
        <div className="mt-5">
          {editing === null && (
            <button type="button" onClick={() => setEditing('new')} className={btnPrimary}>
              <Plus className="size-3.5" aria-hidden="true" />
              NOVA LIVE
            </button>
          )}

          {editing !== null && (
            <form
              className="flex flex-col gap-4 rounded-3xl border border-white/8 bg-background/50 p-5"
              onSubmit={(e) => {
                e.preventDefault()
                run(
                  () => saveLive({ id: editing === 'new' ? undefined : editing, artistId, ...liveForm }),
                  editing === 'new' ? 'Live agendada!' : 'Live atualizada!',
                )
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black tracking-[0.2em] text-primary">
                  {editing === 'new' ? 'NOVA LIVE' : 'EDITAR LIVE'}
                </p>
                <button type="button" onClick={resetForms} aria-label="Fechar formulário">
                  <X className="size-4 text-muted-foreground" aria-hidden="true" />
                </button>
              </div>
              <div>
                <label className={labelCls} htmlFor="cm-live-title">TÍTULO *</label>
                <input
                  id="cm-live-title"
                  className={`mt-1.5 ${inputCls}`}
                  value={liveForm.title}
                  onChange={(e) => setLiveForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  maxLength={140}
                  placeholder="Ex.: Bastidores do novo álbum"
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="cm-live-date">DATA E HORA *</label>
                <input
                  id="cm-live-date"
                  type="datetime-local"
                  className={`mt-1.5 ${inputCls}`}
                  value={liveForm.scheduledAt}
                  onChange={(e) => setLiveForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="cm-live-stream">
                  LINK DA TRANSMISSÃO
                </label>
                <input
                  id="cm-live-stream"
                  type="url"
                  inputMode="url"
                  className={`mt-1.5 ${inputCls}`}
                  value={liveForm.streamUrl}
                  onChange={(e) => setLiveForm((f) => ({ ...f, streamUrl: e.target.value }))}
                  placeholder="YouTube, Vimeo ou link .mp4/.m3u8"
                />
                <p className="mt-1.5 text-[8px] font-bold leading-relaxed tracking-[0.05em] text-muted-foreground">
                  Cole o link do YouTube/Vimeo ou de um vídeo direto. Ao mudar a
                  situação para AO VIVO, os fãs veem a transmissão e o chat em tempo real.
                </p>
              </div>
              <div>
                <p className={labelCls}>SITUAÇÃO</p>
                <div className="mt-1.5 flex gap-2">
                  {(['scheduled', 'live', 'ended'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setLiveForm((f) => ({ ...f, status: v }))}
                      className={
                        liveForm.status === v
                          ? 'rounded-full bg-primary/15 px-4 py-2 text-[8px] font-black tracking-[0.15em] text-primary'
                          : 'rounded-full border border-white/8 px-4 py-2 text-[8px] font-black tracking-[0.15em] text-muted-foreground'
                      }
                    >
                      {LIVE_STATUS_LABELS[v]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className={labelCls}>QUEM PODE ASSISTIR</p>
                <div className="mt-1.5">
                  <TierPicker
                    isExclusive={liveForm.isExclusive}
                    minTier={liveForm.minTier}
                    onChange={(isExclusive, minTier) =>
                      setLiveForm((f) => ({ ...f, isExclusive, minTier }))
                    }
                  />
                </div>
              </div>
              <button type="submit" disabled={isPending} className={btnPrimary}>
                {isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                {editing === 'new' ? 'AGENDAR LIVE' : 'SALVAR ALTERAÇÕES'}
              </button>
            </form>
          )}

          <ul className="mt-4 flex flex-col gap-2">
            {lives.map((l) => (
              <li
                key={l.id}
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-background/40 p-3.5"
              >
                <span
                  className={
                    l.status === 'live'
                      ? 'flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400'
                      : 'flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'
                  }
                >
                  <Radio className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-extrabold">{l.title}</p>
                  <p className="mt-0.5 truncate text-[8px] font-black tracking-[0.1em] text-muted-foreground">
                    {new Date(l.scheduled_at).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    · {LIVE_STATUS_LABELS[l.status]}
                    {l.min_tier ? ` · ${TIER_LABELS[l.min_tier].toUpperCase()}+` : ' · PÚBLICA'}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Editar ${l.title}`}
                  className="flex size-8 items-center justify-center rounded-full border border-white/8 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => {
                    setEditing(l.id)
                    setLiveForm({
                      title: l.title,
                      scheduledAt: new Date(l.scheduled_at).toISOString().slice(0, 16),
                      status: l.status,
                      isExclusive: Boolean(l.min_tier),
                      minTier: l.min_tier ?? 'bronze',
                      streamUrl: l.stream_url ?? '',
                    })
                  }}
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Excluir ${l.title}`}
                  disabled={isPending}
                  className="flex size-8 items-center justify-center rounded-full border border-red-500/20 text-red-400 transition-colors hover:bg-red-500/10"
                  onClick={() => confirmDelete(() => deleteLive(l.id, artistId))}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
            {lives.length === 0 && (
              <li className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-[10px] font-bold text-muted-foreground">
                Nenhuma live agendada.
              </li>
            )}
          </ul>
        </div>
      )}

      {/* ============ FAN CLUB (planos) ============ */}
      {section === 'fanclub' && (
        <div className="mt-5">
          {editing === null && (
            <button type="button" onClick={() => setEditing('new')} className={btnPrimary}>
              <Plus className="size-3.5" aria-hidden="true" />
              NOVO PLANO
            </button>
          )}

          {editing !== null && (
            <form
              className="flex flex-col gap-4 rounded-3xl border border-white/8 bg-background/50 p-5"
              onSubmit={(e) => {
                e.preventDefault()
                run(
                  () =>
                    savePlan({
                      id: editing === 'new' ? undefined : editing,
                      artistId,
                      tier: planForm.tier,
                      name: planForm.name,
                      priceReais: planForm.priceReais,
                      benefits: planForm.benefits,
                    }),
                  editing === 'new' ? 'Plano criado!' : 'Plano atualizado!',
                )
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black tracking-[0.2em] text-primary">
                  {editing === 'new' ? 'NOVO PLANO' : 'EDITAR PLANO'}
                </p>
                <button type="button" onClick={resetForms} aria-label="Fechar formulário">
                  <X className="size-4 text-muted-foreground" aria-hidden="true" />
                </button>
              </div>
              <div>
                <span className={labelCls}>NÍVEL (TIER)</span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {TIER_ORDER.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPlanForm((f) => ({ ...f, tier: t }))}
                      className={
                        planForm.tier === t
                          ? 'rounded-full bg-primary/15 px-4 py-2 text-[8px] font-black tracking-[0.15em] text-primary'
                          : 'rounded-full border border-white/8 px-4 py-2 text-[8px] font-black tracking-[0.15em] text-muted-foreground'
                      }
                    >
                      {TIER_LABELS[t].toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="cm-plan-name">NOME DO PLANO *</label>
                  <input
                    id="cm-plan-name"
                    className={`mt-1.5 ${inputCls}`}
                    value={planForm.name}
                    onChange={(e) => setPlanForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    maxLength={60}
                    placeholder="ex: Clube Ouro"
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="cm-plan-price">PREÇO/MÊS (R$) *</label>
                  <input
                    id="cm-plan-price"
                    className={`mt-1.5 ${inputCls} font-numeric`}
                    value={planForm.priceReais}
                    onChange={(e) => setPlanForm((f) => ({ ...f, priceReais: e.target.value }))}
                    inputMode="decimal"
                    required
                    placeholder="29,90"
                  />
                </div>
              </div>
              <div>
                <span className={labelCls}>BENEFÍCIOS</span>
                <div className="mt-1.5 flex flex-col gap-2">
                  {planForm.benefits.map((b, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        className={inputCls}
                        value={b}
                        onChange={(e) =>
                          setPlanForm((f) => {
                            const benefits = [...f.benefits]
                            benefits[i] = e.target.value
                            return { ...f, benefits }
                          })
                        }
                        placeholder={`Benefício ${i + 1}`}
                        maxLength={120}
                      />
                      <button
                        type="button"
                        aria-label="Remover benefício"
                        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/8 text-muted-foreground"
                        onClick={() =>
                          setPlanForm((f) => ({
                            ...f,
                            benefits: f.benefits.length > 1 ? f.benefits.filter((_, j) => j !== i) : [''],
                          }))
                        }
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPlanForm((f) => ({ ...f, benefits: [...f.benefits, ''] }))}
                    className="flex w-fit items-center gap-2 rounded-full border border-white/8 bg-background px-4 py-2 text-[8px] font-black tracking-[0.15em] text-muted-foreground"
                  >
                    <Plus className="size-3" aria-hidden="true" />
                    ADICIONAR BENEFÍCIO
                  </button>
                </div>
              </div>
              <button type="submit" disabled={isPending} className={btnPrimary}>
                {isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                {editing === 'new' ? 'CRIAR PLANO' : 'SALVAR ALTERAÇÕES'}
              </button>
            </form>
          )}

          <ul className="mt-4 flex flex-col gap-2">
            {[...plans]
              .sort((a, b) => a.price_cents - b.price_cents)
              .map((p) => (
                <li key={p.id} className="rounded-2xl border border-white/8 bg-background/40 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Star className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-extrabold">
                        {p.name}{' '}
                        <span className="text-[8px] font-black tracking-[0.1em] text-muted-foreground">
                          · {TIER_LABELS[p.tier].toUpperCase()}
                        </span>
                      </p>
                      <p className="mt-0.5 font-numeric text-[10px] font-bold text-primary">
                        {formatPrice(p.price_cents)}/mês
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Editar ${p.name}`}
                      className="flex size-8 items-center justify-center rounded-full border border-white/8 text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => {
                        setEditing(p.id)
                        setPlanForm({
                          tier: p.tier,
                          name: p.name,
                          priceReais: (p.price_cents / 100).toFixed(2).replace('.', ','),
                          benefits: p.benefits && p.benefits.length > 0 ? [...p.benefits] : [''],
                        })
                      }}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Excluir ${p.name}`}
                      disabled={isPending}
                      className="flex size-8 items-center justify-center rounded-full border border-red-500/20 text-red-400 transition-colors hover:bg-red-500/10"
                      onClick={() => confirmDelete(() => deletePlan(p.id, artistId))}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  {p.benefits && p.benefits.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-1.5 pl-1">
                      {p.benefits.map((b, i) => (
                        <li key={i} className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                          <Check className="size-3 shrink-0 text-primary" aria-hidden="true" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            {plans.length === 0 && (
              <li className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-[10px] font-bold text-muted-foreground">
                Nenhum plano criado. Adicione planos para monetizar seu Fan Club.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
