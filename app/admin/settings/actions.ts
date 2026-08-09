'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']

export async function uploadSiteLogo(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado.' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Apenas administradores.' }

  const file = formData.get('file') as File | null

  if (!file || file.size === 0) return { error: 'Nenhum arquivo enviado.' }
  if (file.size > MAX_IMAGE_BYTES) return { error: 'Imagem muito grande (máx. 5MB).' }
  if (!ALLOWED_TYPES.includes(file.type)) return { error: 'Formato inválido (use PNG, JPG, WebP, GIF ou SVG).' }

  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
  const path = `site-logo/logo-${Date.now()}.${ext}`

  const { error } = await supabase.storage.from('site-assets').upload(path, file, {
    contentType: file.type,
    upsert: true,
  })

  if (error) {
    console.log('[v0] site logo upload error:', error.message)
    return { error: 'Falha no upload. Tente novamente.' }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('site-assets').getPublicUrl(path)

  return { url: publicUrl }
}

export async function saveSiteSettings({ logoUrl }: { logoUrl: string }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado.' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Apenas administradores.' }

  // Salvar configurações do site em uma tabela de settings
  const { error } = await supabase
    .from('site_settings')
    .upsert({ id: 'default', logo_url: logoUrl.trim() || null }, { onConflict: 'id' })

  if (error) {
    console.log('[v0] save site settings error:', error.message)
    return { error: 'Não foi possível salvar as configurações.' }
  }

  revalidatePath('/admin/settings')
  revalidatePath('/home')
  revalidatePath('/search')
  return { success: true }
}
