import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/data'
import { OnboardingSlides } from './onboarding-slides'

export default async function OnboardingPage() {
  const user = await getCurrentUser()
  if (user) redirect('/home')

  return <OnboardingSlides />
}
