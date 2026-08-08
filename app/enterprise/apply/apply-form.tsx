'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, ShieldCheck, CreditCard, Building2, AlertCircle } from 'lucide-react'
import { formatCNPJ, isValidCNPJ, normalizeCnpj } from '@/lib/cnpj'
import { applyEnterprise, payEnterpriseLead } from '../actions'

type Step = 'form' | 'payment' | 'done'

export function ApplyForm({
  artistSlug,
  priceCents,
  prefillEmail,
}: {
  artistSlug: string
  priceCents: number
  prefillEmail: string
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [leadId, setLeadId] = useState<string | null>(null)

  const [companyName, setCompanyName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState(prefillEmail)
  const [contactPhone, setContactPhone] = useState('')
  const [segment, setSegment] = useState('')
  const [budget, setBudget] = useState('')
  const [message, setMessage] = useState('')

  const cnpjValid = useMemo(() => isValidCNPJ(cnpj), [cnpj])
  const cnpjTouched = cnpj.replace(/\D/g, '').length === 14

  function submitForm() {
    setError(null)
    if (!companyName.trim()) return setError('Informe a empresa.')
    if (!cnpjValid) return setError('CNPJ inválido. Confira os dígitos.')
    if (!contactName.trim()) return setError('Informe o responsável.')
    if (!contactEmail.trim()) return setError('Informe o e-mail de contato.')
    if (contactPhone.replace(/\D/g, '').length < 10) return setError('Telefone inválido.')

    startTransition(async () => {
      const res = await applyEnterprise({
        artistSlug,
        companyName,
        cnpj: normalizeCnpj(cnpj),
        contactName,
        contactEmail,
        contactPhone,
        segment,
        budget,
        message,
      })
      if (res.error) return setError(res.error)
      setLeadId(res.leadId!)
      setStep('payment')
    })
  }

  function pay() {
    if (!leadId) return
    setError(null)
    startTransition(async () => {
      const res = await payEnterpriseLead(leadId)
      if (res.error) return setError(res.error)
      setStep('done')
    })
  }

  if (step === 'done') {
    return (
      <div className="mt-8 rounded-3xl border border-white/8 bg-card p-8 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full holo-fill">
          <Check className="size-8 text-black" aria-hidden="true" />
        </span>
        <h2 className="mt-5 font-serif text-2xl font-black">ENTERPRISE ATIVADO</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Pagamento confirmado! Seu perfil já ganhou o selo holográfico Enterprise. O empresário do
          artista vai entrar em contato para os próximos passos.
        </p>
        <button
          type="button"
          onClick={() => router.push('/enterprise/status')}
          className="holo-fill mt-7 flex h-14 w-full items-center justify-center rounded-2xl text-[11px] font-black tracking-[0.25em] text-black"
        >
          ACOMPANHAR STATUS
        </button>
      </div>
    )
  }

  if (step === 'payment') {
    return (
      <div className="mt-8">
        <div className="rounded-3xl border border-white/8 bg-card p-7">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-[8px] font-black tracking-[0.2em] text-muted-foreground">
            <CreditCard className="size-3" aria-hidden="true" />
            ATIVAÇÃO ENTERPRISE
          </span>
          <p className="mt-4 font-numeric text-4xl font-bold">{formatBRL(priceCents)}</p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">
            Taxa única. Seu selo Enterprise é ativado assim que o pagamento é confirmado.
          </p>

          {error && (
            <p className="mt-5 flex items-center gap-2 rounded-2xl bg-destructive/15 px-4 py-3 text-xs font-bold text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={pay}
            disabled={isPending}
            className="holo-fill mt-6 flex h-16 w-full items-center justify-center gap-2 rounded-2xl text-[11px] font-black tracking-[0.25em] text-black disabled:opacity-60"
          >
            {isPending ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <ShieldCheck className="size-5" aria-hidden="true" />}
            {isPending ? 'PROCESSANDO...' : `PAGAR ${formatBRL(priceCents)}`}
          </button>
          <p className="mt-3 text-center text-[9px] font-bold tracking-[0.1em] text-muted-foreground">
            PAGAMENTO SIMULADO PARA DEMONSTRAÇÃO
          </p>
        </div>
      </div>
    )
  }

  // step === 'form'
  return (
    <div className="mt-7 flex flex-col gap-4">
      <Field label="EMPRESA / RAZÃO SOCIAL *">
        <input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Ex.: Eventos Brasil Ltda."
          className="input"
        />
      </Field>

      <Field label="CNPJ *">
        <div className="relative">
          <input
            value={cnpj}
            onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
            inputMode="numeric"
            placeholder="00.000.000/0000-00"
            aria-invalid={cnpjTouched && !cnpjValid}
            className={`input pr-11 ${cnpjTouched ? (cnpjValid ? 'border-emerald-500/60' : 'border-destructive/70') : ''}`}
          />
          {cnpjTouched && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2">
              {cnpjValid ? (
                <Check className="size-4 text-emerald-400" aria-label="CNPJ válido" />
              ) : (
                <AlertCircle className="size-4 text-destructive" aria-label="CNPJ inválido" />
              )}
            </span>
          )}
        </div>
        {cnpjTouched && !cnpjValid && (
          <span className="text-[10px] font-bold text-destructive">CNPJ inválido — verifique os dígitos.</span>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="RESPONSÁVEL *">
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Seu nome"
            className="input"
          />
        </Field>
        <Field label="TELEFONE *">
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(formatPhone(e.target.value))}
            inputMode="tel"
            placeholder="(00) 00000-0000"
            className="input"
          />
        </Field>
      </div>

      <Field label="E-MAIL DE CONTATO *">
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="empresa@email.com"
          className="input"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="SEGMENTO">
          <input
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            placeholder="Ex.: Bebidas"
            className="input"
          />
        </Field>
        <Field label="ORÇAMENTO (R$)">
          <input
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            inputMode="numeric"
            placeholder="50.000"
            className="input"
          />
        </Field>
      </div>

      <Field label="MENSAGEM PARA O EMPRESÁRIO">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Conte o objetivo do contato: patrocínio, show, collab..."
          className="input resize-none"
        />
      </Field>

      {error && (
        <p className="flex items-center gap-2 rounded-2xl bg-destructive/15 px-4 py-3 text-xs font-bold text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submitForm}
        disabled={isPending}
        className="holo-fill mt-1 flex h-16 w-full items-center justify-center gap-2 rounded-2xl text-[11px] font-black tracking-[0.25em] text-black disabled:opacity-60"
      >
        {isPending ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Building2 className="size-5" aria-hidden="true" />}
        {isPending ? 'ENVIANDO...' : 'CONTINUAR PARA PAGAMENTO'}
      </button>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: var(--background);
          padding: 0.85rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          outline: none;
        }
        .input:focus {
          border-color: #a78bfa;
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
