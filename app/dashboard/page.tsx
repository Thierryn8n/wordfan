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
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/wordfan/logo'
import {
  formatPrice,
  TIER_LABELS,
  type Artist,
  type Plan,
  type Post,
  type Subscription,
  type Tier,
} from '@/lib/types'
import { PublishPostForm } from './publish-post-form'

export const metadata = { title: 'Dashboard do artista — WordFan' }

const NAV_ITEMS = [
  { label: 'DASHBOARD', icon: LayoutDashboard, active: true },
  { label: 'CONTEÚDO', icon: FileText, active: false },
  { label: 'GALERIA', icon: ImageIcon, active: false },
  { label: 'LIVES', icon: Radio, active: false },
  { label: 'AGENDA', icon: CalendarDays, active: false },
  { label: 'FAN CLUB', icon: Star, active: false },
]

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

  const [{ data: subsData }, { data: postsData }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('*, plan:plans(*)')
      .eq('artist_id', artist.id)
      .eq('status', 'active'),
    supabase.from('posts').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
  ])

  const subs = (subsData ?? []) as (Subscription & { plan: Plan })[]
  const posts = (postsData ?? []) as Post[]

  const mrr = subs.reduce((acc, s) => acc + (s.plan?.price_cents ?? 0), 0)
  const tierCounts = subs.reduce<Record<string, number>>((acc, s) => {
    const t = s.plan?.tier
    if (t) acc[t] = (acc[t] ?? 0) + 1
    return acc
  }, {})

  const stats = [
    { label: 'ASSINANTES ATIVOS', value: subs.length.toLocaleString('pt-BR'), icon: Users },
    { label: 'RECEITA MENSAL', value: formatPrice(mrr), icon: TrendingUp },
    { label: 'PUBLICAÇÕES', value: posts.length.toLocaleString('pt-BR'), icon: FileText },
    { label: 'SEGUIDORES', value: artist.followers_count.toLocaleString('pt-BR'), icon: Radio },
  ]

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-white/8 bg-card px-5 py-7 lg:flex">
        <Logo href="/home" className="px-2 text-xl" />
        <p className="mt-1 px-2 text-[8px] font-black tracking-[0.3em] text-muted-foreground">
          PAINEL DO ARTISTA
        </p>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Menu do painel">
          {NAV_ITEMS.map(({ label, icon: Icon, active }) => (
            <span
              key={label}
              className={
                active
                  ? 'gradient-brand flex items-center gap-3 rounded-2xl px-4 py-3 text-[10px] font-black tracking-[0.15em] text-white'
                  : 'flex items-center gap-3 rounded-2xl px-4 py-3 text-[10px] font-black tracking-[0.15em] text-muted-foreground'
              }
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
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
              DASHBOARD
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

        <section aria-label="Métricas" className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
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

        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          <section aria-labelledby="publish-heading" className="lg:col-span-2">
            <h2 id="publish-heading" className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
              NOVA PUBLICAÇÃO
            </h2>
            <PublishPostForm artistId={artist.id} slug={artist.slug} />

            <h2 className="mt-8 text-[10px] font-black tracking-[0.25em] text-muted-foreground">
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
          </section>

          <section aria-labelledby="posts-list-heading" className="lg:col-span-3">
            <h2
              id="posts-list-heading"
              className="text-[10px] font-black tracking-[0.25em] text-muted-foreground"
            >
              PUBLICAÇÕES RECENTES
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {posts.map((p) => (
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
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
