import { Briefcase, Mail, Phone, Building2, Banknote, Clock } from 'lucide-react'
import { getDashboardArtist } from '@/lib/dashboard'
import { DashboardHeader } from '@/components/wordfan/dashboard-header'

export const metadata = { title: 'Propostas | Painel do Artista' }

interface Lead {
  id: string
  company_name: string | null
  cnpj: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  segment: string | null
  budget_cents: number | null
  message: string | null
  status: string | null
  paid: boolean | null
  created_at: string
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'EM ANÁLISE', cls: 'bg-amber-500/15 text-amber-400' },
  pending_payment: { label: 'AGUARDANDO PAGAMENTO', cls: 'bg-amber-500/15 text-amber-400' },
  approved: { label: 'APROVADA', cls: 'bg-emerald-500/15 text-emerald-400' },
  rejected: { label: 'RECUSADA', cls: 'bg-red-500/15 text-red-400' },
}

function statusOf(s: string | null) {
  return STATUS[s ?? 'pending'] ?? { label: (s ?? 'ENVIADA').toUpperCase(), cls: 'bg-white/10 text-[var(--artist-muted)]' }
}

function money(cents: number | null) {
  if (!cents) return '—'
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

export default async function PropostasPage() {
  const { artist, supabase } = await getDashboardArtist('/dashboard/propostas')

  if (!artist) {
    return (
      <div className="rounded-3xl border border-white/10 bg-card p-10 text-center">
        <p className="text-sm font-bold text-muted-foreground">Nenhum artista vinculado.</p>
      </div>
    )
  }

  const { data } = await supabase
    .from('enterprise_leads')
    .select(
      'id, company_name, cnpj, contact_name, contact_email, contact_phone, segment, budget_cents, message, status, paid, created_at',
    )
    .eq('artist_id', artist.id)
    .order('created_at', { ascending: false })

  const leads = (data ?? []) as Lead[]
  const approved = leads.filter((l) => l.status === 'approved')
  const totalBudget = approved.reduce((a, l) => a + (l.budget_cents ?? 0), 0)

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader eyebrow="OPORTUNIDADES DE NEGÓCIO" title="Propostas de Marcas" />

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-3xl border border-white/10 bg-card p-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--artist-primary)]/15 text-[var(--artist-primary)]">
            <Briefcase className="size-4" aria-hidden="true" />
          </span>
          <p className="mt-3 font-numeric text-2xl font-black text-[var(--artist-text)]">{leads.length}</p>
          <p className="mt-0.5 text-[9px] font-black tracking-[0.15em] text-[var(--artist-muted)]">PROPOSTAS</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-card p-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <Building2 className="size-4" aria-hidden="true" />
          </span>
          <p className="mt-3 font-numeric text-2xl font-black text-[var(--artist-text)]">{approved.length}</p>
          <p className="mt-0.5 text-[9px] font-black tracking-[0.15em] text-[var(--artist-muted)]">FECHADAS</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-card p-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--artist-primary)]/15 text-[var(--artist-primary)]">
            <Banknote className="size-4" aria-hidden="true" />
          </span>
          <p className="mt-3 font-numeric text-2xl font-black text-[var(--artist-text)]">{money(totalBudget)}</p>
          <p className="mt-0.5 text-[9px] font-black tracking-[0.15em] text-[var(--artist-muted)]">VOLUME FECHADO</p>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-white/12 bg-card p-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-[var(--artist-primary)]/10 text-[var(--artist-primary)]">
            <Briefcase className="size-6" aria-hidden="true" />
          </span>
          <p className="text-sm font-black text-[var(--artist-text)]">Nenhuma proposta ainda</p>
          <p className="max-w-sm text-[11px] font-bold text-[var(--artist-muted)]">
            Quando empresas quiserem fechar parcerias, patrocínios ou shows com você, as propostas
            aparecerão aqui com todos os detalhes de contato.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {leads.map((l) => {
            const st = statusOf(l.status)
            return (
              <li key={l.id} className="rounded-3xl border border-white/10 bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-serif text-base font-black text-[var(--artist-text)]">
                      {l.company_name ?? 'Empresa'}
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold text-[var(--artist-muted)]">
                      {[l.segment, l.cnpj].filter(Boolean).join(' • ') || 'Sem detalhes'}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-[8px] font-black tracking-[0.15em] ${st.cls}`}>
                    {st.label}
                  </span>
                </div>

                {l.message && (
                  <p className="mt-3 rounded-2xl bg-[var(--artist-bg)] p-3.5 text-xs font-medium leading-relaxed text-[var(--artist-text)]/90">
                    {l.message}
                  </p>
                )}

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {l.budget_cents ? (
                    <p className="flex items-center gap-2 text-[11px] font-bold text-[var(--artist-text)]">
                      <Banknote className="size-3.5 text-[var(--artist-primary)]" aria-hidden="true" />
                      Orçamento: {money(l.budget_cents)}
                    </p>
                  ) : null}
                  <p className="flex items-center gap-2 text-[11px] font-bold text-[var(--artist-muted)]">
                    <Clock className="size-3.5" aria-hidden="true" />
                    {new Date(l.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                  {l.contact_email && (
                    <a
                      href={`mailto:${l.contact_email}`}
                      className="flex items-center gap-2 text-[11px] font-bold text-[var(--artist-text)] transition-colors hover:text-[var(--artist-primary)]"
                    >
                      <Mail className="size-3.5 text-[var(--artist-primary)]" aria-hidden="true" />
                      {l.contact_email}
                    </a>
                  )}
                  {l.contact_phone && (
                    <a
                      href={`tel:${l.contact_phone}`}
                      className="flex items-center gap-2 text-[11px] font-bold text-[var(--artist-text)] transition-colors hover:text-[var(--artist-primary)]"
                    >
                      <Phone className="size-3.5 text-[var(--artist-primary)]" aria-hidden="true" />
                      {l.contact_phone}
                    </a>
                  )}
                </div>
                {l.contact_name && (
                  <p className="mt-3 text-[10px] font-bold text-[var(--artist-muted)]">
                    Contato: <span className="text-[var(--artist-text)]">{l.contact_name}</span>
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
