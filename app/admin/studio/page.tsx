import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Palette } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient, isServiceRoleConfigured } from '@/lib/supabase/admin'
import type { Artist, GalleryItem, Live, Plan, Post, Show, Story, Video } from '@/lib/types'
import { ContentManager } from '@/components/wordfan/content-manager'
import { StudioEditor } from './studio-editor'
import { ManagerSection, type ManagerRow } from './manager-section'

export const metadata = { title: 'Studio do Artista — ADM WordFan' }

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ artist?: string }>
}) {
  const { artist: selectedSlug } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin/studio')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/home')

  // Sem artista selecionado → vai para a lista de artistas
  if (!selectedSlug) redirect('/admin/artists')

  const { data: artistData } = await supabase.from('artists').select('*').eq('slug', selectedSlug).single()
  const selected = (artistData as Artist | null) ?? null
  if (!selected) redirect('/admin/artists')

  // Conteúdo do artista para o CRUD
  const [
    { data: postsData },
    { data: showsData },
    { data: galleryData },
    { data: videosData },
    { data: storiesData },
    { data: livesData },
    { data: plansData },
  ] = await Promise.all([
    supabase.from('posts').select('*').eq('artist_id', selected.id).order('created_at', { ascending: false }),
    supabase.from('shows').select('*').eq('artist_id', selected.id).order('starts_at', { ascending: true }),
    supabase.from('gallery_items').select('*').eq('artist_id', selected.id).order('created_at', { ascending: false }),
    supabase.from('videos').select('*').eq('artist_id', selected.id).order('created_at', { ascending: false }),
    supabase.from('stories').select('*').eq('artist_id', selected.id).order('created_at', { ascending: false }),
    supabase.from('lives').select('*').eq('artist_id', selected.id).order('scheduled_at', { ascending: false }),
    supabase.from('plans').select('*').eq('artist_id', selected.id).order('price_cents', { ascending: true }),
  ])

  // Empresários vinculados a este artista (admin usa service client para ler emails).
  // A service role key pode não estar configurada — nesse caso a seção degrada
  // graciosamente em vez de derrubar a página inteira.
  const serviceKeyConfigured = isServiceRoleConfigured()
  let managers: ManagerRow[] = []
  if (serviceKeyConfigured) {
    const admin = createServiceClient()
    const { data: managerLinks } = await admin
      .from('managers')
      .select('user_id, created_at, profile:profiles(display_name)')
      .eq('artist_id', selected.id)
    managers = await Promise.all(
      (managerLinks ?? []).map(async (m) => {
        const { data: u } = await admin.auth.admin.getUserById((m as { user_id: string }).user_id)
        return {
          userId: (m as { user_id: string }).user_id,
          email: u?.user?.email ?? '—',
          name:
            ((m as { profile?: { display_name?: string } }).profile?.display_name) ||
            (u?.user?.user_metadata?.display_name as string | undefined) ||
            'Empresário',
        }
      }),
    )
  }

  return (
    <div className="min-h-dvh bg-background pb-16">
      <header className="border-b border-white/8 bg-card/50 px-6 py-6 md:px-10">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <Link
            href="/admin/artists"
            aria-label="Voltar para a lista de artistas"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/8 bg-card"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[9px] font-black tracking-[0.3em] text-primary">
              <Palette className="size-3.5" aria-hidden="true" />
              ADM — STUDIO DO ARTISTA
            </p>
            <h1 className="mt-1 font-serif text-2xl font-black tracking-tight">
              IDENTIDADE VISUAL E CONFIGURAÇÕES
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-8 md:px-10">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-bold">
            Editando: <span className="font-serif font-black text-primary">{selected.name}</span>
          </p>
          <Link
            href="/admin/artists"
            className="shrink-0 rounded-full border border-white/8 bg-card px-5 py-2.5 text-[9px] font-black tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground"
          >
            TROCAR ARTISTA
          </Link>
        </div>

        <StudioEditor
          key={selected.id}
          artist={selected}
          contentSlot={
            <ContentManager
              artistId={selected.id}
              posts={(postsData as Post[]) ?? []}
              shows={(showsData as Show[]) ?? []}
              gallery={(galleryData as GalleryItem[]) ?? []}
              videos={(videosData as Video[]) ?? []}
              stories={(storiesData as Story[]) ?? []}
              lives={(livesData as Live[]) ?? []}
              plans={(plansData as Plan[]) ?? []}
            />
          }
        />

        <ManagerSection
          artistId={selected.id}
          artistName={selected.name}
          managers={managers}
          serviceKeyConfigured={serviceKeyConfigured}
        />
      </main>
    </div>
  )
}
