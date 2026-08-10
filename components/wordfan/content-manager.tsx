'use client'

import dynamic from 'next/dynamic'
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
} from 'lucide-react'
import type { GalleryItem, Live, Plan, Post, Show, Story, Video, Tier } from '@/lib/types'
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
} from '@/app/actions/content'

const StoryCanvasEditor = dynamic(
  () => import('./story-canvas-editor').then((m) => ({ default: m.StoryCanvasEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[600px] items-center justify-center rounded-3xl border border-white/8 bg-background/50">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
      </div>
    ),
  },
)

function dataUrlToFile(dataUrl: string, filename: string) {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png'
  const bytes = atob(base64)
  const buffer = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i)
  return new File([buffer], filename, { type: mime })
}

type Section = 'feed' | 'stories' | 'agenda' | 'galeria' | 'videos' | 'lives' | 'fanclub'

const SECTIONS: { key: Section; label: string; icon: typeof FileText }[] = [
  { key: 'feed', label: 'FEED', icon: FileText },
  { key: 'stories', label: 'STORIES', icon: Circle },
  { key: 'agenda', label: 'AGENDA', icon: CalendarDays },
  { key: 'galeria', label: 'GALERIA', icon: ImageIcon },
  { key: 'videos', label: 'VÍDEOS', icon: PlaySquare },
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

export function ContentManager({
  artistId,
  posts,
  shows,
  gallery,
  videos,
  stories = [],
  lives = [],
  plans = [],
}: {
  artistId: string
  posts: Post[]
  shows: Show[]
  gallery: GalleryItem[]
  videos: Video[]
  stories?: Story[]
  lives?: Live[]
  plans?: Plan[]
}) {
  const router = useRouter()
  const [section, setSection] = useState<Section>('feed')
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [status, setStatus] = useState<{ ok?: string; error?: string }>({})
  const [isPending, startTransition] = useTransition()
  const [useCanvasEditor, setUseCanvasEditor] = useState(false)

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
  })
  const [planForm, setPlanForm] = useState({
    tier: 'bronze' as Tier,
    name: '',
    priceReais: '',
    benefits: [''],
  })

  function resetForms() {
    setPostForm({ type: 'text', title: '', content: '', mediaUrl: '', isExclusive: false, minTier: 'bronze' })
    setShowForm({ title: '', venue: '', city: '', state: '', startsAt: '', status: 'scheduled' })
    setGalleryForm({ url: '', album: '' })
    setVideoForm({ title: '', category: 'clipe', thumbnailUrl: '', duration: '', isExclusive: false, minTier: 'bronze' })
    setStoryForm({ mediaUrl: '', caption: '' })
    setLiveForm({ title: '', scheduledAt: '', status: 'scheduled', isExclusive: false, minTier: 'bronze' })
    setPlanForm({ tier: 'bronze', name: '', priceReais: '', benefits: [''] })
    setEditing(null)
    setUseCanvasEditor(false)
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
        <div className="mt-5">
          {editing === null && (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditing('canvas')
                  setUseCanvasEditor(true)
                }}
                className={btnPrimary}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                CRIAR STORY
              </button>
              <button type="button" onClick={() => setEditing('new')} className={btnGhost}>
                <Upload className="size-3.5" aria-hidden="true" />
                UPLOAD SIMPLES
              </button>
            </div>
          )}

          {editing === 'canvas' && useCanvasEditor && (
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelCls} htmlFor="cm-story-canvas-caption">
                  LEGENDA (OPCIONAL)
                </label>
                <input
                  id="cm-story-canvas-caption"
                  className={`mt-1.5 ${inputCls}`}
                  value={storyForm.caption}
                  onChange={(e) => setStoryForm((f) => ({ ...f, caption: e.target.value }))}
                  placeholder="Escreva algo (opcional)"
                  maxLength={140}
                />
              </div>
              <div className="h-[600px]">
                <StoryCanvasEditor
                  onSave={(imageDataUrl) => {
                    startTransition(async () => {
                      setStatus({})
                      const file = dataUrlToFile(imageDataUrl, `story-${Date.now()}.png`)
                      const fd = new FormData()
                      fd.set('file', file)
                      fd.set('artistId', artistId)
                      fd.set('kind', 'story')
                      const upload = await uploadContentImage(fd)
                      if (upload.error) {
                        setStatus({ error: upload.error })
                        return
                      }
                      const res = await saveStory({
                        id: undefined,
                        artistId,
                        mediaUrl: upload.url!,
                        caption: storyForm.caption,
                      })
                      if (res.error) setStatus({ error: res.error })
                      else {
                        setStatus({ ok: 'Story publicado com o editor visual!' })
                        resetForms()
                        router.refresh()
                      }
                    })
                  }}
                  onCancel={resetForms}
                  backgroundImage={storyForm.mediaUrl || undefined}
                />
              </div>
            </div>
          )}

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
                  {editing === 'new' ? 'UPLOAD SIMPLES DE STORY' : 'EDITAR STORY'}
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

          <div className="mt-4 flex flex-wrap gap-3">
            {stories.map((s) => (
              <div key={s.id} className="group relative">
                <span className="gradient-brand block rounded-full p-[3px]">
                  <span className="block rounded-full border-2 border-card">
                    <Image
                      src={s.media_url || '/placeholder.svg'}
                      alt={s.caption ?? 'Story'}
                      width={72}
                      height={72}
                      className="size-16 rounded-full object-cover"
                    />
                  </span>
                </span>
                <div className="absolute inset-0 flex items-center justify-center gap-1 rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    type="button"
                    aria-label="Editar story"
                    className="flex size-7 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm"
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
                    className="flex size-7 items-center justify-center rounded-full bg-red-500/80 text-white backdrop-blur-sm"
                    onClick={() => confirmDelete(() => deleteStory(s.id, artistId))}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
            {stories.length === 0 && (
              <p className="w-full rounded-2xl border border-dashed border-white/10 p-6 text-center text-[10px] font-bold text-muted-foreground">
                Nenhum story ativo. Publique o primeiro!
              </p>
            )}
          </div>
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
