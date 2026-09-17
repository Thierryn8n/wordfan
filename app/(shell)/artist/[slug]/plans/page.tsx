import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, Check, ShieldCheck, Building2, ArrowRight } from 'lucide-react'
import { getArtistBySlug, getArtistPlans, getUserSubscription } from '@/lib/data'
import { getEnterprisePlan } from '@/lib/enterprise'
import { formatPrice } from '@/lib/types'
import { ArtistThemeScope } from '@/components/wordfan/artist-theme-provider'
import { SubscribeButton } from './subscribe-button'

export const metadata = { title: 'Planos — WordFan' }

const tierColor: Record<string, string> = {
  bronze: 'text-[#cd7f32]',
  silver: 'text-[#c0c0c8]',
  gold: 'text-[#ffd700]',
  platinum: 'text-white',
}

const tierTagline: Record<string, string> = {
  bronze: 'O começo da jornada VIP',
  silver: 'Para fãs de verdade',
  gold: 'Experiência premium completa',
  platinum: 'ACESSO TOTAL E IRRESTRITO',
}

export default async function PlansPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const artist = await getArtistBySlug(slug)
  if (!artist) notFound()

  const [plans, subscription, enterprise] = await Promise.all([
    getArtistPlans(artist.id),
    getUserSubscription(artist.id),
    getEnterprisePlan(),
  ])

  const platinum = plans.find((p) => p.tier === 'platinum')
  const others = plans.filter((p) => p.tier !== 'platinum')
  const [bronze, ...rest] = others

  function CompactCard({ plan }: { plan: NonNullable<typeof bronze> }) {
    const isCurrent = subscription?.plan_id === plan.id
    return (
      <div className="rounded-[32px] border border-white/8 bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className={`font-serif text-xl font-extrabold ${tierColor[plan.tier]}`}>
              {plan.name.toUpperCase()}
            </h2>
            <p className="mt-1 text-[10px] font-bold text-muted-foreground">
              {tierTagline[plan.tier]}
            </p>
          </div>
          <div className="text-right">
            <p className="font-numeric text-xl font-bold">{formatPrice(plan.price_cents)}</p>
            <p className="text-[8px] font-extrabold tracking-wide text-muted-foreground">POR MÊS</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {plan.benefits.slice(0, 3).map((b) => (
            <span
              key={b}
              className="rounded-full bg-white/5 px-3 py-1 text-[8px] font-extrabold tracking-[0.1em] text-muted-foreground uppercase"
            >
              {b}
            </span>
          ))}
        </div>
        <SubscribeButton slug={slug} planId={plan.id} isCurrent={isCurrent} variant="compact" />
      </div>
    )
  }

  return (
    <ArtistThemeScope theme={artist.theme}>
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background pb-40">
      {/* Header / Banner */}
      <div className="relative flex h-72 items-center">
        <Image
          src={artist.banner_url || artist.avatar_url || '/placeholder.svg?height=288&width=375'}
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 448px"
          className="object-cover opacity-50"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent"
          aria-hidden="true"
        />
        <div className="relative z-10 flex w-full items-start justify-between px-6">
          <div>
            <h1 className="font-serif text-4xl font-black leading-none tracking-tight text-balance">
              FAN CLUB
              <br />
              {artist.name.toUpperCase()}
            </h1>
            <p className="mt-3 text-[10px] font-black tracking-[0.2em] text-muted-foreground">
              ESCOLHA SUA EXPERIÊNCIA DE ELITE
            </p>
          </div>
          <Link
            href={`/artist/${slug}`}
            aria-label="Voltar para o perfil"
            className="flex size-10 items-center justify-center rounded-full border border-white/8 bg-white/8 backdrop-blur-md"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <main className="flex flex-col gap-6 px-6 pt-8">
        {bronze && <CompactCard plan={bronze} />}

        {/* Platina em destaque */}
        {platinum && (
          <div className="relative">
            <div
              className="relative overflow-hidden rounded-[40px] border-2 border-club p-8"
              style={{
                backgroundImage:
                  'linear-gradient(to bottom, color-mix(in srgb, var(--artist-primary, #ff00a2) 22%, var(--card)), var(--card))',
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -top-10 right-0 size-40 rounded-full bg-club/20 blur-[80px]"
              />
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-black tracking-tight">
                    {platinum.name.toUpperCase()}
                  </h2>
                  <p className="mt-1 max-w-[120px] text-[10px] font-bold tracking-[0.1em] text-muted-foreground">
                    {tierTagline.platinum}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-numeric text-2xl font-bold leading-tight">
                    {formatPrice(platinum.price_cents)}
                  </p>
                  <p className="text-[8px] font-extrabold tracking-wide text-club">POR MÊS</p>
                </div>
              </div>

              <ul className="mt-8 flex flex-col gap-4 pb-2">
                {platinum.benefits.map((b) => (
                  <li key={b} className="flex items-center gap-3 text-xs font-bold">
                    <Check className="size-4 shrink-0 text-club" aria-hidden="true" />
                    {b}
                  </li>
                ))}
              </ul>

              <SubscribeButton
                slug={slug}
                planId={platinum.id}
                isCurrent={subscription?.plan_id === platinum.id}
                variant="featured"
              />
            </div>
            <span className="gradient-club absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-[8px] font-black tracking-[0.2em] text-white shadow-lg">
              RECOMENDADO
            </span>
          </div>
        )}

        {rest.map((p) => (
          <CompactCard key={p.id} plan={p} />
        ))}

        {/* Comparativo de benefícios entre os planos (cumulativo, mobile-first) */}
        {plans.length > 1 &&
          (() => {
            const rank: Record<string, number> = { bronze: 1, silver: 2, gold: 3, platinum: 4 }
            const ordered = [...plans].sort(
              (a, b) => (rank[a.tier] ?? 99) - (rank[b.tier] ?? 99),
            )
            // Linhas "Tudo do X" são redundantes num comparativo cumulativo
            const isMeta = (b: string) => /^tudo d[oa]\b/i.test(b.trim())
            // Um plano marca o benefício se ele estiver nele OU em qualquer tier inferior
            const has = (planTier: string, benefit: string) =>
              ordered.some(
                (p) =>
                  (rank[p.tier] ?? 99) <= (rank[planTier] ?? 99) &&
                  p.benefits.includes(benefit),
              )
            // Benefícios únicos, do tier mais baixo ao mais alto (efeito escada)
            const rows: string[] = []
            for (const p of ordered) {
              for (const b of p.benefits) {
                if (!isMeta(b) && !rows.includes(b)) rows.push(b)
              }
            }
            return (
              <section
                aria-labelledby="compare-heading"
                className="rounded-[32px] border border-white/8 bg-card p-6"
              >
                <h2
                  id="compare-heading"
                  className="font-serif text-lg font-extrabold tracking-tight"
                >
                  COMPARE OS BENEFÍCIOS
                </h2>
                <p className="mt-1 text-[10px] font-bold tracking-wide text-muted-foreground">
                  Cada plano inclui tudo do anterior
                </p>
                <table className="mt-5 w-full table-fixed border-collapse">
                  <colgroup>
                    <col />
                    {ordered.map((p) => (
                      <col key={p.id} className="w-[3.25rem]" />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col" className="pb-3" />
                      {ordered.map((p) => (
                        <th
                          key={p.id}
                          scope="col"
                          className={`pb-3 text-center align-bottom text-[9px] font-black leading-tight tracking-[0.04em] ${tierColor[p.tier]}`}
                        >
                          {p.name
                            .toUpperCase()
                            .split(' ')
                            .map((w, idx) => (
                              <span key={idx} className="block">
                                {w}
                              </span>
                            ))}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((benefit, i) => (
                      <tr key={benefit} className={i % 2 === 0 ? 'bg-white/[0.02]' : undefined}>
                        <th
                          scope="row"
                          className="py-3 pr-2 text-left text-[11px] font-bold leading-tight text-pretty text-foreground/90"
                        >
                          {benefit}
                        </th>
                        {ordered.map((p) => (
                          <td key={p.id} className="py-3 text-center">
                            {has(p.tier, benefit) ? (
                              <Check className="mx-auto size-4 text-club" aria-hidden="true" />
                            ) : (
                              <span
                                className="mx-auto block size-1 rounded-full bg-white/15"
                                aria-hidden="true"
                              />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )
          })()}

        {/* Plano Enterprise — global, gerido pelo admin, aparece em todos os artistas */}
        {enterprise.active && (
          <div className="relative mt-2">
            <div className="holo-border overflow-hidden rounded-[40px] p-[2px]">
              <div className="rounded-[38px] bg-card p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-[8px] font-black tracking-[0.2em] text-muted-foreground">
                      <Building2 className="size-3" aria-hidden="true" />
                      PARA EMPRESAS
                    </span>
                    <h2 className="holo-text mt-3 font-serif text-3xl font-black tracking-tight">
                      {enterprise.name.toUpperCase()}
                    </h2>
                    <p className="mt-1 max-w-[200px] text-[10px] font-bold leading-relaxed text-muted-foreground">
                      {enterprise.tagline}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-extrabold tracking-wide text-muted-foreground">
                      ENTRADA
                    </p>
                    <p className="font-numeric text-2xl font-bold leading-tight">
                      {formatPrice(enterprise.price_cents)}
                    </p>
                    <p className="text-[8px] font-bold tracking-wide text-muted-foreground">
                      LISTA DE ESPERA
                    </p>
                  </div>
                </div>

                <ul className="mt-7 flex flex-col gap-4">
                  {enterprise.benefits.map((b) => (
                    <li key={b} className="flex items-center gap-3 text-xs font-bold">
                      <Check className="holo-check size-4 shrink-0" aria-hidden="true" />
                      {b}
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/enterprise/apply?artist=${slug}`}
                  className="holo-fill mt-8 flex h-16 w-full items-center justify-center gap-2 rounded-2xl text-[11px] font-black tracking-[0.25em] text-black"
                >
                  QUERO CONTRATAR
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        )}

        <p className="flex items-center justify-center gap-1 text-center text-[10px] font-bold tracking-[0.1em] text-zinc-600">
          PAGAMENTO SEGURO E CRIPTOGRAFADO
          <ShieldCheck className="size-3" aria-hidden="true" />
        </p>
      </main>
    </div>
    </ArtistThemeScope>
  )
}
