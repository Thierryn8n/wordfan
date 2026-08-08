import Image from 'next/image'
import Link from 'next/link'
import { Heart, Lock } from 'lucide-react'
import { TierBadge } from '@/components/wordfan/tier-badge'
import type { Post, Artist } from '@/lib/types'

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return 'agora há pouco'
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  return `há ${days}d`
}

export function PostCard({
  post,
  artist,
  locked = false,
}: {
  post: Post
  artist?: Artist
  locked?: boolean
}) {
  const a = artist ?? post.artist
  return (
    <article className="glass-panel sheen relative overflow-hidden rounded-2xl">
      {a && (
        <header className="flex items-center gap-3 p-4 pb-3">
          <Image
            src={a.avatar_url || '/placeholder.svg?height=40&width=40'}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            <Link href={`/artist/${a.slug}`} className="font-medium leading-tight hover:underline">
              {a.name}
            </Link>
            <p className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</p>
          </div>
          {post.is_exclusive && post.min_tier && <TierBadge tier={post.min_tier} />}
        </header>
      )}

      {locked ? (
        <div className="skeu-inset mx-4 mb-4 flex flex-col items-center gap-3 rounded-xl px-6 py-10 text-center">
          <Lock className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">Conteúdo exclusivo para assinantes</p>
          {post.min_tier && (
            <p className="text-xs text-muted-foreground">
              Disponível a partir do plano {post.min_tier === 'bronze' ? 'Bronze' : post.min_tier === 'silver' ? 'Prata' : post.min_tier === 'gold' ? 'Ouro' : 'Platina'}
            </p>
          )}
          {a && (
            <Link
              href={`/artist/${a.slug}/plans`}
              className="skeu-btn sheen relative mt-1 rounded-full px-5 py-2 text-sm font-semibold text-white"
            >
              Ver planos
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="px-4 pb-3">
            {post.title && <h3 className="font-serif font-semibold text-pretty">{post.title}</h3>}
            {post.content && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{post.content}</p>}
          </div>
          {post.media_url && (
            <div className="relative mx-4 mb-3 aspect-video overflow-hidden rounded-xl">
              <Image src={post.media_url || "/placeholder.svg"} alt={post.title ?? 'Mídia do post'} fill sizes="(max-width: 768px) 100vw, 600px" className="object-cover" />
            </div>
          )}
          <footer className="flex items-center gap-2 px-4 pb-4 text-sm text-muted-foreground">
            <Heart className="size-4" aria-hidden="true" />
            <span>{post.likes_count.toLocaleString('pt-BR')} curtidas</span>
          </footer>
        </>
      )}
    </article>
  )
}
