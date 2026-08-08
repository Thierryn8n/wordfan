import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import {
  ArrowLeft,
  Users,
  TrendingUp,
  FileText,
  ExternalLink,
  Briefcase,
  Building2,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/wordfan/logo'
import { ArtistThemeScope } from '@/components/wordfan/artist-theme-provider'
import { ContentManager } from '@/components/wordfan/content-manager'
import { getManagedArtists } from '@/lib/enterprise'
import {
  formatPrice,
  type Artist,
  type EnterpriseLead,
  type GalleryItem,
  type Plan,
  type Post,
  type Show,
  type Story,
  type Subscription,
  type Video,
} from '@/lib/types'

export const metadata = { title: 'Painel do Empresário — WordFan' }

const LEAD_STATUS: Record<EnterpriseLead['status'], { label: string; cls: string }> = {
  pending_payment: { label: 'AGUARDANDO PAGAMENTO', cls: 'bg-amber-500/15 text-amber-400' },
  waitlist: { label: 'NA LISTA DE ESPERA', cls: 'bg-sky-500/15 text-sky-400' },
  approved: { label: 'APROVADO', cls: 'bg-emerald-500/15 text-emerald-400' },
  rejected: { label: 'RECUSADO', cls: 'bg-rose-500/15 text-rose-400' },
}

export default async function ManagerPage({
  searchParams,
}: {
  searchParams: Promise<{ artist?: string }>
}) {
  const { artist: selectedSlug } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/manager')

  const artists = await getManagedArtists(user.id)

  // Nenhum artista sob gestão
  if (artists.length === 0) {
    return (
      <main className="crm-scope flex min-h-dvh items-center justify-center bg-background px-6">
        <div className="max-w-sm rounded-[14px] border border-white/8 bg-card p-8 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/15">
            <Briefcase className="size-6 text-primary" aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-serif text-xl font-black tracking-tight">PAINEL DO EMPRESÁRIO</h1>
          <p className="mt-3 text-xs font-bold leading-relaxed text-muted-foreground text-pretty">
            Sua conta ainda não gerencia nenhum artista. A equipe WordFan vincula você a um artista
            para liberar este painel.
          </p>
          <Link
            href="/home"
            className="gradient-brand mt-6 inline-block rounded-full px-7 py-3 text-[10px] font-black tracking-[0.2em] text-white"
          >
            VOLTAR PARA A HOME
          </Link>
        </div>
      </main>
    )
  }

  const selected = selectedSlug ? artists.find((a) => a.slug === selectedSlug) ?? null : null

  // ===== Lista de artistas geridos =====
  if (!selected) {
    return (
      <div className="crm-scope min-h-dvh bg-background pb-16">
        <header className="border-b border-white/8 bg-card/50 px-6 py-5 md:px-10">
          <div className="mx-auto flex max-w-5xl items-center gap-4">
            <Logo href="/home" className="text-xl" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[9px] font-black tracking-[0.28em] text-muted-foreground">
                <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                PAINEL DO EMPRESÁRIO
              </p>
              <h1 className="mt-1 font-serif text-xl font-black tracking-tight">SEUS ARTISTAS</h1>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-6 pt-8 md:px-10">
          <div className="grid gap-4 sm:grid-cols-2">
            {artists.map((a) => (
              <Link
                key={a.id}
                href={`/manager?artist=${a.slug}`}
                className="group flex items-center gap-4 rounded-[12px] border border-white/8 bg-card p-4 transition-colors hover:border-primary/40"
              >
                <Image
                  src={a.avatar_url || '/placeholder.svg?height=64&width=64'}
                  alt=""
                  width={56}
                  height={56}
                  className="size-14 rounded-[10px] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-lg font-black">{a.name}</p>
                  <p className="mt-0.5 text-[10px] font-black tracking-[0.15em] text-muted-foreground">
                    {a.followers_count.toLocaleString('pt-BR')} FÃS · @{a.slug}
                  </p>
                </div>
                <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </main>
      </div>
    )
  }

  // ===== Detalhe do artista gerido =====
  const artist = selected as Artist
  const [
    { data: subsData },
    { data: postsData },
    { data: showsData },
    { data: galleryData },
    { data: videosData },
    { data: storiesData },
    { data: plansData },
    { data: leadsData },
  ] = await Promise.all([
    supabase.from('subscriptions').select('*, plan:plans(*)').eq('artist_id', artist.id).eq('status', 'active'),
    supabase.from('posts').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
    supabase.from('shows').select('*').eq('artist_id', artist.id).order('starts_at', { ascending: true }),
    supabase.from('gallery_items').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
    supabase.from('videos').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
    supabase.from('stories').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
    supabase.from('plans').select('*').eq('artist_id', artist.id).order('price_cents', { ascending: true }),
    supabase.from('enterprise_leads').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
  ])

  const subs = (subsData ?? []) as (Subscription & { plan: Plan })[]
  const posts = (postsData ?? []) as Post[]
  const leads = (leadsData ?? []) as EnterpriseLead[]

  const stats = [
    { label: 'ASSINANTES', value: subs.length.toLocaleString('pt-BR'), icon: Users },
    { label: 'PUBLICAÇÕES', value: posts.length.toLocaleString('pt-BR'), icon: FileText },
    { label: 'SEGUIDORES', value: artist.followers_count.toLocaleString('pt-BR'), icon: TrendingUp },
    { label: 'LEADS ENTERPRISE', value: leads.length.toLocaleString('pt-BR'), icon: Building2 },
  ]

  return (
    <ArtistThemeScope theme={artist.theme}>
      <div className="crm-scope min-h-dvh bg-background pb-16">
        <header className="border-b border-white/8 bg-card/50 px-6 py-5 md:px-10">
          <div className="mx-auto flex max-w-6xl items-center gap-4">
            <Link
              href="/manager"
              aria-label="Voltar para seus artistas"
              className="flex size-9 shrink-0 items-center justify-center rounded-[8px] border border-white/8 bg-card"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[9px] font-black tracking-[0.28em] text-muted-foreground">
                <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                EMPRESÁRIO — GESTÃO
              </p>
              <h1 className="mt-1 truncate font-serif text-xl font-black tracking-tight">
                {artist.name.toUpperCase()}
              </h1>
            </div>
            <Link
              href={`/artist/${artist.slug}`}
              className="flex shrink-0 items-center gap-2 rounded-[8px] border border-white/8 bg-card px-4 py-2 text-[9px] font-black tracking-[0.15em] transition-colors hover:bg-secondary"
            >
              VER PERFIL
              <ExternalLink className="size-3" aria-hidden="true" />
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 pt-8 md:px-10">
          <section aria-label="Métricas" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="crm-card p-4">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-[7px] bg-primary/10">
                    <Icon className="size-3.5 text-primary" aria-hidden="true" />
                  </span>
                  <p className="text-[8px] font-black tracking-[0.18em] text-muted-foreground">
                    {label}
                  </p>
                </div>
                <p className="mt-3 font-numeric text-2xl font-bold">{value}</p>
              </div>
            ))}
          </section>

          {/* Leads Enterprise deste artista */}
          <section aria-labelledby="leads-h" className="mt-8">
            <h2 id="leads-h" className="crm-section-title">
              PROPOSTAS ENTERPRISE (EMPRESAS INTERESSADAS)
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {leads.length === 0 && (
                <li className="rounded-[10px] border border-dashed border-white/10 p-6 text-center text-[11px] font-bold text-muted-foreground">
                  Nenhuma empresa entrou em contato ainda.
                </li>
              )}
              {leads.map((l) => {
                const st = LEAD_STATUS[l.status]
                const showContact = l.status === 'approved'
                return (
                  <li key={l.id} className="crm-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-serif text-base font-black">{l.company_name}</p>
                        <p className="mt-0.5 font-numeric text-[10px] font-bold tracking-[0.1em] text-muted-foreground">
                          CNPJ {l.cnpj}
                          {l.segment ? ` · ${l.segment}` : ''}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1.5 text-[8px] font-black tracking-[0.15em] ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                    {l.message && (
                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{l.message}</p>
                    )}
                    {showContact ? (
                      <div className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <p className="w-full text-[9px] font-black tracking-[0.2em] text-emerald-400">
                          CONTATO LIBERADO
                        </p>
                        <span className="text-xs font-bold">{l.contact_name}</span>
                        <span className="text-xs font-bold text-muted-foreground">· {l.contact_email}</span>
                        <span className="text-xs font-bold text-muted-foreground">· {l.contact_phone}</span>
                        {l.budget_cents ? (
                          <span className="text-xs font-bold text-primary">
                            · Orçamento {formatPrice(l.budget_cents)}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-4 text-[10px] font-bold text-muted-foreground">
                        Os dados de contato são liberados após a aprovação do administrador.
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>

          {/* Gestão de conteúdo completa */}
          <section aria-labelledby="mgr-content-h" className="mt-8">
            <h2 id="mgr-content-h" className="crm-section-title">
              GERENCIAR CONTEÚDO
            </h2>
            <p className="mt-1 text-[10px] font-bold text-muted-foreground/70">
              Feed, Stories, Agenda, Galeria, Vídeos e Fan Club do artista.
            </p>
            <div className="mt-3">
              <ContentManager
                artistId={artist.id}
                posts={posts}
                shows={(showsData as Show[]) ?? []}
                gallery={(galleryData as GalleryItem[]) ?? []}
                videos={(videosData as Video[]) ?? []}
                stories={(storiesData as Story[]) ?? []}
                plans={(plansData as Plan[]) ?? []}
              />
            </div>
          </section>
        </main>
      </div>
    </ArtistThemeScope>
  )
}
