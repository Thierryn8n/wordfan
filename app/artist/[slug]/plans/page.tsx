import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import { getArtistBySlug, getArtistPlans, getUserSubscription } from '@/lib/data'
import { formatPrice } from '@/lib/types'
import { SubscribeButton } from './subscribe-button'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Planos — WordFan' }

const tierAccent: Record<string, string> = {
  bronze: 'border-[#8c5a2b]/40',
  silver: 'border-[#9aa4b2]/40',
  gold: 'border-accent/50',
  platinum: 'border-primary/60',
}

export default async function PlansPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const artist = await getArtistBySlug(slug)
  if (!artist) notFound()

  const [plans, subscription] = await Promise.all([
    getArtistPlans(artist.id),
    getUserSubscription(artist.id),
  ])

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-12 md:max-w-lg">
      <header className="relative flex items-center gap-4 px-5 pt-6">
        <Link
          href={`/artist/${slug}`}
          aria-label="Voltar para o perfil do artista"
          className="glass flex size-10 items-center justify-center rounded-full"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <div className="flex items-center gap-3">
          <Image
            src={artist.avatar_url || '/placeholder.svg?height=40&width=40'}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-full object-cover"
          />
          <div>
            <p className="text-xs text-muted-foreground">Fan Club de</p>
            <p className="font-serif font-semibold leading-tight">{artist.name}</p>
          </div>
        </div>
      </header>

      <main className="px-5">
        <h1 className="mt-8 font-serif text-2xl font-bold text-balance">Escolha seu nível de fã</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          Quanto maior o nível, mais perto você fica. Cancele quando quiser.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          {plans.map((plan) => {
            const isCurrent = subscription?.plan_id === plan.id
            const isPopular = plan.tier === 'gold'
            return (
              <div
                key={plan.id}
                className={cn(
                  'glass relative rounded-2xl border p-5',
                  tierAccent[plan.tier],
                  isPopular && 'ring-1 ring-accent/40',
                )}
              >
                {isPopular && (
                  <span className="gradient-brand absolute -top-2.5 right-4 rounded-full px-3 py-0.5 text-[11px] font-bold text-black">
                    MAIS POPULAR
                  </span>
                )}
                <div className="flex items-baseline justify-between">
                  <h2 className="font-serif text-xl font-bold">{plan.name}</h2>
                  <p>
                    <span className="font-serif text-2xl font-bold">{formatPrice(plan.price_cents)}</span>
                    <span className="text-xs text-muted-foreground">/mês</span>
                  </p>
                </div>
                <ul className="mt-4 flex flex-col gap-2">
                  {plan.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      {b}
                    </li>
                  ))}
                </ul>
                <SubscribeButton
                  slug={slug}
                  planId={plan.id}
                  isCurrent={isCurrent}
                  isPopular={isPopular}
                />
              </div>
            )
          })}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground text-pretty">
          Pagamento simulado nesta versão de demonstração. Nenhuma cobrança será feita.
        </p>
      </main>
    </div>
  )
}
