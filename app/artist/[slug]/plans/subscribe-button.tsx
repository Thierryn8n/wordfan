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
      if (result?.error) setError(result.error)
    })
  }

  if (isCurrent) {
    return (
      <p className="skeu-inset mt-5 rounded-2xl py-3.5 text-center text-[11px] font-extrabold tracking-[0.2em] text-club">
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
          'relative flex w-full items-center justify-center gap-2 rounded-2xl text-[11px] font-extrabold tracking-[0.25em] transition-opacity disabled:opacity-60',
          variant === 'featured' ? 'skeu-btn sheen h-16 text-white' : 'skeu h-12 text-foreground',
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
