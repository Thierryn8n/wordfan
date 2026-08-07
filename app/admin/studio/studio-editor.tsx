'use client'

import { useState, useTransition, type CSSProperties } from 'react'
import Image from 'next/image'
import { BadgeCheck, Check, Star } from 'lucide-react'
import {
  resolveTheme,
  themeToCssVars,
  FONT_LABELS,
  STYLE_LABELS,
  NAV_LABELS,
  TOOL_PLANS,
  type ArtistTheme,
  type ArtistFontDisplay,
  type ArtistThemeStyle,
  type ArtistNavStyle,
  type ToolPlan,
} from '@/lib/artist-theme'
import type { Artist } from '@/lib/types'
import { saveArtistStudio } from './actions'

const COLOR_FIELDS: { key: keyof Omit<ArtistTheme, 'gradient' | 'style' | 'font_display' | 'radius' | 'nav_style'>; label: string }[] = [
  { key: 'primary', label: 'Primária' },
  { key: 'secondary', label: 'Secundária' },
  { key: 'bg', label: 'Fundo' },
  { key: 'surface', label: 'Superfície' },
  { key: 'text', label: 'Texto' },
  { key: 'muted', label: 'Texto suave' },
]

const GRAD_FIELDS: { key: keyof ArtistTheme['gradient']; label: string }[] = [
  { key: 'from', label: 'Início' },
  { key: 'via', label: 'Meio' },
  { key: 'to', label: 'Fim' },
]

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-card p-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="size-8 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0"
      />
      <span className="flex-1 text-[10px] font-black tracking-[0.1em] text-muted-foreground">
        {label.toUpperCase()}
      </span>
      <span className="font-numeric text-[10px] font-bold text-zinc-500">{value.toUpperCase()}</span>
    </label>
  )
}

export function StudioEditor({ artist }: { artist: Artist }) {
  const [theme, setTheme] = useState<ArtistTheme>(() => resolveTheme(artist.theme))
  const [commission, setCommission] = useState(String(Number(artist.commission_pct ?? 20)))
  const [toolPlan, setToolPlan] = useState<ToolPlan>((artist.tool_plan ?? 'basic') as ToolPlan)
  const [avatarUrl, setAvatarUrl] = useState(artist.avatar_url ?? '')
  const [bannerUrl, setBannerUrl] = useState(artist.banner_url ?? '')
  const [status, setStatus] = useState<{ ok?: string; error?: string }>({})
  const [isPending, startTransition] = useTransition()

  const vars = themeToCssVars(theme) as CSSProperties

  function set<K extends keyof ArtistTheme>(key: K, value: ArtistTheme[K]) {
    setTheme((t) => ({ ...t, [key]: value }))
  }

  function save() {
    setStatus({})
    const pct = Number.parseFloat(commission.replace(',', '.'))
    startTransition(async () => {
      const res = await saveArtistStudio({
        artistId: artist.id,
        slug: artist.slug,
        theme,
        commissionPct: pct,
        toolPlan,
        avatarUrl,
        bannerUrl,
      })
      if (res?.error) setStatus({ error: res.error })
      else setStatus({ ok: 'Identidade salva! Todas as páginas do artista foram atualizadas.' })
    })
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      {/* ===== Controles ===== */}
      <div className="flex flex-col gap-7">
        <section aria-labelledby="colors-h">
          <h2 id="colors-h" className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
            CORES DA IDENTIDADE
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {COLOR_FIELDS.map(({ key, label }) => (
              <ColorInput
                key={key}
                label={label}
                value={theme[key] as string}
                onChange={(v) => set(key, v as never)}
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="grad-h">
          <h2 id="grad-h" className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
            GRADIENTE DA MARCA
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {GRAD_FIELDS.map(({ key, label }) => (
              <ColorInput
                key={key}
                label={label}
                value={theme.gradient[key]}
                onChange={(v) => setTheme((t) => ({ ...t, gradient: { ...t.gradient, [key]: v } }))}
              />
            ))}
          </div>
          <div
            aria-hidden="true"
            className="mt-3 h-4 rounded-full"
            style={{
              backgroundImage: `linear-gradient(90deg, ${theme.gradient.from}, ${theme.gradient.via}, ${theme.gradient.to})`,
            }}
          />
        </section>

        <section aria-labelledby="style-h">
          <h2 id="style-h" className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
            ESTILO, FONTE E FORMAS
          </h2>
          <div className="mt-3 flex flex-col gap-4">
            <div>
              <p className="text-[9px] font-black tracking-[0.15em] text-zinc-500">VIBE VISUAL</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(STYLE_LABELS) as ArtistThemeStyle[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set('style', s)}
                    aria-pressed={theme.style === s}
                    className={
                      theme.style === s
                        ? 'gradient-brand rounded-full px-5 py-2.5 text-[9px] font-black tracking-[0.15em] text-white'
                        : 'rounded-full border border-white/8 bg-card px-5 py-2.5 text-[9px] font-black tracking-[0.15em] text-muted-foreground'
                    }
                  >
                    {STYLE_LABELS[s].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[9px] font-black tracking-[0.15em] text-zinc-500">FONTE DE DESTAQUE</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(FONT_LABELS) as ArtistFontDisplay[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => set('font_display', f)}
                    aria-pressed={theme.font_display === f}
                    className={
                      theme.font_display === f
                        ? 'gradient-brand rounded-full px-5 py-2.5 text-[9px] font-black tracking-[0.15em] text-white'
                        : 'rounded-full border border-white/8 bg-card px-5 py-2.5 text-[9px] font-black tracking-[0.15em] text-muted-foreground'
                    }
                  >
                    {FONT_LABELS[f].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[9px] font-black tracking-[0.15em] text-zinc-500">ESTILO DO MENU</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(NAV_LABELS) as ArtistNavStyle[]).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => set('nav_style', n)}
                    aria-pressed={theme.nav_style === n}
                    className={
                      theme.nav_style === n
                        ? 'gradient-brand rounded-full px-5 py-2.5 text-[9px] font-black tracking-[0.15em] text-white'
                        : 'rounded-full border border-white/8 bg-card px-5 py-2.5 text-[9px] font-black tracking-[0.15em] text-muted-foreground'
                    }
                  >
                    {NAV_LABELS[n].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="radius-slider"
                className="text-[9px] font-black tracking-[0.15em] text-zinc-500"
              >
                RAIO DOS CARDS: <span className="font-numeric text-primary">{theme.radius}px</span>
              </label>
              <input
                id="radius-slider"
                type="range"
                min={0}
                max={48}
                step={2}
                value={theme.radius}
                onChange={(e) => set('radius', Number(e.target.value))}
                className="mt-2 w-full accent-[var(--artist-primary)]"
                style={{ accentColor: theme.primary }}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="imgs-h">
          <h2 id="imgs-h" className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
            IMAGENS
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[9px] font-black tracking-[0.15em] text-zinc-500">URL DO AVATAR</span>
              <input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="/artists/exemplo.png"
                className="h-11 rounded-xl border border-white/10 bg-card px-4 text-xs font-bold outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[9px] font-black tracking-[0.15em] text-zinc-500">URL DO BANNER</span>
              <input
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="/artists/exemplo-banner.png"
                className="h-11 rounded-xl border border-white/10 bg-card px-4 text-xs font-bold outline-none focus:border-primary"
              />
            </label>
          </div>
        </section>

        <section aria-labelledby="biz-h">
          <h2 id="biz-h" className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
            NEGÓCIO
          </h2>
          <div className="mt-3 flex flex-col gap-4">
            <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-card p-4">
              <span className="flex-1 text-[10px] font-black tracking-[0.1em] text-muted-foreground">
                COMISSÃO DA PLATAFORMA (%)
              </span>
              <input
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                inputMode="decimal"
                aria-label="Comissão da plataforma em porcentagem"
                className="h-10 w-20 rounded-xl border border-white/10 bg-background px-3 text-center font-numeric text-sm font-bold outline-none focus:border-primary"
              />
            </label>

            <div>
              <p className="text-[9px] font-black tracking-[0.15em] text-zinc-500">
                PLANO DE FERRAMENTA DO ARTISTA
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(Object.keys(TOOL_PLANS) as ToolPlan[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setToolPlan(p)}
                    aria-pressed={toolPlan === p}
                    className={
                      toolPlan === p
                        ? 'rounded-2xl border-2 border-primary bg-primary/10 p-4 text-left'
                        : 'rounded-2xl border border-white/8 bg-card p-4 text-left'
                    }
                  >
                    <span className="block text-[10px] font-black tracking-[0.15em]">
                      {TOOL_PLANS[p].label.toUpperCase()}
                    </span>
                    <span className="mt-1 block font-numeric text-[10px] font-bold text-muted-foreground">
                      {TOOL_PLANS[p].price}
                    </span>
                    <span className="mt-2 block text-[8px] font-bold leading-relaxed text-zinc-500">
                      {TOOL_PLANS[p].features.join(' · ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div>
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="gradient-brand h-14 w-full rounded-2xl text-[11px] font-black tracking-[0.25em] text-white disabled:opacity-60"
          >
            {isPending ? 'SALVANDO...' : 'SALVAR IDENTIDADE DO ARTISTA'}
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

      {/* ===== Preview ao vivo ===== */}
      <div className="lg:sticky lg:top-8 lg:self-start">
        <h2 className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
          PREVIEW AO VIVO
        </h2>
        <div
          style={vars}
          className="artist-scope mt-3 overflow-hidden rounded-[36px] border border-white/10"
        >
          {/* Mini perfil */}
          <div className="relative h-52">
            {(bannerUrl || avatarUrl) && (
              <Image
                src={bannerUrl || avatarUrl || '/placeholder.svg?height=208&width=480'}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
              />
            )}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(to top, ${theme.bg} 5%, transparent 70%)`,
              }}
              aria-hidden="true"
            />
            <div className="absolute inset-x-0 bottom-0 px-6 pb-4">
              <p
                className="artist-font flex items-center gap-2 text-3xl font-extrabold tracking-tight"
                style={{ color: theme.text }}
              >
                {artist.name.toUpperCase()}
                <BadgeCheck className="size-6" style={{ color: theme.primary }} aria-hidden="true" />
              </p>
              <p
                className="mt-1 text-[10px] font-black tracking-[0.2em]"
                style={{ color: theme.primary }}
              >
                {Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(artist.followers_count)}{' '}
                FÃS • @{artist.slug}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 p-6" style={{ backgroundColor: theme.bg }}>
            <button
              type="button"
              tabIndex={-1}
              className="artist-gradient flex h-13 w-full items-center justify-center gap-2 py-4 text-[10px] font-black tracking-[0.2em] text-white"
              style={{ borderRadius: theme.radius }}
            >
              <Star className="size-4 fill-white" aria-hidden="true" />
              ENTRAR NO FAN CLUB
            </button>

            <div
              className="p-5"
              style={{
                backgroundColor: theme.surface,
                borderRadius: theme.radius,
                border: `1px solid ${theme.primary}22`,
              }}
            >
              <p className="text-[9px] font-black tracking-[0.2em]" style={{ color: theme.muted }}>
                POST EXCLUSIVO
              </p>
              <p
                className="artist-font mt-2 text-base font-extrabold"
                style={{ color: theme.text }}
              >
                Bastidores do próximo show
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: theme.muted }}>
                Conteúdo liberado para assinantes do fan club.
              </p>
              <div className="mt-4 flex gap-2">
                {['BRONZE', 'PRATA', 'OURO'].map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1 text-[8px] font-black tracking-[0.15em]"
                    style={{
                      borderRadius: 999,
                      backgroundColor: `${theme.primary}1f`,
                      color: theme.primary,
                      border: `1px solid ${theme.primary}44`,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Mini nav no estilo escolhido */}
            <div
              className={
                theme.nav_style === 'glass'
                  ? 'flex items-center justify-around border py-3 backdrop-blur-xl'
                  : 'flex items-center justify-around py-3'
              }
              style={{
                borderRadius: theme.nav_style === 'flat' ? 8 : 999,
                backgroundColor:
                  theme.nav_style === 'glass' ? `${theme.surface}cc` : theme.surface,
                borderColor: theme.nav_style === 'glass' ? `${theme.primary}33` : 'transparent',
              }}
            >
              {['INÍCIO', 'CLUBE', 'LIVES', 'PERFIL'].map((item, i) => (
                <span
                  key={item}
                  className="text-[8px] font-black tracking-[0.15em]"
                  style={{ color: i === 1 ? theme.primary : theme.muted }}
                >
                  {i === 1 && theme.nav_style === 'pill' ? (
                    <span
                      className="px-4 py-2"
                      style={{
                        borderRadius: 999,
                        backgroundColor: theme.primary,
                        color: '#fff',
                      }}
                    >
                      {item}
                    </span>
                  ) : (
                    item
                  )}
                </span>
              ))}
            </div>

            <p
              className="flex items-center justify-center gap-1.5 text-[8px] font-black tracking-[0.2em]"
              style={{ color: theme.muted }}
            >
              <Check className="size-3" style={{ color: theme.primary }} aria-hidden="true" />
              FONTE: {FONT_LABELS[theme.font_display].toUpperCase()} • RAIO: {theme.radius}PX •{' '}
              {STYLE_LABELS[theme.style].toUpperCase()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
