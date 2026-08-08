'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Upload,
  Save,
  User,
  Palette,
  BookOpen,
  Share2,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react'
import type { Artist, ArtistAbout } from '@/lib/types'
import {
  type ArtistTheme,
  type ArtistThemeStyle,
  type ArtistFontDisplay,
  type ArtistNavStyle,
  STYLE_LABELS,
  FONT_LABELS,
  NAV_LABELS,
  resolveTheme,
} from '@/lib/artist-theme'
import {
  saveArtistIdentity,
  saveArtistTheme,
  saveArtistAbout,
  uploadArtistImage,
} from '@/app/dashboard/perfil/actions'
import { cn } from '@/lib/utils'

type Tab = 'identidade' | 'tema' | 'sobre' | 'redes'

const TABS: { key: Tab; label: string; icon: typeof User }[] = [
  { key: 'identidade', label: 'IDENTIDADE', icon: User },
  { key: 'tema', label: 'TEMA', icon: Palette },
  { key: 'sobre', label: 'SOBRE', icon: BookOpen },
  { key: 'redes', label: 'REDES', icon: Share2 },
]

const SOCIAL_FIELDS = [
  { key: 'instagram', label: 'Instagram', ph: '@usuario' },
  { key: 'tiktok', label: 'TikTok', ph: '@usuario' },
  { key: 'youtube', label: 'YouTube', ph: '@canal' },
  { key: 'spotify', label: 'Spotify', ph: 'link do artista' },
  { key: 'facebook', label: 'Facebook', ph: 'link da página' },
  { key: 'site', label: 'Site', ph: 'https://...' },
]

const inputCls =
  'w-full rounded-2xl border border-white/10 bg-[var(--artist-bg)] px-4 py-3 text-xs font-bold text-[var(--artist-text)] outline-none transition-colors focus:border-[var(--artist-primary)]'
const labelCls = 'text-[8px] font-black tracking-[0.2em] text-[var(--artist-muted)]'

function ImageField({
  artistId,
  kind,
  value,
  onChange,
  aspect,
}: {
  artistId: string
  kind: string
  value: string
  onChange: (url: string) => void
  aspect: 'square' | 'wide'
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
    const res = await uploadArtistImage(fd)
    setUploading(false)
    if (res.error) setError(res.error)
    else if (res.url) onChange(res.url)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {value ? (
          <Image
            src={value || '/placeholder.svg'}
            alt=""
            width={aspect === 'wide' ? 128 : 72}
            height={72}
            className={cn(
              'shrink-0 border border-white/10 object-cover',
              aspect === 'wide' ? 'h-18 w-32 rounded-2xl' : 'size-18 rounded-2xl',
            )}
          />
        ) : (
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/15 text-[var(--artist-muted)]',
              aspect === 'wide' ? 'h-18 w-32' : 'size-18',
            )}
          >
            <Upload className="size-5" aria-hidden="true" />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex w-fit items-center gap-2 rounded-full border border-white/10 bg-[var(--artist-bg)] px-4 py-2 text-[8px] font-black tracking-[0.15em] text-[var(--artist-muted)] transition-colors hover:text-[var(--artist-text)] disabled:opacity-50"
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

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[var(--artist-bg)] p-2.5">
      <span
        className="relative size-9 shrink-0 overflow-hidden rounded-xl border border-white/15"
        style={{ backgroundColor: value }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          aria-label={label}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[8px] font-black tracking-[0.2em] text-[var(--artist-muted)]">
          {label}
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-0.5 w-full bg-transparent font-numeric text-[11px] font-bold uppercase text-[var(--artist-text)] outline-none"
          maxLength={7}
        />
      </span>
    </label>
  )
}

export function ProfileEditor({ artist }: { artist: Artist }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('identidade')
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<{ ok?: string; error?: string }>({})

  // Identidade
  const [name, setName] = useState(artist.name)
  const [bio, setBio] = useState(artist.bio ?? '')
  const [genre, setGenre] = useState(artist.genre ?? '')
  const [city, setCity] = useState(artist.city ?? '')
  const [state, setState] = useState(artist.state ?? '')
  const [avatarUrl, setAvatarUrl] = useState(artist.avatar_url ?? '')
  const [bannerUrl, setBannerUrl] = useState(artist.banner_url ?? '')
  const [social, setSocial] = useState<Record<string, string>>(artist.social_links ?? {})

  // Tema
  const [theme, setTheme] = useState<ArtistTheme>(resolveTheme(artist.theme))
  const patchTheme = (p: Partial<ArtistTheme>) => setTheme((t) => ({ ...t, ...p }))
  const patchGrad = (p: Partial<ArtistTheme['gradient']>) =>
    setTheme((t) => ({ ...t, gradient: { ...t.gradient, ...p } }))

  // Sobre
  const initialAbout = (artist.about ?? {}) as ArtistAbout
  const [history, setHistory] = useState(initialAbout.history ?? '')
  const [influences, setInfluences] = useState<string[]>(initialAbout.influences ?? [])
  const [awards, setAwards] = useState<string[]>(initialAbout.awards ?? [])
  const [discography, setDiscography] = useState<{ title: string; year: string }[]>(
    initialAbout.discography ?? [],
  )

  function run(action: () => Promise<{ error?: string; success?: boolean }>, okMsg: string) {
    setStatus({})
    startTransition(async () => {
      const res = await action()
      if (res.error) setStatus({ error: res.error })
      else {
        setStatus({ ok: okMsg })
        router.refresh()
      }
    })
  }

  const btnPrimary =
    'flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[9px] font-black tracking-[0.2em] text-white transition-transform active:scale-[0.98] disabled:opacity-50'

  return (
    <div
      className="artist-scope overflow-hidden rounded-[32px] border border-white/10 bg-[var(--artist-surface)]"
      style={
        {
          '--artist-primary': theme.primary,
          '--artist-secondary': theme.secondary,
          '--artist-bg': theme.bg,
          '--artist-surface': theme.surface,
          '--artist-text': theme.text,
          '--artist-muted': theme.muted,
        } as React.CSSProperties
      }
    >
      {/* Abas */}
      <div
        className="scrollbar-none flex gap-2 overflow-x-auto border-b border-white/10 p-4"
        role="tablist"
        aria-label="Editar perfil do artista"
      >
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key)
              setStatus({})
            }}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-[9px] font-black tracking-[0.2em] transition-colors',
              tab === key
                ? 'text-white'
                : 'border border-white/10 text-[var(--artist-muted)] hover:text-[var(--artist-text)]',
            )}
            style={tab === key ? { backgroundColor: theme.primary } : undefined}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {status.error && (
          <p
            role="alert"
            className="mb-4 rounded-2xl bg-red-500/10 px-4 py-3 text-[10px] font-bold text-red-400"
          >
            {status.error}
          </p>
        )}
        {status.ok && (
          <p
            role="status"
            className="mb-4 rounded-2xl px-4 py-3 text-[10px] font-bold"
            style={{ backgroundColor: `${theme.primary}22`, color: theme.primary }}
          >
            {status.ok}
          </p>
        )}

        {/* ======= IDENTIDADE ======= */}
        {tab === 'identidade' && (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault()
              run(
                () =>
                  saveArtistIdentity({
                    artistId: artist.id,
                    name,
                    bio,
                    genre,
                    city,
                    state,
                    avatarUrl,
                    bannerUrl,
                    social,
                  }),
                'Identidade atualizada!',
              )
            }}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <span className={labelCls}>FOTO DE PERFIL</span>
                <div className="mt-1.5">
                  <ImageField
                    artistId={artist.id}
                    kind="avatar"
                    value={avatarUrl}
                    onChange={setAvatarUrl}
                    aspect="square"
                  />
                </div>
              </div>
              <div>
                <span className={labelCls}>CAPA (BANNER)</span>
                <div className="mt-1.5">
                  <ImageField
                    artistId={artist.id}
                    kind="banner"
                    value={bannerUrl}
                    onChange={setBannerUrl}
                    aspect="wide"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className={labelCls} htmlFor="pe-name">
                NOME ARTÍSTICO *
              </label>
              <input
                id="pe-name"
                className={`mt-1.5 ${inputCls}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={80}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="pe-bio">
                BIO CURTA
              </label>
              <textarea
                id="pe-bio"
                rows={2}
                className={`mt-1.5 ${inputCls} resize-none leading-relaxed`}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={280}
                placeholder="Uma frase que te define"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="col-span-2">
                <label className={labelCls} htmlFor="pe-genre">
                  GÊNERO
                </label>
                <input
                  id="pe-genre"
                  className={`mt-1.5 ${inputCls}`}
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  maxLength={40}
                  placeholder="Pop, Funk, Sertanejo..."
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="pe-city">
                  CIDADE
                </label>
                <input
                  id="pe-city"
                  className={`mt-1.5 ${inputCls}`}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  maxLength={60}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="pe-state">
                  UF
                </label>
                <input
                  id="pe-state"
                  className={`mt-1.5 ${inputCls} uppercase`}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  maxLength={2}
                  placeholder="SP"
                />
              </div>
            </div>
            <button type="submit" disabled={isPending} className={btnPrimary} style={{ backgroundColor: theme.primary }}>
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              SALVAR IDENTIDADE
            </button>
          </form>
        )}

        {/* ======= TEMA ======= */}
        {tab === 'tema' && (
          <div className="flex flex-col gap-6">
            {/* Preview ao vivo */}
            <div
              className="relative overflow-hidden rounded-3xl border border-white/10 p-5"
              style={{ backgroundColor: theme.bg }}
            >
              <div
                className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full opacity-40 blur-3xl"
                style={{ backgroundColor: theme.primary }}
                aria-hidden="true"
              />
              <p
                className="flex items-center gap-1.5 text-[8px] font-black tracking-[0.3em]"
                style={{ color: theme.primary }}
              >
                <Sparkles className="size-3" aria-hidden="true" />
                PRÉVIA AO VIVO
              </p>
              <div className="relative mt-4 flex items-center gap-3">
                <span
                  className="size-14 shrink-0 rounded-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${theme.gradient.from}, ${theme.gradient.via}, ${theme.gradient.to})`,
                  }}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="truncate font-serif text-xl font-black" style={{ color: theme.text }}>
                    {name || artist.name}
                  </p>
                  <p className="text-[10px] font-bold" style={{ color: theme.muted }}>
                    {genre || 'Seu gênero'} • {city || 'Cidade'}
                  </p>
                </div>
              </div>
              <div className="relative mt-4 flex flex-wrap gap-2">
                <span
                  className="rounded-full px-4 py-2 text-[9px] font-black tracking-[0.15em] text-white"
                  style={{
                    background: `linear-gradient(135deg, ${theme.gradient.from}, ${theme.gradient.to})`,
                  }}
                >
                  ENTRAR NO FAN CLUB
                </span>
                <span
                  className="rounded-full border px-4 py-2 text-[9px] font-black tracking-[0.15em]"
                  style={{ borderColor: `${theme.primary}55`, color: theme.primary }}
                >
                  SEGUIR
                </span>
              </div>
            </div>

            {/* Cores */}
            <div>
              <span className={labelCls}>CORES DA MARCA</span>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <ColorField label="PRIMÁRIA" value={theme.primary} onChange={(v) => patchTheme({ primary: v })} />
                <ColorField label="SECUNDÁRIA" value={theme.secondary} onChange={(v) => patchTheme({ secondary: v })} />
                <ColorField label="FUNDO" value={theme.bg} onChange={(v) => patchTheme({ bg: v })} />
                <ColorField label="SUPERFÍCIE" value={theme.surface} onChange={(v) => patchTheme({ surface: v })} />
                <ColorField label="TEXTO" value={theme.text} onChange={(v) => patchTheme({ text: v })} />
                <ColorField label="TEXTO SUAVE" value={theme.muted} onChange={(v) => patchTheme({ muted: v })} />
              </div>
            </div>

            {/* Gradiente */}
            <div>
              <span className={labelCls}>GRADIENTE (DESTAQUE)</span>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <ColorField label="INÍCIO" value={theme.gradient.from} onChange={(v) => patchGrad({ from: v })} />
                <ColorField label="MEIO" value={theme.gradient.via} onChange={(v) => patchGrad({ via: v })} />
                <ColorField label="FIM" value={theme.gradient.to} onChange={(v) => patchGrad({ to: v })} />
              </div>
            </div>

            {/* Estilo, fonte, nav */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <span className={labelCls}>ESTILO</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(Object.keys(STYLE_LABELS) as ArtistThemeStyle[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => patchTheme({ style: s })}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-[8px] font-black tracking-[0.1em] transition-colors',
                        theme.style === s
                          ? 'text-white'
                          : 'border border-white/10 text-[var(--artist-muted)]',
                      )}
                      style={theme.style === s ? { backgroundColor: theme.primary } : undefined}
                    >
                      {STYLE_LABELS[s].toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className={labelCls}>FONTE DE TÍTULO</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(Object.keys(FONT_LABELS) as ArtistFontDisplay[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => patchTheme({ font_display: f })}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-[8px] font-black tracking-[0.1em] transition-colors',
                        theme.font_display === f
                          ? 'text-white'
                          : 'border border-white/10 text-[var(--artist-muted)]',
                      )}
                      style={theme.font_display === f ? { backgroundColor: theme.primary } : undefined}
                    >
                      {FONT_LABELS[f].toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className={labelCls}>MENU</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(Object.keys(NAV_LABELS) as ArtistNavStyle[]).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => patchTheme({ nav_style: n })}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-[8px] font-black tracking-[0.1em] transition-colors',
                        theme.nav_style === n
                          ? 'text-white'
                          : 'border border-white/10 text-[var(--artist-muted)]',
                      )}
                      style={theme.nav_style === n ? { backgroundColor: theme.primary } : undefined}
                    >
                      {NAV_LABELS[n].toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Arredondamento */}
            <div>
              <div className="flex items-center justify-between">
                <span className={labelCls}>ARREDONDAMENTO</span>
                <span className="font-numeric text-[11px] font-bold" style={{ color: theme.primary }}>
                  {theme.radius}px
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                value={theme.radius}
                onChange={(e) => patchTheme({ radius: Number(e.target.value) })}
                className="mt-3 w-full accent-[var(--artist-primary)]"
                aria-label="Arredondamento das bordas"
              />
            </div>

            <button
              type="button"
              disabled={isPending}
              className={btnPrimary}
              style={{ backgroundColor: theme.primary }}
              onClick={() => run(() => saveArtistTheme({ artistId: artist.id, theme }), 'Tema salvo! Sua identidade foi atualizada.')}
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              SALVAR TEMA
            </button>
          </div>
        )}

        {/* ======= SOBRE ======= */}
        {tab === 'sobre' && (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault()
              run(
                () =>
                  saveArtistAbout({
                    artistId: artist.id,
                    about: { history, influences, awards, discography },
                  }),
                'Informações salvas!',
              )
            }}
          >
            <div>
              <label className={labelCls} htmlFor="pe-history">
                HISTÓRIA
              </label>
              <textarea
                id="pe-history"
                rows={5}
                className={`mt-1.5 ${inputCls} resize-none leading-relaxed`}
                value={history}
                onChange={(e) => setHistory(e.target.value)}
                maxLength={2000}
                placeholder="Conte a sua trajetória..."
              />
            </div>

            <ListField
              label="INFLUÊNCIAS"
              items={influences}
              onChange={setInfluences}
              placeholder="Nome de um artista"
              theme={theme}
            />
            <ListField
              label="PRÊMIOS E CONQUISTAS"
              items={awards}
              onChange={setAwards}
              placeholder="Ex.: Prêmio X (2024)"
              theme={theme}
            />

            {/* Discografia */}
            <div>
              <span className={labelCls}>DISCOGRAFIA</span>
              <div className="mt-2 flex flex-col gap-2">
                {discography.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={d.year}
                      onChange={(e) => {
                        const next = [...discography]
                        next[i] = { ...next[i], year: e.target.value }
                        setDiscography(next)
                      }}
                      placeholder="2024"
                      maxLength={4}
                      className={cn(inputCls, 'w-20 shrink-0 text-center')}
                    />
                    <input
                      value={d.title}
                      onChange={(e) => {
                        const next = [...discography]
                        next[i] = { ...next[i], title: e.target.value }
                        setDiscography(next)
                      }}
                      placeholder="Nome do álbum ou single"
                      maxLength={100}
                      className={inputCls}
                    />
                    <button
                      type="button"
                      aria-label="Remover"
                      onClick={() => setDiscography(discography.filter((_, j) => j !== i))}
                      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-red-500/20 text-red-400"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setDiscography([...discography, { title: '', year: '' }])}
                  className="flex w-fit items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[8px] font-black tracking-[0.15em] text-[var(--artist-muted)]"
                >
                  <Plus className="size-3" aria-hidden="true" />
                  ADICIONAR LANÇAMENTO
                </button>
              </div>
            </div>

            <button type="submit" disabled={isPending} className={btnPrimary} style={{ backgroundColor: theme.primary }}>
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              SALVAR SOBRE
            </button>
          </form>
        )}

        {/* ======= REDES ======= */}
        {tab === 'redes' && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              run(
                () =>
                  saveArtistIdentity({
                    artistId: artist.id,
                    name,
                    bio,
                    genre,
                    city,
                    state,
                    avatarUrl,
                    bannerUrl,
                    social,
                  }),
                'Redes atualizadas!',
              )
            }}
          >
            {SOCIAL_FIELDS.map(({ key, label, ph }) => (
              <div key={key}>
                <label className={labelCls} htmlFor={`pe-social-${key}`}>
                  {label.toUpperCase()}
                </label>
                <input
                  id={`pe-social-${key}`}
                  className={`mt-1.5 ${inputCls}`}
                  value={social[key] ?? ''}
                  onChange={(e) => setSocial((s) => ({ ...s, [key]: e.target.value }))}
                  placeholder={ph}
                  maxLength={200}
                />
              </div>
            ))}
            <button type="submit" disabled={isPending} className={btnPrimary} style={{ backgroundColor: theme.primary }}>
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              SALVAR REDES
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function ListField({
  label,
  items,
  onChange,
  placeholder,
  theme,
}: {
  label: string
  items: string[]
  onChange: (v: string[]) => void
  placeholder: string
  theme: ArtistTheme
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="mt-2 flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={item}
              onChange={(e) => {
                const next = [...items]
                next[i] = e.target.value
                onChange(next)
              }}
              placeholder={placeholder}
              className={inputCls}
            />
            <button
              type="button"
              aria-label="Remover"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-red-500/20 text-red-400"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, ''])}
          className="flex w-fit items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[8px] font-black tracking-[0.15em] text-[var(--artist-muted)]"
          style={{ color: theme.muted }}
        >
          <Plus className="size-3" aria-hidden="true" />
          ADICIONAR
        </button>
      </div>
    </div>
  )
}
