'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, PenLine } from 'lucide-react'
import { acceptContract } from './actions'

export function AcceptContractForm({ token }: { token: string }) {
  const [name, setName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await acceptContract(token, name)
      if (res?.error) setError(res.error)
      else setDone(true)
    })
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm font-bold text-emerald-400">
        <CheckCircle2 className="size-5" aria-hidden="true" />
        Contrato assinado com sucesso. Uma cópia fica registrada na plataforma.
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-5">
      <div className="flex items-center gap-2">
        <PenLine className="size-4 text-primary" aria-hidden="true" />
        <h2 className="text-xs font-black tracking-[0.1em] text-foreground">ACEITE DIGITAL</h2>
      </div>
      <p className="mt-2 text-xs font-medium leading-relaxed text-muted-foreground">
        Ao assinar, você declara ter lido e concordado com todos os termos do contrato acima.
        O aceite é registrado com seu nome, data, hora e endereço IP.
      </p>

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-[11px] font-bold tracking-[0.04em] text-muted-foreground">NOME COMPLETO (ASSINATURA)</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome civil completo"
          className="h-11 rounded-xl border border-border bg-background px-4 text-sm font-bold outline-none focus:border-primary"
        />
      </label>

      <label className="mt-3 flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span className="text-xs font-medium leading-relaxed text-muted-foreground">
          Li e concordo com os termos do contrato e autorizo o registro do aceite digital.
        </span>
      </label>

      {error && (
        <p role="alert" className="mt-3 text-xs font-bold text-destructive">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={isPending || !agreed || name.trim().length < 3}
        className="gradient-brand mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-2xl py-4 text-[11px] font-black tracking-[0.16em] text-white shadow-[0_12px_30px_-16px_rgba(255,106,0,0.8)] disabled:opacity-50"
      >
        {isPending ? 'REGISTRANDO…' : 'ASSINAR CONTRATO'}
      </button>
    </section>
  )
}
