import { requireAdmin } from '@/lib/admin-guard'
import { SettingsManager } from './settings-manager'

export const metadata = { title: 'Configurações — ADM WordFan' }

export default async function AdminSettingsPage() {
  const { supabase } = await requireAdmin('/admin/settings')

  return (
    <main className="px-6 pb-16 pt-8 xl:px-10">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-black tracking-[-0.04em] text-white">
          Configurações Gerais
        </h1>
        <p className="mt-2 text-sm font-medium text-zinc-500">
          Personalize o logo e configurações globais da plataforma.
        </p>
      </header>

      <section className="admin-panel p-6">
        <SettingsManager />
      </section>
    </main>
  )
}
