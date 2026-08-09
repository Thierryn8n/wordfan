import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Sora, Space_Grotesk, Playfair_Display, Bebas_Neue } from 'next/font/google'
import { getMyEnterpriseStatus } from '@/lib/enterprise'
import { createClient } from '@/lib/supabase/server'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-body' })
const sora = Sora({ subsets: ['latin'], variable: '--font-display' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-numeric' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })
const bebas = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-bebas' })

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 'default')
    .single()

  const siteName = settings?.site_name || 'WordFan'
  const siteDescription = settings?.site_description || 
    'A plataforma de fan clubs que aproxima fãs e artistas com conteúdo exclusivo, lives e experiências únicas.'
  const faviconUrl = settings?.favicon_url || '/icon.svg'

  return {
    title: `${siteName} — Conecte-se aos seus artistas favoritos`,
    description: siteDescription,
    generator: 'v0.app',
    icons: {
      icon: faviconUrl,
      apple: settings?.favicon_url || '/apple-icon.png',
    },
  }
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0e0e0e',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Contratante Enterprise aprovado => tema holográfico em todo o app
  const enterprise = await getMyEnterpriseStatus()
  const enterpriseTheme = enterprise?.status === 'approved' ? 'enterprise-theme' : ''

  return (
    <html
      lang="pt-BR"
      className={`dark bg-background ${enterpriseTheme} ${inter.variable} ${sora.variable} ${spaceGrotesk.variable} ${playfair.variable} ${bebas.variable}`}
    >
      <body className="antialiased font-sans">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
