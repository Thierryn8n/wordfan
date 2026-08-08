import Link from 'next/link'
import { ArrowLeft, TrendingUp, Wallet, Users, Percent } from 'lucide-react'
import { requireAdmin } from '@/lib/admin-guard'
import { formatPrice, type Artist } from '@/lib/types'

export const metadata = { title: 'Relatórios — WordFan Admin' }

type Tx = {
  artist_id: string
  amount_cents: number
  platform_fee_cents: number
  artist_net_cents: number
  created_at: string
}

export default async function AdminReportsPage() {
  const { supabase } = await requireAdmin('/admin/reports')

  const [{ data: txData }, { data: artistsData }, { count: subsCount }] = await Promise.all([
    supabase
      .from('transactions')
      .select('artist_id, amount_cents, platform_fee_cents, artist_net_cents, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('artists').select('*'),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ])

  const txs = (txData ?? []) as Tx[]
  const artists = (artistsData ?? []) as Artist[]
  const artistName = Object.fromEntries(artists.map((a) => [a.id, a.name]))

  const gross = txs.reduce((s, t) => s + t.amount_cents, 0)
  const fees = txs.reduce((s, t) => s + t.platform_fee_cents, 0)
  const net = txs.reduce((s, t) => s + t.artist_net_cents, 0)

  // Agrupa por artista para o ranking de receita.
  const byArtist = Object.entries(
    txs.reduce<Record<string, { gross: number; fee: number; net: number; count: number }>>((acc, t) => {
      const cur = acc[t.artist_id] ?? { gross: 0, fee: 0, net: 0, count: 0 }
      acc[t.artist_id] = {
        gross: cur.gross + t.amount_cents,
        fee: cur.fee + t.platform_fee_cents,
        net: cur.net + t.artist_net_cents,
        count: cur.count + 1,
      }
      return acc
    }, {}),
  ).sort((a, b) => b[1].gross - a[1].gross)

  // Últimos 6 meses de faturamento bruto.
  const byMonth = txs.reduce<Record<string, number>>((acc, t) => {
    const key = new Date(t.created_at).toISOString().slice(0, 7)
    acc[key] = (acc[key] ?? 0) + t.amount_cents
    return acc
  }, {})
  const months = Object.entries(byMonth).sort().slice(-6)
  const maxMonth = Math.max(...months.map(([, v]) => v), 1)

  const stats = [
    { label: 'FATURAMENTO BRUTO', value: formatPrice(gross), icon: TrendingUp },
    { label: 'TAXA DA PLATAFORMA', value: formatPrice(fees), icon: Percent },
    { label: 'REPASSE AOS ARTISTAS', value: formatPrice(net), icon: Wallet },
    { label: 'ASSINATURAS ATIVAS', value: (subsCount ?? 0).toLocaleString('pt-BR'), icon: Users },
  ]

  return (
    <div className="min-w-0 flex-1">
      <div className="px-5 pb-16 pt-6 md:px-8">
        <header className="flex items-center gap-4">
          <Link
            href="/admin"
            aria-label="Voltar para o painel"
            className="flex size-10 items-center justify-center rounded-full border border-white/8 bg-card lg:hidden"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <div>
            <p className="text-[9px] font-black tracking-[0.3em] text-gold">WORDFAN ADMIN</p>
            <h1 className="mt-0.5 font-serif text-2xl font-black tracking-tight">RELATÓRIOS</h1>
          </div>
        </header>

        <section aria-label="Indicadores financeiros" className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-3xl border border-white/8 bg-card p-5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-gold/10">
                <Icon className="size-4 text-gold" aria-hidden="true" />
              </span>
              <p className="mt-4 font-numeric text-2xl font-bold">{value}</p>
              <p className="mt-1 text-[8px] font-black tracking-[0.2em] text-muted-foreground">{label}</p>
            </div>
          ))}
        </section>

        <section aria-labelledby="months-heading" className="mt-8">
          <h2 id="months-heading" className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
            FATURAMENTO POR MÊS
          </h2>
          {months.length === 0 ? (
            <p className="mt-3 rounded-3xl border border-white/8 bg-card p-6 text-center text-xs font-bold text-muted-foreground">
              Ainda não há transações registradas.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3 rounded-3xl border border-white/8 bg-card p-6">
              {months.map(([month, value]) => (
                <li key={month} className="flex items-center gap-4">
                  <span className="w-20 shrink-0 font-numeric text-[10px] font-black tracking-[0.1em] text-muted-foreground">
                    {new Date(`${month}-02`)
                      .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
                      .toUpperCase()}
                  </span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/6">
                    <span
                      className="block h-full rounded-full bg-gold"
                      style={{ width: `${Math.max((value / maxMonth) * 100, 2)}%` }}
                    />
                  </span>
                  <span className="w-24 shrink-0 text-right font-numeric text-xs font-bold">
                    {formatPrice(value)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="ranking-heading" className="mt-8">
          <h2 id="ranking-heading" className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
            RECEITA POR ARTISTA
          </h2>
          {byArtist.length === 0 ? (
            <p className="mt-3 rounded-3xl border border-white/8 bg-card p-6 text-center text-xs font-bold text-muted-foreground">
              Nenhuma receita registrada.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {byArtist.map(([id, v], i) => (
                <li key={id} className="flex flex-wrap items-center gap-4 rounded-3xl border border-white/8 bg-card p-4">
                  <span className="w-6 shrink-0 font-numeric text-sm font-bold text-zinc-600">{i + 1}</span>
                  <p className="min-w-0 flex-1 truncate text-xs font-extrabold">
                    {artistName[id] ?? 'Artista removido'}
                  </p>
                  <p className="font-numeric text-[9px] font-bold text-zinc-500">{v.count} TRANSAÇÕES</p>
                  <div className="text-right">
                    <p className="font-numeric text-sm font-bold">{formatPrice(v.gross)}</p>
                    <p className="font-numeric text-[9px] font-bold text-zinc-500">
                      REPASSE {formatPrice(v.net)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
