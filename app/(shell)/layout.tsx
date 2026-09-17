import { AppShell } from '@/components/wordfan/app-shell'
import { OnboardingModal } from '@/components/wordfan/onboarding-modal'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient, isServiceRoleConfigured } from '@/lib/supabase/admin'

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  let needsOnboarding = false
  let initialName = ''

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user && isServiceRoleConfigured()) {
      // Lê o flag via service role para não depender de RLS de leitura do próprio perfil.
      const admin = createServiceClient()
      const { data: profile } = await admin
        .from('profiles')
        .select('onboarded_at, display_name')
        .eq('id', user.id)
        .maybeSingle()

      needsOnboarding = !profile || !profile.onboarded_at
      initialName = profile?.display_name ?? ''
    }
  } catch {
    needsOnboarding = false
  }

  return (
    <>
      <AppShell>{children}</AppShell>
      {needsOnboarding && <OnboardingModal initialName={initialName} />}
    </>
  )
}
