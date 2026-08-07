import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import {
  ArrowLeft,
  Users,
  TrendingUp,
  FileText,
  Radio,
  LayoutDashboard,
  ImageIcon,
  CalendarDays,
  Star,
  ExternalLink,
  Lock,
  Wallet,
  Landmark,
  Sparkles,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/wordfan/logo'
import { ArtistThemeScope } from '@/components/wordfan/artist-theme-provider'
import { TOOL_PLANS, hasEntitlement, type ToolPlan } from '@/lib/artist-theme'
import {
  formatPrice,
  TIER_LABELS,
  type Artist,
  type GalleryItem,
  type Plan,
  type Post,
  type Show,
  type Story,
  type Subscription,
  type Tier,
  type Transaction,
  type Video,
} from '@/lib/types'
import { ContentManager } from '@/components/wordfan/content-manager'

export const metadata = { title: 'Dashboard do artista — WordFan' }

const tierBar: Record<Tier, string> = {
  bronze: 'bg-[#cd7f32]',
  silver: 'bg-[#c0c0c8]',
  gold: 'bg-[#ffd700]',
  platinum: 'bg-club',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/dashboard')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  let artistQuery = supabase.from('artists').select('*')
  if (profile?.role !== 'admin') {
    artistQuery = artistQuery.eq('owner_id', user.id)
  }
  const { data: artistData } = await artistQuery.limit(1).maybeSingle()
  const artist = artistData as Artist | null

  if (!artist) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-6">
        <div className="max-w-sm rounded-[32px] border border-white/8 bg-card p-8 text-center">
          <h1 className="font-serif text-xl font-black tracking-tight">ÁREA DO ARTISTA</h1>
          <p className="mt-3 text-xs font-bold leading-relaxed text-muted-foreground text-pretty">
            Sua conta ainda não está vinculada a um perfil de artista. Fale com a equipe WordFan
            para ativar seu dashboard.
          </p>
          <Link
            href="/home"
            className="gradient-brand mt-6 inline-block rounded-full px-7 py-3 text-[10px] font-black tracking-[0.2em] text-white"
          >
            VOLTAR PARA A HOME
          </Link>
        </div>
      </main>
    )
  }

  const [
    { data: subsData },
    { data: postsData },
    { data: txData },
    { data: showsData },
    { data: galleryData },
    { data: videosData },
    { data: storiesData },
    { data: plansData },
  ] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('*, plan:plans(*)')
      .eq('artist_id', artist.id)
      .eq('status', 'active'),
    supabase.from('posts').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
    supabase
      .from('transactions')
      .select('*')
      .eq('artist_id', artist.id)
      .order('created_at', { ascending: false }),
    supabase.from('shows').select('*').eq('artist_id', artist.id).order('starts_at', { ascending: true }),
    supabase.from('gallery_items').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
    supabase.from('videos').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
    supabase.from('stories').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
    supabase.from('plans').select('*').eq('artist_id', artist.id).order('price_cents', { ascending: true }),
  ])

  const subs = (subsData ?? []) as (Subscription & { plan: Plan })[]
  const posts = (postsData ?? []) as Post[]
  const txs = (txData ?? []) as Transaction[]
  const shows = (showsData ?? []) as Show[]
  const gallery = (galleryData ?? []) as GalleryItem[]
  const videos = (videosData ?? []) as Video[]
  const stories = (storiesData ?? []) as Story[]
  const plans = (plansData ?? []) as Plan[]

  const gross = txs.reduce((acc, t) => acc + t.amount_cents, 0)
  const fees = txs.reduce((acc, t) => acc + t.platform_fee_cents, 0)
  const net = txs.reduce((acc, t) => acc + t.artist_net_cents, 0)

  const tierCounts = subs.reduce<Record<string, number>>((acc, s) => {
    const t = s.plan?.tier
    if (t) acc[t] = (acc[t] ?? 0) + 1
    return acc
  }, {})

  const toolPlan = (artist.tool_plan ?? 'basic') as ToolPlan
  const toolInfo = TOOL_PLANS[toolPlan]

  const NAV_ITEMS = [
    { label: 'DASHBOARD', icon: LayoutDashboard, enabled: true, active: true },
    { label: 'CONTEÚDO', icon: FileText, enabled: true, active: false },
    { label: 'GALERIA', icon: ImageIcon, enabled: hasEntitlement(toolPlan, 'gallery'), active: false },
    { label: 'LIVES', icon: Radio, enabled: hasEntitlement(toolPlan, 'lives'), active: false },
    { label: 'AGENDA', icon: CalendarDays, enabled: true, active: false },
    { label: 'FAN CLUB', icon: Star, enabled: hasEntitlement(toolPlan, 'club'), active: false },
  ]

  const stats = [
    { label: 'ASSINANTES ATIVOS', value: subs.length.toLocaleString('pt-BR'), icon: Users },
    { label: 'RECEITA BRUTA', value: formatPrice(gross), icon: TrendingUp },
    { label: 'PUBLICAÇÕES', value: posts.length.toLocaleString('pt-BR'), icon: FileText },
    { label: 'SEGUIDORES', value: artist.followers_count.toLocaleString('pt-BR'), icon: Radio },
  ]

  return (
    <ArtistThemeScope theme={artist.theme}>
    <div className="flex min-h-dvh bg-background">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-white/8 bg-card px-5 py-7 lg:flex">
        <Logo href="/home" className="px-2 text-xl" />
        <p className="mt-1 px-2 text-[8px] font-black tracking-[0.3em] text-muted-foreground">
          PAINEL DO ARTISTA
        </p>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Menu do painel">
          {NAV_ITEMS.map(({ label, icon: Icon, enabled, active }) => (
            <span
              key={label}
              className={
                active
                  ? 'gradient-brand flex items-center gap-3 rounded-2xl px-4 py-3 text-[10px] font-black tracking-[0.15em] text-white'
                  : enabled
                    ? 'flex items-center gap-3 rounded-2xl px-4 py-3 text-[10px] font-black tracking-[0.15em] text-muted-foreground'
                    : 'flex items-center gap-3 rounded-2xl px-4 py-3 text-[10px] font-black tracking-[0.15em] text-muted-foreground/40'
              }
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
              {!enabled && <Lock className="ml-auto size-3" aria-hidden="true" />}
            </span>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-2xl border border-white/8 bg-background p-3">
          <Image
            src={artist.avatar_url || '/placeholder.svg?height=36&width=36'}
            alt=""
            width={36}
            height={36}
            className="size-9 rounded-xl object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-extrabold">{artist.name}</p>
            <p className="text-[8px] font-black tracking-[0.15em] text-primary">ARTISTA</p>
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="min-w-0 flex-1 px-5 pb-16 pt-6 md:px-8">
        <header className="flex flex-wrap items-center gap-4">
          <Link
            href="/profile"
            aria-label="Voltar para o perfil"
            className="flex size-10 items-center justify-center rounded-full border border-white/8 bg-card lg:hidden"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black tracking-[0.3em] text-primary">VISÃO GERAL</p>
            <h1 className="mt-0.5 truncate font-serif text-2xl font-black tracking-tight">
              DASHBOARD — {artist.name.toUpperCase()}
            </h1>
          </div>
          <Link
            href={`/artist/${artist.slug}`}
            className="flex items-center gap-2 rounded-full border border-white/8 bg-card px-5 py-2.5 text-[9px] font-black tracking-[0.15em] transition-colors hover:bg-secondary"
          >
            VER PERFIL PÚBLICO
            <ExternalLink className="size-3" aria-hidden="true" />
          </Link>
        </header>

        {/* Banner do plano de ferramenta */}
        <section
          aria-label="Seu plano WordFan"
          className="mt-6 flex flex-wrap items-center gap-4 rounded-3xl border border-primary/25 bg-primary/5 p-5"
        >
          <span className="gradient-brand flex size-11 shrink-0 items-center justify-center rounded-2xl">
            <Sparkles className="size-5 text-white" aria-hidden="true" />
          </span>
          <div className="shrink-0">
            <p className="whitespace-nowrap text-[9px] font-black tracking-[0.2em] text-muted-foreground">
              SEU PLANO WORDFAN
            </p>
            <p className="mt-0.5 whitespace-nowrap font-serif text-lg font-black text-primary">
              {toolInfo.label.toUpperCase()}{' '}
              <span className="font-numeric text-xs font-bold text-muted-foreground">
                • {toolInfo.price}
              </span>
            </p>
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap justify-end gap-2">
            {toolInfo.features.map((f) => (
              <span
                key={f}
                className="rounded-full bg-white/5 px-3 py-1 text-[8px] font-black tracking-[0.1em] text-muted-foreground uppercase"
              >
                {f}
              </span>
            ))}
          </div>
        </section>

        <section aria-label="Métricas" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-3xl border border-white/8 bg-card p-5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="size-4 text-primary" aria-hidden="true" />
              </span>
              <p className="mt-4 font-numeric text-2xl font-bold">{value}</p>
              <p className="mt-1 text-[8px] font-black tracking-[0.2em] text-muted-foreground">{label}</p>
            </div>
          ))}
        </section>

        {/* Receita com split */}
        <section aria-labelledby="revenue-heading" className="mt-6">
          <h2
            id="revenue-heading"
            className="text-[10px] font-black tracking-[0.25em] text-muted-foreground"
          >
            RECEITA E REPASSE
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/8 bg-card p-5">
              <p className="flex items-center gap-2 text-[8px] font-black tracking-[0.2em] text-muted-foreground">
                <TrendingUp className="size-3.5" aria-hidden="true" />
                BRUTO (ASSINATURAS)
              </p>
              <p className="mt-3 font-numeric text-2xl font-bold">{formatPrice(gross)}</p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-card p-5">
              <p className="flex items-center gap-2 text-[8px] font-black tracking-[0.2em] text-muted-foreground">
                <Landmark className="size-3.5" aria-hidden="true" />
                TAXA WORDFAN ({Number(artist.commission_pct ?? 20)}%)
              </p>
              <p className="mt-3 font-numeric text-2xl font-bold text-muted-foreground">
                −{formatPrice(fees)}
              </p>
            </div>
            <div className="rounded-3xl border border-primary/30 bg-primary/5 p-5">
              <p className="flex items-center gap-2 text-[8px] font-black tracking-[0.2em] text-primary">
                <Wallet className="size-3.5" aria-hidden="true" />
                SEU LÍQUIDO
              </p>
              <p className="mt-3 font-numeric text-2xl font-bold text-primary">{formatPrice(net)}</p>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          {/* Gerenciar conteúdo (CRUD completo) */}
          <section aria-labelledby="manage-heading" className="lg:col-span-3">
            <h2 id="manage-heading" className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
              GERENCIAR CONTEÚDO
            </h2>
            <p className="mt-1 text-[10px] font-bold text-muted-foreground/70">
              Feed, Stories, Agenda, Galeria, Vídeos e Fan Club — tudo que aparece no seu perfil público.
            </p>
            <div className="mt-3">
              <ContentManager
                artistId={artist.id}
                posts={posts}
                shows={shows}
                gallery={gallery}
                videos={videos}
                stories={stories}
                plans={plans}
              />
            </div>
          </section>

          {/* Resumo de assinantes */}
          <section aria-labelledby="subs-heading" className="lg:col-span-2">
            <h2 id="subs-heading" className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
              ASSINANTES POR PLANO
            </h2>
            <div className="mt-3 flex flex-col gap-4 rounded-3xl border border-white/8 bg-card p-5">
              {(['bronze', 'silver', 'gold', 'platinum'] as Tier[]).map((tier) => {
                const count = tierCounts[tier] ?? 0
                const pct = subs.length > 0 ? Math.round((count / subs.length) * 100) : 0
                return (
                  <div key={tier}>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black tracking-[0.15em]">
                        {TIER_LABELS[tier].toUpperCase()}
                      </span>
                      <span className="font-numeric text-[10px] font-bold text-muted-foreground">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className={`h-full rounded-full ${tierBar[tier]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <h2 className="mt-8 text-[10px] font-black tracking-[0.25em] text-muted-foreground">
              PUBLICAÇÕES RECENTES
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {posts.slice(0, 6).map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-4 rounded-3xl border border-white/8 bg-card p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-extrabold">{p.title ?? 'Sem título'}</p>
                    <p className="mt-1 font-numeric text-[9px] font-bold tracking-[0.1em] text-zinc-500">
                      {new Date(p.created_at).toLocaleDateString('pt-BR')} ·{' '}
                      {p.likes_count.toLocaleString('pt-BR')} CURTIDAS
                    </p>
                  </div>
                  {p.is_exclusive && p.min_tier ? (
                    <span className="shrink-0 rounded-full bg-club/10 px-3 py-1.5 text-[8px] font-black tracking-[0.15em] text-club">
                      {TIER_LABELS[p.min_tier].toUpperCase()}+
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-white/5 px-3 py-1.5 text-[8px] font-black tracking-[0.15em] text-muted-foreground">
                      PÚBLICO
                    </span>
                  )}
                </li>
              ))}
              {posts.length === 0 && (
                <li className="rounded-3xl border border-dashed border-white/10 p-6 text-center text-[10px] font-bold text-muted-foreground">
                  Nenhuma publicação ainda.
                </li>
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
    </ArtistThemeScope>
  )
}
