import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'
import { ProfileEditForm } from './profile-edit-form'

export const metadata = { title: 'Editar perfil — WordFan' }

export default async function ProfileEditPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/profile/edit')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as Profile | null

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background pb-24">
      <ProfileEditForm
        email={user.email ?? ''}
        initialName={profile?.display_name ?? ''}
        initialAvatar={profile?.avatar_url ?? ''}
      />
    </div>
  )
}
