import { createClient } from '@/lib/supabase/server'
import type { EnterprisePlan, EnterpriseLead, Artist } from '@/lib/types'

const DEFAULT_ENTERPRISE: EnterprisePlan = {
  id: 1,
  name: 'Enterprise',
  tagline: 'Para empresas que querem fechar com o artista',
  price_cents: 5000,
  benefits: [
    'Contato direto com o empresário do artista',
    'Proposta de patrocínio e collab',
    'Prioridade na agenda de shows',
    'Selo holográfico Enterprise no seu perfil',
  ],
  active: true,
}

/** Plano Enterprise global (gerido pelo admin) que aparece em todas as telas de planos. */
export async function getEnterprisePlan(): Promise<EnterprisePlan> {
  const supabase = await createClient()
  const { data } = await supabase.from('enterprise_plan').select('*').eq('id', 1).maybeSingle()
  return (data as EnterprisePlan | null) ?? DEFAULT_ENTERPRISE
}

/**
 * Situação Enterprise do usuário logado. `paid` controla a coroa holográfica
 * (aparece após o pagamento). Retorna null se não houver lead.
 */
export async function getMyEnterpriseStatus(): Promise<{
  status: EnterpriseLead['status']
  paid: boolean
} | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('enterprise_leads')
    .select('status, paid')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return { status: data.status as EnterpriseLead['status'], paid: Boolean(data.paid) }
}

/** Todos os leads (admin) com o artista relacionado. */
export async function getAllEnterpriseLeads(): Promise<(EnterpriseLead & { artist: Artist | null })[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('enterprise_leads')
    .select('*, artist:artists(*)')
    .order('created_at', { ascending: false })
  return (data ?? []) as (EnterpriseLead & { artist: Artist | null })[]
}

/** Artistas geridos por um empresário (via tabela managers). */
export async function getManagedArtists(userId: string): Promise<Artist[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('managers')
    .select('artist:artists(*)')
    .eq('user_id', userId)
  return ((data ?? [])
    .map((r) => (r as unknown as { artist: Artist | null }).artist)
    .filter(Boolean)) as Artist[]
}
