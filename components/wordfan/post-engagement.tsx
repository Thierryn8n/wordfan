'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Heart, MessageCircle, Share2, Check, Loader2, Send, Trash2 } from 'lucide-react'
import {
  togglePostLike,
  getPostComments,
  addPostComment,
  deletePostComment,
  type PostComment,
} from '@/app/actions/posts'

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export function PostEngagement({
  postId,
  artistSlug,
  initialLikes,
  initialLiked,
  initialCommentCount,
  isLoggedIn,
  currentUserId,
}: {
  postId: string
  artistSlug: string
  initialLikes: number
  initialLiked: boolean
  initialCommentCount: number
  isLoggedIn: boolean
  currentUserId: string | null
}) {
  const router = useRouter()
  const [liked, setLiked] = useState(initialLiked)
  const [likes, setLikes] = useState(initialLikes)
  const [commentCount, setCommentCount] = useState(initialCommentCount)
  const [isPending, startTransition] = useTransition()

  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState<PostComment[] | null>(null)
  const [loadingComments, setLoadingComments] = useState(false)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const loginHref = `/auth/login?next=/artist/${artistSlug}`

  function requireLogin() {
    router.push(loginHref)
  }

  function handleLike() {
    if (!isLoggedIn) return requireLogin()
    // Otimista.
    const next = !liked
    setLiked(next)
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)))
    startTransition(async () => {
      const res = await togglePostLike(postId)
      if ('needAuth' in res && res.needAuth) {
        setLiked(!next)
        setLikes((n) => Math.max(0, n + (next ? -1 : 1)))
        requireLogin()
      } else if ('error' in res && res.error) {
        // Reverte em caso de erro.
        setLiked(!next)
        setLikes((n) => Math.max(0, n + (next ? -1 : 1)))
      }
    })
  }

  async function openComments() {
    const next = !open
    setOpen(next)
    if (next && comments === null) {
      setLoadingComments(true)
      const res = await getPostComments(postId)
      setComments(res.comments)
      setCommentCount(res.comments.length)
      setLoadingComments(false)
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!isLoggedIn) return requireLogin()
    const text = draft.trim()
    if (!text || posting) return
    setPosting(true)
    const res = await addPostComment(postId, text)
    setPosting(false)
    if ('needAuth' in res && res.needAuth) return requireLogin()
    if ('comment' in res && res.comment) {
      setComments((prev) => [...(prev ?? []), res.comment])
      setCommentCount((n) => n + 1)
      setDraft('')
    }
  }

  function handleDelete(commentId: string) {
    startTransition(async () => {
      const res = await deletePostComment(commentId)
      if ('success' in res && res.success) {
        setComments((prev) => (prev ?? []).filter((c) => c.id !== commentId))
        setCommentCount((n) => Math.max(0, n - 1))
      }
    })
  }

  async function handleShare() {
    const url = `${window.location.origin}/artist/${artistSlug}#feed`
    const shareData = {
      title: 'WordFan',
      text: 'Confira este post no WordFan',
      url,
    }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch {
        // usuário cancelou — segue para o fallback só se quiser copiar
        return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* noop */
    }
  }

  return (
    <div className="mt-4">
      <footer className="flex items-center gap-6">
        <button
          type="button"
          onClick={handleLike}
          aria-pressed={liked}
          aria-label={liked ? 'Remover curtida' : 'Curtir'}
          className="flex items-center gap-2 text-sm font-bold transition-transform active:scale-90"
        >
          <Heart
            className={liked ? 'size-6 fill-club text-club' : 'size-6 text-foreground'}
            aria-hidden="true"
          />
          <span className="font-numeric tabular-nums">{formatCount(likes)}</span>
        </button>

        <button
          type="button"
          onClick={openComments}
          aria-expanded={open}
          aria-label="Ver comentários"
          className="flex items-center gap-2 text-sm font-bold transition-transform active:scale-90"
        >
          <MessageCircle
            className={open ? 'size-6 text-club' : 'size-6 text-foreground'}
            aria-hidden="true"
          />
          <span className="font-numeric tabular-nums">{formatCount(commentCount)}</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          aria-label="Compartilhar"
          className="ml-auto flex items-center gap-1.5 text-sm font-bold transition-transform active:scale-90"
        >
          {copied ? (
            <>
              <Check className="size-6 text-club" aria-hidden="true" />
              <span className="text-[10px] font-black tracking-[0.1em] text-club">COPIADO</span>
            </>
          ) : (
            <Share2 className="size-6 text-foreground" aria-hidden="true" />
          )}
        </button>
      </footer>

      {/* Painel de comentários */}
      {open && (
        <section aria-label="Comentários" className="mt-4 rounded-3xl border border-white/8 bg-card/60 p-4">
          {!isLoggedIn && (
            <p className="mb-3 text-center text-[11px] font-bold text-muted-foreground">
              <button type="button" onClick={requireLogin} className="text-club underline">
                Entre ou crie sua conta
              </button>{' '}
              para curtir e comentar.
            </p>
          )}

          {loadingComments ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          ) : comments && comments.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {comments.map((c) => (
                <li key={c.id} className="flex items-start gap-3">
                  <Image
                    src={c.author_avatar || '/placeholder.svg?height=32&width=32'}
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 shrink-0 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-extrabold tracking-wide">
                      {c.author_name}
                      <span className="ml-2 text-[9px] font-bold text-muted-foreground">
                        {timeAgo(c.created_at)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-foreground/90">{c.content}</p>
                  </div>
                  {currentUserId === c.user_id && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      disabled={isPending}
                      aria-label="Excluir comentário"
                      className="shrink-0 text-muted-foreground transition-colors hover:text-red-400"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-[11px] font-bold text-muted-foreground">
              Seja o primeiro a comentar.
            </p>
          )}

          {/* Campo de novo comentário */}
          <form onSubmit={submitComment} className="mt-4 flex items-center gap-2">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={() => {
                if (!isLoggedIn) {
                  inputRef.current?.blur()
                  requireLogin()
                }
              }}
              placeholder="Escreva um comentário..."
              maxLength={500}
              className="h-11 flex-1 rounded-full border border-white/8 bg-background px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-club"
            />
            <button
              type="submit"
              disabled={posting || !draft.trim()}
              aria-label="Enviar comentário"
              className="gradient-club flex size-11 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
            >
              {posting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="size-4" aria-hidden="true" />
              )}
            </button>
          </form>
        </section>
      )}
    </div>
  )
}
