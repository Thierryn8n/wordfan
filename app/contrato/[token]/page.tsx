import { notFound, redirect } from 'next/navigation'
import Image from 'next/image'
import { FileText, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'
import { decodeContractToken } from '@/lib/artist-link'
import { formatPrice, type Contract } from '@/lib/types'
import { COMPANY_PLANS, isCompanyPlan } from '@/lib/company-plans'
import { AcceptContractForm } from './accept-form'

export const metadata = { title: 'Revisão de contrato — WordFan' }

export default async function ContractPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const contractId = decodeContractToken(token)
  if (!contractId) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(`/contrato/${token}`)}`)

  const svc = createServiceClient()
  const { data } = await svc.from('contracts').select('*').eq('id', contractId).maybeSingle()
  if (!data) notFound()
  const contract = data as Contract

  const [{ data: artist }, { data: profile }] = await Promise.all([
    svc.from('artists').select('owner_id, name, logo_url').eq('id', contract.artist_id).maybeSingle(),
    svc.from('profiles').select('role').eq('id', user.id).maybeSingle(),
  ])
  const isOwner = artist?.owner_id === user.id
  const isAdmin = profile?.role === 'admin'
  if (!isOwner && !isAdmin) redirect('/home')

  // URL assinada temporária para visualizar/baixar o PDF (bucket privado).
  let pdfUrl: string | null = null
  if (contract.pdf_path) {
    const { data: signed } = await svc.storage.from('contracts').createSignedUrl(contract.pdf_path, 60 * 30)
    pdfUrl = signed?.signedUrl ?? null
  }

  const planLabel = isCompanyPlan(contract.plan) ? COMPANY_PLANS[contract.plan].label : contract.plan
  const company = contract.company_snapshot as Record<string, string | null>
  const signed = contract.status === 'signed'

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {artist?.logo_url ? (
            <Image src={artist.logo_url || '/placeholder.svg'} alt="" width={44} height={44} className="size-11 rounded-xl object-contain" />
          ) : (
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="size-5" aria-hidden="true" />
            </span>
          )}
          <div>
            <p className="text-[10px] font-black tracking-[0.18em] text-primary">CONTRATO</p>
            <h1 className="text-balance font-serif text-xl font-black tracking-[-0.03em] text-foreground">
              {contract.title}
            </h1>
          </div>
        </div>
      </header>

      {signed && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-400">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Assinado por {contract.signer_name} em{' '}
          {contract.signed_at ? new Date(contract.signed_at).toLocaleString('pt-BR') : '—'}
        </div>
      )}

      <section className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-black tracking-[0.12em] text-muted-foreground">PLANO</p>
          <p className="mt-1 text-sm font-black text-foreground">{planLabel}</p>
        </div>
        <div>
          <p className="text-[10px] font-black tracking-[0.12em] text-muted-foreground">COMISSÃO</p>
          <p className="mt-1 text-sm font-black text-foreground">{contract.commission_pct}%</p>
        </div>
        <div>
          <p className="text-[10px] font-black tracking-[0.12em] text-muted-foreground">CONTRATANTE</p>
          <p className="mt-1 text-sm font-black text-foreground">{company?.trade_name || company?.legal_name || '—'}</p>
        </div>
      </section>

      {contract.plan_values.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] font-black tracking-[0.12em] text-muted-foreground">PLANOS DE ASSINATURA</p>
          <ul className="mt-3 flex flex-col gap-2">
            {contract.plan_values.map((p) => (
              <li key={p.tier} className="flex items-center justify-between text-xs font-bold text-foreground">
                <span>{p.name}</span>
                <span className="font-numeric text-muted-foreground">{formatPrice(p.price_cents)}/mês</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pdfUrl && (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
            <p className="text-xs font-black tracking-[0.1em] text-foreground">DOCUMENTO COMPLETO</p>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-black tracking-[0.08em] text-primary hover:underline"
            >
              ABRIR PDF
            </a>
          </div>
          <iframe src={pdfUrl} title="Contrato em PDF" className="h-[520px] w-full bg-white" />
        </section>
      )}

      {!signed && isOwner && <AcceptContractForm token={token} />}
      {!signed && !isOwner && isAdmin && (
        <p className="rounded-2xl border border-border bg-card px-5 py-4 text-center text-xs font-bold text-muted-foreground">
          Aguardando o aceite do artista titular. Envie o link{' '}
          <span className="text-foreground">/contrato/{token.slice(0, 10)}…</span> para {artist?.name}.
        </p>
      )}
    </main>
  )
}
