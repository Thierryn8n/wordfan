import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, BadgeCheck, Palette } from 'lucide-react'
import { ContentManager } from '@/components/wordfan/content-manager'
import { createServiceClient, isServiceRoleConfigured } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Artist, GalleryItem, Live, Plan, Post, Show, Story, Video } from '@/lib/types'
import { ManagerSection, type ManagerRow } from './manager-section'
import { StudioEditor } from './studio-editor'

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
  if (!selectedSlug) redirect('/admin/artists')

  const { data: artistData } = await supabase.from('artists').select('*').eq('slug', selectedSlug).single()
  const selected = (artistData as Artist | null) ?? null
  if (!selected) redirect('/admin/artists')

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

  const serviceKeyConfigured = isServiceRoleConfigured()
  let managers: ManagerRow[] = []
  if (serviceKeyConfigured) {
    const admin = createServiceClient()
    const { data: managerLinks } = await admin
      .from('managers')
      .select('user_id, created_at, profile:profiles(display_name)')
      .eq('artist_id', selected.id)
    managers = await Promise.all(
      (managerLinks ?? []).map(async (manager) => {
        const userId = (manager as { user_id: string }).user_id
        const { data: managedUser } = await admin.auth.admin.getUserById(userId)
        return {
          userId,
          email: managedUser?.user?.email ?? '—',
          name:
            ((manager as { profile?: { display_name?: string } }).profile?.display_name) ||
            (managedUser?.user?.user_metadata?.display_name as string | undefined) ||
            'Empresário',
        }
      }),
    )
  }

  return (
    <main className="px-6 pb-16 pt-8 xl:px-10">
      <header className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/artists"
            aria-label="Voltar para a lista de artistas"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>
          <div>
            <p className="flex items-center gap-2 text-[9px] font-black tracking-[0.22em] text-primary">
              <Palette className="size-3.5" aria-hidden="true" />
              STUDIO DO ARTISTA
            </p>
            <h1 className="mt-2 font-serif text-3xl font-black tracking-[-0.04em] text-white">
              Perfil, identidade e conteúdo
            </h1>
          </div>
        </div>
        <Link
          href={`/artist/${selected.slug}`}
          className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 text-[9px] font-black tracking-[0.13em] text-zinc-300 transition-colors hover:bg-white/[0.07] hover:text-white"
        >
          VER PERFIL PÚBLICO
          <ArrowUpRight className="size-3.5 text-primary" aria-hidden="true" />
        </Link>
      </header>

      <section className="admin-panel mt-7 flex flex-wrap items-center gap-4 p-4">
        <Image
          src={selected.avatar_url || '/placeholder-user.jpg'}
          alt=""
          width={64}
          height={64}
          className="size-16 rounded-2xl border border-primary/25 object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-black text-white">
            {selected.name}
            <BadgeCheck className="size-4 text-primary" aria-hidden="true" />
          </p>
          <p className="mt-1 text-[9px] font-bold text-zinc-500">
            @{selected.slug} · {selected.genre || 'Gênero não informado'} ·{' '}
            {selected.followers_count.toLocaleString('pt-BR')} seguidores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-[8px] font-black tracking-[0.13em] text-zinc-500">
            PLANO {selected.tool_plan.toUpperCase()}
          </span>
          <Link
            href="/admin/artists"
            className="rounded-xl border border-primary/20 bg-primary/[0.06] px-4 py-2.5 text-[8px] font-black tracking-[0.13em] text-primary"
          >
            TROCAR ARTISTA
          </Link>
        </div>
      </section>

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
  )
}
