import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Check, X, CreditCard } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { HoloCrown } from '@/components/wordfan/holo-crown'
import type { EnterpriseLead } from '@/lib/types'

export const dynamic = 'force-dynamic'

const STATUS_META: Record<
  EnterpriseLead['status'],
  { label: string; hint: string; icon: typeof Clock; tone: string }
> = {
  pending_payment: {
    label: 'AGUARDANDO PAGAMENTO',
    hint: 'Finalize o pagamento para ativar seu Enterprise na hora.',
    icon: CreditCard,
    tone: 'text-amber-400',
  },
  waitlist: {
    label: 'NA LISTA DE ESPERA',
    hint: 'Pagamento confirmado. Nossa equipe está analisando sua solicitação.',
    icon: Clock,
    tone: 'text-sky-400',
  },
  approved: {
    label: 'ENTERPRISE ATIVO',
    hint: 'Pagamento confirmado! Seu perfil já exibe o selo Enterprise.',
    icon: Check,
    tone: 'text-emerald-400',
  },
  rejected: {
    label: 'NÃO APROVADO',
    hint: 'Sua solicitação não foi aprovada desta vez. Fale com o suporte para mais detalhes.',
    icon: X,
    tone: 'text-destructive',
  },
}

export default async function EnterpriseStatusPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/enterprise/status')

  const { data: leads } = await supabase
    .from('enterprise_leads')
    .select('*, artist:artists(name, slug)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const list = (leads ?? []) as (EnterpriseLead & { artist?: { name: string; slug: string } | null })[]
  const hasApproved = list.some((l) => l.status === 'approved')

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-6">
      <header className="flex items-center gap-3">
        <Link
          href="/home"
          className="flex size-10 items-center justify-center rounded-full border border-white/8 bg-card"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="holo-text font-serif text-2xl font-black">MINHAS CONTRATAÇÕES</h1>
        </div>
      </header>

      {hasApproved && (
        <div className="mt-6 flex flex-col items-center">
          <HoloCrown size={96} label="Selo Enterprise ativo" />
          <p className="holo-text mt-1 text-[11px] font-black tracking-[0.3em]">SELO ENTERPRISE ATIVO</p>
        </div>
      )}

      {list.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-white/8 bg-card p-8 text-center">
          <p className="text-sm font-bold text-muted-foreground">
            Você ainda não iniciou nenhuma contratação Enterprise.
          </p>
        </div>
      ) : (
        <div className="mt-7 flex flex-col gap-4">
          {list.map((lead) => {
            const meta = STATUS_META[lead.status]
            const Icon = meta.icon
            return (
              <div key={lead.id} className="rounded-3xl border border-white/8 bg-card p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-serif text-lg font-black">{lead.company_name}</p>
                    {lead.artist && (
                      <p className="text-[11px] font-bold text-muted-foreground">
                        para {lead.artist.name}
                      </p>
                    )}
                  </div>
                  {lead.status === 'approved' && <HoloCrown size={36} />}
                </div>

                <div className={`mt-4 flex items-center gap-2 ${meta.tone}`}>
                  <Icon className="size-4" aria-hidden="true" />
                  <span className="text-[10px] font-black tracking-[0.2em]">{meta.label}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{meta.hint}</p>

                {lead.status === 'pending_payment' && lead.artist && (
                  <Link
                    href={`/enterprise/apply?artist=${lead.artist.slug}`}
                    className="holo-fill mt-4 flex h-12 w-full items-center justify-center rounded-2xl text-[10px] font-black tracking-[0.2em] text-black"
                  >
                    FINALIZAR PAGAMENTO
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
