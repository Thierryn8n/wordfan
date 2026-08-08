import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/admin-guard'
import { isServiceRoleConfigured } from '@/lib/supabase/admin'
import { UsersManager } from './users-manager'

export const metadata = { title: 'Usuários — WordFan Admin' }

export default async function AdminUsersPage() {
  const { supabase } = await requireAdmin('/admin/users')

  const [{ data: profiles }, { data: subs }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(500),
    supabase.from('subscriptions').select('user_id, status'),
  ])

  const activeByUser = (subs ?? []).reduce<Record<string, number>>((acc, s) => {
    if (s.status === 'active') acc[s.user_id] = (acc[s.user_id] ?? 0) + 1
    return acc
  }, {})

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
            <h1 className="mt-0.5 font-serif text-2xl font-black tracking-tight">USUÁRIOS</h1>
          </div>
        </header>

        <UsersManager
          users={profiles ?? []}
          activeSubsByUser={activeByUser}
          canManageAuth={isServiceRoleConfigured()}
        />
      </div>
    </div>
  )
}
