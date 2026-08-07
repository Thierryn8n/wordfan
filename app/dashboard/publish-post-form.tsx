'use client'

import { useState, useTransition } from 'react'
import { publishPost } from './actions'
import { TIER_LABELS, TIER_ORDER, type Tier } from '@/lib/types'
import { cn } from '@/lib/utils'

export function PublishPostForm({ artistId, slug }: { artistId: string; slug: string }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [minTier, setMinTier] = useState<Tier | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)
    startTransition(async () => {
      const result = await publishPost({
        artistId,
        slug,
        title: title.trim(),
        content: content.trim(),
        minTier,
      })
      if (result?.error) {
        setFeedback({ type: 'error', text: result.error })
      } else {
        setFeedback({ type: 'success', text: 'Publicação criada com sucesso.' })
        setTitle('')
        setContent('')
        setMinTier(null)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="glass mt-3 flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="post-title" className="text-sm font-medium">
          Título
        </label>
        <input
          id="post-title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título da publicação"
          className="rounded-xl border border-input bg-secondary/50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="post-content" className="text-sm font-medium">
          Conteúdo
        </label>
        <textarea
          id="post-content"
          required
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="O que você quer contar pros seus fãs?"
          className="resize-none rounded-xl border border-input bg-secondary/50 px-4 py-2.5 text-sm leading-relaxed outline-none transition-colors focus:border-primary"
        />
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Visibilidade</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMinTier(null)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
              minTier === null ? 'gradient-brand text-black' : 'bg-secondary text-muted-foreground',
            )}
          >
            Público
          </button>
          {TIER_ORDER.map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setMinTier(tier)}
              className={cn(
                'rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
                minTier === tier ? 'gradient-brand text-black' : 'bg-secondary text-muted-foreground',
              )}
            >
              {TIER_LABELS[tier]}+
            </button>
          ))}
        </div>
      </fieldset>

      {feedback && (
        <p
          role="alert"
          className={cn('text-sm', feedback.type === 'error' ? 'text-destructive' : 'text-primary')}
        >
          {feedback.text}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="gradient-brand rounded-full py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? 'Publicando...' : 'Publicar'}
      </button>
    </form>
  )
}
