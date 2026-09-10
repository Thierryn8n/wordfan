'use server'

import { createClient } from '@/lib/supabase/server'

export interface PostComment {
  id: string
  content: string
  created_at: string
  user_id: string
  author_name: string
  author_avatar: string | null
}

// Curtir / descurtir. Exige login — retorna needAuth quando não há sessão,
// para o cliente redirecionar ao fluxo de entrar/cadastrar.
export async function togglePostLike(postId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { needAuth: true as const }

  const { data: existing } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase.from('post_likes').delete().eq('id', existing.id)
    if (error) return { error: 'Não foi possível remover a curtida.' }
    return { liked: false as const }
  }

  const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
  if (error) {
    console.log('[v0] togglePostLike insert error:', error.message)
    return { error: 'Não foi possível curtir.' }
  }
  return { liked: true as const }
}

// Lista de comentários com nome/avatar do autor (via RPC security definer).
export async function getPostComments(postId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_post_comments', { p_post_id: postId })
  if (error) {
    console.log('[v0] getPostComments error:', error.message)
    return { comments: [] as PostComment[] }
  }
  return { comments: (data ?? []) as PostComment[] }
}

// Comentar. Exige login.
export async function addPostComment(postId: string, content: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { needAuth: true as const }

  const text = content.trim().slice(0, 500)
  if (!text) return { error: 'Escreva algo para comentar.' }

  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, user_id: user.id, content: text })
    .select('id, content, created_at, user_id')
    .single()
  if (error || !data) {
    console.log('[v0] addPostComment error:', error?.message)
    return { error: 'Não foi possível comentar.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  const comment: PostComment = {
    id: data.id,
    content: data.content,
    created_at: data.created_at,
    user_id: data.user_id,
    author_name: profile?.display_name ?? 'Fã',
    author_avatar: profile?.avatar_url ?? null,
  }
  return { comment }
}

// Excluir comentário próprio (a RLS também permite admin).
export async function deletePostComment(commentId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { needAuth: true as const }

  const { error } = await supabase.from('post_comments').delete().eq('id', commentId)
  if (error) return { error: 'Não foi possível remover o comentário.' }
  return { success: true as const }
}
