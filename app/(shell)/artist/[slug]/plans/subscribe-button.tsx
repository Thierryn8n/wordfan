'use client'

import { useState, useTransition } from 'react'
import { ArrowRight } from 'lucide-react'
import { subscribeToPlan } from './actions'
import { cn } from '@/lib/utils'

export function SubscribeButton({
  slug,
  planId,
  isCurrent,
  variant = 'compact',
}: {
  slug: string
  planId: string
  isCurrent: boolean
  variant?: 'compact' | 'featured'
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await subscribeToPlan(slug, planId)
      if (result && 'error' in result) {
        setError(result.error)
      } else if (result && 'url' in result) {
        // Checkout do Stripe abre no mesmo contexto; em iframe (preview), nova aba.
        if (window.self !== window.top) {
          window.open(result.url, '_blank')
        } else {
          window.location.href = result.url
        }
      }
    })
  }

  if (isCurrent) {
    return (
      <p className="mt-5 rounded-2xl border border-club/50 py-3.5 text-center text-[11px] font-extrabold tracking-[0.2em] text-club">
        SEU PLANO ATUAL
      </p>
    )
  }

  return (
    <div className={variant === 'featured' ? 'mt-6' : 'mt-5'}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-2xl text-[11px] font-extrabold tracking-[0.25em] transition-opacity disabled:opacity-60',
          variant === 'featured'
            ? 'h-16 bg-white text-black'
            : 'h-12 border border-white/8 bg-white/5 text-foreground hover:bg-white/10',
        )}
      >
        {isPending ? 'ASSINANDO...' : 'ASSINAR AGORA'}
        {variant === 'featured' && <ArrowRight className="size-4" aria-hidden="true" />}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-center text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
