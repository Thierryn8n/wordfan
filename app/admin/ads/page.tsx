import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/admin-guard'
import { Logo } from '@/components/wordfan/logo'
import type { Ad } from '@/lib/types'
import { AdsManager } from './ads-manager'

export const metadata = { title: 'Anúncios — Painel administrativo' }

export default async function AdminAdsPage() {
  const { supabase } = await requireAdmin('/admin/ads')

  const { data, error } = await supabase
    .from('ad_banners')
    .select('*')
    .order('placement', { ascending: true })
    .order('sort_order', { ascending: true })

  const ads = (data ?? []) as Ad[]
  const tableMissing = Boolean(error)

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-white/8 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              aria-label="Voltar ao painel"
              className="surface elev-1 flex size-10 items-center justify-center rounded-xl"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
            <Logo className="text-xl" />
            <span className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
              ANÚNCIOS
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-8 py-8">
        <AdsManager ads={ads} tableMissing={tableMissing} />
      </main>
    </div>
  )
}
