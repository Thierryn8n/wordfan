import { getSiteSettings } from '@/lib/site-settings'
import { PageLoading } from '@/components/wordfan/page-loading'

export default async function ShellLoading() {
  const { logoUrl, siteName } = await getSiteSettings()
  return <PageLoading logoUrl={logoUrl} siteName={siteName} />
}
