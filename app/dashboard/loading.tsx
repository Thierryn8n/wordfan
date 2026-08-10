import { getSiteSettings } from '@/lib/site-settings'
import { PageLoading } from '@/components/wordfan/page-loading'

export default async function DashboardLoading() {
  const { logoUrl, siteName } = await getSiteSettings()
  return <PageLoading logoUrl={logoUrl} siteName={siteName} />
}
