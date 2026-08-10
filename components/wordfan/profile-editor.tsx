'use client'

import { useState, useTransition, useRef } from 'react'
import Image from 'next/image'
import {
  User,
  FileText,
  Share2,
  Upload,
  Plus,
  X,
  Check,
  Loader2,
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Artist, ArtistAbout } from '@/lib/types'
import { uploadContentImage } from '@/app/actions/content'
import {
  saveArtistProfile,
  saveArtistAbout,
  saveArtistSocials,
} from '@/app/dashboard/perfil/actions'

type Tab = 'info' | 'about' | 'social'

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'info', label: 'Informações', icon: User },
  { id: 'about', label: 'Sobre', icon: FileText },
  { id: 'social', label: 'Redes', icon: Share2 },
]

const SOCIALS: { key: string; label: string; placeholder: string }[] = [
  { key: 'instagram', label: 'Instagram', placeholder: '@usuario ou URL' },
  { key: 'tiktok', label: 'TikTok', placeholder: '@usuario ou URL' },
  { key: 'youtube', label: 'YouTube', placeholder: 'URL do canal' },
  { key: 'spotify', label: 'Spotify', placeholder: 'URL do artista' },
  { key: 'twitter', label: 'X / Twitter', placeholder: '@usuario ou URL' },
  { key: 'site', label: 'Site oficial', placeholder: 'https://' },
]

export function ProfileEditor({ artist }: { artist: Artist }) {
  const [tab, setTab] = useState<Tab>('info')

  return (
    <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
      {/* Abas */}
      <nav className="flex gap-2 lg:flex-col" aria-label="Seções do perfil">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'flex flex-1 items-center gap-2.5 rounded-[8px] border px-3 py-2.5 text-[11px] font-bold tracking-[0.04em] transition-colors lg:flex-none',
                active
                  ? 'border-[var(--artist-primary)]/40 bg-[var(--artist-primary)]/10 text-[var(--artist-text)]'
                  : 'border-white/8 text-[var(--artist-muted)] hover:bg-white/5 hover:text-[var(--artist-text)]',
              )}
            >
              <Icon
                className={cn('size-4', active && 'text-[var(--artist-primary)]')}
                aria-hidden="true"
              />
              {label.toUpperCase()}
            </button>
          )
        })}
        <p className="mt-2 hidden items-start gap-2 rounded-[8px] border border-white/8 px-3 py-2.5 text-[9px] font-bold leading-relaxed text-[var(--artist-muted)] lg:flex">
          <Lock className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          Cores, formas e o tema visual do seu perfil são definidos pela equipe WordFan.
        </p>
      </nav>

      <div className="crm-card p-5">
        {tab === 'info' && <InfoForm artist={artist} />}
        {tab === 'about' && <AboutForm artist={artist} />}
        {tab === 'social' && <SocialForm artist={artist} />}
      </div>
    </div>
  )
}

/* ---------- feedback de salvamento ---------- */
function SaveButton({
  pending,
  saved,
}: {
  pending: boolean
  saved: boolean
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 rounded-[8px] bg-[var(--artist-primary)] px-5 py-2.5 text-[10px] font-black tracking-[0.12em] text-white transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      ) : saved ? (
        <Check className="size-3.5" aria-hidden="true" />
      ) : null}
      {pending ? 'SALVANDO...' : saved ? 'SALVO' : 'SALVAR ALTERAÇÕES'}
    </button>
  )
}

const labelCls = 'text-[9px] font-black tracking-[0.15em] text-[var(--artist-muted)]'
const inputCls =
  'w-full rounded-[8px] border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm font-medium text-[var(--artist-text)] outline-none transition-colors focus:border-[var(--artist-primary)]/60'

/* ---------- Informações ---------- */
function InfoForm({ artist }: { artist: Artist }) {
  const [pending, start] = useTransition()
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [avatar, setAvatar] = useState(artist.avatar_url ?? '')
  const [banner, setBanner] = useState(artist.banner_url ?? '')

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setErr(null)
    start(async () => {
      const res = await saveArtistProfile({
        name: String(fd.get('name') ?? ''),
        bio: String(fd.get('bio') ?? ''),
        genre: String(fd.get('genre') ?? ''),
        city: String(fd.get('city') ?? ''),
        state: String(fd.get('state') ?? ''),
        avatarUrl: avatar,
        bannerUrl: banner,
      })
      if (res.error) return setErr(res.error)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <ImageField
          label="FOTO DE PERFIL"
          value={avatar}
          onChange={setAvatar}
          artistId={artist.id}
          kind="avatar"
          rounded
        />
        <ImageField
          label="CAPA (BANNER)"
          value={banner}
          onChange={setBanner}
          artistId={artist.id}
          kind="banner"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className={labelCls}>
          NOME ARTÍSTICO
        </label>
        <input id="name" name="name" defaultValue={artist.name} className={inputCls} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="genre" className={labelCls}>
            GÊNERO
          </label>
          <input id="genre" name="genre" defaultValue={artist.genre ?? ''} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="city" className={labelCls}>
            CIDADE
          </label>
          <input id="city" name="city" defaultValue={artist.city ?? ''} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="state" className={labelCls}>
            UF
          </label>
          <input id="state" name="state" defaultValue={artist.state ?? ''} className={inputCls} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bio" className={labelCls}>
          BIO CURTA
        </label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={artist.bio ?? ''}
          rows={3}
          maxLength={600}
          className={cn(inputCls, 'resize-none')}
        />
      </div>

      {err && <p className="text-[11px] font-bold text-red-400">{err}</p>}
      <div className="flex justify-end">
        <SaveButton pending={pending} saved={saved} />
      </div>
    </form>
  )
}

/* ---------- Sobre ---------- */
function AboutForm({ artist }: { artist: Artist }) {
  const [pending, start] = useTransition()
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const about = artist.about ?? {}
  const [history, setHistory] = useState(about.history ?? '')
  const [influences, setInfluences] = useState<string[]>(about.influences ?? [])
  const [awards, setAwards] = useState<string[]>(about.awards ?? [])
  const [disco, setDisco] = useState<{ title: string; year: string }[]>(
    about.discography ?? [],
  )

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErr(null)
    start(async () => {
      const res = await saveArtistAbout({
        history,
        influences,
        awards,
        discography: disco,
      })
      if (res.error) return setErr(res.error)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="history" className={labelCls}>
          HISTÓRIA / TRAJETÓRIA
        </label>
        <textarea
          id="history"
          value={history}
          onChange={(e) => setHistory(e.target.value)}
          rows={5}
          maxLength={2000}
          className={cn(inputCls, 'resize-none')}
        />
      </div>

      <TagField label="INFLUÊNCIAS" values={influences} onChange={setInfluences} placeholder="Adicionar influência" />
      <TagField label="PRÊMIOS" values={awards} onChange={setAwards} placeholder="Adicionar prêmio" />

      <div className="flex flex-col gap-2">
        <span className={labelCls}>DISCOGRAFIA</span>
        {disco.map((d, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={d.title}
              onChange={(e) =>
                setDisco(disco.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
              }
              placeholder="Título"
              className={cn(inputCls, 'flex-1')}
            />
            <input
              value={d.year}
              onChange={(e) =>
                setDisco(disco.map((x, j) => (j === i ? { ...x, year: e.target.value } : x)))
              }
              placeholder="Ano"
              className={cn(inputCls, 'w-24')}
            />
            <button
              type="button"
              onClick={() => setDisco(disco.filter((_, j) => j !== i))}
              aria-label="Remover"
              className="flex size-10 shrink-0 items-center justify-center rounded-[8px] border border-white/10 text-[var(--artist-muted)] hover:text-red-400"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setDisco([...disco, { title: '', year: '' }])}
          className="flex items-center gap-2 self-start rounded-[8px] border border-dashed border-white/15 px-3 py-2 text-[10px] font-black tracking-[0.1em] text-[var(--artist-muted)] hover:text-[var(--artist-text)]"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          ADICIONAR LANÇAMENTO
        </button>
      </div>

      {err && <p className="text-[11px] font-bold text-red-400">{err}</p>}
      <div className="flex justify-end">
        <SaveButton pending={pending} saved={saved} />
      </div>
    </form>
  )
}

/* ---------- Redes ---------- */
function SocialForm({ artist }: { artist: Artist }) {
  const [pending, start] = useTransition()
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [links, setLinks] = useState<Record<string, string>>(artist.social_links ?? {})

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErr(null)
    start(async () => {
      const res = await saveArtistSocials(links)
      if (res.error) return setErr(res.error)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {SOCIALS.map(({ key, label, placeholder }) => (
        <div key={key} className="flex flex-col gap-1.5">
          <label htmlFor={`s-${key}`} className={labelCls}>
            {label.toUpperCase()}
          </label>
          <input
            id={`s-${key}`}
            value={links[key] ?? ''}
            onChange={(e) => setLinks({ ...links, [key]: e.target.value })}
            placeholder={placeholder}
            className={inputCls}
          />
        </div>
      ))}
      {err && <p className="text-[11px] font-bold text-red-400">{err}</p>}
      <div className="flex justify-end">
        <SaveButton pending={pending} saved={saved} />
      </div>
    </form>
  )
}

/* ---------- campos reutilizáveis ---------- */
function TagField({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string
  values: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState('')
  function add() {
    const v = draft.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setDraft('')
  }
  return (
    <div className="flex flex-col gap-2">
      <span className={labelCls}>{label}</span>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <span
              key={v}
              className="flex items-center gap-1.5 rounded-[6px] border border-[var(--artist-primary)]/30 bg-[var(--artist-primary)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--artist-text)]"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                aria-label={`Remover ${v}`}
                className="text-[var(--artist-muted)] hover:text-red-400"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
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
          className={cn(inputCls, 'flex-1')}
        />
        <button
          type="button"
          onClick={add}
          className="flex size-10 shrink-0 items-center justify-center rounded-[8px] border border-white/10 text-[var(--artist-muted)] hover:text-[var(--artist-text)]"
          aria-label="Adicionar"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

function ImageField({
  label,
  value,
  onChange,
  artistId,
  kind,
  rounded,
}: {
  label: string
  value: string
  onChange: (url: string) => void
  artistId: string
  kind: string
  rounded?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErr(null)
    setBusy(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('artistId', artistId)
    fd.append('kind', kind)
    const res = await uploadContentImage(fd)
    setBusy(false)
    if ('error' in res && res.error) return setErr(res.error)
    if ('url' in res && res.url) onChange(res.url)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className={labelCls}>{label}</span>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'relative size-16 shrink-0 overflow-hidden border border-white/10 bg-black/30',
            rounded ? 'rounded-full' : 'rounded-[8px]',
          )}
        >
          {value ? (
            <Image src={value || '/placeholder.svg'} alt="" fill className="object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-[var(--artist-muted)]">
              <User className="size-5" aria-hidden="true" />
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-2 rounded-[8px] border border-white/10 px-3 py-2 text-[10px] font-black tracking-[0.1em] text-[var(--artist-muted)] transition-colors hover:text-[var(--artist-text)] disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="size-3.5" aria-hidden="true" />
          )}
          {busy ? 'ENVIANDO...' : 'ENVIAR'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={onFile}
          className="hidden"
        />
      </div>
      {err && <p className="text-[10px] font-bold text-red-400">{err}</p>}
    </div>
  )
}
