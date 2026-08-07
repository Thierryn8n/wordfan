import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Sora, Space_Grotesk, Playfair_Display, Bebas_Neue } from 'next/font/google'
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
  themeColor: '#0e0e0e',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`dark bg-background ${inter.variable} ${sora.variable} ${spaceGrotesk.variable} ${playfair.variable} ${bebas.variable}`}
    >
      <body className="antialiased font-sans">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
