import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Megaphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getAllAdsAdmin } from '@/lib/data'
import { AdsManager } from './ads-manager'

export const metadata = { title: 'Anúncios — WordFan Admin' }

export default async function AdminAdsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin/ads')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/home')

  const { ads, missing } = await getAllAdsAdmin()

  return (
    <div className="min-h-dvh bg-background px-5 pb-16 pt-6 md:px-8">
      <header className="flex items-center gap-4">
        <Link
          href="/admin"
          aria-label="Voltar para o dashboard"
          className="skeu flex size-10 items-center justify-center rounded-full"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <div className="flex items-center gap-3">
          <span className="skeu-raised flex size-11 items-center justify-center rounded-2xl">
            <Megaphone className="size-5 text-gold" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[9px] font-black tracking-[0.3em] text-gold">WORDFAN ADMIN</p>
            <h1 className="mt-0.5 font-serif text-2xl font-black tracking-tight">ANÚNCIOS</h1>
          </div>
        </div>
      </header>

      <AdsManager initialAds={ads} tableMissing={missing} />
    </div>
  )
}
