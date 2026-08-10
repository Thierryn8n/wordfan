import { Suspense } from 'react'
import { getSiteSettings } from '@/lib/site-settings'
import { LoginForm } from './login-form'

export const metadata = { title: 'Entrar — WordFan' }

export default async function LoginPage() {
  const { logoUrl, siteName } = await getSiteSettings()
  return (
    <Suspense>
      <LoginForm logoUrl={logoUrl} siteName={siteName} />
    </Suspense>
  )
}
