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
      className="ios-card flex w-full items-center justify-center gap-2 py-3.5 text-[17px] font-normal text-destructive active:bg-[color:var(--ios-fill-2)]"
    >
      <LogOut className="size-[18px]" aria-hidden="true" />
      Sair da conta
    </button>
  )
}
