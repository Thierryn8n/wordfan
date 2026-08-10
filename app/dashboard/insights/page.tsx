import { Heart, Eye, FileText, PlaySquare, TrendingUp, Flame } from 'lucide-react'
import { getDashboardArtist, bucketByMonth } from '@/lib/dashboard'
import { DashboardHeader } from '@/components/wordfan/dashboard-header'
import { RevenueAreaChart, TopContentBarChart, TierDonutChart } from '@/components/wordfan/dashboard-charts'
import { VIDEO_CATEGORY_LABELS } from '@/lib/types'
import type { Post, Video } from '@/lib/types'

export const metadata = { title: 'Insights | Painel do Artista' }

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Heart
  label: string
  value: string
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-card p-5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--artist-primary)]/15 text-[var(--artist-primary)]">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <p className="mt-3 font-numeric text-2xl font-black text-[var(--artist-text)]">{value}</p>
      <p className="mt-0.5 text-[9px] font-black tracking-[0.15em] text-[var(--artist-muted)]">
        {label}
      </p>
    </div>
  )
}

export default async function InsightsPage() {
  const { artist, supabase } = await getDashboardArtist('/dashboard/insights')

  if (!artist) {
    return (
      <div className="rounded-3xl border border-white/10 bg-card p-10 text-center">
        <p className="text-sm font-bold text-muted-foreground">Nenhum artista vinculado.</p>
      </div>
    )
  }

  const [{ data: postsRaw }, { data: videosRaw }] = await Promise.all([
    supabase.from('posts').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
    supabase.from('videos').select('*').eq('artist_id', artist.id).order('views_count', { ascending: false }),
  ])
  const posts = (postsRaw ?? []) as Post[]
  const videos = (videosRaw ?? []) as Video[]

  const totalLikes = posts.reduce((a, p) => a + (p.likes_count ?? 0), 0)
  const totalViews = videos.reduce((a, v) => a + (v.views_count ?? 0), 0)
  const exclusiveCount = posts.filter((p) => p.is_exclusive).length
  const exclusiveShare = posts.length ? Math.round((exclusiveCount / posts.length) * 100) : 0

  // Engajamento (curtidas) ao longo dos meses de publicação
  const engagement = bucketByMonth(posts, 'created_at', (p) => p.likes_count ?? 0, 6)

  // Top posts por curtidas
  const topPosts = [...posts]
    .sort((a, b) => (b.likes_count ?? 0) - (a.likes_count ?? 0))
    .slice(0, 6)
    .map((p) => ({ name: p.title ?? 'Sem título', value: p.likes_count ?? 0 }))

  // Top vídeos por visualizações
  const topVideos = videos
    .slice(0, 6)
    .map((v) => ({ name: v.title, value: v.views_count ?? 0 }))

  // Mix de conteúdo por categoria de vídeo
  const catColors: Record<string, string> = {
    clipe: 'var(--artist-primary)',
    show: 'var(--artist-secondary)',
    entrevista: '#8b5cf6',
    bastidores: '#f59e0b',
  }
  const mix = (Object.keys(VIDEO_CATEGORY_LABELS) as Video['category'][])
    .map((cat) => ({
      tier: cat,
      label: VIDEO_CATEGORY_LABELS[cat],
      value: videos.filter((v) => v.category === cat).length,
      color: catColors[cat] ?? 'var(--artist-primary)',
    }))
    .filter((s) => s.value > 0)

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader eyebrow="DESEMPENHO DO CONTEÚDO" title="Insights" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Heart} label="CURTIDAS TOTAIS" value={totalLikes.toLocaleString('pt-BR')} />
        <StatCard icon={Eye} label="VIEWS EM VÍDEOS" value={totalViews.toLocaleString('pt-BR')} />
        <StatCard icon={FileText} label="PUBLICAÇÕES" value={String(posts.length)} />
        <StatCard icon={PlaySquare} label="VÍDEOS" value={String(videos.length)} />
      </div>

      <section className="rounded-3xl border border-white/10 bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="size-4 text-[var(--artist-primary)]" aria-hidden="true" />
          <h2 className="font-serif text-base font-black text-[var(--artist-text)]">
            Engajamento por mês
          </h2>
        </div>
        <RevenueAreaChart data={engagement} />
        <p className="mt-3 text-[10px] font-bold text-[var(--artist-muted)]">
          Curtidas acumuladas nas publicações de cada mês.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Flame className="size-4 text-[var(--artist-primary)]" aria-hidden="true" />
            <h2 className="font-serif text-base font-black text-[var(--artist-text)]">
              Posts mais curtidos
            </h2>
          </div>
          <TopContentBarChart data={topPosts} />
        </section>

        <section className="rounded-3xl border border-white/10 bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Eye className="size-4 text-[var(--artist-primary)]" aria-hidden="true" />
            <h2 className="font-serif text-base font-black text-[var(--artist-text)]">
              Vídeos mais vistos
            </h2>
          </div>
          <TopContentBarChart data={topVideos} />
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="rounded-3xl border border-white/10 bg-card p-6">
          <h2 className="mb-4 font-serif text-base font-black text-[var(--artist-text)]">
            Mix de vídeos
          </h2>
          <TierDonutChart data={mix} />
          <ul className="mt-4 flex flex-col gap-2">
            {mix.map((s) => (
              <li key={s.tier} className="flex items-center gap-2 text-[10px] font-bold">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
                <span className="text-[var(--artist-text)]">{s.label}</span>
                <span className="ml-auto text-[var(--artist-muted)]">{s.value}</span>
              </li>
            ))}
            {mix.length === 0 && (
              <li className="text-[10px] font-bold text-[var(--artist-muted)]">Nenhum vídeo cadastrado.</li>
            )}
          </ul>
        </section>

        <section className="rounded-3xl border border-white/10 bg-card p-6">
          <h2 className="mb-4 font-serif text-base font-black text-[var(--artist-text)]">
            Conteúdo exclusivo
          </h2>
          <div className="flex items-end gap-4">
            <p className="font-numeric text-5xl font-black text-[var(--artist-primary)]">
              {exclusiveShare}%
            </p>
            <p className="pb-2 text-[11px] font-bold leading-relaxed text-[var(--artist-muted)]">
              das suas publicações são exclusivas para membros do fã-clube
              <br />
              <span className="text-[var(--artist-text)]">
                {exclusiveCount} de {posts.length} posts
              </span>
            </p>
          </div>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-[var(--artist-bg)]">
            <div
              className="h-full rounded-full bg-[var(--artist-primary)] transition-all"
              style={{ width: `${exclusiveShare}%` }}
            />
          </div>
          <p className="mt-4 text-[11px] font-bold leading-relaxed text-[var(--artist-muted)]">
            Equilibre conteúdo público (para atrair novos fãs) e exclusivo (para converter e reter
            assinantes). Uma boa referência é manter entre 40% e 60% de conteúdo exclusivo.
          </p>
        </section>
      </div>
    </div>
  )
}
