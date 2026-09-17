import { getDashboardArtist } from '@/lib/dashboard'
import { DashboardHeader } from '@/components/wordfan/dashboard-header'
import { AgendaClient } from '@/components/wordfan/agenda-client'
import type { Show } from '@/lib/types'

export const metadata = { title: 'Agenda | Painel do Artista' }

const SHOW_COLS =
  'id, artist_id, title, venue, city, state, starts_at, status, fee, payment_method, payment_status, contract_type, contract_status, contract_notes, address, lat, lng'

export default async function AgendaPage() {
  const { artist, supabase } = await getDashboardArtist('/dashboard/agenda')

  if (!artist) {
    return (
      <div className="rounded-3xl border border-white/10 bg-card p-10 text-center">
        <p className="text-sm font-bold text-muted-foreground">Nenhum artista vinculado.</p>
      </div>
    )
  }

  const { data } = await supabase
    .from('shows')
    .select(SHOW_COLS)
    .eq('artist_id', artist.id)
    .order('starts_at', { ascending: true })

  const shows = (data ?? []) as Show[]

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader eyebrow="AGENDA E LOGÍSTICA" title="Agenda de Shows" />
      <AgendaClient shows={shows} />
    </div>
  )
}
