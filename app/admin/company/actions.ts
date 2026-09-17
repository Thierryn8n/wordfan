'use server'

import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/admin-guard'
import { createServiceClient } from '@/lib/supabase/admin'
import type { CompanySettings } from '@/lib/types'

export interface CompanyInput {
  legalName: string
  tradeName: string
  cnpj: string
  address: string
  city: string
  state: string
  zip: string
  email: string
  phone: string
  logoUrl: string
}

export async function saveCompanySettings(input: CompanyInput) {
  const { error: authError } = await assertAdmin()
  if (authError) return { error: authError }

  const svc = createServiceClient()

  // Singleton: pega a linha existente (se houver) para atualizar no lugar.
  const { data: existing } = await svc
    .from('company_settings')
    .select('id')
    .limit(1)
    .maybeSingle()

  const patch = {
    legal_name: input.legalName.trim().slice(0, 200) || null,
    trade_name: input.tradeName.trim().slice(0, 200) || null,
    cnpj: input.cnpj.trim().slice(0, 24) || null,
    address: input.address.trim().slice(0, 240) || null,
    city: input.city.trim().slice(0, 80) || null,
    state: input.state.trim().slice(0, 2).toUpperCase() || null,
    zip: input.zip.trim().slice(0, 12) || null,
    email: input.email.trim().slice(0, 160) || null,
    phone: input.phone.trim().slice(0, 40) || null,
    logo_url: input.logoUrl.trim().slice(0, 500) || null,
    singleton: true,
    updated_at: new Date().toISOString(),
  }

  const { error } = existing
    ? await svc.from('company_settings').update(patch).eq('id', existing.id)
    : await svc.from('company_settings').insert(patch)

  if (error) {
    console.log('[v0] company save error:', error.message)
    return { error: 'Não foi possível salvar os dados da empresa.' }
  }

  revalidatePath('/admin/company')
  return { success: true }
}

const MAX_LOGO_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']

export async function uploadCompanyLogo(formData: FormData) {
  const { error: authError } = await assertAdmin()
  if (authError) return { error: authError }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'Nenhum arquivo enviado.' }
  if (file.size > MAX_LOGO_BYTES) return { error: 'Imagem muito grande (máx. 5MB).' }
  if (!ALLOWED_TYPES.includes(file.type)) return { error: 'Formato inválido (use PNG, JPG, WebP, GIF ou SVG).' }

  const svc = createServiceClient()
  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1] === 'svg+xml' ? 'svg' : file.type.split('/')[1]
  const path = `company/logo-${Date.now()}.${ext}`

  const { error } = await svc.storage.from('artist-media').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) {
    console.log('[v0] company logo upload error:', error.message)
    return { error: 'Falha no upload. Tente novamente.' }
  }

  const {
    data: { publicUrl },
  } = svc.storage.from('artist-media').getPublicUrl(path)

  return { url: publicUrl }
}

export async function getCompanySettings(): Promise<CompanySettings | null> {
  const svc = createServiceClient()
  const { data } = await svc.from('company_settings').select('*').limit(1).maybeSingle()
  return (data as CompanySettings | null) ?? null
}
