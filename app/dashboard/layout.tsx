import Link from 'next/link'
import { headers } from 'next/headers'
import { DesktopBlocker, DesktopOnly } from '@/components/wordfan/desktop-only'
import { ArtistSidebar } from '@/components/wordfan/artist-sidebar'
import { ArtistThemeScope } from '@/components/wordfan/artist-theme-provider'
import { Logo } from '@/components/wordfan/logo'
import { getDashboardArtist, getAllArtists } from '@/lib/dashboard'
import { TOOL_PLANS, type ToolPlan } from '@/lib/artist-theme'
import { isMobileUserAgent } from '@/lib/is-mobile'
import type { ArtistAbout } from '@/lib/types'

export default async function DashboardLayout({ 
  children,
}: { 
  children: React.ReactNode
}) {
  const h = await headers()
  if (isMobileUserAgent(h.get('user-agent'))) return <DesktopBlocker />

  // O artista ativo (para admin) vem do cookie de seleção; o usuário comum
  // sempre resolve o próprio artista. Ver getDashboardArtist.
  const { artist, role, supabase } = await getDashboardArtist('/dashboard')
  const allArtists = role === 'admin' ? await getAllArtists() : []

  // Conta ainda não vinculada a um artista.
  if (!artist) {
    return (
      <DesktopOnly>
        <main className="flex min-h-dvh items-center justify-center bg-background px-6">
          <div className="max-w-sm rounded-[32px] border border-white/8 bg-card p-8 text-center">
            <h1 className="font-serif text-xl font-black tracking-tight">ÁREA DO ARTISTA</h1>
            <p className="mt-3 text-xs font-bold leading-relaxed text-muted-foreground text-pretty">
              Sua conta ainda não está vinculada a um perfil de artista. Fale com a equipe WordFan
              para ativar seu painel.
            </p>
            <Link
              href="/home"
              className="gradient-brand mt-6 inline-block rounded-full px-7 py-3 text-[10px] font-black tracking-[0.2em] text-white"
            >
              VOLTAR PARA A HOME
            </Link>
          </div>
        </main>
      </DesktopOnly>
    )
  }

  const planLabel = TOOL_PLANS[(artist.tool_plan ?? 'basic') as ToolPlan].label
  const logoUrl = (artist as { logo_url?: string | null }).logo_url ?? null

  // Modo de primeiro acesso: o próprio dono ainda não concluiu o cadastro.
  // Nesse estado o gate força o artista para /dashboard/perfil, então recolhemos
  // toda a navegação e mantemos apenas a logo — o foco é preencher o formulário.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const setupPending = Boolean((artist.about as ArtistAbout | null)?.setup_pending)
  const isOwner = Boolean(user?.id && user.id === artist.owner_id)
  const setupMode = setupPending && isOwner

  if (setupMode) {
    return (
      <DesktopOnly>
        <ArtistThemeScope theme={artist.theme}>
          <div className="crm-scope flex min-h-dvh flex-col bg-[var(--artist-bg)]">
            <header className="flex items-center justify-center border-b border-white/8 px-6 py-5">
              <Logo href="/home" className="text-xl" imageUrl={logoUrl || undefined} />
            </header>
            <main className="relative flex-1 overflow-hidden px-6 pb-16 pt-4">
              <div
                className="pointer-events-none absolute -right-44 -top-56 size-[520px] rounded-full bg-[var(--artist-primary)]/[0.045] blur-[140px]"
                aria-hidden="true"
              />
              <div className="relative mx-auto w-full max-w-3xl">{children}</div>
            </main>
          </div>
        </ArtistThemeScope>
      </DesktopOnly>
    )
  }

  return (
    <DesktopOnly>
      <ArtistThemeScope theme={artist.theme}>
        <div className="crm-scope flex min-h-dvh w-full bg-[var(--artist-bg)]">
          <ArtistSidebar
            name={artist.name}
            slug={artist.slug}
            avatarUrl={artist.avatar_url}
            logoUrl={(artist as any).logo_url}
            planLabel={planLabel}
            isAdmin={role === 'admin'}
            allArtists={allArtists}
          />
          <main className="relative min-w-0 flex-1 overflow-hidden px-6 pb-12 pt-8 xl:px-10">
            <div
              className="pointer-events-none absolute -right-44 -top-56 size-[520px] rounded-full bg-[var(--artist-primary)]/[0.045] blur-[140px]"
              aria-hidden="true"
            />
            <div className="relative mx-auto w-full max-w-[1280px]">{children}</div>
          </main>
        </div>
      </ArtistThemeScope>
    </DesktopOnly>
  )
}
