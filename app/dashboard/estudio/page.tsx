import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  FileText, Clapperboard, PlaySquare, Images,
  CalendarDays, Radio, Sparkles, ArrowUpRight,
} from 'lucide-react'
import { getDashboardArtist } from '@/lib/dashboard'
import { ContentManager } from '@/components/wordfan/content-manager'
import type {
  GalleryItem,
  Live,
  Plan,
  Post,
  Show,
  Song,
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
    { data: songsData },
  ] = await Promise.all([
    supabase.from('posts').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
    supabase.from('shows').select('*').eq('artist_id', artist.id).order('starts_at', { ascending: true }),
    supabase.from('gallery_items').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
    supabase.from('videos').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
    supabase.from('stories').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
    supabase.from('lives').select('*').eq('artist_id', artist.id).order('scheduled_at', { ascending: false }),
    supabase.from('plans').select('*').eq('artist_id', artist.id).order('price_cents', { ascending: true }),
    supabase.from('songs').select('*').eq('artist_id', artist.id).order('rank', { ascending: true }),
  ])

  const posts   = (postsData   ?? []) as Post[]
  const shows   = (showsData   ?? []) as Show[]
  const gallery = (galleryData ?? []) as GalleryItem[]
  const videos  = (videosData  ?? []) as Video[]
  const stories = (storiesData ?? []) as Story[]
  const lives   = (livesData   ?? []) as Live[]
  const plans   = (plansData   ?? []) as Plan[]
  const songs   = (songsData   ?? []) as Song[]

  const totalContent =
    posts.length + stories.length + videos.length +
    gallery.length + shows.length + lives.length

  const stats = [
    { label: 'Posts',   value: posts.length,   icon: FileText },
    { label: 'Stories', value: stories.length, icon: Clapperboard },
    { label: 'Vídeos',  value: videos.length,  icon: PlaySquare },
    { label: 'Galeria', value: gallery.length, icon: Images },
    { label: 'Shows',   value: shows.length,   icon: CalendarDays },
    { label: 'Lives',   value: lives.length,   icon: Radio },
  ]

  return (
    <div className="flex flex-col gap-6">

      {/* ── Hero header ── */}
      <header className="artist-dashboard-panel relative overflow-hidden p-6 xl:p-7">
        <div
          className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-[var(--artist-primary)]/12 blur-[110px]"
          aria-hidden="true"
        />

        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="artist-dashboard-eyebrow flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[var(--artist-primary)]" aria-hidden="true" />
              CRIAÇÃO
            </p>
            <h1 className="mt-2 font-serif text-3xl font-black tracking-[-0.03em] text-[var(--artist-text)] text-balance">
              Estúdio de conteúdo
            </h1>
            <p className="mt-2 max-w-xl text-xs font-medium leading-relaxed text-[var(--artist-muted)] text-pretty">
              Crie e organize tudo que aparece no seu perfil público — Feed, Stories, Agenda,
              Galeria, Vídeos, Lives e Fan Club — em um só lugar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={`/artist/${artist.slug}`}
              target="_blank"
              className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[10px] font-black tracking-[0.14em] text-[var(--artist-text)] transition-colors hover:bg-white/[0.08]"
            >
              VER PERFIL
              <ArrowUpRight className="size-3.5 text-[var(--artist-primary)]" aria-hidden="true" />
            </Link>
            <Link
              href="/estudio/editor-video"
              className="artist-gradient flex h-10 items-center gap-2 rounded-xl px-4 text-[10px] font-black tracking-[0.14em] text-white shadow-[0_12px_30px_-12px_var(--artist-primary)] transition-transform hover:scale-[1.02]"
            >
              <Sparkles className="size-3.5" aria-hidden="true" />
              CRIAR STORY
            </Link>
          </div>
        </div>

        {/* stats strip */}
        <div className="relative mt-6 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
          {stats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5 transition-colors hover:border-[var(--artist-primary)]/25"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--artist-primary)]/12 text-[var(--artist-primary)]">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <p className="font-numeric mt-3 text-2xl font-black leading-none text-[var(--artist-text)]">
                {value}
              </p>
              <p className="mt-1 text-[9px] font-black tracking-[0.14em] text-[var(--artist-muted)]">
                {label.toUpperCase()}
              </p>
            </div>
          ))}
        </div>

        {/* footer line */}
        <p className="relative mt-5 border-t border-white/[0.06] pt-4 text-[10px] font-bold text-[var(--artist-muted)]">
          {totalContent === 0 ? (
            <>Nenhuma publicação ainda — comece criando seu primeiro conteúdo.</>
          ) : (
            <>
              <span className="text-[var(--artist-text)]">{totalContent}</span> publicaç
              {totalContent === 1 ? 'ão' : 'ões'} no perfil de{' '}
              <span className="text-[var(--artist-text)]">{artist.name}</span>.
            </>
          )}
        </p>
      </header>

      <ContentManager
        artistId={artist.id}
        posts={posts}
        shows={shows}
        gallery={gallery}
        videos={videos}
        stories={stories}
        lives={lives}
        plans={plans}
        songs={songs}
      />
    </div>
  )
}
