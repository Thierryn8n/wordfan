'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, MessageSquare } from 'lucide-react'
import { deleteFanComment } from '@/app/dashboard/comunidade/actions'

export interface ModerationComment {
  id: string
  content: string
  createdAt: string
  postTitle: string
  authorName: string
  authorAvatar: string | null
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function CommentModeration({
  artistId,
  comments,
}: {
  artistId: string
  comments: ModerationComment[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  function remove(id: string) {
    if (typeof window !== 'undefined' && !window.confirm('Remover este comentário? Esta ação não pode ser desfeita.')) {
      return
    }
    setPendingId(id)
    startTransition(async () => {
      await deleteFanComment({ commentId: id, artistId })
      setPendingId(null)
      router.refresh()
    })
  }

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-white/12 bg-card p-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-[var(--artist-primary)]/10 text-[var(--artist-primary)]">
          <MessageSquare className="size-6" aria-hidden="true" />
        </span>
        <p className="text-sm font-black text-[var(--artist-text)]">Nenhum comentário ainda</p>
        <p className="max-w-xs text-[11px] font-bold text-[var(--artist-muted)]">
          Quando seus fãs comentarem nas publicações, eles aparecerão aqui para você acompanhar e
          moderar.
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {comments.map((c) => (
        <li
          key={c.id}
          className="flex items-start gap-3 rounded-3xl border border-white/10 bg-card p-4"
        >
          <Image
            src={c.authorAvatar || '/placeholder.svg?height=40&width=40&query=fan avatar'}
            alt=""
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="text-[11px] font-black text-[var(--artist-text)]">
                {c.authorName}
              </span>
              <span className="text-[9px] font-bold text-[var(--artist-muted)]">
                {timeAgo(c.createdAt)}
              </span>
            </div>
            <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--artist-text)]/90">
              {c.content}
            </p>
            <p className="mt-1.5 truncate text-[9px] font-black tracking-[0.1em] text-[var(--artist-muted)]">
              EM: {c.postTitle.toUpperCase()}
            </p>
          </div>
          <button
            type="button"
            aria-label="Remover comentário"
            disabled={isPending && pendingId === c.id}
            onClick={() => remove(c.id)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-red-500/20 text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
          >
            {isPending && pendingId === c.id ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="size-3.5" aria-hidden="true" />
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}
