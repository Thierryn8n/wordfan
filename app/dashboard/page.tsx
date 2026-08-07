import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { ArrowLeft, Users, TrendingUp, FileText, Radio } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { TierBadge } from '@/components/wordfan/tier-badge'
import { formatPrice, TIER_LABELS, type Artist, type Plan, type Post, type Subscription, type Tier } from '@/lib/types'
import { PublishPostForm } from './publish-post-form'

export const metadata = { title: 'Dashboard do artista — WordFan' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/dashboard')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  // Find artist owned by this user (admin can view the first artist as demo)
  let artistQuery = supabase.from('artists').select('*')
  if (profile?.role !== 'admin') {
    artistQuery = artistQuery.eq('owner_id', user.id)
  }
  const { data: artistData } = await artistQuery.limit(1).maybeSingle()
  const artist = artistData as Artist | null

  if (!artist) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <div className="glass max-w-sm rounded-2xl p-8 text-center">
          <h1 className="font-serif text-xl font-bold">Área do artista</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
            Sua conta ainda não está vinculada a um perfil de artista. Fale com a equipe WordFan
            para ativar seu dashboard.
          </p>
          <Link
            href="/home"
            className="gradient-brand mt-5 inline-block rounded-full px-6 py-2.5 text-sm font-semibold text-black"
          >
            Voltar para a home
          </Link>
        </div>
      </main>
    )
  }

  const [{ data: subsData }, { data: postsData }] = await Promise.all([
    supabase.from('subscriptions').select('*, plan:plans(*)').eq('artist_id', artist.id).eq('status', 'active'),
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
    { label: 'Assinantes ativos', value: subs.length.toLocaleString('pt-BR'), icon: Users },
    { label: 'Receita mensal', value: formatPrice(mrr), icon: TrendingUp },
    { label: 'Publicações', value: posts.length.toLocaleString('pt-BR'), icon: FileText },
    { label: 'Seguidores', value: artist.followers_count.toLocaleString('pt-BR'), icon: Radio },
  ]

  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-5 pb-16 pt-6 md:px-8">
      <header className="flex flex-wrap items-center gap-4">
        <Link
          href="/profile"
          aria-label="Voltar para o perfil"
          className="glass flex size-10 items-center justify-center rounded-full"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <Image
          src={artist.avatar_url || '/placeholder.svg?height=48&width=48'}
          alt=""
          width={48}
          height={48}
          className="size-12 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Dashboard do artista</p>
          <h1 className="truncate font-serif text-xl font-bold">{artist.name}</h1>
        </div>
        <Link
          href={`/artist/${artist.slug}`}
          className="glass rounded-full px-5 py-2 text-sm font-medium transition-colors hover:bg-secondary"
        >
          Ver perfil público
        </Link>
      </header>

      <section aria-label="Métricas" className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <Icon className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-3 font-serif text-2xl font-bold">{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <section aria-labelledby="publish-heading" className="lg:col-span-2">
          <h2 id="publish-heading" className="font-serif text-lg font-semibold">
            Nova publicação
          </h2>
          <PublishPostForm artistId={artist.id} slug={artist.slug} />

          <h2 className="mt-8 font-serif text-lg font-semibold">Assinantes por plano</h2>
          <div className="glass mt-3 flex flex-col gap-3 rounded-2xl p-5">
            {(['bronze', 'silver', 'gold', 'platinum'] as Tier[]).map((tier) => {
              const count = tierCounts[tier] ?? 0
              const pct = subs.length > 0 ? Math.round((count / subs.length) * 100) : 0
              return (
                <div key={tier}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <TierBadge tier={tier} />
                    </span>
                    <span className="text-muted-foreground">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="gradient-brand h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            <p className="sr-only">
              Distribuição de assinantes: {Object.entries(tierCounts)
                .map(([t, c]) => `${TIER_LABELS[t as Tier]}: ${c}`)
                .join(', ')}
            </p>
          </div>
        </section>

        <section aria-labelledby="posts-list-heading" className="lg:col-span-3">
          <h2 id="posts-list-heading" className="font-serif text-lg font-semibold">
            Publicações recentes
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {posts.map((p) => (
              <li key={p.id} className="glass flex items-center gap-4 rounded-2xl p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.title ?? 'Sem título'}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString('pt-BR')} ·{' '}
                    {p.likes_count.toLocaleString('pt-BR')} curtidas
                  </p>
                </div>
                {p.is_exclusive && p.min_tier ? (
                  <TierBadge tier={p.min_tier} />
                ) : (
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                    Público
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
