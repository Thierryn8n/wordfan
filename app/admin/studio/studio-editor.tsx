'use client'

import { useState, useTransition, type CSSProperties } from 'react'
import Image from 'next/image'
import { BadgeCheck, Check, Star, Palette, User, LayoutGrid, Eye, Sparkles, ChevronRight } from 'lucide-react'
import {
  resolveTheme, themeToCssVars, FONT_LABELS, STYLE_LABELS,
  NAV_LABELS, TOOL_PLANS,
  type ArtistTheme, type ArtistFontDisplay,
  type ArtistThemeStyle, type ArtistNavStyle, type ToolPlan,
} from '@/lib/artist-theme'
import type { Artist } from '@/lib/types'
import { saveArtistStudio } from './actions'
import { ProfileEditor } from './profile-editor'

type Tab = 'identity' | 'profile' | 'content'

const COLOR_FIELDS: {
  key: keyof Omit<ArtistTheme, 'gradient' | 'style' | 'font_display' | 'radius' | 'nav_style'>
  label: string
  hint: string
}[] = [
  { key: 'primary',   label: 'Cor primária',   hint: 'Botões, links, destaques' },
  { key: 'secondary', label: 'Secundária',      hint: 'Elementos complementares' },
  { key: 'bg',        label: 'Fundo',           hint: 'Fundo das páginas' },
  { key: 'surface',   label: 'Superfície',      hint: 'Cards e painéis' },
  { key: 'text',      label: 'Texto',           hint: 'Cor principal do texto' },
  { key: 'muted',     label: 'Texto suave',     hint: 'Legendas e subtítulos' },
]

const GRAD_FIELDS: { key: keyof ArtistTheme['gradient']; label: string }[] = [
  { key: 'from', label: 'Início' },
  { key: 'via',  label: 'Meio'   },
  { key: 'to',   label: 'Fim'    },
]

/* ── Small helpers ── */

function SectionRule({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-white/[0.055]" />
      <span className="admin-eyebrow shrink-0">{children}</span>
      <span className="h-px flex-1 bg-white/[0.055]" />
    </div>
  )
}

function ColorPicker({
  label, hint, value, onChange,
}: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-white/[0.065] bg-white/[0.02] p-3 transition-colors hover:border-white/[0.1] hover:bg-white/[0.03]">
      <div className="relative shrink-0">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="absolute inset-0 size-full cursor-pointer rounded-xl opacity-0"
        />
        <span
          className="flex size-10 items-center justify-center rounded-xl border border-white/10 shadow-inner"
          style={{ backgroundColor: value }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black text-white">{label}</p>
        <p className="text-[8px] font-bold text-zinc-600">{hint}</p>
      </div>
      <span className="font-mono text-[8px] font-bold text-zinc-600 transition-colors group-hover:text-zinc-400">
        {value.toUpperCase()}
      </span>
    </label>
  )
}

function TabBtn({
  active, onClick, icon: Icon, label, sub,
}: { active: boolean; onClick: () => void; icon: React.ElementType; label: string; sub: string }) {
  return (
    <button
      type="button" role="tab" aria-selected={active} onClick={onClick}
      className={[
        'flex flex-1 flex-col items-center gap-1.5 rounded-2xl px-3 py-3.5 transition-all',
        active
          ? 'gradient-brand text-white shadow-[0_8px_20px_-8px_rgba(255,106,0,0.5)]'
          : 'border border-white/[0.065] bg-white/[0.02] text-zinc-500 hover:border-white/[0.1] hover:text-zinc-300',
      ].join(' ')}
    >
      <Icon className="size-4" aria-hidden="true" />
      <span className="text-[9px] font-black tracking-[0.12em]">{label}</span>
      <span className={`text-[7px] font-bold leading-none ${active ? 'text-white/60' : 'text-zinc-600'}`}>{sub}</span>
    </button>
  )
}

function ChipGroup<T extends string>({
  label, options, value, onChange, labelMap,
}: {
  label: string
  options: T[]
  value: T
  onChange: (v: T) => void
  labelMap: Record<T, string>
}) {
  return (
    <div>
      <p className="admin-eyebrow mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o} type="button" onClick={() => onChange(o)} aria-pressed={value === o}
            className={[
              'rounded-full px-4 py-2 text-[9px] font-black tracking-[0.12em] transition-all',
              value === o
                ? 'gradient-brand text-white shadow-[0_4px_12px_-4px_rgba(255,106,0,0.5)]'
                : 'border border-white/[0.065] bg-white/[0.02] text-zinc-500 hover:border-white/[0.1] hover:text-white',
            ].join(' ')}
          >
            {labelMap[o].toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Main ── */

export function StudioEditor({
  artist, contentSlot,
}: {
  artist: Artist
  contentSlot?: React.ReactNode
}) {
  const [theme,      setTheme]      = useState<ArtistTheme>(() => resolveTheme(artist.theme))
  const [commission, setCommission] = useState(String(Number(artist.commission_pct ?? 20)))
  const [toolPlan,   setToolPlan]   = useState<ToolPlan>((artist.tool_plan ?? 'basic') as ToolPlan)
  const [avatarUrl,  setAvatarUrl]  = useState(artist.avatar_url ?? '')
  const [bannerUrl,  setBannerUrl]  = useState(artist.banner_url ?? '')
  const [logoUrl,    setLogoUrl]    = useState((artist as Artist & { logo_url?: string }).logo_url ?? '')
  const [status,     setStatus]     = useState<{ ok?: string; error?: string }>({})
  const [isPending,  startTransition] = useTransition()
  const [tab,        setTab]        = useState<Tab>('identity')

  const vars = themeToCssVars(theme) as CSSProperties

  function set<K extends keyof ArtistTheme>(key: K, value: ArtistTheme[K]) {
    setTheme((t) => ({ ...t, [key]: value }))
  }

  function save() {
    setStatus({})
    const pct = Number.parseFloat(commission.replace(',', '.'))
    startTransition(async () => {
      const res = await saveArtistStudio({
        artistId: artist.id, slug: artist.slug,
        theme, commissionPct: pct, toolPlan, avatarUrl, bannerUrl,
      })
      if (res?.error) setStatus({ error: res.error })
      else setStatus({ ok: 'Identidade salva com sucesso!' })
    })
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_380px]">

      {/* ═══ LEFT ═══ */}
      <div className="flex flex-col gap-5">

        {/* Tab switcher */}
        <div className="flex gap-2" role="tablist" aria-label="Seções do estúdio">
          <TabBtn active={tab==='identity'} onClick={()=>setTab('identity')} icon={Palette} label="IDENTIDADE" sub="Cores e estilo" />
          <TabBtn active={tab==='profile'}  onClick={()=>setTab('profile')}  icon={User}    label="PERFIL"     sub="Bio e fotos" />
          {contentSlot && (
            <TabBtn active={tab==='content'} onClick={()=>setTab('content')} icon={LayoutGrid} label="CONTEÚDO" sub="Posts, stories…" />
          )}
        </div>

        {/* Profile tab */}
        {tab === 'profile' && (
          <div className="admin-panel p-6">
            <ProfileEditor
              artist={artist}
              avatarUrl={avatarUrl} bannerUrl={bannerUrl} logoUrl={logoUrl}
              onAvatarChange={setAvatarUrl} onBannerChange={setBannerUrl} onLogoChange={setLogoUrl}
            />
          </div>
        )}

        {/* Content tab */}
        {tab === 'content' && contentSlot}

        {/* Identity tab */}
        {tab === 'identity' && (
          <div className="admin-panel flex flex-col gap-7 p-6">

            {/* Colors */}
            <section>
              <SectionRule>CORES DA IDENTIDADE</SectionRule>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {COLOR_FIELDS.map(({ key, label, hint }) => (
                  <ColorPicker
                    key={key} label={label} hint={hint}
                    value={theme[key] as string}
                    onChange={(v) => set(key, v as never)}
                  />
                ))}
              </div>
            </section>

            {/* Gradient */}
            <section>
              <SectionRule>GRADIENTE DA MARCA</SectionRule>
              <div className="mt-4">
                {/* preview bar */}
                <div className="mb-3 h-8 w-full rounded-2xl border border-white/[0.055] shadow-inner" style={{
                  backgroundImage: `linear-gradient(90deg, ${theme.gradient.from}, ${theme.gradient.via}, ${theme.gradient.to})`,
                }}/>
                <div className="grid grid-cols-3 gap-2">
                  {GRAD_FIELDS.map(({ key, label }) => (
                    <div key={key}>
                      <p className="admin-eyebrow mb-1.5">{label.toUpperCase()}</p>
                      <div className="flex items-center gap-2 rounded-xl border border-white/[0.065] bg-white/[0.02] p-2.5">
                        <label className="relative shrink-0">
                          <input type="color" value={theme.gradient[key]}
                            onChange={(e) => setTheme((t) => ({ ...t, gradient: { ...t.gradient, [key]: e.target.value } }))}
                            aria-label={label}
                            className="absolute inset-0 size-full cursor-pointer rounded-lg opacity-0"/>
                          <span className="flex size-7 rounded-lg border border-white/10" style={{ backgroundColor: theme.gradient[key] }}/>
                        </label>
                        <span className="font-mono text-[8px] font-bold text-zinc-600">{theme.gradient[key].toUpperCase()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Style / Font / Nav */}
            <section>
              <SectionRule>ESTILO, FONTE E MENU</SectionRule>
              <div className="mt-4 flex flex-col gap-5">
                <ChipGroup
                  label="VIBE DO TEMA"
                  options={Object.keys(STYLE_LABELS) as ArtistThemeStyle[]}
                  value={theme.style}
                  onChange={(v) => set('style', v)}
                  labelMap={STYLE_LABELS}
                />
                <ChipGroup
                  label="FONTE DE DESTAQUE"
                  options={Object.keys(FONT_LABELS) as ArtistFontDisplay[]}
                  value={theme.font_display}
                  onChange={(v) => set('font_display', v)}
                  labelMap={FONT_LABELS}
                />
                <ChipGroup
                  label="ESTILO DO MENU"
                  options={Object.keys(NAV_LABELS) as ArtistNavStyle[]}
                  value={theme.nav_style}
                  onChange={(v) => set('nav_style', v)}
                  labelMap={NAV_LABELS}
                />

                {/* Radius slider */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="admin-eyebrow">ARREDONDAMENTO DOS CARDS</p>
                    <span className="font-numeric text-[10px] font-bold text-primary">{theme.radius}px</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/[0.065] bg-white/[0.02] px-4 py-3">
                    <input
                      id="radius-slider" type="range" min={0} max={48} step={2} value={theme.radius}
                      onChange={(e) => set('radius', Number(e.target.value))}
                      className="w-full" style={{ accentColor: theme.primary }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[7px] font-bold text-zinc-700">
                    <span>QUADRADO</span><span>REDONDO</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Business */}
            <section>
              <SectionRule>NEGÓCIO</SectionRule>
              <div className="mt-4 flex flex-col gap-3">

                <div className="flex items-center gap-4 rounded-2xl border border-white/[0.065] bg-white/[0.02] p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black text-white">Comissão da plataforma</p>
                    <p className="text-[8px] font-bold text-zinc-600">% cobrado sobre cada assinatura</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      value={commission}
                      onChange={(e) => setCommission(e.target.value)}
                      inputMode="decimal" aria-label="Comissão %"
                      className="h-10 w-20 rounded-xl border border-white/10 bg-background px-3 text-center font-numeric text-sm font-bold outline-none focus:border-primary"
                    />
                    <span className="text-sm font-black text-zinc-600">%</span>
                  </div>
                </div>

                <p className="admin-eyebrow">PLANO DE FERRAMENTAS</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(Object.keys(TOOL_PLANS) as ToolPlan[]).map((p) => (
                    <button key={p} type="button" onClick={() => setToolPlan(p)} aria-pressed={toolPlan===p}
                      className={[
                        'relative overflow-hidden rounded-2xl p-4 text-left transition-all',
                        toolPlan===p
                          ? 'border-2 border-primary/60 bg-primary/[0.08] shadow-[0_0_20px_-8px_rgba(255,106,0,0.4)]'
                          : 'border border-white/[0.065] bg-white/[0.02] hover:border-white/[0.1]',
                      ].join(' ')}>
                      {toolPlan===p && (
                        <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary shadow-[0_4px_10px_-2px_rgba(255,106,0,0.6)]">
                          <Check className="size-3 text-white"/>
                        </span>
                      )}
                      <span className="block text-[11px] font-black tracking-[0.08em] text-white">
                        {TOOL_PLANS[p].label.toUpperCase()}
                      </span>
                      <span className="font-numeric mt-0.5 block text-[11px] font-bold text-primary">
                        {TOOL_PLANS[p].price}
                      </span>
                      <ul className="mt-3 flex flex-col gap-1">
                        {TOOL_PLANS[p].features.map((f) => (
                          <li key={f} className="flex items-start gap-1.5 text-[8px] font-bold leading-relaxed text-zinc-500">
                            <ChevronRight className="mt-0.5 size-2.5 shrink-0 text-primary/70"/>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Save */}
            <div className="flex flex-col gap-3">
              <button
                type="button" onClick={save} disabled={isPending}
                className="gradient-brand flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl text-[11px] font-black tracking-[0.2em] text-white shadow-[0_12px_30px_-16px_rgba(255,106,0,0.8)] disabled:opacity-60"
              >
                {isPending ? (
                  <><span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"/>SALVANDO…</>
                ) : (
                  <><Sparkles className="size-4"/>SALVAR IDENTIDADE DO ARTISTA</>
                )}
              </button>
              {status.error && (
                <p role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-center text-[11px] font-bold text-destructive">
                  {status.error}
                </p>
              )}
              {status.ok && (
                <p role="status" className="rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3 text-center text-[11px] font-bold text-primary">
                  ✓ {status.ok}
                </p>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ═══ RIGHT — Live Preview ═══ */}
      <div className="hidden xl:block">
        <div className="sticky top-6">
          <div className="admin-panel p-5">

            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="size-3.5 text-zinc-500"/>
                <h2 className="admin-eyebrow">PREVIEW AO VIVO</h2>
              </div>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-1 text-[7px] font-black tracking-[0.12em] text-emerald-400">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-400"/>
                SINCRONIZADO
              </span>
            </div>

            {/* Phone shell */}
            <div style={vars as CSSProperties} className="artist-scope overflow-hidden rounded-[28px] border border-white/10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)]">

              {/* Banner */}
              <div className="relative h-44" style={{ backgroundColor: theme.bg }}>
                {(bannerUrl || avatarUrl) && (
                  <Image src={bannerUrl || avatarUrl} alt="" fill sizes="380px" className="object-cover opacity-60"/>
                )}
                <div className="absolute inset-0" style={{
                  backgroundImage: `linear-gradient(135deg, ${theme.gradient.from}33, ${theme.gradient.to}33)`,
                }}/>
                <div className="absolute inset-0" style={{
                  backgroundImage: `linear-gradient(to top, ${theme.bg} 0%, transparent 55%)`,
                }}/>
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                  <p className="artist-font flex items-center gap-1.5 text-2xl font-extrabold leading-tight tracking-tight" style={{ color: theme.text }}>
                    {artist.name}
                    <BadgeCheck className="size-4 shrink-0" style={{ color: theme.primary }}/>
                  </p>
                  <p className="mt-0.5 text-[9px] font-black tracking-[0.15em]" style={{ color: theme.primary }}>
                    {Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(artist.followers_count)} FÃS
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-col gap-3 p-5" style={{ backgroundColor: theme.bg }}>

                {/* CTA */}
                <button type="button" tabIndex={-1}
                  className="artist-gradient flex h-12 w-full items-center justify-center gap-2 text-[10px] font-black tracking-[0.18em] text-white"
                  style={{ borderRadius: theme.radius }}>
                  <Star className="size-4 fill-white"/>
                  ENTRAR NO FAN CLUB
                </button>

                {/* Post card */}
                <div className="p-4" style={{
                  backgroundColor: theme.surface,
                  borderRadius: Math.max(0, theme.radius - 4),
                  border: `1px solid ${theme.primary}22`,
                }}>
                  <p className="text-[8px] font-black tracking-[0.18em]" style={{ color: theme.muted }}>
                    POST EXCLUSIVO
                  </p>
                  <p className="artist-font mt-1.5 text-sm font-extrabold leading-tight" style={{ color: theme.text }}>
                    Bastidores do novo clipe
                  </p>
                  <div className="mt-3 flex gap-1.5">
                    {['BRONZE','PRATA','OURO'].map((t) => (
                      <span key={t} className="px-2.5 py-1 text-[7px] font-black tracking-[0.1em]" style={{
                        borderRadius: 999,
                        backgroundColor: `${theme.primary}15`,
                        color: theme.primary,
                        border: `1px solid ${theme.primary}40`,
                      }}>{t}</span>
                    ))}
                  </div>
                </div>

                {/* Nav */}
                <div className="flex items-center justify-around py-2" style={{
                  borderRadius: theme.nav_style === 'flat' ? 8 : 999,
                  backgroundColor: theme.nav_style === 'glass' ? `${theme.surface}cc` : theme.surface,
                  border: theme.nav_style === 'glass' ? `1px solid ${theme.primary}33` : 'none',
                  backdropFilter: theme.nav_style === 'glass' ? 'blur(12px)' : 'none',
                }}>
                  {['INÍCIO','CLUBE','LIVES','PERFIL'].map((item, i) => (
                    <span key={item} className="text-[8px] font-black tracking-[0.1em]"
                      style={{ color: i===1 ? theme.primary : theme.muted }}>
                      {i===1 && theme.nav_style==='pill' ? (
                        <span className="px-3 py-1.5" style={{ borderRadius:999, backgroundColor:theme.primary, color:'#fff' }}>
                          {item}
                        </span>
                      ) : item}
                    </span>
                  ))}
                </div>

                {/* Meta */}
                <p className="flex items-center justify-center gap-1.5 text-[7px] font-black tracking-[0.14em]" style={{ color: theme.muted }}>
                  <Check className="size-2.5 shrink-0" style={{ color: theme.primary }}/>
                  {FONT_LABELS[theme.font_display].toUpperCase()} · R{theme.radius} · {STYLE_LABELS[theme.style].toUpperCase()}
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  )
}
