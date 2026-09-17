'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'
import { decodeContractToken } from '@/lib/artist-link'

/**
 * Registra o aceite digital do contrato pelo artista dono da conta.
 * Só o proprietário do artista (ou admin) pode assinar; grava nome, IP e data.
 */
export async function acceptContract(token: string, signerName: string) {
  const contractId = decodeContractToken(token)
  if (!contractId) return { error: 'Link inválido.' }

  const name = signerName.trim()
  if (name.length < 3) return { error: 'Informe seu nome completo para assinar.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado para assinar.' }

  const svc = createServiceClient()
  const { data: contract } = await svc
    .from('contracts')
    .select('id, artist_id, status')
    .eq('id', contractId)
    .maybeSingle()
  if (!contract) return { error: 'Contrato não encontrado.' }
  if (contract.status === 'signed') return { error: 'Este contrato já foi assinado.' }

  // Verifica se o usuário é o dono do artista ou admin.
  const [{ data: artist }, { data: profile }] = await Promise.all([
    svc.from('artists').select('owner_id').eq('id', contract.artist_id).maybeSingle(),
    svc.from('profiles').select('role').eq('id', user.id).maybeSingle(),
  ])
  const isOwner = artist?.owner_id === user.id
  const isAdmin = profile?.role === 'admin'
  if (!isOwner && !isAdmin) return { error: 'Apenas o artista titular pode assinar este contrato.' }

  const hdrs = await headers()
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    hdrs.get('x-real-ip') ||
    null

  const { error } = await svc
    .from('contracts')
    .update({
      status: 'signed',
      signer_name: name.slice(0, 160),
      signer_ip: ip,
      signed_at: new Date().toISOString(),
    })
    .eq('id', contractId)

  if (error) {
    console.log('[v0] contract accept error:', error.message)
    return { error: 'Não foi possível registrar o aceite.' }
  }

  revalidatePath(`/contrato/${token}`)
  return { success: true }
}
