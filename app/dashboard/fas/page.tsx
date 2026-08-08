import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Users, Crown } from 'lucide-react'
import { getDashboardArtist } from '@/lib/dashboard'
import { DashboardHeader } from '@/components/wordfan/dashboard-header'
import { TierDonutChart } from '@/components/wordfan/dashboard-charts'
import { TIER_LABELS, type Plan, type Profile, type Subscription, type Tier } from '@/lib/types'

export const metadata = { title: 'Fãs — Painel do artista' }

const TIER_COLORS: Record<Tier, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c8',
  gold: '#ffd700',
  platinum: 'var(--artist-primary)',
}

export default async function FansPage() {
  const { artist, supabase } = await getDashboardArtist('/dashboard/fas')
  if (!artist) notFound()

  const { data: subsData } = await supabase
    .from('subscriptions')
    .select('*, plan:plans(*)')
    .eq('artist_id', artist.id)
    .eq('status', 'active')
    .order('started_at', { ascending: false })

  const subs = (subsData ?? []) as (Subscription & { plan: Plan })[]

  // Busca os perfis dos fãs numa segunda query (casamento em memória).
  const userIds = Array.from(new Set(subs.map((s) => s.user_id)))
  let profileMap = new Map<string, Profile>()
  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)
    for (const p of (profilesData ?? []) as Profile[]) profileMap.set(p.id, p)
  }

  const tierCounts = subs.reduce<Record<string, number>>((acc, s) => {
    const t = s.plan?.tier
    if (t) acc[t] = (acc[t] ?? 0) + 1
    return acc
  }, {})

  const donutData = (['bronze', 'silver', 'gold', 'platinum'] as Tier[])
    .map((tier) => ({
      tier,
      label: TIER_LABELS[tier],
      value: tierCounts[tier] ?? 0,
      color: TIER_COLORS[tier],
    }))
    .filter((d) => d.value > 0)

  // Ranking real de fãs por XP.
  const ranking = subs
    .map((s) => ({
      sub: s,
      profile: profileMap.get(s.user_id),
    }))
    .sort((a, b) => (b.profile?.xp ?? 0) - (a.profile?.xp ?? 0))
    .slice(0, 10)

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="COMUNIDADE"
        title="Seus fãs"
        action={
          <span className="flex items-center gap-2 rounded-full border border-white/8 bg-[var(--artist-surface)]/60 px-5 py-2.5 text-[9px] font-black tracking-[0.15em] text-[var(--artist-text)]">
            <Users className="size-3.5 text-[var(--artist-primary)]" aria-hidden="true" />
            {subs.length} ASSINANTES
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Distribuição por plano (donut real) */}
        <section className="rounded-[28px] border border-white/8 bg-[var(--artist-surface)]/60 p-5 backdrop-blur-sm lg:col-span-2">
          <h2 className="text-[10px] font-black tracking-[0.25em] text-[var(--artist-muted)]">
            ASSINANTES POR PLANO
          </h2>
          <div className="mt-3">
            <TierDonutChart data={donutData} />
          </div>
          <ul className="mt-4 flex flex-col gap-2">
            {(['platinum', 'gold', 'silver', 'bronze'] as Tier[]).map((tier) => {
              const count = tierCounts[tier] ?? 0
              const pct = subs.length > 0 ? Math.round((count / subs.length) * 100) : 0
              return (
                <li key={tier} className="flex items-center gap-2.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: TIER_COLORS[tier] }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 text-[10px] font-black tracking-[0.1em] text-[var(--artist-text)]">
                    {TIER_LABELS[tier].toUpperCase()}
                  </span>
                  <span className="font-numeric text-[10px] font-bold text-[var(--artist-muted)]">
                    {count} ({pct}%)
                  </span>
                </li>
              )
            })}
          </ul>
        </section>

        {/* Ranking de fãs (XP real) */}
        <section className="lg:col-span-3">
          <h2 className="text-[10px] font-black tracking-[0.25em] text-[var(--artist-muted)]">
            RANKING DE FÃS (POR XP)
          </h2>
          <ol className="mt-3 flex flex-col gap-2">
            {ranking.map(({ sub, profile }, i) => (
              <li
                key={sub.id}
                className="flex items-center gap-3 rounded-[20px] border border-white/8 bg-[var(--artist-surface)]/60 p-3"
              >
                <span
                  className={
                    i === 0
                      ? 'gradient-brand flex size-8 shrink-0 items-center justify-center rounded-xl font-numeric text-xs font-black text-white'
                      : 'flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/5 font-numeric text-xs font-black text-[var(--artist-muted)]'
                  }
                >
                  {i === 0 ? <Crown className="size-4" aria-hidden="true" /> : i + 1}
                </span>
                <Image
                  src={profile?.avatar_url || '/placeholder.svg?height=36&width=36&query=fan avatar'}
                  alt=""
                  width={36}
                  height={36}
                  className="size-9 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-extrabold text-[var(--artist-text)]">
                    {profile?.display_name ?? 'Fã anônimo'}
                  </p>
                  <p className="mt-0.5 text-[8px] font-black tracking-[0.15em] text-[var(--artist-muted)]">
                    {sub.plan?.tier ? TIER_LABELS[sub.plan.tier].toUpperCase() : 'ASSINANTE'} · desde{' '}
                    {new Date(sub.started_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span className="shrink-0 font-numeric text-[11px] font-bold text-[var(--artist-primary)]">
                  {(profile?.xp ?? 0).toLocaleString('pt-BR')} XP
                </span>
              </li>
            ))}
            {ranking.length === 0 && (
              <li className="rounded-[20px] border border-dashed border-white/10 p-8 text-center text-[10px] font-bold text-[var(--artist-muted)]">
                Nenhum assinante ainda. Divulgue seu fan club para começar.
              </li>
            )}
          </ol>
        </section>
      </div>
    </div>
  )
}
