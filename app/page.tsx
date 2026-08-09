import { getCurrentUser } from '@/lib/data'
import { OnboardingSlides } from './onboarding-slides'

export default async function OnboardingPage() {
  const user = await getCurrentUser()
  // Não redirecionamos no servidor: o cliente decide via localStorage.
  // Usuários logados ou que já viram o onboarding vão direto para /home.
  return <OnboardingSlides isLoggedIn={Boolean(user)} />
}
