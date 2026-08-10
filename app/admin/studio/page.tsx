import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowLeft, ArrowUpRight, BadgeCheck,
  FileText, ImageIcon, PlaySquare, Users,
  CalendarDays, Radio, Star, Palette, TrendingUp,
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

  const posts   = (postsData   as Post[])        ?? []
  const shows   = (showsData   as Show[])        ?? []
  const gallery = (galleryData as GalleryItem[]) ?? []
  const videos  = (videosData  as Video[])       ?? []
  const stories = (storiesData as Story[])       ?? []
  const lives   = (livesData   as Live[])        ?? []
  const plans   = (plansData   as Plan[])        ?? []

  /* managers */
  const serviceKeyConfigured = isServiceRoleConfigured()
  let managers: ManagerRow[] = []
  if (serviceKeyConfigured) {
    const admin = createServiceClient()
    const { data: links } = await admin
      .from('managers')
      .select('user_id, created_at, profile:profiles(display_name)')
      .eq('artist_id', selected.id)
    managers = await Promise.all(
      (links ?? []).map(async (m) => {
        const uid = (m as { user_id: string }).user_id
        const { data: au } = await admin.auth.admin.getUserById(uid)
        return {
          userId: uid,
          email: au?.user?.email ?? '—',
          name:
            ((m as { profile?: { display_name?: string } }).profile?.display_name) ||
            (au?.user?.user_metadata?.display_name as string | undefined) ||
            'Empresário',
        }
      }),
    )
  }

  const stats = [
    { label: 'Posts',      value: posts.length,                                    icon: FileText,    tone: 'text-sky-400 bg-sky-500/10' },
    { label: 'Stories',    value: stories.length,                                  icon: ImageIcon,   tone: 'text-pink-400 bg-pink-500/10' },
    { label: 'Vídeos',     value: videos.length,                                   icon: PlaySquare,  tone: 'text-violet-400 bg-violet-500/10' },
    { label: 'Galeria',    value: gallery.length,                                  icon: ImageIcon,   tone: 'text-amber-400 bg-amber-500/10' },
    { label: 'Shows',      value: shows.length,                                    icon: CalendarDays,tone: 'text-emerald-400 bg-emerald-500/10' },
    { label: 'Lives',      value: lives.length,                                    icon: Radio,       tone: 'text-red-400 bg-red-500/10' },
    { label: 'Planos',     value: plans.length,                                    icon: Star,        tone: 'text-gold bg-gold/10' },
    { label: 'Seguidores', value: selected.followers_count,                        icon: Users,       tone: 'text-primary bg-primary/10' },
  ]

  return (
    <main className="px-6 pb-20 pt-8 xl:px-10">

      {/* ── Header ── */}
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/artists"
            aria-label="Voltar para artistas"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="flex items-center gap-2 text-[9px] font-black tracking-[0.24em] text-primary">
              <Palette className="size-3" aria-hidden="true" />
              STUDIO DO ARTISTA
            </p>
            <h1 className="mt-1.5 font-serif text-3xl font-black tracking-[-0.04em] text-white">
              Estúdio de conteúdo
            </h1>
            <p className="mt-1 text-xs font-medium text-zinc-500">
              Identidade visual, perfil, conteúdo e empresários de{' '}
              <span className="font-bold text-zinc-300">{selected.name}</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/artist/${selected.slug}`}
            target="_blank"
            className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 text-[9px] font-black tracking-[0.13em] text-zinc-300 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            VER PERFIL PÚBLICO
            <ArrowUpRight className="size-3.5 text-primary" aria-hidden="true" />
          </Link>
        </div>
      </header>

      {/* ── Artist identity card ── */}
      <section className="admin-panel mt-7 overflow-hidden p-0">
        {/* banner strip */}
        <div className="relative h-28 w-full overflow-hidden">
          {selected.banner_url ? (
            <Image src={selected.banner_url} alt="" fill className="object-cover opacity-60" sizes="100vw" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090909] via-[#090909]/40 to-transparent" />
        </div>

        {/* info row */}
        <div className="flex flex-wrap items-end gap-4 px-6 pb-5 -mt-8">
          <div className="relative shrink-0">
            <Image
              src={selected.avatar_url || '/placeholder-user.jpg'}
              alt={selected.name}
              width={64} height={64}
              className="size-16 rounded-2xl border-2 border-[#090909] object-cover shadow-xl"
            />
            {selected.is_live && (
              <span className="absolute -bottom-1 -right-1 flex items-center gap-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[7px] font-black text-white">
                <span className="size-1.5 animate-pulse rounded-full bg-white" />
                LIVE
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1 pb-0.5">
            <p className="flex items-center gap-2 font-serif text-lg font-black tracking-tight text-white">
              {selected.name}
              <BadgeCheck className="size-4 shrink-0 text-primary" />
            </p>
            <p className="mt-0.5 text-[9px] font-bold text-zinc-500">
              @{selected.slug}
              {selected.genre ? ` · ${selected.genre}` : ''}
              {selected.city ? ` · ${selected.city}${selected.state ? `/${selected.state}` : ''}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 pb-0.5">
            <span className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-1.5 text-[8px] font-black tracking-[0.1em] text-emerald-400">
              <TrendingUp className="size-3" />
              {selected.followers_count.toLocaleString('pt-BR')} FÃS
            </span>
            <span className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[8px] font-black tracking-[0.1em] text-zinc-500">
              PLANO {selected.tool_plan.toUpperCase()}
            </span>
            <Link
              href="/admin/artists"
              className="rounded-xl border border-primary/20 bg-primary/[0.07] px-3 py-1.5 text-[8px] font-black tracking-[0.1em] text-primary transition-colors hover:bg-primary/15"
            >
              TROCAR
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section
        aria-label="Estatísticas de conteúdo"
        className="mt-5 grid grid-cols-4 gap-3 xl:grid-cols-8"
      >
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className="admin-panel p-4">
            <span className={`flex size-8 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="size-3.5" aria-hidden="true" />
            </span>
            <p className="font-numeric mt-4 text-xl font-bold leading-none text-white">
              {value >= 1000
                ? `${(value / 1000).toFixed(1)}k`
                : value}
            </p>
            <p className="admin-eyebrow mt-1.5">{label.toUpperCase()}</p>
          </article>
        ))}
      </section>

      {/* ── Studio editor ── */}
      <div className="mt-5">
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
      </div>

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
