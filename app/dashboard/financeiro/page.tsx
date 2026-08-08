import { notFound } from 'next/navigation'
import { TrendingUp, Landmark, Wallet, Receipt } from 'lucide-react'
import { getDashboardArtist, bucketByMonth } from '@/lib/dashboard'
import { DashboardHeader } from '@/components/wordfan/dashboard-header'
import { RevenueAreaChart } from '@/components/wordfan/dashboard-charts'
import { formatPrice, TIER_LABELS, type Plan, type Subscription, type Transaction } from '@/lib/types'

export const metadata = { title: 'Financeiro — Painel do artista' }

export default async function FinancePage() {
  const { artist, supabase } = await getDashboardArtist('/dashboard/financeiro')
  if (!artist) notFound()

  const [{ data: txData }, { data: subsData }] = await Promise.all([
    supabase
      .from('transactions')
      .select('*')
      .eq('artist_id', artist.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('subscriptions')
      .select('*, plan:plans(*)')
      .eq('artist_id', artist.id)
      .eq('status', 'active'),
  ])

  const txs = (txData ?? []) as Transaction[]
  const subs = (subsData ?? []) as (Subscription & { plan: Plan })[]

  const gross = txs.reduce((acc, t) => acc + t.amount_cents, 0)
  const fees = txs.reduce((acc, t) => acc + t.platform_fee_cents, 0)
  const net = txs.reduce((acc, t) => acc + t.artist_net_cents, 0)
  const commissionPct = Number(artist.commission_pct ?? 20)

  const grossSeries = bucketByMonth(txs, 'created_at', (t) => t.amount_cents, 6)
  const netSeries = bucketByMonth(txs, 'created_at', (t) => t.artist_net_cents, 6)

  // Receita recorrente estimada por tier (a partir das assinaturas ativas).
  const mrrByTier = subs.reduce<Record<string, number>>((acc, s) => {
    const tier = s.plan?.tier
    if (tier) acc[tier] = (acc[tier] ?? 0) + (s.plan?.price_cents ?? 0)
    return acc
  }, {})
  const mrr = Object.values(mrrByTier).reduce((a, b) => a + b, 0)

  const cards = [
    { label: 'BRUTO ACUMULADO', value: formatPrice(gross), icon: TrendingUp, tone: 'text' },
    {
      label: `TAXA WORDFAN (${commissionPct}%)`,
      value: `−${formatPrice(fees)}`,
      icon: Landmark,
      tone: 'muted',
    },
    { label: 'SEU LÍQUIDO', value: formatPrice(net), icon: Wallet, tone: 'primary' },
    { label: 'RECEITA MENSAL (MRR)', value: formatPrice(mrr), icon: Receipt, tone: 'text' },
  ] as const

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader eyebrow="RECEITA E REPASSE" title="Financeiro" />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className={
              tone === 'primary'
                ? 'rounded-[24px] border border-[var(--artist-primary)]/30 bg-[var(--artist-primary)]/8 p-5'
                : 'rounded-[24px] border border-white/8 bg-[var(--artist-surface)]/60 p-5 backdrop-blur-sm'
            }
          >
            <span
              className={
                tone === 'primary'
                  ? 'flex size-9 items-center justify-center rounded-xl bg-[var(--artist-primary)]/15'
                  : 'flex size-9 items-center justify-center rounded-xl bg-white/5'
              }
            >
              <Icon
                className={
                  tone === 'primary'
                    ? 'size-4 text-[var(--artist-primary)]'
                    : 'size-4 text-[var(--artist-muted)]'
                }
                aria-hidden="true"
              />
            </span>
            <p
              className={
                tone === 'primary'
                  ? 'mt-4 font-numeric text-2xl font-bold text-[var(--artist-primary)]'
                  : tone === 'muted'
                    ? 'mt-4 font-numeric text-2xl font-bold text-[var(--artist-muted)]'
                    : 'mt-4 font-numeric text-2xl font-bold text-[var(--artist-text)]'
              }
            >
              {value}
            </p>
            <p className="mt-1 text-[8px] font-black tracking-[0.2em] text-[var(--artist-muted)]">
              {label}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[28px] border border-white/8 bg-[var(--artist-surface)]/60 p-5 backdrop-blur-sm">
          <h2 className="text-[10px] font-black tracking-[0.25em] text-[var(--artist-muted)]">
            FATURAMENTO BRUTO (6 MESES)
          </h2>
          <div className="mt-4">
            <RevenueAreaChart data={grossSeries} currency />
          </div>
        </div>
        <div className="rounded-[28px] border border-white/8 bg-[var(--artist-surface)]/60 p-5 backdrop-blur-sm">
          <h2 className="text-[10px] font-black tracking-[0.25em] text-[var(--artist-muted)]">
            SEU LÍQUIDO (6 MESES)
          </h2>
          <div className="mt-4">
            <RevenueAreaChart data={netSeries} currency />
          </div>
        </div>
      </section>

      {/* Extrato de transações reais */}
      <section aria-labelledby="tx-heading">
        <h2
          id="tx-heading"
          className="text-[10px] font-black tracking-[0.25em] text-[var(--artist-muted)]"
        >
          EXTRATO DE TRANSAÇÕES
        </h2>
        <div className="mt-3 overflow-hidden rounded-[24px] border border-white/8 bg-[var(--artist-surface)]/60">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/8 text-[8px] font-black tracking-[0.2em] text-[var(--artist-muted)]">
                <th className="px-5 py-3">DATA</th>
                <th className="px-5 py-3 text-right">BRUTO</th>
                <th className="px-5 py-3 text-right">TAXA</th>
                <th className="px-5 py-3 text-right">LÍQUIDO</th>
              </tr>
            </thead>
            <tbody>
              {txs.slice(0, 12).map((t) => (
                <tr key={t.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3 font-numeric text-[11px] font-bold text-[var(--artist-text)]">
                    {new Date(t.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-5 py-3 text-right font-numeric text-[11px] font-bold text-[var(--artist-text)]">
                    {formatPrice(t.amount_cents)}
                  </td>
                  <td className="px-5 py-3 text-right font-numeric text-[11px] font-bold text-[var(--artist-muted)]">
                    −{formatPrice(t.platform_fee_cents)}
                  </td>
                  <td className="px-5 py-3 text-right font-numeric text-[11px] font-bold text-[var(--artist-primary)]">
                    {formatPrice(t.artist_net_cents)}
                  </td>
                </tr>
              ))}
              {txs.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-[10px] font-bold text-[var(--artist-muted)]"
                  >
                    Nenhuma transação registrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MRR por tier (real) */}
      {mrr > 0 && (
        <section aria-labelledby="mrr-heading">
          <h2
            id="mrr-heading"
            className="text-[10px] font-black tracking-[0.25em] text-[var(--artist-muted)]"
          >
            RECEITA RECORRENTE POR PLANO
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(['bronze', 'silver', 'gold', 'platinum'] as const).map((tier) => (
              <div
                key={tier}
                className="rounded-[20px] border border-white/8 bg-[var(--artist-surface)]/60 p-4"
              >
                <p className="text-[8px] font-black tracking-[0.2em] text-[var(--artist-muted)]">
                  {TIER_LABELS[tier].toUpperCase()}
                </p>
                <p className="mt-2 font-numeric text-lg font-bold text-[var(--artist-text)]">
                  {formatPrice(mrrByTier[tier] ?? 0)}
                </p>
                <p className="mt-0.5 text-[8px] font-bold text-[var(--artist-muted)]">/mês</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
