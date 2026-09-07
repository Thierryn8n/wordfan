import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowUpRight,
  CalendarDays,
  Crown,
  FileText,
  Heart,
  Radio,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  RevenueAreaChart,
  TierDonutChart,
} from '@/components/wordfan/dashboard-charts'
import { bucketByMonth, getDashboardArtist } from '@/lib/dashboard'
import { TOOL_PLANS, type ToolPlan } from '@/lib/artist-theme'
import {
  formatPrice,
  TIER_LABELS,
  TIER_ORDER,
  type Live,
  type Plan,
  type Post,
  type Show,
  type Subscription,
  type Tier,
  type Transaction,
} from '@/lib/types'

export const metadata = { title: 'Visão geral — Painel do artista' }

const TIER_COLORS: Record<Tier, string> = {
  bronze: '#b7793b',
  silver: '#71717a',
  gold: '#ff8a00',
  platinum: '#a855f7',
}

export default async function OverviewPage() {
  const { artist, supabase } = await getDashboardArtist('/dashboard')
  if (!artist) notFound()

  const [
    { data: subscriptionsData },
    { data: postsData },
    { data: transactionsData },
    { data: showsData },
    { data: livesData },
  ] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('*, plan:plans(*)')
      .eq('artist_id', artist.id)
      .eq('status', 'active'),
    supabase
      .from('posts')
      .select('*')
      .eq('artist_id', artist.id)
      .order('created_at', { ascending: false }),
    supabase.from('transactions').select('*').eq('artist_id', artist.id),
    supabase
      .from('shows')
      .select('*')
      .eq('artist_id', artist.id)
      .eq('status', 'scheduled')
      .order('starts_at', { ascending: true })
      .limit(4),
    supabase
      .from('lives')
      .select('*')
      .eq('artist_id', artist.id)
      .in('status', ['scheduled', 'live'])
      .order('scheduled_at', { ascending: true })
      .limit(4),
  ])

  const subscriptions = (subscriptionsData ?? []) as (Subscription & { plan: Plan | null })[]
  const posts = (postsData ?? []) as Post[]
  const transactions = (transactionsData ?? []) as Transaction[]
  const shows = (showsData ?? []) as Show[]
  const lives = (livesData ?? []) as Live[]
  const revenueSeries = bucketByMonth(transactions, 'created_at', (transaction) => transaction.amount_cents, 6)

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const monthlyNet = transactions
    .filter((transaction) => new Date(transaction.created_at) >= monthStart)
    .reduce((sum, transaction) => sum + transaction.artist_net_cents, 0)
  const totalLikes = posts.reduce((sum, post) => sum + post.likes_count, 0)
  const planInfo = TOOL_PLANS[(artist.tool_plan ?? 'basic') as ToolPlan]

  const tierData = TIER_ORDER.map((tier) => ({
    tier,
    label: TIER_LABELS[tier],
    value: subscriptions.filter((subscription) => subscription.plan?.tier === tier).length,
    color: TIER_COLORS[tier],
  }))

  const events = [
    ...lives.map((live) => ({
      id: `live-${live.id}`,
      title: live.title,
      date: live.scheduled_at,
      meta: live.status === 'live' ? 'Transmitindo agora' : 'Live agendada',
      live: live.status === 'live',
    })),
    ...shows.map((show) => ({
      id: `show-${show.id}`,
      title: show.title,
      date: show.starts_at,
      meta: [show.venue, show.city, show.state].filter(Boolean).join(' · '),
      live: false,
    })),
  ]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4)

  const stats = [
    {
      label: 'TOTAL DE FÃS',
      value: artist.followers_count.toLocaleString('pt-BR'),
      icon: Users,
      tone: 'text-[var(--artist-primary)] bg-[var(--artist-primary)]/10',
    },
    {
      label: 'MEMBROS VIP',
      value: subscriptions.length.toLocaleString('pt-BR'),
      icon: Crown,
      tone: 'text-violet-400 bg-violet-500/10',
    },
    {
      label: 'RECEITA NO MÊS',
      value: formatPrice(monthlyNet),
      icon: TrendingUp,
      tone: 'text-sky-400 bg-sky-500/10',
    },
    {
      label: 'INTERAÇÕES',
      value: totalLikes.toLocaleString('pt-BR'),
      icon: Heart,
      tone: 'text-emerald-400 bg-emerald-500/10',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-black tracking-[0.08em] text-[var(--artist-primary)]">
            <span className="size-1.5 rounded-full bg-[var(--artist-primary)]" aria-hidden="true" />
            DASHBOARD DO ARTISTA
          </p>
          <h1 className="mt-2 font-serif text-3xl font-black tracking-[-0.04em] text-[var(--artist-text)]">
            Olá, {artist.name}
          </h1>
          <p className="mt-2 text-xs font-medium text-[var(--artist-muted)]">
            Acompanhe sua audiência, conteúdos e resultados em um só lugar.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-11 items-center gap-2 rounded-xl border border-white/8 bg-white/[0.035] px-4 text-[11px] font-black tracking-[0.04em] text-[var(--artist-muted)]">
            <Sparkles className="size-3.5 text-[var(--artist-primary)]" aria-hidden="true" />
            PLANO {planInfo.label.toUpperCase()}
          </span>
          <Link
            href="/dashboard/estudio"
            className="artist-gradient flex h-11 items-center gap-2 rounded-xl px-5 text-[11px] font-black tracking-[0.05em] text-white shadow-[0_12px_30px_-16px_rgba(0,0,0,.9)]"
          >
            <FileText className="size-3.5" aria-hidden="true" />
            NOVO CONTEÚDO
          </Link>
        </div>
      </header>

      <section aria-label="Métricas principais" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className="artist-dashboard-panel p-5">
            <span className={`flex size-10 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <p className="mt-5 text-[11px] font-bold tracking-[0.06em] text-[var(--artist-muted)]">{label}</p>
            <p className="mt-1 font-numeric text-2xl font-bold tracking-tight text-[var(--artist-text)]">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,.8fr)]">
        <article className="artist-dashboard-panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="artist-dashboard-eyebrow">RESULTADOS</p>
              <h2 className="mt-1.5 text-lg font-black text-[var(--artist-text)]">Crescimento de receita</h2>
            </div>
            <span className="rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-[10px] font-black tracking-[0.05em] text-[var(--artist-muted)]">
              ÚLTIMOS 6 MESES
            </span>
          </div>
          <div className="mt-5">
            <RevenueAreaChart data={revenueSeries} currency />
          </div>
        </article>

        <article className="artist-dashboard-panel p-6">
          <p className="artist-dashboard-eyebrow">AUDIÊNCIA</p>
          <h2 className="mt-1.5 text-lg font-black text-[var(--artist-text)]">Distribuição de planos</h2>
          <TierDonutChart data={tierData} />
          <div className="mt-2 grid grid-cols-2 gap-2">
            {tierData.map((item) => (
              <div key={item.tier} className="flex items-center gap-2 text-[11px] font-medium text-[var(--artist-muted)]">
                <span className="size-2 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                <span className="font-numeric text-[var(--artist-text)]">{item.value}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.7fr)]">
        <article className="artist-dashboard-panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="artist-dashboard-eyebrow">CONTEÚDO</p>
              <h2 className="mt-1.5 text-lg font-black text-[var(--artist-text)]">Publicações recentes</h2>
            </div>
            <Link href="/dashboard/estudio" className="flex items-center gap-1 text-[11px] font-black tracking-[0.04em] text-[var(--artist-primary)]">
              GERENCIAR
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-5 flex flex-col gap-2.5">
            {posts.slice(0, 4).map((post) => (
              <Link
                key={post.id}
                href="/dashboard/estudio"
                className="group flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3.5 transition-colors hover:border-[var(--artist-primary)]/20 hover:bg-[var(--artist-primary)]/[0.035]"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-white/5">
                  {post.media_url ? (
                    <Image src={post.media_url} alt="" fill sizes="48px" className="object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center">
                      <FileText className="size-4 text-[var(--artist-muted)]" aria-hidden="true" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-black text-[var(--artist-text)]">{post.title || 'Publicação sem título'}</p>
                  <p className="mt-1 text-[11px] font-medium text-[var(--artist-muted)]">
                    {new Date(post.created_at).toLocaleDateString('pt-BR')} · {post.likes_count.toLocaleString('pt-BR')} curtidas
                  </p>
                </div>
                <span className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[10px] font-black tracking-[0.04em] text-[var(--artist-muted)]">
                  {post.is_exclusive ? 'EXCLUSIVO' : 'PÚBLICO'}
                </span>
              </Link>
            ))}
            {posts.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <FileText className="mx-auto size-5 text-[var(--artist-muted)]" aria-hidden="true" />
                <p className="mt-3 text-xs font-semibold text-[var(--artist-muted)]">Nenhuma publicação criada ainda.</p>
              </div>
            )}
          </div>
        </article>

        <article className="artist-dashboard-panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="artist-dashboard-eyebrow">AGENDA</p>
              <h2 className="mt-1.5 text-lg font-black text-[var(--artist-text)]">Próximos eventos</h2>
            </div>
            <CalendarDays className="size-5 text-[var(--artist-primary)]" aria-hidden="true" />
          </div>
          <div className="mt-5 flex flex-col gap-2.5">
            {events.map((event) => (
              <div key={event.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--artist-primary)]/10">
                    {event.live ? (
                      <Radio className="size-4 text-red-400" aria-hidden="true" />
                    ) : (
                      <CalendarDays className="size-4 text-[var(--artist-primary)]" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-black leading-snug text-[var(--artist-text)]">{event.title}</p>
                    <p className="mt-1 text-[11px] font-medium text-[var(--artist-muted)]">{event.meta || 'Evento do artista'}</p>
                    <p className="mt-2 font-numeric text-[11px] font-black tracking-[0.05em] text-[var(--artist-primary)]">
                      {new Date(event.date).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {events.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <CalendarDays className="mx-auto size-5 text-[var(--artist-muted)]" aria-hidden="true" />
                <p className="mt-3 text-xs font-semibold text-[var(--artist-muted)]">Nenhum evento agendado.</p>
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  )
}
