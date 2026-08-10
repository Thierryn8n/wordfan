import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowLeft, ArrowUpRight, BadgeCheck, Palette,
  FileText, Image as ImageIcon, PlaySquare, Users,
  Calendar, Radio, Star, TrendingUp,
} from 'lucide-react'
import { ContentManager } from '@/components/wordfan/content-manager'
import { createServiceClient, isServiceRoleConfigured } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Artist, GalleryItem, Live, Plan, Post, Show, Story, Video } from '@/lib/types'
import { ManagerSection, type ManagerRow } from './manager-section'
import { StudioEditor } from './studio-editor'

export const metadata = { title: 'Studio — ADM WordFan' }

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ artist?: string }>
}) {
  const { artist: selectedSlug } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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

  const posts = (postsData as Post[]) ?? []
  const shows = (showsData as Show[]) ?? []
  const gallery = (galleryData as GalleryItem[]) ?? []
  const videos = (videosData as Video[]) ?? []
  const stories = (storiesData as Story[]) ?? []
  const lives = (livesData as Live[]) ?? []
  const plans = (plansData as Plan[]) ?? []

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

  // stats cards
  const stats = [
    { label: 'Posts', value: posts.length, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Stories', value: stories.length, icon: ImageIcon, color: 'text-pink-400', bg: 'bg-pink-400/10' },
    { label: 'Vídeos', value: videos.length, icon: PlaySquare, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Galeria', value: gallery.length, icon: ImageIcon, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Shows', value: shows.length, icon: Calendar, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: 'Lives', value: lives.length, icon: Radio, color: 'text-red-400', bg: 'bg-red-400/10' },
    { label: 'Planos', value: plans.length, icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Seguidores', value: selected.followers_count, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
  ]

  return (
    <main className="min-h-screen px-6 pb-20 pt-0 xl:px-10">

      {/* ── Hero banner ── */}
      <div className="relative -mx-6 mb-8 h-52 overflow-hidden xl:-mx-10">
        {selected.banner_url ? (
          <Image
            src={selected.banner_url}
            alt=""
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-primary/10 to-transparent" />
        )}
        {/* overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/80 to-transparent" />

        {/* back button */}
        <div className="absolute left-6 top-6 xl:left-10">
          <Link
            href="/admin/artists"
            className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-4 py-2 text-[9px] font-black tracking-[0.15em] text-zinc-300 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="size-3.5" />
            ARTISTAS
          </Link>
        </div>

        {/* Artist identity over banner */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end gap-5 px-6 pb-6 xl:px-10">
          <div className="relative shrink-0">
            <Image
              src={selected.avatar_url || '/placeholder-user.jpg'}
              alt={selected.name}
              width={72}
              height={72}
              className="size-18 rounded-2xl border-2 border-white/20 object-cover shadow-xl"
            />
            {selected.is_live && (
              <span className="absolute -bottom-1 -right-1 flex items-center gap-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[7px] font-black text-white shadow">
                <span className="size-1.5 animate-pulse rounded-full bg-white" />
                AO VIVO
              </span>
            )}
          </div>
          <div className="mb-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-black tracking-tight text-white drop-shadow-lg">
                {selected.name}
              </h1>
              <BadgeCheck className="size-5 shrink-0 text-primary" />
            </div>
            <p className="mt-0.5 text-[9px] font-bold text-zinc-400">
              @{selected.slug}
              {selected.genre ? ` · ${selected.genre}` : ''}
              {selected.city ? ` · ${selected.city}${selected.state ? `/${selected.state}` : ''}` : ''}
            </p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 pb-1">
            <span className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-[8px] font-black tracking-[0.12em] text-zinc-400 backdrop-blur-sm">
              PLANO {selected.tool_plan.toUpperCase()}
            </span>
            <Link
              href={`/artist/${selected.slug}`}
              target="_blank"
              className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/[0.12] px-3 py-1.5 text-[8px] font-black tracking-[0.12em] text-primary backdrop-blur-sm transition-colors hover:bg-primary/20"
            >
              VER PERFIL
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="mb-8 grid grid-cols-4 gap-3 xl:grid-cols-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="admin-panel flex flex-col gap-2 p-4">
            <div className={`flex size-8 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`size-4 ${color}`} />
            </div>
            <p className="font-numeric text-xl font-black text-white leading-none">
              {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
            </p>
            <p className="text-[8px] font-black tracking-[0.12em] text-zinc-500">{label.toUpperCase()}</p>
          </div>
        ))}
      </div>

      {/* ── Eyebrow ── */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15">
            <Palette className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-[8px] font-black tracking-[0.2em] text-primary">ESTÚDIO DO ARTISTA</p>
            <p className="text-sm font-black text-white">Identidade visual, perfil e conteúdo</p>
          </div>
        </div>
        <div className="ml-auto">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1.5">
            <TrendingUp className="size-3 text-emerald-400" />
            <span className="text-[8px] font-black tracking-[0.1em] text-emerald-400">
              {selected.followers_count.toLocaleString('pt-BR')} SEGUIDORES
            </span>
          </div>
        </div>
      </div>

      {/* ── Studio editor ── */}
      <StudioEditor
        key={selected.id}
        artist={selected}
        contentSlot={
          <ContentManager
            artistId={selected.id}
            posts={posts}
            shows={shows}
            gallery={gallery}
            videos={videos}
            stories={stories}
            lives={lives}
            plans={plans}
          />
        }
      />

      {/* ── Manager section ── */}
      <ManagerSection
        artistId={selected.id}
        artistName={selected.name}
        managers={managers}
        serviceKeyConfigured={serviceKeyConfigured}
      />
    </main>
  )
}
