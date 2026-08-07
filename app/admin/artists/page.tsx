import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Mic2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Artist } from '@/lib/types'
import { ArtistsManager } from './artists-manager'

export const metadata = { title: 'Artistas — ADM WordFan' }

export default async function AdminArtistsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin/artists')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/home')

  const { data: artistsData } = await supabase
    .from('artists')
    .select('*, subscriptions(count), transactions(artist_net_cents, platform_fee_cents)')
    .order('name')

  const artists = (artistsData ?? []).map((a) => {
    const subs = (a.subscriptions as { count: number }[] | null)?.[0]?.count ?? 0
    const txs = (a.transactions as { artist_net_cents: number; platform_fee_cents: number }[] | null) ?? []
    const revenueCents = txs.reduce((s, t) => s + t.artist_net_cents + t.platform_fee_cents, 0)
    const { subscriptions: _s, transactions: _t, ...artist } = a
    return { ...(artist as Artist), subscribers: subs, revenueCents }
  })

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
              <Mic2 className="size-3.5" aria-hidden="true" />
              ADM — GESTÃO DE ARTISTAS
            </p>
            <h1 className="mt-1 font-serif text-2xl font-black tracking-tight">
              ARTISTAS DA PLATAFORMA
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-8 md:px-10">
        <ArtistsManager artists={artists} />
      </main>
    </div>
  )
}
