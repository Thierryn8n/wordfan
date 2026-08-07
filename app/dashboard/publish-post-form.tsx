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
    <form
      onSubmit={handleSubmit}
      className="mt-3 flex flex-col gap-5 rounded-3xl border border-white/8 bg-card p-5"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="post-title" className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">
          TÍTULO
        </label>
        <input
          id="post-title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título da publicação"
          className="rounded-2xl border border-white/8 bg-background px-4 py-3 text-xs font-bold outline-none transition-colors placeholder:text-zinc-600 focus:border-primary"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label
          htmlFor="post-content"
          className="text-[9px] font-black tracking-[0.2em] text-muted-foreground"
        >
          CONTEÚDO
        </label>
        <textarea
          id="post-content"
          required
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="O que você quer contar pros seus fãs?"
          className="resize-none rounded-2xl border border-white/8 bg-background px-4 py-3 text-xs font-bold leading-relaxed outline-none transition-colors placeholder:text-zinc-600 focus:border-primary"
        />
      </div>

      <fieldset>
        <legend className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">
          VISIBILIDADE
        </legend>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMinTier(null)}
            className={cn(
              'rounded-full px-4 py-2 text-[9px] font-black tracking-[0.15em] transition-colors',
              minTier === null
                ? 'gradient-brand text-white'
                : 'border border-white/8 bg-background text-muted-foreground',
            )}
          >
            PÚBLICO
          </button>
          {TIER_ORDER.map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setMinTier(tier)}
              className={cn(
                'rounded-full px-4 py-2 text-[9px] font-black tracking-[0.15em] transition-colors',
                minTier === tier
                  ? 'gradient-brand text-white'
                  : 'border border-white/8 bg-background text-muted-foreground',
              )}
            >
              {TIER_LABELS[tier].toUpperCase()}+
            </button>
          ))}
        </div>
      </fieldset>

      {feedback && (
        <p
          role="alert"
          className={cn(
            'text-xs font-bold',
            feedback.type === 'error' ? 'text-destructive' : 'text-primary',
          )}
        >
          {feedback.text}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="gradient-brand rounded-full py-3.5 text-[10px] font-black tracking-[0.25em] text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? 'PUBLICANDO...' : 'PUBLICAR'}
      </button>
    </form>
  )
}
