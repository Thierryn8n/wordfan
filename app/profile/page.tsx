import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { LayoutDashboard, ShieldCheck, Sparkles, ChevronRight, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/wordfan/bottom-nav'
import { SignOutButton } from './sign-out-button'
import { TIER_LABELS } from '@/lib/types'
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
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background pb-32">
      <main className="px-6 pt-8">
        <p className="text-[10px] font-black tracking-[0.3em] text-primary">SUA CONTA</p>
        <h1 className="mt-1 font-serif text-3xl font-black tracking-tight">PERFIL</h1>

        {/* Card do usuário */}
        <div className="mt-6 overflow-hidden rounded-[32px] border border-white/8 bg-card">
          <div className="gradient-brand h-20" />
          <div className="-mt-9 px-6 pb-6">
            <span className="flex size-18 items-center justify-center rounded-3xl border-4 border-card bg-background font-serif text-xl font-black">
              {initials}
            </span>
            <p className="mt-3 truncate font-serif text-xl font-extrabold">{displayName}</p>
            <p className="truncate text-xs font-medium text-muted-foreground">{user.email}</p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1.5 font-numeric text-[10px] font-bold text-gold">
              <Zap className="size-3" aria-hidden="true" />
              {(profile?.xp ?? 0).toLocaleString('pt-BR')} XP
            </p>
          </div>
        </div>

        {(profile?.role === 'artist' || profile?.role === 'admin') && (
          <div className="mt-4 flex flex-col gap-2.5">
            <Link
              href="/dashboard"
              className="flex items-center gap-4 rounded-3xl border border-white/8 bg-card p-5 transition-colors hover:bg-secondary"
            >
              <LayoutDashboard className="size-5 text-primary" aria-hidden="true" />
              <span className="flex-1 text-xs font-extrabold tracking-[0.05em]">DASHBOARD DO ARTISTA</span>
              <ChevronRight className="size-4 text-zinc-600" aria-hidden="true" />
            </Link>
            {profile.role === 'admin' && (
              <Link
                href="/admin"
                className="flex items-center gap-4 rounded-3xl border border-white/8 bg-card p-5 transition-colors hover:bg-secondary"
              >
                <ShieldCheck className="size-5 text-gold" aria-hidden="true" />
                <span className="flex-1 text-xs font-extrabold tracking-[0.05em]">PAINEL ADMINISTRATIVO</span>
                <ChevronRight className="size-4 text-zinc-600" aria-hidden="true" />
              </Link>
            )}
          </div>
        )}

        {/* Assinaturas */}
        <section aria-labelledby="subs-heading" className="mt-8">
          <h2 id="subs-heading" className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
            MINHAS ASSINATURAS
          </h2>
          {subscriptions.length === 0 ? (
            <div className="mt-3 flex flex-col items-center gap-4 rounded-[32px] border border-white/8 bg-card p-8 text-center">
              <Sparkles className="size-6 text-muted-foreground" aria-hidden="true" />
              <p className="text-xs font-bold text-muted-foreground text-pretty">
                Você ainda não assina nenhum fan club.
              </p>
              <Link
                href="/home"
                className="gradient-brand rounded-full px-6 py-3 text-[10px] font-black tracking-[0.2em] text-white"
              >
                DESCOBRIR ARTISTAS
              </Link>
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {subscriptions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/artist/${s.artist.slug}/club`}
                    className="flex items-center gap-4 rounded-3xl border border-white/8 bg-card p-4 transition-colors hover:bg-secondary"
                  >
                    <Image
                      src={s.artist.avatar_url || '/placeholder.svg?height=48&width=48'}
                      alt=""
                      width={48}
                      height={48}
                      className="size-12 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-extrabold">{s.artist.name}</p>
                      <p className="mt-0.5 font-numeric text-[9px] font-bold tracking-[0.1em] text-zinc-500">
                        DESDE {new Date(s.started_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-club/10 px-3 py-1.5 text-[8px] font-black tracking-[0.15em] text-club">
                      {TIER_LABELS[s.plan.tier].toUpperCase()}
                    </span>
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
