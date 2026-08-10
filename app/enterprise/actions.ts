'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isValidCNPJ, normalizeCnpj } from '@/lib/cnpj'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type ApplyInput = {
  artistSlug: string
  companyName: string
  cnpj: string
  contactName: string
  contactEmail: string
  contactPhone: string
  segment: string
  budget: string
  message: string
}

/** Cria o lead Enterprise (status pending_payment). Exige login. */
export async function applyEnterprise(input: ApplyInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado para contratar.' }

  const companyName = input.companyName.trim()
  const contactName = input.contactName.trim()
  const contactEmail = input.contactEmail.trim().toLowerCase()
  const contactPhone = input.contactPhone.trim()
  const cnpj = normalizeCnpj(input.cnpj)

  if (companyName.length < 2) return { error: 'Informe a razão social / nome da empresa.' }
  if (!isValidCNPJ(cnpj)) return { error: 'CNPJ inválido. Verifique os 14 dígitos.' }
  if (contactName.length < 2) return { error: 'Informe o nome do responsável.' }
  if (!EMAIL_RE.test(contactEmail)) return { error: 'E-mail de contato inválido.' }
  if (contactPhone.replace(/\D/g, '').length < 10) return { error: 'Telefone de contato inválido.' }

  // Artista de referência (opcional, mas o fluxo parte de um artista)
  const { data: artist } = await supabase
    .from('artists')
    .select('id')
    .eq('slug', input.artistSlug)
    .maybeSingle()

  const budgetCents = input.budget ? Math.round(parseBudget(input.budget) * 100) : null

  const { data: lead, error } = await supabase
    .from('enterprise_leads')
    .insert({
      user_id: user.id,
      artist_id: artist?.id ?? null,
      company_name: companyName,
      cnpj,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      segment: input.segment.trim().slice(0, 80) || null,
      budget_cents: budgetCents,
      message: input.message.trim().slice(0, 1000) || null,
      status: 'pending_payment',
      paid: false,
    })
    .select('id')
    .single()

  if (error || !lead) {
    console.log('[v0] apply enterprise error:', error?.message)
    return { error: 'Não foi possível registrar sua solicitação.' }
  }

  return { success: true, leadId: lead.id }
}

/**
 * Pagamento simulado (mock) dos R$50. Confirma o pagamento e ATIVA o Enterprise
 * na hora (status `approved`) — o selo holográfico aparece imediatamente no
 * perfil, sem depender de aprovação manual da equipe.
 */
export async function payEnterpriseLead(leadId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada. Entre novamente.' }

  // RLS garante que só o dono do lead atualiza. Confirma estado atual.
  const { data: lead } = await supabase
    .from('enterprise_leads')
    .select('id, status, paid, artist_id')
    .eq('id', leadId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!lead) return { error: 'Solicitação não encontrada.' }
  if (lead.paid) return { success: true, alreadyPaid: true }

  const nowIso = new Date().toISOString()
  const { error } = await supabase
    .from('enterprise_leads')
    .update({
      paid: true,
      paid_at: nowIso,
      // Ativação imediata: pagou, virou Enterprise.
      status: 'approved',
      reviewed_at: nowIso,
      review_note: 'Ativado automaticamente após confirmação do pagamento.',
    })
    .eq('id', leadId)
    .eq('user_id', user.id)

  if (error) {
    console.log('[v0] pay enterprise error:', error.message)
    return { error: 'Não foi possível confirmar o pagamento.' }
  }

  // Confirma ao contratante (in-app) que o Enterprise já está ativo
  await supabase.from('notifications').insert({
    user_id: user.id,
    title: 'Enterprise ativado',
    body: 'Pagamento confirmado! Seu selo Enterprise já está ativo no seu perfil.',
  })

  revalidatePath('/enterprise/status')
  revalidatePath('/profile')
  revalidatePath('/admin/enterprise')
  return { success: true }
}

function parseBudget(v: string): number {
  // aceita "50.000", "50000", "R$ 50.000,00"
  const cleaned = v.replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}
