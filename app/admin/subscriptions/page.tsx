import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/admin-guard'
import { SubscriptionsManager } from './subscriptions-manager'
import type { Artist, Plan, Profile, Subscription } from '@/lib/types'

export const metadata = { title: 'Assinaturas — WordFan Admin' }

export default async function AdminSubscriptionsPage() {
  const { supabase } = await requireAdmin('/admin/subscriptions')

  const [{ data: subs }, { data: profiles }, { data: plans }, { data: artists }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('*, plan:plans(*), artist:artists(*)')
      .order('started_at', { ascending: false })
      .limit(500),
    supabase.from('profiles').select('*').order('display_name', { ascending: true }),
    supabase.from('plans').select('*').order('price_cents', { ascending: true }),
    supabase.from('artists').select('*').order('name', { ascending: true }),
  ])

  return (
    <div className="min-w-0 flex-1">
      <div className="px-5 pb-16 pt-6 md:px-8">
        <header className="flex items-center gap-4">
          <Link
            href="/admin"
            aria-label="Voltar para o painel"
            className="flex size-10 items-center justify-center rounded-full border border-white/8 bg-card lg:hidden"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <div>
            <p className="text-[9px] font-black tracking-[0.3em] text-gold">WORDFAN ADMIN</p>
            <h1 className="mt-0.5 font-serif text-2xl font-black tracking-tight">ASSINATURAS</h1>
          </div>
        </header>

        <SubscriptionsManager
          subscriptions={(subs ?? []) as (Subscription & { plan: Plan | null; artist: Artist | null })[]}
          users={(profiles ?? []) as Profile[]}
          plans={(plans ?? []) as Plan[]}
          artists={(artists ?? []) as Artist[]}
        />
      </div>
    </div>
  )
}
