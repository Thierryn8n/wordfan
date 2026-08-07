import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Megaphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getAllBanners } from '@/lib/data'
import { Logo } from '@/components/wordfan/logo'
import { BannersManager } from './banners-manager'

export const metadata = { title: 'Banners de anúncio — WordFan Admin' }

export default async function AdminAdsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin/ads')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/home')

  const banners = await getAllBanners()

  return (
    <div className="min-h-dvh bg-background px-5 pb-20 pt-6 md:px-8 lg:px-12">
      <header className="flex items-center gap-4">
        <Link
          href="/admin"
          aria-label="Voltar ao painel"
          className="flex size-10 items-center justify-center rounded-full border border-white/8 bg-card"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <div className="flex-1">
          <p className="flex items-center gap-1.5 text-[9px] font-black tracking-[0.3em] text-gold">
            <Megaphone className="size-3" aria-hidden="true" />
            WORDFAN ADMIN
          </p>
          <h1 className="mt-0.5 font-serif text-2xl font-black tracking-tight">BANNERS DE ANÚNCIO</h1>
        </div>
        <Logo href="/home" className="hidden text-lg sm:block" />
      </header>

      <p className="mt-3 max-w-2xl text-xs font-medium leading-relaxed text-muted-foreground">
        Crie, edite e acompanhe o desempenho dos anúncios exibidos na home. Banners inativos ou fora da
        janela de agendamento não aparecem para os fãs.
      </p>

      <div className="mt-7">
        <BannersManager banners={banners} />
      </div>
    </div>
  )
}
