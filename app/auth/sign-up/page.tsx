import { getSiteSettings } from '@/lib/site-settings'
import { SignUpForm } from './sign-up-form'

export const metadata = { title: 'Criar conta — WordFan' }

export default async function SignUpPage() {
  const { logoUrl, siteName } = await getSiteSettings()
  return <SignUpForm logoUrl={logoUrl} siteName={siteName} />
}
