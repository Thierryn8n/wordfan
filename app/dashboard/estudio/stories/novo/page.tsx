import { notFound } from 'next/navigation'
import { getDashboardArtist } from '@/lib/dashboard'
import type { Story } from '@/lib/types'
import { StoryEditorPage } from './story-editor-page'

export const metadata = { title: 'Criar Story — Estúdio' }

export default async function NovoStoryPage() {
  const { artist, supabase } = await getDashboardArtist('/dashboard/estudio/stories/novo')
  if (!artist) notFound()

  // carrega stories existentes para mostrar no painel de contexto
  const { data: storiesData } = await supabase
    .from('stories')
    .select('*')
    .eq('artist_id', artist.id)
    .order('created_at', { ascending: false })
    .limit(12)

  return (
    <StoryEditorPage
      artistId={artist.id}
      artistName={artist.name}
      artistSlug={artist.slug}
      existingStories={(storiesData ?? []) as Story[]}
    />
  )
}
