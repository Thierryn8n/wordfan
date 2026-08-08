import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import {
  ArrowLeft,
  Users,
  Mic2,
  CreditCard,
  FileText,
  LayoutDashboard,
  Palette,
  BarChart3,
  Settings,
  ShieldCheck,
  Building2,
  Megaphone,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/wordfan/logo'
import { formatPrice, TIER_LABELS, type Artist, type Plan, type Subscription } from '@/lib/types'

export const metadata = { title: 'Painel administrativo — WordFan' }

const NAV_ITEMS = [
  { label: 'DASHBOARD', icon: LayoutDashboard, active: true, href: null as string | null },
  { label: 'ARTISTAS', icon: Mic2, active: false, href: '/admin/artists' },
  { label: 'ENTERPRISE', icon: Building2, active: false, href: '/admin/enterprise' },
  { label: 'ANÚNCIOS', icon: Megaphone, active: false, href: '/admin/ads' },
  { label: 'USUÁRIOS', icon: Users, active: false, href: null as string | null },
  { label: 'ASSINATURAS', icon: CreditCard, active: false, href: null as string | null },
  { label: 'STUDIO DO ARTISTA', icon: Palette, active: false, href: '/admin/artists' },
  { label: 'RELATÓRIOS', icon: BarChart3, active: false, href: null as string | null },
  { label: 'CONFIGURAÇÕES', icon: Settings, active: false, href: null as string | null },
]

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/home')

  const [{ data: artistsData }, { data: subsData }, { count: postsCount }, { count: profilesCount }] =
    await Promise.all([
      supabase.from('artists').select('*').order('followers_count', { ascending: false }),
      supabase.from('subscriptions').select('*, plan:plans(*)').eq('status', 'active'),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
    ])

  const artists = (artistsData ?? []) as Artist[]
  const subs = (subsData ?? []) as (Subscription & { plan: Plan })[]
  const totalMrr = subs.reduce((acc, s) => acc + (s.plan?.price_cents ?? 0), 0)

  const subsByArtist = subs.reduce<Record<string, { count: number; revenue: number }>>((acc, s) => {
    const cur = acc[s.artist_id] ?? { count: 0, revenue: 0 }
    acc[s.artist_id] = {
      count: cur.count + 1,
      revenue: cur.revenue + (s.plan?.price_cents ?? 0),
    }
    return acc
  }, {})

  const stats = [
    { label: 'USUÁRIOS', value: (profilesCount ?? 0).toLocaleString('pt-BR'), icon: Users },
    { label: 'ARTISTAS', value: artists.length.toLocaleString('pt-BR'), icon: Mic2 },
    { label: 'RECEITA MENSAL (MRR)', value: formatPrice(totalMrr), icon: CreditCard },
    { label: 'PUBLICAÇÕES', value: (postsCount ?? 0).toLocaleString('pt-BR'), icon: FileText },
  ]

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Sidebar admin (desktop) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-white/8 bg-card px-5 py-7 lg:flex">
        <Logo href="/home" className="px-2 text-xl" />
        <p className="mt-1 flex items-center gap-1.5 px-2 text-[8px] font-black tracking-[0.3em] text-gold">
          <ShieldCheck className="size-3" aria-hidden="true" />
          ADMIN SAAS
        </p>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Menu do admin">
          {NAV_ITEMS.map(({ label, icon: Icon, active, href }) => {
            const className = active
              ? 'flex items-center gap-3 rounded-2xl bg-gold/15 px-4 py-3 text-[10px] font-black tracking-[0.15em] text-gold'
              : 'flex items-center gap-3 rounded-2xl px-4 py-3 text-[10px] font-black tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground'
            return href ? (
              <Link key={label} href={href} className={className}>
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            ) : (
              <span key={label} className={className}>
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </span>
            )
          })}
        </nav>
      </aside>

      {/* Conteúdo */}
      <div className="min-w-0 flex-1 px-5 pb-16 pt-6 md:px-8">
        <header className="flex items-center gap-4">
          <Link
            href="/profile"
            aria-label="Voltar para o perfil"
            className="flex size-10 items-center justify-center rounded-full border border-white/8 bg-card lg:hidden"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <div>
            <p className="text-[9px] font-black tracking-[0.3em] text-gold">WORDFAN ADMIN</p>
            <h1 className="mt-0.5 font-serif text-2xl font-black tracking-tight">DASHBOARD GERAL</h1>
          </div>
        </header>

        <section aria-label="Métricas da plataforma" className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
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

        <section aria-labelledby="artists-heading" className="mt-8">
          <h2 id="artists-heading" className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
            ARTISTAS NA PLATAFORMA
          </h2>
          <div className="mt-3 flex flex-col gap-2.5">
            {artists.map((a) => {
              const info = subsByArtist[a.id] ?? { count: 0, revenue: 0 }
              return (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center gap-4 rounded-3xl border border-white/8 bg-card p-4"
                >
                  <Image
                    src={a.avatar_url || '/placeholder.svg?height=44&width=44'}
                    alt=""
                    width={44}
                    height={44}
                    className="size-11 rounded-2xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-xs font-extrabold">
                      {a.name}
                      {a.is_featured && (
                        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[8px] font-black tracking-[0.1em] text-gold">
                          DESTAQUE
                        </span>
                      )}
                      {a.is_live && (
                        <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[8px] font-black tracking-[0.1em] text-destructive">
                          AO VIVO
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-[9px] font-bold tracking-[0.05em] text-zinc-500">
                      {a.genre?.toUpperCase()} · {a.city}/{a.state} ·{' '}
                      {a.followers_count.toLocaleString('pt-BR')} SEGUIDORES
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-numeric text-sm font-bold">{formatPrice(info.revenue)}/mês</p>
                    <p className="text-[9px] font-bold text-zinc-500">{info.count} ASSINANTES</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={`/admin/studio?artist=${a.slug}`}
                      className="rounded-full bg-gold/15 px-4 py-2 text-[9px] font-black tracking-[0.15em] text-gold transition-colors hover:bg-gold/25"
                    >
                      STUDIO
                    </Link>
                    <Link
                      href={`/artist/${a.slug}`}
                      className="rounded-full border border-white/8 bg-white/5 px-4 py-2 text-[9px] font-black tracking-[0.15em] transition-colors hover:bg-secondary"
                    >
                      VER PERFIL
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section aria-labelledby="recent-subs-heading" className="mt-8">
          <h2
            id="recent-subs-heading"
            className="text-[10px] font-black tracking-[0.25em] text-muted-foreground"
          >
            ASSINATURAS RECENTES
          </h2>
          {subs.length === 0 ? (
            <p className="mt-3 rounded-3xl border border-white/8 bg-card p-6 text-center text-xs font-bold text-muted-foreground">
              Nenhuma assinatura ativa ainda.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {subs
                .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
                .slice(0, 10)
                .map((s) => {
                  const artist = artists.find((a) => a.id === s.artist_id)
                  return (
                    <li
                      key={s.id}
                      className="flex items-center gap-4 rounded-3xl border border-white/8 bg-card p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-extrabold">
                          FAN CLUB: {(artist?.name ?? 'Artista').toUpperCase()}
                        </p>
                        <p className="mt-1 font-numeric text-[9px] font-bold text-zinc-500">
                          {new Date(s.started_at)
                            .toLocaleDateString('pt-BR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                            .toUpperCase()}
                        </p>
                      </div>
                      <p className="font-numeric text-sm font-bold">
                        {formatPrice(s.plan?.price_cents ?? 0)}
                      </p>
                      {s.plan && (
                        <span className="shrink-0 rounded-full bg-club/10 px-3 py-1.5 text-[8px] font-black tracking-[0.15em] text-club">
                          {TIER_LABELS[s.plan.tier].toUpperCase()}
                        </span>
                      )}
                    </li>
                  )
                })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
