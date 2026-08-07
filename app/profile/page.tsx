import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { LayoutDashboard, ShieldCheck, Sparkles, ChevronRight, Zap, Briefcase, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/wordfan/bottom-nav'
import { HoloCrown } from '@/components/wordfan/holo-crown'
import { HolographicCrown3D } from '@/components/wordfan/holo-crown-3d'
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

  const [{ data: profileData }, { data: subsData }, { data: leadsData }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('subscriptions')
      .select('*, plan:plans(*), artist:artists(*)')
      .eq('user_id', user.id)
      .eq('status', 'active'),
    supabase.from('enterprise_leads').select('status').eq('user_id', user.id),
  ])

  const profile = profileData as Profile | null
  const subscriptions = (subsData ?? []) as (Subscription & { plan: Plan; artist: Artist })[]
  const leadStatuses = (leadsData ?? []) as { status: string }[]
  const isEnterprise = leadStatuses.some((l) => l.status === 'approved')
  const hasAnyLead = leadStatuses.length > 0
  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'Fã'
  const initials = displayName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background pb-32">
      <main className="px-4 pt-16">
        <h1 className="ios-large-title">Perfil</h1>

        {/* Card do usuário */}
        <div className="ios-card mt-4 flex items-center gap-4 p-4">
          <div className="relative shrink-0">
            <span className="flex size-16 items-center justify-center rounded-full bg-[color:var(--ios-fill)] text-[22px] font-semibold">
              {initials}
            </span>
            {isEnterprise && (
              <HolographicCrown3D
                size={60}
                className="pointer-events-none absolute -right-6 -top-9"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 truncate text-[20px] font-semibold">
              {displayName}
              {isEnterprise && (
                <span className="holo-text text-[11px] font-bold">Enterprise</span>
              )}
            </p>
            <p className="truncate text-[15px] text-[color:var(--label-secondary)]">{user.email}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-2.5 py-1 text-[13px] font-medium text-gold">
              <Zap className="size-3.5" aria-hidden="true" />
              {(profile?.xp ?? 0).toLocaleString('pt-BR')} XP
            </p>
          </div>
        </div>

        {/* Atalhos por papel (lista agrupada iOS) */}
        {(profile?.role === 'artist' ||
          profile?.role === 'admin' ||
          profile?.role === 'empresario' ||
          hasAnyLead) && (
          <div className="ios-list mt-6">
            {(profile?.role === 'artist' || profile?.role === 'admin') && (
              <Link href="/dashboard" className="ios-row ios-row-inset active:bg-[color:var(--ios-fill-2)]">
                <LayoutDashboard className="size-[22px] text-primary" aria-hidden="true" />
                <span className="flex-1 text-[17px]">Dashboard do artista</span>
                <ChevronRight className="size-4 text-[color:var(--label-tertiary)]" aria-hidden="true" />
              </Link>
            )}
            {profile?.role === 'admin' && (
              <Link href="/admin" className="ios-row ios-row-inset active:bg-[color:var(--ios-fill-2)]">
                <ShieldCheck className="size-[22px] text-gold" aria-hidden="true" />
                <span className="flex-1 text-[17px]">Painel administrativo</span>
                <ChevronRight className="size-4 text-[color:var(--label-tertiary)]" aria-hidden="true" />
              </Link>
            )}
            {profile?.role === 'empresario' && (
              <Link href="/manager" className="ios-row ios-row-inset active:bg-[color:var(--ios-fill-2)]">
                <Briefcase className="size-[22px] text-primary" aria-hidden="true" />
                <span className="flex-1 text-[17px]">Painel do empresário</span>
                <ChevronRight className="size-4 text-[color:var(--label-tertiary)]" aria-hidden="true" />
              </Link>
            )}
            {hasAnyLead && (
              <Link href="/enterprise/status" className="ios-row ios-row-inset active:bg-[color:var(--ios-fill-2)]">
                <Building2 className="size-[22px] text-primary" aria-hidden="true" />
                <span className="flex-1 text-[17px]">Minhas contratações</span>
                {isEnterprise && <HoloCrown size={20} />}
                <ChevronRight className="size-4 text-[color:var(--label-tertiary)]" aria-hidden="true" />
              </Link>
            )}
          </div>
        )}

        {/* Assinaturas */}
        <section aria-labelledby="subs-heading" className="mt-7">
          <h2 id="subs-heading" className="px-1 text-[13px] font-normal uppercase text-[color:var(--label-secondary)]">
            Minhas assinaturas
          </h2>
          {subscriptions.length === 0 ? (
            <div className="ios-card mt-2 flex flex-col items-center gap-3 p-8 text-center">
              <Sparkles className="size-7 text-[color:var(--label-secondary)]" aria-hidden="true" />
              <p className="text-[15px] text-[color:var(--label-secondary)] text-pretty">
                Você ainda não assina nenhum fan club.
              </p>
              <Link
                href="/home"
                className="rounded-full bg-primary px-6 py-2.5 text-[15px] font-semibold text-primary-foreground active:opacity-70"
              >
                Descobrir artistas
              </Link>
            </div>
          ) : (
            <ul className="ios-list mt-2">
              {subscriptions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/artist/${s.artist.slug}/club`}
                    className="ios-row ios-row-inset active:bg-[color:var(--ios-fill-2)]"
                  >
                    <Image
                      src={s.artist.avatar_url || '/placeholder.svg?height=44&width=44'}
                      alt=""
                      width={44}
                      height={44}
                      className="size-11 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[17px] font-semibold">{s.artist.name}</p>
                      <p className="mt-0.5 text-[13px] text-[color:var(--label-secondary)]">
                        Desde {new Date(s.started_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-club/12 px-2.5 py-1 text-[12px] font-medium text-club">
                      {TIER_LABELS[s.plan.tier]}
                    </span>
                    <ChevronRight className="size-4 text-[color:var(--label-tertiary)]" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-7">
          <SignOutButton />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
