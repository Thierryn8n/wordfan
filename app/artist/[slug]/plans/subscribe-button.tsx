'use client'

import { useState, useTransition } from 'react'
import { subscribeToPlan } from './actions'
import { cn } from '@/lib/utils'

export function SubscribeButton({
  slug,
  planId,
  isCurrent,
  isPopular,
}: {
  slug: string
  planId: string
  isCurrent: boolean
  isPopular: boolean
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
      <p className="mt-4 rounded-full border border-primary/40 py-2.5 text-center text-sm font-semibold text-primary">
        Seu plano atual
      </p>
    )
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={cn(
          'w-full rounded-full py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60',
          isPopular ? 'gradient-brand text-black' : 'glass hover:bg-secondary',
        )}
      >
        {isPending ? 'Assinando...' : 'Assinar'}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-center text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
