'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="skeu flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-muted-foreground transition-colors hover:text-destructive"
    >
      <LogOut className="size-4" aria-hidden="true" />
      Sair da conta
    </button>
  )
}
