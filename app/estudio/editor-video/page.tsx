import { notFound } from 'next/navigation'
import { getDashboardArtist } from '@/lib/dashboard'
import { StoryStudio } from '@/components/wordfan/story-studio'

export const metadata = { title: 'Editor de Vídeo — Estúdio' }

export default async function EditorVideoPage() {
  const { artist } = await getDashboardArtist('/estudio/editor-video')
  if (!artist) notFound()

  return (
    <StoryStudio
      artistId={artist.id}
      artistName={artist.name}
      artistSlug={artist.slug}
    />
  )
}
