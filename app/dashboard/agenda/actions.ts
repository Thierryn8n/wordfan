'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardArtist } from '@/lib/dashboard'
import { createServiceClient } from '@/lib/supabase/admin'
import type { DealStatus, ShowStatus } from '@/lib/types'

export interface ShowFormResult {
  ok: boolean
  error?: string
}

const SHOW_STATUSES: ShowStatus[] = ['scheduled', 'done', 'canceled']
const DEAL_STATUSES: DealStatus[] = ['pendente', 'confirmado', 'revisao']

function str(v: FormDataEntryValue | null): string | null {
  const s = (v ?? '').toString().trim()
  return s.length ? s : null
}

function num(v: FormDataEntryValue | null): number | null {
  const s = (v ?? '').toString().trim().replace(/\./g, '').replace(',', '.')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function showStatus(v: FormDataEntryValue | null): ShowStatus {
  const s = (v ?? '').toString() as ShowStatus
  return SHOW_STATUSES.includes(s) ? s : 'scheduled'
}

function dealStatus(v: FormDataEntryValue | null): DealStatus {
  const s = (v ?? '').toString() as DealStatus
  return DEAL_STATUSES.includes(s) ? s : 'pendente'
}

export async function saveShow(formData: FormData): Promise<ShowFormResult> {
  const { artist } = await getDashboardArtist('/dashboard/agenda')
  if (!artist) return { ok: false, error: 'Nenhum artista vinculado.' }

  const id = str(formData.get('id'))
  const title = str(formData.get('title'))
  const startsAtRaw = str(formData.get('starts_at'))

  if (!title) return { ok: false, error: 'Informe o nome do show.' }
  if (!startsAtRaw) return { ok: false, error: 'Informe a data e hora do show.' }

  const startsAt = new Date(startsAtRaw)
  if (Number.isNaN(startsAt.getTime())) return { ok: false, error: 'Data inválida.' }

  const payload = {
    artist_id: artist.id,
    title,
    venue: str(formData.get('venue')),
    city: str(formData.get('city')),
    state: str(formData.get('state')),
    cep: str(formData.get('cep')),
    address: str(formData.get('address')),
    starts_at: startsAt.toISOString(),
    status: showStatus(formData.get('status')),
    fee: num(formData.get('fee')),
    payment_method: str(formData.get('payment_method')),
    payment_status: dealStatus(formData.get('payment_status')),
    contract_type: str(formData.get('contract_type')),
    contract_status: dealStatus(formData.get('contract_status')),
    contract_notes: str(formData.get('contract_notes')),
  }

  const admin = createServiceClient()

  if (id) {
    // Garante que o show pertence ao artista que o usuário está gerenciando.
    const { data: existing } = await admin.from('shows').select('artist_id').eq('id', id).maybeSingle()
    if (!existing || existing.artist_id !== artist.id) {
      return { ok: false, error: 'Show não encontrado.' }
    }
    const { error } = await admin.from('shows').update(payload).eq('id', id)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await admin.from('shows').insert(payload)
    if (error) return { ok: false, error: error.message }
  }

  revalidatePath('/dashboard/agenda')
  return { ok: true }
}

export async function deleteShow(id: string): Promise<ShowFormResult> {
  const { artist } = await getDashboardArtist('/dashboard/agenda')
  if (!artist) return { ok: false, error: 'Nenhum artista vinculado.' }

  const admin = createServiceClient()
  const { data: existing } = await admin.from('shows').select('artist_id').eq('id', id).maybeSingle()
  if (!existing || existing.artist_id !== artist.id) {
    return { ok: false, error: 'Show não encontrado.' }
  }

  const { error } = await admin.from('shows').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/agenda')
  return { ok: true }
}
