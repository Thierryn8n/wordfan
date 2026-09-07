'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { CheckCircle2, ImagePlus, Plus, Upload, X } from 'lucide-react'
import type { Artist, ArtistAbout } from '@/lib/types'
import { saveArtistProfile, uploadArtistImage } from './actions'

const SOCIAL_KEYS = [
  { key: 'instagram', label: 'INSTAGRAM' },
  { key: 'tiktok', label: 'TIKTOK' },
  { key: 'spotify', label: 'SPOTIFY' },
  { key: 'youtube', label: 'YOUTUBE' },
  { key: 'facebook', label: 'FACEBOOK' },
  { key: 'site', label: 'SITE OFICIAL' },
] as const

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  textarea?: boolean
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold tracking-[0.04em] text-zinc-400">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="rounded-xl border border-white/10 bg-card px-4 py-3 text-xs font-bold leading-relaxed outline-none focus:border-primary"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-11 rounded-xl border border-white/10 bg-card px-4 text-xs font-bold outline-none focus:border-primary"
        />
      )}
    </label>
  )
}

function ImageUploader({
  label,
  url,
  artistId,
  kind,
  onUploaded,
}: {
  label: string
  url: string
  artistId: string
  kind: 'avatar' | 'banner' | 'logo'
  onUploaded: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleFile(file: File) {
    setError(null)
    setSuccess(false)
    setUploading(true)

    try {
      const fd = new FormData()
      fd.set('file', file)
      fd.set('artistId', artistId)
      fd.set('kind', kind)
      const res = await uploadArtistImage(fd)

      if (res.error) setError(res.error)
      else if (res.url) {
        onUploaded(res.url)
        setSuccess(true)
      }
    } catch {
      setError('Não foi possível enviar a imagem. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-4">
      <span className="text-[11px] font-bold tracking-[0.04em] text-zinc-400">{label}</span>
      <div className={kind === 'banner' ? 'mt-3 flex flex-col gap-3' : 'mt-3 flex items-center gap-4'}>
        <div
          className={
            kind === 'banner'
              ? 'relative aspect-[16/6] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/30'
              : 'relative size-24 shrink-0 overflow-hidden rounded-full border-2 border-primary/40 bg-black/30'
          }
        >
          {url ? (
            <Image
              src={url || '/placeholder.svg'}
              alt=""
              fill
              sizes={kind === 'banner' ? '(max-width: 768px) 100vw, 560px' : '96px'}
              className="object-cover"
            />
          ) : (
            <span className="flex h-full flex-col items-center justify-center gap-2 text-[11px] font-bold tracking-[0.04em] text-zinc-500">
              <ImagePlus className="size-5" aria-hidden="true" />
              Sem imagem
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <input
            value={url}
            onChange={(e) => onUploaded(e.target.value)}
            placeholder="URL da imagem ou envie um arquivo"
            aria-label={`URL de ${label}`}
            className="h-10 rounded-xl border border-white/10 bg-card px-3 text-xs font-medium outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 text-[11px] font-black tracking-[0.06em] text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
          >
            <Upload className="size-3.5" aria-hidden="true" />
            {uploading ? 'Enviando…' : 'Enviar arquivo'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            aria-label={`Enviar arquivo para ${label}`}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }}
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[10px] font-bold text-destructive">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          Imagem enviada e salva no perfil.
        </p>
      )}
    </div>
  )
}

function ListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState('')

  function add() {
    const v = draft.trim()
    if (!v) return
    onChange([...items, v])
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-bold tracking-[0.04em] text-zinc-400">{label}</span>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-card px-3 py-1.5 text-[10px] font-bold"
          >
            {item}
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label={`Remover ${item}`}
              className="text-zinc-500 transition-colors hover:text-destructive"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          className="h-10 flex-1 rounded-xl border border-white/10 bg-card px-3 text-[10px] font-bold outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={add}
          aria-label={`Adicionar em ${label}`}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-card text-muted-foreground transition-colors hover:text-primary"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export function ProfileEditor({
  artist,
  avatarUrl,
  bannerUrl,
  logoUrl,
  onAvatarChange,
  onBannerChange,
  onLogoChange,
}: {
  artist: Artist
  avatarUrl: string
  bannerUrl: string
  logoUrl: string
  onAvatarChange: (url: string) => void
  onBannerChange: (url: string) => void
  onLogoChange: (url: string) => void
}) {
  const about = (artist.about ?? {}) as ArtistAbout
  const [name, setName] = useState(artist.name)
  const [bio, setBio] = useState(artist.bio ?? '')
  const [genre, setGenre] = useState(artist.genre ?? '')
  const [city, setCity] = useState(artist.city ?? '')
  const [state, setState] = useState(artist.state ?? '')
  const [socials, setSocials] = useState<Record<string, string>>(artist.social_links ?? {})
  const [history, setHistory] = useState(about.history ?? '')
  const [influences, setInfluences] = useState<string[]>(about.influences ?? [])
  const [awards, setAwards] = useState<string[]>(about.awards ?? [])
  const [discography, setDiscography] = useState<{ title: string; year: string }[]>(
    about.discography ?? [],
  )
  const [discoDraft, setDiscoDraft] = useState({ title: '', year: '' })
  const [status, setStatus] = useState<{ ok?: string; error?: string }>({})
  const [isPending, startTransition] = useTransition()

  function save() {
    setStatus({})
    startTransition(async () => {
      const res = await saveArtistProfile({
        artistId: artist.id,
        slug: artist.slug,
        name,
        bio,
        genre,
        city,
        state,
        socialLinks: socials,
        about: { history, influences, discography, awards },
        avatarUrl,
        bannerUrl,
        logoUrl,
      })
      if (res?.error) setStatus({ error: res.error })
      else setStatus({ ok: 'Perfil salvo! Páginas públicas atualizadas.' })
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="fotos-h" className="admin-editor-section">
        <h2 id="fotos-h" className="text-[11px] font-black tracking-[0.1em] text-muted-foreground">
          FOTOS DO ARTISTA
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <ImageUploader
            label="FOTO DE PERFIL (AVATAR)"
            url={avatarUrl}
            artistId={artist.id}
            kind="avatar"
            onUploaded={onAvatarChange}
          />
          <ImageUploader
            label="BANNER / CAPA"
            url={bannerUrl}
            artistId={artist.id}
            kind="banner"
            onUploaded={onBannerChange}
          />
          <ImageUploader
            label="LOGO DO ARTISTA"
            url={logoUrl}
            artistId={artist.id}
            kind="logo"
            onUploaded={onLogoChange}
          />
        </div>
        <p className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 text-[9px] font-bold text-emerald-300/80">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          Arquivos enviados são aplicados imediatamente. URLs digitadas são gravadas ao salvar o perfil.
        </p>
      </section>

      <section aria-labelledby="dados-h" className="admin-editor-section">
        <h2 id="dados-h" className="text-[11px] font-black tracking-[0.1em] text-muted-foreground">
          DADOS DO ARTISTA
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="NOME ARTÍSTICO" value={name} onChange={setName} placeholder="Nome" />
          <Field label="GÊNERO MUSICAL" value={genre} onChange={setGenre} placeholder="Pop" />
          <Field label="CIDADE" value={city} onChange={setCity} placeholder="São Paulo" />
          <Field label="ESTADO (UF)" value={state} onChange={setState} placeholder="SP" />
        </div>
        <div className="mt-3">
          <Field label="BIO CURTA" value={bio} onChange={setBio} placeholder="Bio do artista" textarea />
        </div>
      </section>

      <section aria-labelledby="social-h" className="admin-editor-section">
        <h2 id="social-h" className="text-[11px] font-black tracking-[0.1em] text-muted-foreground">
          REDES SOCIAIS
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {SOCIAL_KEYS.map(({ key, label }) => (
            <Field
              key={key}
              label={label}
              value={socials[key] ?? ''}
              onChange={(v) => setSocials((s) => ({ ...s, [key]: v }))}
              placeholder={key === 'site' ? 'https://...' : '@usuario'}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="sobre-h" className="admin-editor-section">
        <h2 id="sobre-h" className="text-[11px] font-black tracking-[0.1em] text-muted-foreground">
          SOBRE O ARTISTA
        </h2>
        <div className="mt-3 flex flex-col gap-4">
          <Field
            label="HISTÓRIA / BIOGRAFIA COMPLETA"
            value={history}
            onChange={setHistory}
            placeholder="Conte a história do artista..."
            textarea
          />
          <ListEditor
            label="INFLUÊNCIAS"
            items={influences}
            onChange={setInfluences}
            placeholder="Adicionar influência"
          />
          <ListEditor
            label="PRÊMIOS E CONQUISTAS"
            items={awards}
            onChange={setAwards}
            placeholder="Adicionar prêmio"
          />

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold tracking-[0.04em] text-zinc-400">DISCOGRAFIA</span>
            <div className="flex flex-col gap-2">
              {discography.map((d, i) => (
                <div
                  key={`${d.title}-${i}`}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-card px-4 py-2.5"
                >
                  <span className="flex-1 text-[11px] font-bold">{d.title}</span>
                  <span className="font-numeric text-[10px] font-bold text-muted-foreground">
                    {d.year}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDiscography(discography.filter((_, j) => j !== i))}
                    aria-label={`Remover ${d.title}`}
                    className="text-zinc-500 transition-colors hover:text-destructive"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={discoDraft.title}
                onChange={(e) => setDiscoDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="Título do álbum"
                aria-label="Título do álbum"
                className="h-10 flex-1 rounded-xl border border-white/10 bg-card px-3 text-[10px] font-bold outline-none focus:border-primary"
              />
              <input
                value={discoDraft.year}
                onChange={(e) => setDiscoDraft((d) => ({ ...d, year: e.target.value }))}
                placeholder="Ano"
                aria-label="Ano do álbum"
                className="h-10 w-20 rounded-xl border border-white/10 bg-card px-3 text-center font-numeric text-[10px] font-bold outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => {
                  if (!discoDraft.title.trim()) return
                  setDiscography([...discography, { title: discoDraft.title.trim(), year: discoDraft.year.trim() }])
                  setDiscoDraft({ title: '', year: '' })
                }}
                aria-label="Adicionar álbum"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-card text-muted-foreground transition-colors hover:text-primary"
              >
                <Plus className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <div>
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="h-14 w-full rounded-2xl border-2 border-primary bg-primary/10 py-4 text-xs font-black tracking-[0.12em] text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
        >
          {isPending ? 'SALVANDO PERFIL…' : 'SALVAR PERFIL DO ARTISTA'}
        </button>
        {status.error && (
          <p role="alert" className="mt-3 text-center text-xs font-bold text-destructive">
            {status.error}
          </p>
        )}
        {status.ok && (
          <p role="status" className="mt-3 text-center text-xs font-bold text-primary">
            {status.ok}
          </p>
        )}
      </div>
    </div>
  )
}
