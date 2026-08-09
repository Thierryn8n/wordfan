import Link from 'next/link'
import { ArrowLeft, Mic2 } from 'lucide-react'
import { requireAdmin } from '@/lib/admin-guard'
import type { Artist } from '@/lib/types'
import { ArtistsManager } from './artists-manager'

export const metadata = { title: 'Artistas — ADM WordFan' }

export default async function AdminArtistsPage() {
  const { supabase } = await requireAdmin('/admin/artists')

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
    <main className="px-6 pb-16 pt-8 xl:px-10">
      <header className="flex items-center gap-4">
          <Link
            href="/admin"
            aria-label="Voltar para o painel admin"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[9px] font-black tracking-[0.22em] text-primary">
              <Mic2 className="size-3.5" aria-hidden="true" />
              ADM — GESTÃO DE ARTISTAS
            </p>
            <h1 className="mt-2 font-serif text-3xl font-black tracking-[-0.04em] text-white">
              Gestão de artistas
            </h1>
            <p className="mt-2 text-xs font-medium text-zinc-500">
              Cadastre, personalize e acompanhe toda a operação de cada artista.
            </p>
          </div>
      </header>

      <section className="admin-panel mt-7 p-5">
        <ArtistsManager artists={artists} />
      </section>
    </main>
  )
}
