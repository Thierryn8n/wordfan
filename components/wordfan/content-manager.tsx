'use client'

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
} from 'lucide-react'
import type { GalleryItem, Post, Show, Video } from '@/lib/types'
import { TIER_LABELS, VIDEO_CATEGORY_LABELS } from '@/lib/types'
import {
  savePost,
  deletePost,
  saveShow,
  deleteShow,
  saveGalleryItem,
  deleteGalleryItem,
  saveVideo,
  deleteVideo,
  uploadContentImage,
} from '@/app/actions/content'

type Section = 'feed' | 'agenda' | 'galeria' | 'videos'

const SECTIONS: { key: Section; label: string; icon: typeof FileText }[] = [
  { key: 'feed', label: 'FEED', icon: FileText },
  { key: 'agenda', label: 'AGENDA', icon: CalendarDays },
  { key: 'galeria', label: 'GALERIA', icon: ImageIcon },
  { key: 'videos', label: 'VÍDEOS', icon: PlaySquare },
]

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
}: {
  artistId: string
  kind: string
  value: string
  onChange: (url: string) => void
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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {value ? (
          <Image
            src={value || "/placeholder.svg"}
            alt=""
            width={72}
            height={72}
            className="size-18 shrink-0 rounded-2xl border border-white/8 object-cover"
          />
        ) : (
          <span className="flex size-18 shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/15 text-muted-foreground">
            <ImageIcon className="size-5" aria-hidden="true" />
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
            {uploading ? 'ENVIANDO...' : 'ENVIAR IMAGEM'}
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
        accept="image/png,image/jpeg,image/webp,image/gif"
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
}: {
  artistId: string
  posts: Post[]
  shows: Show[]
  gallery: GalleryItem[]
  videos: Video[]
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

  function resetForms() {
    setPostForm({ type: 'text', title: '', content: '', mediaUrl: '', isExclusive: false, minTier: 'bronze' })
    setShowForm({ title: '', venue: '', city: '', state: '', startsAt: '', status: 'scheduled' })
    setGalleryForm({ url: '', album: '' })
    setVideoForm({ title: '', category: 'clipe', thumbnailUrl: '', duration: '', isExclusive: false, minTier: 'bronze' })
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
    run(fn, 'Excluído com sucesso.')
  }

  const btnPrimary =
    'gradient-brand flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[9px] font-black tracking-[0.2em] text-white disabled:opacity-50'
  const btnGhost =
    'flex items-center gap-2 rounded-full border border-white/8 bg-background px-5 py-3 text-[9px] font-black tracking-[0.15em] text-muted-foreground'

  return (
    <div className="rounded-[32px] border border-white/8 bg-card p-6">
      {/* Abas */}
      <div className="scrollbar-none -mx-2 flex gap-2 overflow-x-auto px-2" role="tablist" aria-label="Gerenciar conteúdo">
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
                ? 'gradient-brand flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-[9px] font-black tracking-[0.2em] text-white'
                : 'flex shrink-0 items-center gap-2 rounded-full border border-white/8 bg-background px-5 py-2.5 text-[9px] font-black tracking-[0.2em] text-muted-foreground'
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
    </div>
  )
}
