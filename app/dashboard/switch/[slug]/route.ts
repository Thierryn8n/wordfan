import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DASHBOARD_ARTIST_COOKIE } from '@/lib/dashboard'

// Troca o artista ativo do painel (somente admin). Grava a seleção em cookie
// para que ela persista em todas as páginas fixas do dashboard, e volta para
// a Home do painel.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/dashboard')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  // Confirma que o slug existe antes de gravar.
  const { data: artist } = await supabase.from('artists').select('id').eq('slug', slug).maybeSingle()
  if (artist) {
    const store = await cookies()
    store.set(DASHBOARD_ARTIST_COOKIE, slug, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
  }
  redirect('/dashboard')
}
