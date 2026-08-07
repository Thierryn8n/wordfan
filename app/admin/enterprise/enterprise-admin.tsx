'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  X,
  Loader2,
  Clock,
  CreditCard,
  Building2,
  Plus,
  Trash2,
  Save,
  AlertCircle,
} from 'lucide-react'
import { formatCNPJ } from '@/lib/cnpj'
import type { EnterpriseLead, EnterprisePlan } from '@/lib/types'
import { approveLead, rejectLead, updateEnterprisePlan } from './actions'

type Lead = EnterpriseLead & { artist?: { name: string; slug: string } | null }

const STATUS_LABEL: Record<EnterpriseLead['status'], { label: string; tone: string; icon: typeof Clock }> = {
  pending_payment: { label: 'AGUARDANDO PAGAMENTO', tone: 'text-amber-400', icon: CreditCard },
  waitlist: { label: 'LISTA DE ESPERA', tone: 'text-sky-400', icon: Clock },
  approved: { label: 'APROVADO', tone: 'text-emerald-400', icon: Check },
  rejected: { label: 'REJEITADO', tone: 'text-destructive', icon: X },
}

export function EnterpriseAdmin({ plan, leads }: { plan: EnterprisePlan; leads: Lead[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'waitlist' | 'plan'>('waitlist')

  const waitlist = leads.filter((l) => l.status === 'waitlist')
  const others = leads.filter((l) => l.status !== 'waitlist')

  function act(fn: () => Promise<{ error?: string; success?: boolean }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res.error) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="mt-8">
      <div className="flex gap-2" role="tablist">
        <TabBtn active={tab === 'waitlist'} onClick={() => setTab('waitlist')}>
          LISTA DE ESPERA ({waitlist.length})
        </TabBtn>
        <TabBtn active={tab === 'plan'} onClick={() => setTab('plan')}>
          PLANO ENTERPRISE
        </TabBtn>
      </div>

      {error && (
        <p className="mt-5 flex items-center gap-2 rounded-2xl bg-destructive/15 px-4 py-3 text-xs font-bold text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {tab === 'waitlist' ? (
        <div className="mt-6 flex flex-col gap-4">
          {waitlist.length === 0 && (
            <p className="rounded-3xl border border-white/8 bg-card p-8 text-center text-sm font-bold text-muted-foreground">
              Nenhum contratante aguardando aprovação.
            </p>
          )}
          {waitlist.map((lead) => (
            <LeadCard key={lead.id} lead={lead} isPending={isPending} onAct={act} />
          ))}

          {others.length > 0 && (
            <>
              <p className="mt-4 text-[9px] font-black tracking-[0.25em] text-muted-foreground">HISTÓRICO</p>
              {others.map((lead) => (
                <LeadCard key={lead.id} lead={lead} isPending={isPending} onAct={act} readOnly />
              ))}
            </>
          )}
        </div>
      ) : (
        <PlanEditor plan={plan} isPending={isPending} onAct={act} />
      )}
    </div>
  )
}

function LeadCard({
  lead,
  isPending,
  onAct,
  readOnly = false,
}: {
  lead: Lead
  isPending: boolean
  onAct: (fn: () => Promise<{ error?: string; success?: boolean }>) => void
  readOnly?: boolean
}) {
  const meta = STATUS_LABEL[lead.status]
  const Icon = meta.icon
  return (
    <div className="rounded-3xl border border-white/8 bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
            <p className="font-serif text-lg font-black">{lead.company_name}</p>
          </div>
          <p className="mt-0.5 font-numeric text-xs text-muted-foreground">CNPJ {formatCNPJ(lead.cnpj)}</p>
          {lead.artist && (
            <p className="mt-1 text-[11px] font-bold text-muted-foreground">
              interesse em <span className="text-foreground">{lead.artist.name}</span>
            </p>
          )}
        </div>
        <div className={`flex items-center gap-1.5 ${meta.tone}`}>
          <Icon className="size-4" aria-hidden="true" />
          <span className="text-[9px] font-black tracking-[0.2em]">{meta.label}</span>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <Info label="Responsável" value={lead.contact_name} />
        <Info label="Telefone" value={lead.contact_phone} />
        <Info label="E-mail" value={lead.contact_email} />
        <Info label="Segmento" value={lead.segment ?? '—'} />
        {lead.budget_cents != null && (
          <Info label="Orçamento" value={(lead.budget_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
        )}
        <Info label="Pago" value={lead.paid ? 'Sim' : 'Não'} />
      </dl>

      {lead.message && (
        <p className="mt-3 rounded-2xl bg-white/5 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          {lead.message}
        </p>
      )}

      {!readOnly && (
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => onAct(() => approveLead(lead.id))}
            className="holo-fill flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-[10px] font-black tracking-[0.2em] text-black disabled:opacity-60"
          >
            <Check className="size-4" aria-hidden="true" />
            APROVAR
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => onAct(() => rejectLead(lead.id))}
            className="flex items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-5 py-3.5 text-[10px] font-black tracking-[0.2em] text-destructive disabled:opacity-60"
          >
            <X className="size-4" aria-hidden="true" />
            REJEITAR
          </button>
        </div>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[9px] font-black tracking-[0.15em] text-muted-foreground">{label.toUpperCase()}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  )
}

function PlanEditor({
  plan,
  isPending,
  onAct,
}: {
  plan: EnterprisePlan
  isPending: boolean
  onAct: (fn: () => Promise<{ error?: string; success?: boolean }>) => void
}) {
  const [name, setName] = useState(plan.name)
  const [tagline, setTagline] = useState(plan.tagline)
  const [price, setPrice] = useState((plan.price_cents / 100).toFixed(2).replace('.', ','))
  const [active, setActive] = useState(plan.active)
  const [benefits, setBenefits] = useState<string[]>(plan.benefits.length ? plan.benefits : [''])

  function save() {
    const priceCents = Math.round(Number(price.replace(/\./g, '').replace(',', '.')) * 100)
    onAct(() =>
      updateEnterprisePlan({ name, tagline, priceCents, benefits, active }),
    )
  }

  return (
    <div className="mt-6 max-w-lg rounded-3xl border border-white/8 bg-card p-7">
      <label className="flex flex-col gap-1.5">
        <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">NOME</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className="ent-input" />
      </label>
      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">SUBTÍTULO</span>
        <input value={tagline} onChange={(e) => setTagline(e.target.value)} className="ent-input" />
      </label>
      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">VALOR DE ENTRADA (R$)</span>
        <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className="ent-input" />
      </label>

      <div className="mt-4">
        <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">BENEFÍCIOS</span>
        <div className="mt-2 flex flex-col gap-2">
          {benefits.map((b, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={b}
                onChange={(e) => setBenefits((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))}
                placeholder={`Benefício ${i + 1}`}
                className="ent-input flex-1"
              />
              <button
                type="button"
                onClick={() => setBenefits((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label="Remover benefício"
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-destructive/40 bg-destructive/10 text-destructive"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setBenefits((prev) => [...prev, ''])}
          className="mt-2 flex items-center gap-2 rounded-2xl border border-white/8 bg-white/5 px-4 py-2.5 text-[10px] font-black tracking-[0.2em]"
        >
          <Plus className="size-4" aria-hidden="true" />
          ADICIONAR BENEFÍCIO
        </button>
      </div>

      <label className="mt-5 flex items-center gap-3">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-[#a78bfa]" />
        <span className="text-xs font-bold">Plano visível em todos os artistas</span>
      </label>

      <button
        type="button"
        onClick={save}
        disabled={isPending}
        className="holo-fill mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[11px] font-black tracking-[0.25em] text-black disabled:opacity-60"
      >
        {isPending ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Save className="size-5" aria-hidden="true" />}
        SALVAR PLANO
      </button>

      <style jsx>{`
        .ent-input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: var(--background);
          padding: 0.8rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          outline: none;
        }
        .ent-input:focus {
          border-color: #a78bfa;
        }
      `}</style>
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full px-5 py-2.5 text-[10px] font-black tracking-[0.2em] transition-colors ${
        active ? 'holo-fill text-black' : 'border border-white/8 bg-card text-muted-foreground'
      }`}
    >
      {children}
    </button>
  )
}
