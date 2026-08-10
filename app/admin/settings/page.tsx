import { requireAdmin } from '@/lib/admin-guard'
import { createClient } from '@/lib/supabase/server'
import { SettingsManager } from './settings-manager'

export const metadata = { title: 'Configurações — ADM WordFan' }

export default async function AdminSettingsPage() {
  const { supabase } = await requireAdmin('/admin/settings')
  
  // Buscar configurações atuais
  const { data: settings } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 'default')
    .single()

  return (
    <main className="px-6 pb-16 pt-8 xl:px-10">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-black tracking-[-0.04em] text-white">
          Configurações Gerais
        </h1>
        <p className="mt-2 text-sm font-medium text-zinc-500">
          Personalize o logo, favicon e configurações globais da plataforma.
        </p>
      </header>

      <section className="admin-panel p-6">
        <SettingsManager 
          initialLogoUrl={settings?.logo_url || ''}
          initialFaviconUrl={settings?.favicon_url || ''}
          initialSiteName={settings?.site_name || ''}
          initialSiteDescription={settings?.site_description || ''}
        />
      </section>
    </main>
  )
}
