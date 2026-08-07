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

  const { data: artistsData } = await supabase.from('artists').select('*').order('name')
  const artists = (artistsData ?? []) as Artist[]

  const selected = artists.find((a) => a.slug === selectedSlug) ?? artists[0] ?? null

  return (
    <div className="min-h-dvh bg-background pb-16">
      <header className="border-b border-white/8 bg-card/50 px-6 py-6 md:px-10">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <Link
            href="/admin"
            aria-label="Voltar para o painel admin"
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
        {/* Seletor de artista */}
        <nav aria-label="Selecionar artista" className="scrollbar-none -mx-6 flex gap-3 overflow-x-auto px-6 md:mx-0 md:px-0">
          {artists.map((a) => (
            <Link
              key={a.id}
              href={`/admin/studio?artist=${a.slug}`}
              aria-current={selected?.id === a.id ? 'page' : undefined}
              className={
                selected?.id === a.id
                  ? 'gradient-brand shrink-0 rounded-full px-6 py-3 text-[10px] font-black tracking-[0.15em] text-white'
                  : 'shrink-0 rounded-full border border-white/8 bg-card px-6 py-3 text-[10px] font-black tracking-[0.15em] text-muted-foreground'
              }
            >
              {a.name.toUpperCase()}
            </Link>
          ))}
        </nav>

        {selected ? (
          <StudioEditor key={selected.id} artist={selected} />
        ) : (
          <p className="mt-10 text-sm text-muted-foreground">Nenhum artista cadastrado.</p>
        )}
      </main>
    </div>
  )
}
