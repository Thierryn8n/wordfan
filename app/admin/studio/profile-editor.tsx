'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { Upload, Plus, X } from 'lucide-react'
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
      <span className="text-[9px] font-black tracking-[0.15em] text-zinc-500">{label}</span>
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
  slug,
  kind,
  onUploaded,
}: {
  label: string
  url: string
  slug: string
  kind: 'avatar' | 'banner'
  onUploaded: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    setUploading(true)
    const fd = new FormData()
    fd.set('file', file)
    fd.set('slug', slug)
    fd.set('kind', kind)
    const res = await uploadArtistImage(fd)
    setUploading(false)
    if (res.error) setError(res.error)
    else if (res.url) onUploaded(res.url)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[9px] font-black tracking-[0.15em] text-zinc-500">{label}</span>
      <div className="flex items-center gap-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-card">
          {url ? (
            <Image src={url || "/placeholder.svg"} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-[8px] font-black text-zinc-600">
              VAZIO
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <input
            value={url}
            onChange={(e) => onUploaded(e.target.value)}
            placeholder="URL da imagem ou envie um arquivo"
            aria-label={`URL de ${label}`}
            className="h-10 rounded-xl border border-white/10 bg-card px-3 text-[10px] font-bold outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/5 text-[9px] font-black tracking-[0.15em] text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <Upload className="size-3.5" aria-hidden="true" />
            {uploading ? 'ENVIANDO...' : 'ENVIAR ARQUIVO'}
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
        <p role="alert" className="text-[10px] font-bold text-destructive">
          {error}
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
      <span className="text-[9px] font-black tracking-[0.15em] text-zinc-500">{label}</span>
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
  onAvatarChange,
  onBannerChange,
}: {
  artist: Artist
  avatarUrl: string
  bannerUrl: string
  onAvatarChange: (url: string) => void
  onBannerChange: (url: string) => void
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
      })
      if (res?.error) setStatus({ error: res.error })
      else setStatus({ ok: 'Perfil salvo! Páginas públicas atualizadas.' })
    })
  }

  return (
    <div className="flex flex-col gap-7">
      <section aria-labelledby="fotos-h">
        <h2 id="fotos-h" className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
          FOTOS DO ARTISTA
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <ImageUploader
            label="FOTO DE PERFIL (AVATAR)"
            url={avatarUrl}
            slug={artist.slug}
            kind="avatar"
            onUploaded={onAvatarChange}
          />
          <ImageUploader
            label="BANNER / CAPA"
            url={bannerUrl}
            slug={artist.slug}
            kind="banner"
            onUploaded={onBannerChange}
          />
        </div>
        <p className="mt-2 text-[9px] font-bold text-zinc-600">
          O upload salva no Supabase Storage. As fotos são aplicadas ao clicar em SALVAR IDENTIDADE.
        </p>
      </section>

      <section aria-labelledby="dados-h">
        <h2 id="dados-h" className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
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

      <section aria-labelledby="social-h">
        <h2 id="social-h" className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
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

      <section aria-labelledby="sobre-h">
        <h2 id="sobre-h" className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
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
            <span className="text-[9px] font-black tracking-[0.15em] text-zinc-500">DISCOGRAFIA</span>
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
          className="h-13 w-full rounded-2xl border-2 border-primary bg-primary/10 py-4 text-[11px] font-black tracking-[0.25em] text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
        >
          {isPending ? 'SALVANDO PERFIL...' : 'SALVAR PERFIL DO ARTISTA'}
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
