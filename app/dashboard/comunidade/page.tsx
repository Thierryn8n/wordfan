import { MessageSquare, Heart, Users } from 'lucide-react'
import { getDashboardArtist } from '@/lib/dashboard'
import { DashboardHeader } from '@/components/wordfan/dashboard-header'
import {
  CommentModeration,
  type ModerationComment,
} from '@/components/wordfan/comment-moderation'

export const metadata = { title: 'Comunidade | Painel do Artista' }

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Heart
  label: string
  value: string
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-card p-5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--artist-primary)]/15 text-[var(--artist-primary)]">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <p className="mt-3 font-numeric text-2xl font-black text-[var(--artist-text)]">{value}</p>
      <p className="mt-0.5 text-[9px] font-black tracking-[0.15em] text-[var(--artist-muted)]">
        {label}
      </p>
    </div>
  )
}

export default async function ComunidadePage() {
  const { artist, supabase } = await getDashboardArtist('/dashboard/comunidade')

  if (!artist) {
    return (
      <div className="rounded-3xl border border-white/10 bg-card p-10 text-center">
        <p className="text-sm font-bold text-muted-foreground">Nenhum artista vinculado.</p>
      </div>
    )
  }

  // Posts do artista (id + título para exibir o contexto do comentário)
  const { data: postsRaw } = await supabase
    .from('posts')
    .select('id, title, likes_count')
    .eq('artist_id', artist.id)
  const posts = (postsRaw ?? []) as { id: string; title: string | null; likes_count: number }[]
  const postMap = new Map(posts.map((p) => [p.id, p.title ?? 'Publicação']))
  const totalLikes = posts.reduce((a, p) => a + (p.likes_count ?? 0), 0)

  let comments: ModerationComment[] = []
  if (posts.length > 0) {
    const postIds = posts.map((p) => p.id)
    const { data: commentsRaw } = await supabase
      .from('post_comments')
      .select('id, content, created_at, post_id, user_id')
      .in('post_id', postIds)
      .order('created_at', { ascending: false })
      .limit(100)

    const rows = (commentsRaw ?? []) as {
      id: string
      content: string
      created_at: string
      post_id: string
      user_id: string
    }[]

    // Busca os perfis dos autores em uma segunda consulta
    const userIds = [...new Set(rows.map((r) => r.user_id))]
    const profileMap = new Map<string, { name: string; avatar: string | null }>()
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds)
      for (const p of (profs ?? []) as { id: string; display_name: string | null; avatar_url: string | null }[]) {
        profileMap.set(p.id, { name: p.display_name ?? 'Fã', avatar: p.avatar_url })
      }
    }

    comments = rows.map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.created_at,
      postTitle: postMap.get(r.post_id) ?? 'Publicação',
      authorName: profileMap.get(r.user_id)?.name ?? 'Fã',
      authorAvatar: profileMap.get(r.user_id)?.avatar ?? null,
    }))
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader eyebrow="ENGAJAMENTO DOS FÃS" title="Comunidade" />

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={MessageSquare} label="COMENTÁRIOS" value={comments.length.toLocaleString('pt-BR')} />
        <StatCard icon={Heart} label="CURTIDAS" value={totalLikes.toLocaleString('pt-BR')} />
        <StatCard icon={Users} label="SEGUIDORES" value={artist.followers_count.toLocaleString('pt-BR')} />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-base font-black text-[var(--artist-text)]">
          Moderação de comentários
        </h2>
        <CommentModeration artistId={artist.id} comments={comments} />
      </section>
    </div>
  )
}
