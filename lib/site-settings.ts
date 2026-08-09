import { createClient } from '@/lib/supabase/server'

export async function getSiteSettings() {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 'default')
    .single()

  return {
    logoUrl: settings?.logo_url || null,
    faviconUrl: settings?.favicon_url || null,
    siteName: settings?.site_name || 'WordFan',
    siteDescription: settings?.site_description || 
      'A plataforma de fan clubs que aproxima fãs e artistas com conteúdo exclusivo, lives e experiências únicas.',
  }
}
