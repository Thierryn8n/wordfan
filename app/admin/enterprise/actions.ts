'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado.' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Apenas administradores.' }
  return { error: null as string | null }
}

async function notify(userId: string, title: string, body: string) {
  const admin = createServiceClient()
  await admin.from('notifications').insert({ user_id: userId, title, body })
}

/** Aprova o lead: contratante ganha selo, empresário do artista é avisado. */
export async function approveLead(leadId: string, note?: string) {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  const admin = createServiceClient()
  const { data: lead } = await admin
    .from('enterprise_leads')
    .select('id, user_id, artist_id, company_name, contact_name, paid')
    .eq('id', leadId)
    .maybeSingle()

  if (!lead) return { error: 'Solicitação não encontrada.' }
  if (!lead.paid) return { error: 'Este contratante ainda não pagou a entrada.' }

  const { error } = await admin
    .from('enterprise_leads')
    .update({ status: 'approved', reviewed_at: new Date().toISOString(), review_note: note ?? null })
    .eq('id', leadId)
  if (error) {
    console.log('[v0] approve lead error:', error.message)
    return { error: 'Não foi possível aprovar.' }
  }

  // Notifica o contratante (in-app)
  await notify(
    lead.user_id,
    'Contratação aprovada',
    'Parabéns! Sua contratação Enterprise foi aprovada. O empresário do artista entrará em contato.',
  )

  // Notifica os empresários do artista (in-app) + tenta email
  if (lead.artist_id) {
    const { data: managers } = await admin.from('managers').select('user_id').eq('artist_id', lead.artist_id)
    for (const m of managers ?? []) {
      await notify(
        (m as { user_id: string }).user_id,
        'Novo contratante Enterprise',
        `${lead.company_name} foi aprovada e quer falar com você. Responsável: ${lead.contact_name}.`,
      )
    }
  }

  revalidatePath('/admin/enterprise')
  revalidatePath('/manager')
  revalidatePath('/enterprise/status')
  return { success: true }
}

/** Rejeita o lead. */
export async function rejectLead(leadId: string, note?: string) {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  const admin = createServiceClient()
  const { data: lead } = await admin.from('enterprise_leads').select('user_id').eq('id', leadId).maybeSingle()
  if (!lead) return { error: 'Solicitação não encontrada.' }

  const { error } = await admin
    .from('enterprise_leads')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString(), review_note: note ?? null })
    .eq('id', leadId)
  if (error) return { error: 'Não foi possível rejeitar.' }

  await notify(
    (lead as { user_id: string }).user_id,
    'Contratação não aprovada',
    'Sua solicitação Enterprise não foi aprovada desta vez. Fale com o suporte para mais detalhes.',
  )

  revalidatePath('/admin/enterprise')
  return { success: true }
}

/** Atualiza o plano Enterprise global (nome, preço, benefícios). */
export async function updateEnterprisePlan(input: {
  name: string
  tagline: string
  priceCents: number
  benefits: string[]
  active: boolean
}) {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  const admin = createServiceClient()
  const { error } = await admin
    .from('enterprise_plan')
    .update({
      name: input.name.trim().slice(0, 60) || 'Enterprise',
      tagline: input.tagline.trim().slice(0, 140),
      price_cents: Math.max(0, Math.round(input.priceCents)),
      benefits: input.benefits.map((b) => b.trim()).filter(Boolean).slice(0, 8),
      active: input.active,
    })
    .eq('id', 1)
  if (error) return { error: 'Não foi possível salvar o plano.' }

  revalidatePath('/admin/enterprise')
  return { success: true }
}
