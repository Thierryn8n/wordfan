import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getEnterprisePlan } from '@/lib/enterprise'
import { ApplyForm } from './apply-form'

export const dynamic = 'force-dynamic'

export default async function EnterpriseApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ artist?: string }>
}) {
  const { artist: artistSlug = '' } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/enterprise/apply?artist=${artistSlug}`)}`)
  }

  const enterprise = await getEnterprisePlan()

  // Pré-preenche email do contato com o email logado
  const prefillEmail = user.email ?? ''

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-6">
      <header className="flex items-center gap-3">
        <Link
          href={artistSlug ? `/artist/${artistSlug}/plans` : '/home'}
          className="flex size-10 items-center justify-center rounded-full border border-white/8 bg-card"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <div>
          <p className="text-[9px] font-black tracking-[0.25em] text-muted-foreground">CONTRATAÇÃO</p>
          <h1 className="holo-text font-serif text-2xl font-black">{enterprise.name.toUpperCase()}</h1>
        </div>
      </header>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Preencha os dados da sua empresa para entrar em contato com o empresário do artista. A entrada na
        lista de espera custa {formatBRL(enterprise.price_cents)}.
      </p>

      <ApplyForm artistSlug={artistSlug} priceCents={enterprise.price_cents} prefillEmail={prefillEmail} />
    </main>
  )
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
