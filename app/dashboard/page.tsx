import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  Users,
  TrendingUp,
  FileText,
  Radio,
  Wallet,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react'
import { getDashboardArtist, bucketByMonth } from '@/lib/dashboard'
import { TOOL_PLANS, type ToolPlan } from '@/lib/artist-theme'
import { DashboardHeader } from '@/components/wordfan/dashboard-header'
import { RevenueAreaChart, SubscribersBarChart } from '@/components/wordfan/dashboard-charts'
import {
  formatPrice,
  TIER_LABELS,
  type Plan,
  type Post,
  type Subscription,
  type Transaction,
} from '@/lib/types'

export const metadata = { title: 'Visão geral — Painel do artista' }

export default async function OverviewPage() {
  const { artist, supabase } = await getDashboardArtist('/dashboard')
  if (!artist) notFound()

  const [{ data: subsData }, { data: postsData }, { data: txData }, { count: liveCount }] =
    await Promise.all([
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
      supabase.from('lives').select('id', { count: 'exact', head: true }).eq('artist_id', artist.id),
    ])

  const subs = (subsData ?? []) as (Subscription & { plan: Plan })[]
  const posts = (postsData ?? []) as Post[]
  const txs = (txData ?? []) as Transaction[]

  const gross = txs.reduce((acc, t) => acc + t.amount_cents, 0)
  const net = txs.reduce((acc, t) => acc + t.artist_net_cents, 0)

  // Séries reais dos últimos 6 meses.
  const revenueSeries = bucketByMonth(txs, 'created_at', (t) => t.amount_cents, 6)
  const subsSeries = bucketByMonth(subs, 'started_at', () => 1, 6)

  const toolInfo = TOOL_PLANS[(artist.tool_plan ?? 'basic') as ToolPlan]

  const stats = [
    {
      label: 'ASSINANTES ATIVOS',
      value: subs.length.toLocaleString('pt-BR'),
      icon: Users,
    },
    { label: 'RECEITA BRUTA', value: formatPrice(gross), icon: TrendingUp },
    { label: 'SEU LÍQUIDO', value: formatPrice(net), icon: Wallet },
    {
      label: 'SEGUIDORES',
      value: artist.followers_count.toLocaleString('pt-BR'),
      icon: Radio,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="VISÃO GERAL"
        title={artist.name}
        action={
          <span className="flex items-center gap-2 rounded-[8px] border border-[var(--artist-primary)]/30 bg-[var(--artist-primary)]/10 px-4 py-2 text-[9px] font-black tracking-[0.15em] text-[var(--artist-primary)]">
            <Sparkles className="size-3.5" aria-hidden="true" />
            PLANO {toolInfo.label.toUpperCase()}
          </span>
        }
      />

      {/* Métricas */}
      <section aria-label="Métricas principais" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="crm-card p-4">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-[7px] bg-[var(--artist-primary)]/10">
                <Icon className="size-3.5 text-[var(--artist-primary)]" aria-hidden="true" />
              </span>
              <p className="text-[8px] font-black tracking-[0.18em] text-[var(--artist-muted)]">
                {label}
              </p>
            </div>
            <p className="mt-3 font-numeric text-2xl font-bold text-[var(--artist-text)]">{value}</p>
          </div>
        ))}
      </section>

      {/* Gráficos reais */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="crm-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="crm-section-title">RECEITA (6 MESES)</h2>
            <span className="font-numeric text-[11px] font-bold text-[var(--artist-primary)]">
              {formatPrice(gross)}
            </span>
          </div>
          <div className="mt-4">
            <RevenueAreaChart data={revenueSeries} currency />
          </div>
        </div>

        <div className="crm-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="crm-section-title">NOVOS ASSINANTES (6 MESES)</h2>
            <span className="font-numeric text-[11px] font-bold text-[var(--artist-primary)]">
              +{subsSeries.reduce((a, b) => a + b.value, 0)}
            </span>
          </div>
          <div className="mt-4">
            <SubscribersBarChart data={subsSeries} />
          </div>
        </div>
      </section>

      {/* Publicações recentes */}
      <section aria-labelledby="recent-heading">
        <div className="flex items-center justify-between">
          <h2 id="recent-heading" className="crm-section-title">
            PUBLICAÇÕES RECENTES
          </h2>
          <Link
            href="/dashboard/estudio"
            className="flex items-center gap-1 text-[9px] font-black tracking-[0.15em] text-[var(--artist-primary)]"
          >
            GERENCIAR
            <ArrowUpRight className="size-3" aria-hidden="true" />
          </Link>
        </div>
        <ul className="mt-3 grid gap-2.5 md:grid-cols-2">
          {posts.slice(0, 6).map((p) => (
            <li key={p.id} className="crm-card flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-extrabold text-[var(--artist-text)]">
                  {p.title ?? 'Sem título'}
                </p>
                <p className="mt-1 font-numeric text-[9px] font-bold tracking-[0.1em] text-[var(--artist-muted)]">
                  {new Date(p.created_at).toLocaleDateString('pt-BR')} ·{' '}
                  {p.likes_count.toLocaleString('pt-BR')} CURTIDAS
                </p>
              </div>
              {p.is_exclusive && p.min_tier ? (
                <span className="shrink-0 rounded-full bg-[var(--artist-primary)]/12 px-3 py-1.5 text-[8px] font-black tracking-[0.15em] text-[var(--artist-primary)]">
                  {TIER_LABELS[p.min_tier].toUpperCase()}+
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-white/5 px-3 py-1.5 text-[8px] font-black tracking-[0.15em] text-[var(--artist-muted)]">
                  PÚBLICO
                </span>
              )}
            </li>
          ))}
          {posts.length === 0 && (
            <li className="rounded-[20px] border border-dashed border-white/10 p-6 text-center text-[10px] font-bold text-[var(--artist-muted)] md:col-span-2">
              Nenhuma publicação ainda. Comece pelo Estúdio.
            </li>
          )}
        </ul>
      </section>
    </div>
  )
}
