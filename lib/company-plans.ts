/**
 * Planos que a empresa (a plataforma) oferece ao artista quando o admin
 * cadastra o artista localmente. Fonte de verdade única para a UI de seleção
 * e para o texto do contrato gerado pela IA.
 *
 * Regra de negócio: cada plano é CUMULATIVO — inclui tudo do anterior e
 * adiciona os seus próprios benefícios.
 */

export type CompanyPlan = 'basico' | 'pro' | 'premium'

export const COMPANY_PLAN_ORDER: CompanyPlan[] = ['basico', 'pro', 'premium']

export interface CompanyPlanDef {
  id: CompanyPlan
  label: string
  tagline: string
  /** Benefícios exclusivos deste nível (os dos níveis anteriores são herdados). */
  ownBenefits: string[]
}

export const COMPANY_PLANS: Record<CompanyPlan, CompanyPlanDef> = {
  basico: {
    id: 'basico',
    label: 'Básico',
    tagline: 'Fundamentos para começar',
    ownBenefits: [
      'Treinamento de uso da plataforma',
      'Suporte operacional',
    ],
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    tagline: 'Acompanhamento próximo',
    ownBenefits: [
      'Grupo de WhatsApp dedicado',
      'Suporte direto com a equipe',
    ],
  },
  premium: {
    id: 'premium',
    label: 'Premium',
    tagline: 'Operação completa feita pela equipe',
    ownBenefits: [
      'Equipe dedicada para alimentar o perfil (postagens e conteúdo) de forma completa',
      'Equipe de videomakers para produção de todo o conteúdo',
      'Social media profissional',
      'Painel com exclusividade e maior visibilidade dentro da plataforma',
    ],
  },
}

/** Retorna todos os benefícios de um plano de forma cumulativa (inclui os anteriores). */
export function benefitsForPlan(plan: CompanyPlan): string[] {
  const idx = COMPANY_PLAN_ORDER.indexOf(plan)
  const tiers = COMPANY_PLAN_ORDER.slice(0, idx + 1)
  const all: string[] = []
  for (const t of tiers) all.push(...COMPANY_PLANS[t].ownBenefits)
  return all
}

export function isCompanyPlan(v: unknown): v is CompanyPlan {
  return v === 'basico' || v === 'pro' || v === 'premium'
}
