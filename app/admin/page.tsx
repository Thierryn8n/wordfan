import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowUpRight,
  BadgeCheck,
  CircleDollarSign,
  FileText,
  Mic2,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react'
import { AdminRevenueChart } from '@/components/wordfan/admin-charts'
import { requireAdmin } from '@/lib/admin-guard'
import { bucketByMonth } from '@/lib/dashboard'
import { formatPrice, type Artist, type Plan, type Subscription } from '@/lib/types'

export const metadata = { title: 'Painel administrativo — WordFan' }

type TransactionRow = {
  artist_id: string
  amount_cents: number
  platform_fee_cents: number
  artist_net_cents: number
  created_at: string
}

export default async function AdminPage() {
  const { supabase } = await requireAdmin('/admin')

  const [
    { data: artistsData },
    { data: subsData },
    { data: transactionsData },
    { count: postsCount },
    { count: profilesCount },
  ] = await Promise.all([
    supabase.from('artists').select('*').order('followers_count', { ascending: false }),
    supabase.from('subscriptions').select('*, plan:plans(*)').eq('status', 'active'),
    supabase
      .from('transactions')
      .select('artist_id, amount_cents, platform_fee_cents, artist_net_cents, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  const artists = (artistsData ?? []) as Artist[]
  const subscriptions = (subsData ?? []) as (Subscription & { plan: Plan | null })[]
  const transactions = (transactionsData ?? []) as TransactionRow[]
  const totalMrr = subscriptions.reduce((sum, subscription) => sum + (subscription.plan?.price_cents ?? 0), 0)
  const totalGross = transactions.reduce((sum, transaction) => sum + transaction.amount_cents, 0)
  const platformFees = transactions.reduce((sum, transaction) => sum + transaction.platform_fee_cents, 0)
  const artistPayout = transactions.reduce((sum, transaction) => sum + transaction.artist_net_cents, 0)
  const revenueSeries = bucketByMonth(transactions, 'created_at', (transaction) => transaction.amount_cents, 6)

  const artistPerformance = artists.map((artist) => {
    const artistSubscriptions = subscriptions.filter((subscription) => subscription.artist_id === artist.id)
    const artistTransactions = transactions.filter((transaction) => transaction.artist_id === artist.id)
    return {
      artist,
      subscribers: artistSubscriptions.length,
      revenue: artistTransactions.reduce((sum, transaction) => sum + transaction.amount_cents, 0),
    }
  })

  const stats = [
    {
      label: 'MRR TOTAL',
      value: formatPrice(totalMrr),
      detail: `${subscriptions.length.toLocaleString('pt-BR')} assinaturas ativas`,
      icon: CircleDollarSign,
      tone: 'text-emerald-400 bg-emerald-500/10',
    },
    {
      label: 'ARTISTAS ATIVOS',
      value: artists.length.toLocaleString('pt-BR'),
      detail: `${artists.filter((artist) => artist.is_featured).length} em destaque`,
      icon: Mic2,
      tone: 'text-primary bg-primary/10',
    },
    {
      label: 'USUÁRIOS TOTAIS',
      value: (profilesCount ?? 0).toLocaleString('pt-BR'),
      detail: 'Perfis cadastrados',
      icon: Users,
      tone: 'text-sky-400 bg-sky-500/10',
    },
    {
      label: 'PUBLICAÇÕES',
      value: (postsCount ?? 0).toLocaleString('pt-BR'),
      detail: 'Conteúdos na plataforma',
      icon: FileText,
      tone: 'text-violet-400 bg-violet-500/10',
    },
  ]

  return (
    <main className="px-6 pb-16 pt-8 xl:px-10">
      <header className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="flex items-center gap-2 text-[9px] font-black tracking-[0.24em] text-primary">
            <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,.65)]" aria-hidden="true" />
            SISTEMA ONLINE
          </p>
          <h1 className="mt-2 font-serif text-3xl font-black tracking-[-0.04em] text-white">
            Painel de Controle WordFan
          </h1>
          <p className="mt-2 text-xs font-medium text-zinc-500">
            Visão executiva da plataforma, artistas, audiência e receita.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/reports"
            className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 text-[9px] font-black tracking-[0.13em] text-zinc-300 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            RELATÓRIOS
            <ArrowUpRight className="size-3.5 text-primary" aria-hidden="true" />
          </Link>
          <Link
            href="/admin/artists"
            className="gradient-brand flex h-11 items-center gap-2 rounded-xl px-5 text-[9px] font-black tracking-[0.13em] text-white shadow-[0_12px_30px_-16px_rgba(255,106,0,.8)]"
          >
            <Mic2 className="size-3.5" aria-hidden="true" />
            GERENCIAR ARTISTAS
          </Link>
        </div>
      </header>

      <section aria-label="Indicadores da plataforma" className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, detail, icon: Icon, tone }) => (
          <article key={label} className="admin-panel p-5">
            <div className="flex items-start justify-between gap-4">
              <span className={`flex size-10 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <ShieldCheck className="size-3.5 text-zinc-700" aria-hidden="true" />
            </div>
            <p className="mt-5 text-[9px] font-black tracking-[0.16em] text-zinc-500">{label}</p>
            <p className="mt-1 font-numeric text-2xl font-bold tracking-tight text-white">{value}</p>
            <p className="mt-2 text-[9px] font-bold text-zinc-600">{detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.9fr)_minmax(300px,.8fr)]">
        <article className="admin-panel overflow-hidden p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="admin-eyebrow">CRESCIMENTO DA PLATAFORMA</p>
              <h2 className="mt-1.5 text-lg font-black text-white">Volume transacionado</h2>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/30 px-4 py-2 text-right">
              <p className="text-[8px] font-black tracking-[0.15em] text-zinc-600">ACUMULADO</p>
              <p className="mt-0.5 font-numeric text-sm font-bold text-primary">{formatPrice(totalGross)}</p>
            </div>
          </div>
          <div className="mt-5">
            <AdminRevenueChart data={revenueSeries} />
          </div>
        </article>

        <article className="admin-panel p-6">
          <p className="admin-eyebrow">SAÚDE FINANCEIRA</p>
          <h2 className="mt-1.5 text-lg font-black text-white">Distribuição da receita</h2>
          <div className="mt-6 flex flex-col gap-3">
            <div className="rounded-2xl border border-primary/15 bg-primary/[0.055] p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                  <TrendingUp className="size-4 text-primary" aria-hidden="true" />
                </span>
                <span className="text-[8px] font-black tracking-[0.14em] text-primary">PLATAFORMA</span>
              </div>
              <p className="mt-4 font-numeric text-2xl font-bold text-primary">{formatPrice(platformFees)}</p>
              <p className="mt-1 text-[9px] font-bold text-zinc-600">Comissões acumuladas</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white/5">
                  <WalletCards className="size-4 text-zinc-300" aria-hidden="true" />
                </span>
                <span className="text-[8px] font-black tracking-[0.14em] text-zinc-500">ARTISTAS</span>
              </div>
              <p className="mt-4 font-numeric text-2xl font-bold text-white">{formatPrice(artistPayout)}</p>
              <p className="mt-1 text-[9px] font-bold text-zinc-600">Repasse líquido acumulado</p>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.65fr)]">
        <article className="admin-panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="admin-eyebrow">ARTISTAS EM DESTAQUE</p>
              <h2 className="mt-1.5 text-lg font-black text-white">Desempenho da operação</h2>
            </div>
            <Link href="/admin/artists" className="text-[8px] font-black tracking-[0.15em] text-primary">
              VER TODOS
            </Link>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/8 text-[8px] font-black tracking-[0.15em] text-zinc-600">
                  <th className="pb-3">ARTISTA</th>
                  <th className="pb-3">SEGUIDORES</th>
                  <th className="pb-3">ASSINANTES</th>
                  <th className="pb-3 text-right">RECEITA</th>
                </tr>
              </thead>
              <tbody>
                {artistPerformance.slice(0, 5).map(({ artist, subscribers, revenue }) => (
                  <tr key={artist.id} className="border-b border-white/[0.055] last:border-0">
                    <td className="py-3.5">
                      <Link href={`/admin/studio?artist=${artist.slug}`} className="flex items-center gap-3">
                        <Image
                          src={artist.avatar_url || '/placeholder-user.jpg'}
                          alt=""
                          width={40}
                          height={40}
                          className="size-10 rounded-xl object-cover"
                        />
                        <span>
                          <span className="flex items-center gap-1.5 text-[11px] font-black text-white">
                            {artist.name}
                            {artist.is_featured && <BadgeCheck className="size-3.5 text-primary" aria-hidden="true" />}
                          </span>
                          <span className="mt-0.5 block text-[8px] font-bold text-zinc-600">@{artist.slug}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="py-3.5 font-numeric text-[10px] font-bold text-zinc-400">
                      {artist.followers_count.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 font-numeric text-[10px] font-bold text-zinc-400">{subscribers}</td>
                    <td className="py-3.5 text-right font-numeric text-[11px] font-bold text-white">
                      {formatPrice(revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-panel p-6">
          <p className="admin-eyebrow">ATALHOS OPERACIONAIS</p>
          <h2 className="mt-1.5 text-lg font-black text-white">Próximas ações</h2>
          <div className="mt-5 flex flex-col gap-2">
            {[
              { label: 'Cadastrar novo artista', href: '/admin/artists', icon: Mic2 },
              { label: 'Revisar assinaturas', href: '/admin/subscriptions', icon: WalletCards },
              { label: 'Gerenciar usuários', href: '/admin/users', icon: Users },
              { label: 'Abrir relatórios', href: '/admin/reports', icon: TrendingUp },
            ].map(({ label, href, icon: Icon }) => (
              <Link
                key={href + label}
                href={href}
                className="group flex items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.02] px-4 py-3.5 text-[10px] font-bold text-zinc-400 transition-colors hover:border-primary/20 hover:bg-primary/[0.045] hover:text-white"
              >
                <Icon className="size-4 text-zinc-600 transition-colors group-hover:text-primary" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                <ArrowUpRight className="size-3.5 text-zinc-700 transition-colors group-hover:text-primary" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </article>
      </section>
    </main>
  )
}
