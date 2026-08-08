import Link from 'next/link'
import { headers } from 'next/headers'
import { DesktopBlocker, DesktopOnly } from '@/components/wordfan/desktop-only'
import { ArtistSidebar } from '@/components/wordfan/artist-sidebar'
import { ArtistThemeScope } from '@/components/wordfan/artist-theme-provider'
import { getDashboardArtist } from '@/lib/dashboard'
import { TOOL_PLANS, type ToolPlan } from '@/lib/artist-theme'
import { isMobileUserAgent } from '@/lib/is-mobile'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  if (isMobileUserAgent(h.get('user-agent'))) return <DesktopBlocker />

  const { artist } = await getDashboardArtist('/dashboard')

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

  return (
    <DesktopOnly>
      <ArtistThemeScope theme={artist.theme}>
        <div className="mx-auto flex w-full max-w-[1500px] gap-5 px-4 pb-6">
          <ArtistSidebar
            name={artist.name}
            slug={artist.slug}
            avatarUrl={artist.avatar_url}
            planLabel={planLabel}
          />
          <main className="min-w-0 flex-1 py-4">{children}</main>
        </div>
      </ArtistThemeScope>
    </DesktopOnly>
  )
}
