'use client'

import { useState, useTransition } from 'react'
import { Check, Pencil } from 'lucide-react'
import { updatePlan } from './actions'
import { formatPrice, TIER_LABELS, type Plan } from '@/lib/types'

export function PlanEditor({ plan, slug }: { plan: Plan; slug: string }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(plan.name)
  const [price, setPrice] = useState((plan.price_cents / 100).toFixed(2))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function save() {
    setError(null)
    const cents = Math.round(Number.parseFloat(price.replace(',', '.')) * 100)
    if (!Number.isFinite(cents) || cents < 100) {
      setError('Preço mínimo: R$ 1,00')
      return
    }
    startTransition(async () => {
      const res = await updatePlan({ planId: plan.id, slug, name, priceCents: cents })
      if (res?.error) {
        setError(res.error)
      } else {
        setEditing(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  return (
    <div className="rounded-3xl border border-white/8 bg-card p-5">
      <p className="text-[8px] font-black tracking-[0.2em] text-muted-foreground">
        {TIER_LABELS[plan.tier].toUpperCase()}
      </p>

      {editing ? (
        <div className="mt-3 flex flex-col gap-2.5">
          <label className="sr-only" htmlFor={`name-${plan.id}`}>
            Nome do plano
          </label>
          <input
            id={`name-${plan.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            className="h-10 rounded-xl border border-white/10 bg-background px-3 text-xs font-bold outline-none focus:border-primary"
          />
          <label className="sr-only" htmlFor={`price-${plan.id}`}>
            Preço mensal em reais
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">R$</span>
            <input
              id={`price-${plan.id}`}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              className="h-10 w-full rounded-xl border border-white/10 bg-background px-3 font-numeric text-xs font-bold outline-none focus:border-primary"
            />
          </div>
          {error && <p className="text-[9px] font-bold text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={isPending}
              className="gradient-brand h-9 flex-1 rounded-xl text-[9px] font-black tracking-[0.15em] text-white disabled:opacity-60"
            >
              {isPending ? 'SALVANDO...' : 'SALVAR'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false)
                setName(plan.name)
                setPrice((plan.price_cents / 100).toFixed(2))
                setError(null)
              }}
              className="h-9 rounded-xl border border-white/10 px-3 text-[9px] font-black tracking-[0.15em] text-muted-foreground"
            >
              CANCELAR
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 truncate font-serif text-base font-extrabold">{name.toUpperCase()}</p>
          <p className="mt-1 font-numeric text-xl font-bold text-primary">
            {formatPrice(Math.round(Number.parseFloat(price.replace(',', '.')) * 100) || plan.price_cents)}
            <span className="text-[9px] font-bold text-muted-foreground"> /mês</span>
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-white/10 text-[9px] font-black tracking-[0.15em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {saved ? (
              <>
                <Check className="size-3 text-primary" aria-hidden="true" />
                SALVO
              </>
            ) : (
              <>
                <Pencil className="size-3" aria-hidden="true" />
                EDITAR
              </>
            )}
          </button>
        </>
      )}
    </div>
  )
}
