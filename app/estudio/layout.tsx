import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { DesktopBlocker, DesktopOnly } from '@/components/wordfan/desktop-only'
import { ArtistThemeScope } from '@/components/wordfan/artist-theme-provider'
import { getDashboardArtist } from '@/lib/dashboard'
import { isMobileUserAgent } from '@/lib/is-mobile'

// Layout dedicado, em tela cheia, para o editor de vídeo. Diferente do painel
// (/dashboard), aqui NÃO há a sidebar do artista — o editor tem a sua própria
// navegação, no estilo de um app de edição.
export default async function EstudioLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  if (isMobileUserAgent(h.get('user-agent'))) return <DesktopBlocker />

  const { artist } = await getDashboardArtist('/estudio/editor-video')
  if (!artist) notFound()

  return (
    <DesktopOnly>
      <ArtistThemeScope theme={artist.theme} className="!min-h-0 h-dvh overflow-hidden bg-[#070707]">
        {children}
      </ArtistThemeScope>
    </DesktopOnly>
  )
}
