'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Autorização: admin OU dono do artista podem moderar comentários.
// (Moderação da comunidade é função de CRM; NÃO permite editar a identidade
// do painel, que é exclusiva do admin.)
async function requireArtistAccess(artistId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, error: 'Você precisa estar logado.' as string | null, slug: null as string | null }

  const [{ data: profile }, { data: artist }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('artists').select('slug, owner_id').eq('id', artistId).single(),
  ])
  if (!artist) return { supabase, error: 'Artista não encontrado.', slug: null }
  const isAdmin = profile?.role === 'admin'
  const isOwner = artist.owner_id === user.id
  if (!isAdmin && !isOwner) return { supabase, error: 'Sem permissão.', slug: null }

  return { supabase, error: null as string | null, slug: artist.slug as string }
}

// ============ MODERAÇÃO: excluir comentário ============
export async function deleteFanComment(input: { commentId: string; artistId: string }) {
  const { supabase, error, slug } = await requireArtistAccess(input.artistId)
  if (error) return { error }

  const { error: dbError } = await supabase.from('post_comments').delete().eq('id', input.commentId)
  if (dbError) {
    console.log('[v0] deleteFanComment error:', dbError.message)
    return { error: 'Não foi possível remover o comentário.' }
  }
  revalidatePath('/dashboard/comunidade')
  if (slug) revalidatePath(`/artist/${slug}`)
  return { success: true }
}
