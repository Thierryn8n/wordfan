import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'
import type { EnterpriseLead, EnterprisePlan } from '@/lib/types'
import { EnterpriseAdmin } from './enterprise-admin'

export const dynamic = 'force-dynamic'

export default async function AdminEnterprisePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin/enterprise')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/home')

  const admin = createServiceClient()
  const [{ data: planRow }, { data: leadRows }] = await Promise.all([
    admin.from('enterprise_plan').select('*').eq('id', 1).single(),
    admin
      .from('enterprise_leads')
      .select('*, artist:artists(name, slug)')
      .order('created_at', { ascending: false }),
  ])

  const plan = planRow as EnterprisePlan
  const leads = (leadRows ?? []) as (EnterpriseLead & { artist?: { name: string; slug: string } | null })[]

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

      <EnterpriseAdmin plan={plan} leads={leads} />
    </div>
  )
}
