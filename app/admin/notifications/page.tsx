import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/admin-guard'
import type { Artist, Notification, Profile } from '@/lib/types'
import { NotificationsManager } from './notifications-manager'

export const metadata = { title: 'Notificações — WordFan Admin' }

export default async function AdminNotificationsPage() {
  const { supabase } = await requireAdmin('/admin/notifications')

  const [{ data: notifications }, { data: profiles }, { data: artists }] = await Promise.all([
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(300),
    supabase.from('profiles').select('*').order('display_name', { ascending: true }),
    supabase.from('artists').select('*').order('name', { ascending: true }),
  ])

  return (
    <div className="min-w-0 flex-1">
      <div className="px-5 pb-16 pt-6 md:px-8">
        <header className="flex items-center gap-4">
          <Link
            href="/admin"
            aria-label="Voltar para o painel"
            className="flex size-10 items-center justify-center rounded-full border border-white/8 bg-card lg:hidden"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <div>
            <p className="text-[9px] font-black tracking-[0.3em] text-gold">WORDFAN ADMIN</p>
            <h1 className="mt-0.5 font-serif text-2xl font-black tracking-tight">NOTIFICAÇÕES</h1>
          </div>
        </header>

        <NotificationsManager
          notifications={(notifications ?? []) as Notification[]}
          users={(profiles ?? []) as Profile[]}
          artists={(artists ?? []) as Artist[]}
        />
      </div>
    </div>
  )
}
