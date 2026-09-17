import { notFound } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { getDashboardArtist } from '@/lib/dashboard'
import { ArtistProfilePanel } from '@/components/wordfan/artist-profile-panel'
import type { ArtistAbout } from '@/lib/types'

export const metadata = { title: 'Meu perfil — Painel do artista' }

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ artist?: string }>
}) {
  const { artist } = await searchParams.then((sp) => getDashboardArtist('/dashboard/perfil', sp.artist))
  if (!artist) notFound()

  const { supabase } = await getDashboardArtist('/dashboard/perfil')
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pending = Boolean((artist.about as ArtistAbout | null)?.setup_pending)
  // Só o próprio artista dono altera as credenciais de acesso aqui.
  const showCredentials = user?.id === artist.owner_id

  return (
    <div className="mx-auto w-full max-w-3xl py-6">
      <header className="mb-6">
        <h1 className="font-serif text-2xl font-black tracking-tight">Meu perfil</h1>
        <p className="mt-1.5 text-sm font-medium text-muted-foreground">
          Preencha todos os dados do seu perfil. Eles alimentam sua página pública e o fan club.
        </p>
        {pending && (
          <p className="mt-4 flex items-center gap-2 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-xs font-bold text-primary">
            <Sparkles className="size-4 shrink-0" aria-hidden="true" />
            Bem-vindo! Complete seu perfil abaixo para publicar sua página e liberar todos os recursos.
          </p>
        )}
      </header>

      <ArtistProfilePanel
        artist={artist}
        currentEmail={user?.email ?? ''}
        showCredentials={showCredentials}
      />
    </div>
  )
}
