import { getCurrentUser } from '@/lib/data'
import { getSiteSettings } from '@/lib/site-settings'
import { OnboardingSlides } from './onboarding-slides'

export default async function OnboardingPage() {
  const [user, { logoUrl, siteName }] = await Promise.all([
    getCurrentUser(),
    getSiteSettings(),
  ])
  return (
    <OnboardingSlides
      isLoggedIn={Boolean(user)}
      logoUrl={logoUrl}
      siteName={siteName}
    />
  )
}
