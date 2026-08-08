import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { LayoutDashboard, ShieldCheck, Sparkles, ChevronRight, Zap, Briefcase, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/wordfan/bottom-nav'
import { HoloCrown } from '@/components/wordfan/holo-crown'
import { HolographicCrown3D } from '@/components/wordfan/holo-crown-3d'
import { SignOutButton } from './sign-out-button'
import { ProfileEditor } from './profile-editor'
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
      <main className="px-6 pt-10">
        <div className="glass-panel sheen relative flex items-center justify-between rounded-[26px] px-5 py-5">
          <div>
            <p className="text-[10px] font-black tracking-[0.3em] text-primary">SUA CONTA</p>
            <h1 className="mt-1 font-serif text-3xl font-black tracking-tight">PERFIL</h1>
          </div>
          <ProfileEditor initialName={displayName} initialAvatar={profile?.avatar_url ?? null} />
        </div>

        {/* Card do usuário */}
        <div className="skeu-raised sheen relative mt-6 overflow-hidden rounded-[32px]">
          <div className="gradient-brand h-20" />
          <div className="-mt-9 px-6 pb-6">
            <div className="relative w-fit">
              <span className="skeu-raised flex size-18 items-center justify-center overflow-hidden rounded-3xl border-4 border-card font-serif text-xl font-black">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url || '/placeholder.svg'}
                    alt=""
                    width={72}
                    height={72}
                    className="size-full object-cover"
                  />
                ) : (
                  initials
                )}
              </span>
              {isEnterprise && (
                <HolographicCrown3D
                  size={72}
                  className="pointer-events-none absolute -right-8 -top-12"
                />
              )}
            </div>
            <p className="mt-3 flex items-center gap-2 truncate font-serif text-xl font-extrabold">
              {displayName}
              {isEnterprise && (
                <span className="holo-text text-[9px] font-black tracking-[0.2em]">ENTERPRISE</span>
              )}
            </p>
            <p className="truncate text-xs font-medium text-muted-foreground">{user.email}</p>
            <p className="skeu-inset mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-numeric text-[10px] font-bold text-gold">
              <Zap className="size-3" aria-hidden="true" />
              {(profile?.xp ?? 0).toLocaleString('pt-BR')} XP
            </p>
          </div>
        </div>

        {(profile?.role === 'artist' || profile?.role === 'admin') && (
          <div className="mt-4 flex flex-col gap-2.5">
            <Link
              href="/dashboard"
              className="skeu flex items-center gap-4 rounded-3xl p-5 transition-colors hover:brightness-125"
            >
              <LayoutDashboard className="size-5 text-primary" aria-hidden="true" />
              <span className="flex-1 text-xs font-extrabold tracking-[0.05em]">DASHBOARD DO ARTISTA</span>
              <ChevronRight className="size-4 text-zinc-600" aria-hidden="true" />
            </Link>
            {profile.role === 'admin' && (
              <Link
                href="/admin"
                className="skeu flex items-center gap-4 rounded-3xl p-5 transition-colors hover:brightness-125"
              >
                <ShieldCheck className="size-5 text-gold" aria-hidden="true" />
                <span className="flex-1 text-xs font-extrabold tracking-[0.05em]">PAINEL ADMINISTRATIVO</span>
                <ChevronRight className="size-4 text-zinc-600" aria-hidden="true" />
              </Link>
            )}
          </div>
        )}

        {profile?.role === 'empresario' && (
          <div className="mt-4">
            <Link
              href="/manager"
              className="skeu flex items-center gap-4 rounded-3xl p-5 transition-colors hover:brightness-125"
            >
              <Briefcase className="size-5 text-primary" aria-hidden="true" />
              <span className="flex-1 text-xs font-extrabold tracking-[0.05em]">PAINEL DO EMPRESÁRIO</span>
              <ChevronRight className="size-4 text-zinc-600" aria-hidden="true" />
            </Link>
          </div>
        )}

        {hasAnyLead && (
          <div className="mt-4">
            <Link
              href="/enterprise/status"
              className="skeu flex items-center gap-4 rounded-3xl p-5 transition-colors hover:brightness-125"
            >
              <Building2 className="size-5 text-primary" aria-hidden="true" />
              <span className="flex-1 text-xs font-extrabold tracking-[0.05em]">MINHAS CONTRATAÇÕES</span>
              {isEnterprise && <HoloCrown size={20} />}
              <ChevronRight className="size-4 text-zinc-600" aria-hidden="true" />
            </Link>
          </div>
        )}

        {/* Assinaturas */}
        <section aria-labelledby="subs-heading" className="mt-8">
          <h2 id="subs-heading" className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
            MINHAS ASSINATURAS
          </h2>
          {subscriptions.length === 0 ? (
            <div className="glass-panel sheen relative mt-3 flex flex-col items-center gap-4 rounded-[32px] p-8 text-center">
              <span className="skeu-raised flex size-14 items-center justify-center rounded-2xl">
                <Sparkles className="size-6 text-muted-foreground" aria-hidden="true" />
              </span>
              <p className="text-xs font-bold text-muted-foreground text-pretty">
                Você ainda não assina nenhum fan club.
              </p>
              <Link
                href="/home"
                className="skeu-btn sheen relative rounded-full px-6 py-3 text-[10px] font-black tracking-[0.2em] text-white"
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
                    className="skeu flex items-center gap-4 rounded-3xl p-4 transition-colors hover:brightness-125"
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
