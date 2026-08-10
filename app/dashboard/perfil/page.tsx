import { getDashboardArtist } from '@/lib/dashboard'
import { DashboardHeader } from '@/components/wordfan/dashboard-header'
import { ProfileEditor } from '@/components/wordfan/profile-editor'

export const dynamic = 'force-dynamic'

export default async function PerfilPage() {
  const { artist } = await getDashboardArtist('/dashboard/perfil')

  if (!artist) {
    return (
      <div className="flex flex-col gap-6">
        <DashboardHeader eyebrow="MEU PERFIL" title="Perfil" />
        <p className="text-sm font-bold text-[var(--artist-muted)]">
          Nenhum perfil de artista vinculado à sua conta.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader eyebrow="MEU PERFIL" title="Informações do Perfil" />
      <ProfileEditor artist={artist} />
    </div>
  )
}
