import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient, isServiceRoleConfigured } from '@/lib/supabase/admin'
import type { EnterpriseLead, EnterprisePlan } from '@/lib/types'
import { EnterpriseAdmin } from './enterprise-admin'

export const dynamic = 'force-dynamic'

const DEFAULT_PLAN: EnterprisePlan = {
  id: 1,
  name: 'Enterprise',
  tagline: '',
  price_cents: 0,
  benefits: [],
  active: false,
}

export default async function AdminEnterprisePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin/enterprise')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/home')

  // Esta seção usa a service role key para ignorar RLS ao listar todos os leads.
  // Sem a chave configurada, degrada graciosamente em vez de derrubar a página.
  const serviceKeyConfigured = isServiceRoleConfigured()
  let plan: EnterprisePlan = DEFAULT_PLAN
  let leads: (EnterpriseLead & { artist?: { name: string; slug: string } | null })[] = []

  if (serviceKeyConfigured) {
    const admin = createServiceClient()
    const [{ data: planRow }, { data: leadRows }] = await Promise.all([
      admin.from('enterprise_plan').select('*').eq('id', 1).single(),
      admin
        .from('enterprise_leads')
        .select('*, artist:artists(name, slug)')
        .order('created_at', { ascending: false }),
    ])
    plan = (planRow as EnterprisePlan) ?? DEFAULT_PLAN
    leads = (leadRows ?? []) as (EnterpriseLead & { artist?: { name: string; slug: string } | null })[]
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-5xl px-6 pb-24 pt-8">
      <header className="flex items-center gap-3">
        <Link
          href="/admin"
          className="flex size-10 items-center justify-center rounded-full border border-white/8 bg-card"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <div>
          <p className="text-[9px] font-black tracking-[0.25em] text-muted-foreground">ADMINISTRAÇÃO</p>
          <h1 className="holo-text font-serif text-3xl font-black">ENTERPRISE</h1>
        </div>
      </header>

      {!serviceKeyConfigured && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
          <p className="text-[11px] font-bold leading-relaxed text-amber-200">
            Esta seção precisa da variável <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span> configurada
            no projeto para listar leads e gerenciar o plano Enterprise.
          </p>
        </div>
      )}

      <EnterpriseAdmin plan={plan} leads={leads} />
    </div>
  )
}
