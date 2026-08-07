import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Palette } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Artist } from '@/lib/types'
import { StudioEditor } from './studio-editor'

export const metadata = { title: 'Studio do Artista — ADM WordFan' }

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ artist?: string }>
}) {
  const { artist: selectedSlug } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin/studio')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/home')

  // Sem artista selecionado → vai para a lista de artistas
  if (!selectedSlug) redirect('/admin/artists')

  const { data: artistData } = await supabase.from('artists').select('*').eq('slug', selectedSlug).single()
  const selected = (artistData as Artist | null) ?? null
  if (!selected) redirect('/admin/artists')

  return (
    <div className="min-h-dvh bg-background pb-16">
      <header className="border-b border-white/8 bg-card/50 px-6 py-6 md:px-10">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <Link
            href="/admin/artists"
            aria-label="Voltar para a lista de artistas"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/8 bg-card"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[9px] font-black tracking-[0.3em] text-primary">
              <Palette className="size-3.5" aria-hidden="true" />
              ADM — STUDIO DO ARTISTA
            </p>
            <h1 className="mt-1 font-serif text-2xl font-black tracking-tight">
              IDENTIDADE VISUAL E CONFIGURAÇÕES
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-8 md:px-10">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-bold">
            Editando: <span className="font-serif font-black text-primary">{selected.name}</span>
          </p>
          <Link
            href="/admin/artists"
            className="shrink-0 rounded-full border border-white/8 bg-card px-5 py-2.5 text-[9px] font-black tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground"
          >
            TROCAR ARTISTA
          </Link>
        </div>

        <StudioEditor key={selected.id} artist={selected} />
      </main>
    </div>
  )
}
