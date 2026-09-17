import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { decodeArtistToken } from '@/lib/artist-link'

/**
 * Link permanente e criptografado do perfil do artista: `dominio/a/<token>`.
 * - Não logado  → manda para o login e volta para cá.
 * - Dono/admin  → abre o editor do próprio perfil.
 * - Outro usuário → mostra a página pública do artista.
 */
export default async function ArtistLinkPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const artistId = decodeArtistToken(token)
  if (!artistId) notFound()

  const supabase = await createClient()
  const { data: artist } = await supabase
    .from('artists')
    .select('slug, owner_id')
    .eq('id', artistId)
    .maybeSingle()
  if (!artist) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/auth/login?next=${encodeURIComponent(`/a/${token}`)}`)

  if (user.id === artist.owner_id) redirect('/dashboard/perfil')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'admin') redirect(`/dashboard/perfil?artist=${artist.slug}`)

  redirect(`/artist/${artist.slug}`)
}
