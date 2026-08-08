import { getDashboardArtist } from '@/lib/dashboard'
import { DashboardHeader } from '@/components/wordfan/dashboard-header'
import { ProfileEditor } from '@/components/wordfan/profile-editor'
import type { Artist } from '@/lib/types'

export const metadata = { title: 'Perfil e Identidade | Painel do Artista' }

export default async function PerfilPage() {
  const { artist } = await getDashboardArtist('/dashboard/perfil')

  if (!artist) {
    return (
      <div className="rounded-3xl border border-white/10 bg-card p-10 text-center">
        <p className="text-sm font-bold text-muted-foreground">
          Nenhum artista vinculado à sua conta.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader eyebrow="PERSONALIZE SUA MARCA" title="Perfil e Identidade" />
      <ProfileEditor artist={artist as Artist} />
    </div>
  )
}
