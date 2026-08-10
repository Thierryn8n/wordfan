import { notFound } from 'next/navigation'
import { getDashboardArtist } from '@/lib/dashboard'
import { DashboardHeader } from '@/components/wordfan/dashboard-header'
import { ContentManager } from '@/components/wordfan/content-manager'
import type {
  GalleryItem,
  Live,
  Plan,
  Post,
  Show,
  Story,
  Video,
} from '@/lib/types'

export const metadata = { title: 'Estúdio — Painel do artista' }

export default async function StudioPage() {
  const { artist, supabase } = await getDashboardArtist('/dashboard/estudio')
  if (!artist) notFound()

  const [
    { data: postsData },
    { data: showsData },
    { data: galleryData },
    { data: videosData },
    { data: storiesData },
    { data: livesData },
    { data: plansData },
  ] = await Promise.all([
    supabase.from('posts').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
    supabase.from('shows').select('*').eq('artist_id', artist.id).order('starts_at', { ascending: true }),
    supabase.from('gallery_items').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
    supabase.from('videos').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
    supabase.from('stories').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
    supabase.from('lives').select('*').eq('artist_id', artist.id).order('scheduled_at', { ascending: false }),
    supabase.from('plans').select('*').eq('artist_id', artist.id).order('price_cents', { ascending: true }),
  ])

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader eyebrow="CRIAÇÃO" title="Estúdio de conteúdo" />
      <p className="-mt-3 text-[10px] font-bold text-[var(--artist-muted)]">
        Feed, Stories (editor visual com textos, emojis e formas), Agenda, Galeria, Vídeos, Lives e
        Fan Club — tudo que aparece no seu perfil público.
      </p>
      <ContentManager
        artistId={artist.id}
        posts={(postsData ?? []) as Post[]}
        shows={(showsData ?? []) as Show[]}
        gallery={(galleryData ?? []) as GalleryItem[]}
        videos={(videosData ?? []) as Video[]}
        stories={(storiesData ?? []) as Story[]}
        lives={(livesData ?? []) as Live[]}
        plans={(plansData ?? []) as Plan[]}
      />
    </div>
  )
}
