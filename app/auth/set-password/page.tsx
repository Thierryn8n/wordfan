import { Suspense } from 'react'
import { SetPasswordForm } from './set-password-form'

export const metadata = { title: 'Definir senha — WordFan' }

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  )
}
