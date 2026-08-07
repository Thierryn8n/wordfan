import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { ArrowLeft, Users, Mic2, CreditCard, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { TierBadge } from '@/components/wordfan/tier-badge'
import { formatPrice, type Artist, type Plan, type Subscription } from '@/lib/types'

export const metadata = { title: 'Painel administrativo — WordFan' }

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
    { label: 'Usuários', value: (profilesCount ?? 0).toLocaleString('pt-BR'), icon: Users },
    { label: 'Artistas', value: artists.length.toLocaleString('pt-BR'), icon: Mic2 },
    { label: 'Receita mensal', value: formatPrice(totalMrr), icon: CreditCard },
    { label: 'Publicações', value: (postsCount ?? 0).toLocaleString('pt-BR'), icon: FileText },
  ]

  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-5 pb-16 pt-6 md:px-8">
      <header className="flex items-center gap-4">
        <Link
          href="/profile"
          aria-label="Voltar para o perfil"
          className="glass flex size-10 items-center justify-center rounded-full"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground">WordFan</p>
          <h1 className="font-serif text-xl font-bold">Painel administrativo</h1>
        </div>
      </header>

      <section aria-label="Métricas da plataforma" className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <Icon className="size-5 text-accent" aria-hidden="true" />
            <p className="mt-3 font-serif text-2xl font-bold">{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="artists-heading" className="mt-8">
        <h2 id="artists-heading" className="font-serif text-lg font-semibold">
          Artistas na plataforma
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {artists.map((a) => {
            const info = subsByArtist[a.id] ?? { count: 0, revenue: 0 }
            return (
              <div key={a.id} className="glass flex flex-wrap items-center gap-4 rounded-2xl p-4">
                <Image
                  src={a.avatar_url || '/placeholder.svg?height=44&width=44'}
                  alt=""
                  width={44}
                  height={44}
                  className="size-11 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    {a.name}
                    {a.is_featured && (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                        DESTAQUE
                      </span>
                    )}
                    {a.is_live && (
                      <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                        AO VIVO
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.genre} · {a.city}/{a.state} · {a.followers_count.toLocaleString('pt-BR')} seguidores
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatPrice(info.revenue)}/mês</p>
                  <p className="text-xs text-muted-foreground">{info.count} assinantes</p>
                </div>
                <Link
                  href={`/artist/${a.slug}`}
                  className="glass rounded-full px-4 py-1.5 text-xs font-medium transition-colors hover:bg-secondary"
                >
                  Ver perfil
                </Link>
              </div>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="recent-subs-heading" className="mt-8">
        <h2 id="recent-subs-heading" className="font-serif text-lg font-semibold">
          Assinaturas recentes
        </h2>
        {subs.length === 0 ? (
          <p className="glass mt-3 rounded-2xl p-6 text-center text-sm text-muted-foreground">
            Nenhuma assinatura ativa ainda.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {subs
              .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
              .slice(0, 10)
              .map((s) => {
                const artist = artists.find((a) => a.id === s.artist_id)
                return (
                  <li key={s.id} className="glass flex items-center gap-4 rounded-2xl p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        Fan club: {artist?.name ?? 'Artista'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.started_at).toLocaleDateString('pt-BR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{formatPrice(s.plan?.price_cents ?? 0)}</p>
                    {s.plan && <TierBadge tier={s.plan.tier} />}
                  </li>
                )
              })}
          </ul>
        )}
      </section>
    </div>
  )
}
