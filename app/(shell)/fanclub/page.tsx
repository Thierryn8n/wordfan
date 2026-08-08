import Link from 'next/link'
import Image from 'next/image'
import { Star, ArrowRight, Sparkles, Crown, Users } from 'lucide-react'
import { getArtists, getMySubscriptions, getCurrentUser } from '@/lib/data'
import { hasEntitlement } from '@/lib/artist-theme'
import { TIER_LABELS } from '@/lib/types'

export const metadata = { title: 'Fan Club — WordFan' }

const tierBadge: Record<string, string> = {
  bronze: 'bg-[#cd7f32]/15 text-[#cd7f32]',
  silver: 'bg-[#c0c0c8]/15 text-[#c0c0c8]',
  gold: 'bg-[#ffd700]/15 text-[#ffd700]',
  platinum: 'bg-club/15 text-club',
}

export default async function FanClubPage() {
  const [user, mySubs, artists] = await Promise.all([
    getCurrentUser(),
    getMySubscriptions(),
    getArtists(),
  ])

  // Só artistas cujo plano de ferramenta libera o fan club podem receber fãs.
  const clubArtists = artists.filter((a) => hasEntitlement(a.tool_plan, 'club'))
  const subscribedIds = new Set(mySubs.map((s) => s.artist_id))
  const discover = clubArtists.filter((a) => !subscribedIds.has(a.id))

  const hasClubs = mySubs.length > 0

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background pb-32">
      {/* Cabeçalho */}
      <header className="relative overflow-hidden px-6 pb-6 pt-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-club/20 blur-[90px]"
        />
        <p className="flex items-center gap-1.5 text-[9px] font-black tracking-[0.3em] text-club">
          <Sparkles className="size-3" aria-hidden="true" />
          WORDFAN CLUBS
        </p>
        <h1 className="mt-2 font-serif text-4xl font-black leading-none tracking-tight text-balance">
          {hasClubs ? 'SEUS FAN CLUBS' : 'ENTRE PARA UM FAN CLUB'}
        </h1>
        <p className="mt-3 max-w-[280px] text-xs font-bold leading-relaxed text-muted-foreground">
          {hasClubs
            ? 'Escolha em qual clube você quer entrar agora e acesse o conteúdo exclusivo dos seus artistas.'
            : 'Assine o clube de um artista para desbloquear posts, lives e conteúdo exclusivo só para membros.'}
        </p>
      </header>

      <main className="px-6">
        {/* Meus clubes */}
        {hasClubs && (
          <section aria-labelledby="meus-clubes">
            <h2
              id="meus-clubes"
              className="flex items-center gap-2 text-[10px] font-black tracking-[0.25em] text-muted-foreground"
            >
              <Crown className="size-3.5 text-club" aria-hidden="true" />
              MEUS CLUBES
            </h2>
            <ul className="mt-3 flex flex-col gap-3">
              {mySubs.map((sub) => (
                <li key={sub.id}>
                  <Link
                    href={`/artist/${sub.artist.slug}/club`}
                    className="group flex items-center gap-4 rounded-3xl border border-club/25 bg-club/5 p-4 transition-colors active:bg-club/10"
                  >
                    <Image
                      src={sub.artist.avatar_url || '/placeholder.svg?height=56&width=56'}
                      alt=""
                      width={56}
                      height={56}
                      className="size-14 rounded-2xl border-2 border-club object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-base font-extrabold leading-tight">
                        {sub.artist.name}
                      </p>
                      <span
                        className={`mt-1.5 inline-block rounded-full px-2.5 py-1 text-[8px] font-black tracking-[0.15em] ${
                          tierBadge[sub.plan.tier] ?? 'bg-white/10 text-muted-foreground'
                        }`}
                      >
                        {TIER_LABELS[sub.plan.tier].toUpperCase()}
                      </span>
                    </div>
                    <span className="gradient-club flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-[9px] font-black tracking-[0.15em] text-white">
                      ENTRAR
                      <ArrowRight
                        className="size-3.5 transition-transform group-active:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Estado vazio */}
        {!hasClubs && (
          <div className="flex flex-col items-center rounded-[32px] border border-white/8 bg-card px-6 py-10 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-club/10">
              <Star className="size-8 fill-club text-club" aria-hidden="true" />
            </span>
            <p className="mt-4 font-serif text-lg font-extrabold">Nenhum clube ainda</p>
            <p className="mt-1.5 max-w-[240px] text-xs font-bold leading-relaxed text-muted-foreground">
              Escolha um artista abaixo e entre direto na assinatura do fan club dele.
            </p>
          </div>
        )}

        {/* Descobrir / escolher artista */}
        {discover.length > 0 && (
          <section aria-labelledby="descobrir" className="mt-8">
            <h2
              id="descobrir"
              className="flex items-center gap-2 text-[10px] font-black tracking-[0.25em] text-muted-foreground"
            >
              <Users className="size-3.5 text-club" aria-hidden="true" />
              {hasClubs ? 'DESCUBRA MAIS CLUBES' : 'ESCOLHA UM ARTISTA'}
            </h2>
            <ul className="mt-3 flex flex-col gap-3">
              {discover.map((artist) => (
                <li key={artist.id}>
                  <Link
                    href={`/artist/${artist.slug}/plans`}
                    className="group flex items-center gap-4 rounded-3xl border border-white/8 bg-card p-4 transition-colors active:bg-white/5"
                  >
                    <Image
                      src={artist.avatar_url || '/placeholder.svg?height=56&width=56'}
                      alt=""
                      width={56}
                      height={56}
                      className="size-14 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-base font-extrabold leading-tight">
                        {artist.name}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] font-bold text-muted-foreground">
                        {artist.genre
                          ? `${artist.genre} · ${artist.followers_count.toLocaleString('pt-BR')} fãs`
                          : `${artist.followers_count.toLocaleString('pt-BR')} fãs`}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-club/40 px-4 py-2.5 text-[9px] font-black tracking-[0.15em] text-club">
                      ASSINAR
                      <ArrowRight
                        className="size-3.5 transition-transform group-active:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Todos já assinados */}
        {hasClubs && discover.length === 0 && (
          <p className="mt-8 rounded-3xl border border-dashed border-white/10 p-6 text-center text-[11px] font-bold text-muted-foreground">
            Você já faz parte de todos os fan clubs disponíveis.
          </p>
        )}

        {!user && discover.length > 0 && (
          <p className="mt-6 text-center text-[10px] font-bold tracking-[0.1em] text-zinc-600">
            VOCÊ FARÁ LOGIN AO ESCOLHER UM CLUBE
          </p>
        )}
      </main>
    </div>
  )
}
