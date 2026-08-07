import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Sora, Space_Grotesk, Playfair_Display, Bebas_Neue } from 'next/font/google'
import { getMyEnterpriseStatus } from '@/lib/enterprise'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-body' })
const sora = Sora({ subsets: ['latin'], variable: '--font-display' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-numeric' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })
const bebas = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-bebas' })

export const metadata: Metadata = {
  title: 'WordFan — Conecte-se aos seus artistas favoritos',
  description:
    'A plataforma de fan clubs que aproxima fãs e artistas com conteúdo exclusivo, lives e experiências únicas.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#000000',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Contratante Enterprise aprovado => tema holográfico em todo o app.
  // Nunca deixa a checagem derrubar o layout (ex.: Supabase indisponível).
  let enterpriseTheme = ''
  try {
    const enterprise = await getMyEnterpriseStatus()
    enterpriseTheme = enterprise?.status === 'approved' ? 'enterprise-theme' : ''
  } catch {
    enterpriseTheme = ''
  }

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
