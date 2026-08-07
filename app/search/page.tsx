import { getArtists } from '@/lib/data'
import { BottomNav } from '@/components/wordfan/bottom-nav'
import { SearchClient } from './search-client'

export const metadata = { title: 'Pesquisar — WordFan' }

export default async function SearchPage() {
  const artists = await getArtists()
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-28 md:max-w-lg">
      <SearchClient artists={artists} />
      <BottomNav />
    </div>
  )
}
