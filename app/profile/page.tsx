import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { LayoutDashboard, ShieldCheck, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/wordfan/bottom-nav'
import { TierBadge } from '@/components/wordfan/tier-badge'
import { SignOutButton } from './sign-out-button'
import type { Profile, Subscription, Plan, Artist } from '@/lib/types'

export const metadata = { title: 'Perfil — WordFan' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/profile')

  const [{ data: profileData }, { data: subsData }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('subscriptions')
      .select('*, plan:plans(*), artist:artists(*)')
      .eq('user_id', user.id)
      .eq('status', 'active'),
  ])

  const profile = profileData as Profile | null
  const subscriptions = (subsData ?? []) as (Subscription & { plan: Plan; artist: Artist })[]
  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'Fã'
  const initials = displayName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-28 md:max-w-lg">
      <main className="px-5 pt-6">
        <h1 className="font-serif text-2xl font-bold">Perfil</h1>

        <div className="glass mt-5 flex items-center gap-4 rounded-2xl p-5">
          <span className="gradient-brand flex size-16 shrink-0 items-center justify-center rounded-full font-serif text-xl font-bold text-black">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate font-serif text-lg font-semibold">{displayName}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <p className="mt-1 text-xs text-accent">{profile?.xp ?? 0} XP acumulados</p>
          </div>
        </div>

        {(profile?.role === 'artist' || profile?.role === 'admin') && (
          <div className="mt-4 flex flex-col gap-2">
            {profile.role !== 'admin' ? (
              <Link
                href="/dashboard"
                className="glass flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-secondary"
              >
                <LayoutDashboard className="size-5 text-primary" aria-hidden="true" />
                <span className="font-medium">Dashboard do artista</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className="glass flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-secondary"
                >
                  <LayoutDashboard className="size-5 text-primary" aria-hidden="true" />
                  <span className="font-medium">Dashboard do artista</span>
                </Link>
                <Link
                  href="/admin"
                  className="glass flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-secondary"
                >
                  <ShieldCheck className="size-5 text-accent" aria-hidden="true" />
                  <span className="font-medium">Painel administrativo</span>
                </Link>
              </>
            )}
          </div>
        )}

        <section aria-labelledby="subs-heading" className="mt-8">
          <h2 id="subs-heading" className="font-serif text-lg font-semibold">
            Minhas assinaturas
          </h2>
          {subscriptions.length === 0 ? (
            <div className="glass mt-3 flex flex-col items-center gap-3 rounded-2xl p-8 text-center">
              <Sparkles className="size-6 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground text-pretty">
                Você ainda não assina nenhum fan club.
              </p>
              <Link
                href="/home"
                className="gradient-brand rounded-full px-5 py-2 text-sm font-semibold text-black"
              >
                Descobrir artistas
              </Link>
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {subscriptions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/artist/${s.artist.slug}/club`}
                    className="glass flex items-center gap-4 rounded-2xl p-4 transition-colors hover:bg-secondary"
                  >
                    <Image
                      src={s.artist.avatar_url || '/placeholder.svg?height=48&width=48'}
                      alt=""
                      width={48}
                      height={48}
                      className="size-12 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{s.artist.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Desde {new Date(s.started_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <TierBadge tier={s.plan.tier} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-8">
          <SignOutButton />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
