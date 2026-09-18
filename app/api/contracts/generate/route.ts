import { NextResponse } from 'next/server'
import React from 'react'
import { generateText } from 'ai'
import { renderToBuffer } from '@react-pdf/renderer'
import { assertAdmin } from '@/lib/admin-guard'
import { createServiceClient } from '@/lib/supabase/admin'
import { encodeContractToken } from '@/lib/artist-link'
import { COMPANY_PLANS, benefitsForPlan, isCompanyPlan, type CompanyPlan } from '@/lib/company-plans'
import { ContractDocument } from '@/components/contracts/contract-pdf'
import { formatPrice } from '@/lib/types'

export const maxDuration = 60

const CONTRACT_MODEL = 'openai/gpt-4.1'

interface Body {
  artistId?: string
  plan?: string
  commissionPct?: number
}

export async function POST(req: Request) {
  const { error: authError } = await assertAdmin()
  if (authError) return NextResponse.json({ error: authError }, { status: 403 })

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })
  }

  const artistId = (body.artistId ?? '').trim()
  const plan = body.plan
  const commissionPct = Number(body.commissionPct)

  if (!artistId) return NextResponse.json({ error: 'Artista não informado.' }, { status: 400 })
  if (!isCompanyPlan(plan)) return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 })
  if (!Number.isFinite(commissionPct) || commissionPct < 0 || commissionPct > 90) {
    return NextResponse.json({ error: 'Comissão inválida (0 a 90%).' }, { status: 400 })
  }

  const svc = createServiceClient()

  const [{ data: artist }, { data: company }, { data: fanPlans }] = await Promise.all([
    svc.from('artists').select('*').eq('id', artistId).maybeSingle(),
    svc.from('company_settings').select('*').limit(1).maybeSingle(),
    svc.from('plans').select('tier, name, price_cents').eq('artist_id', artistId).order('price_cents', { ascending: true }),
  ])

  if (!artist) return NextResponse.json({ error: 'Artista não encontrado.' }, { status: 404 })
  if (!company?.cnpj || !company?.legal_name) {
    return NextResponse.json(
      { error: 'Configure os dados da SUA empresa/plataforma (razão social e CNPJ) em Admin → Empresa antes de gerar o contrato. Estes são os dados da CONTRATANTE, não do artista.' },
      { status: 412 },
    )
  }
  if (!artist.legal_name || !artist.legal_document) {
    return NextResponse.json(
      { error: 'Preencha os dados legais do artista (nome civil e CPF/CNPJ) antes de gerar o contrato.' },
      { status: 412 },
    )
  }

  const planDef = COMPANY_PLANS[plan as CompanyPlan]
  const planBenefits = benefitsForPlan(plan as CompanyPlan)
  const planValues = (fanPlans ?? []).map((p) => ({
    tier: p.tier as string,
    name: p.name as string,
    price_cents: p.price_cents as number,
  }))

  const fanPlansText = planValues.length
    ? planValues.map((p) => `- ${p.name} (${p.tier}): ${formatPrice(p.price_cents)}/mês`).join('\n')
    : '- (Nenhum plano de assinatura cadastrado ainda)'

  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const prompt = `Você é um advogado especialista em direito contratual, direito autoral e direito da música no Brasil. Redija um CONTRATO DE PRESTAÇÃO DE SERVIÇOS E GESTÃO DE FÃ-CLUBE DIGITAL completo, avançado e juridicamente sólido, em conformidade com a legislação brasileira aplicável (Código Civil - Lei 10.406/2002; Lei de Direitos Autorais - Lei 9.610/1998; Lei do Ecad/execução pública; Marco Civil da Internet - Lei 12.965/2014; LGPD - Lei 13.709/2018; Código de Defesa do Consumidor quando aplicável).

Escreva em português do Brasil, em linguagem jurídica formal, estruturado em CLÁUSULAS numeradas com títulos. Use markdown: "## " para títulos de cláusula e "- " para listas. NÃO use tabelas. NÃO inclua comentários fora do contrato. Comece diretamente pelo texto do contrato.

DADOS PARA O CONTRATO:

CONTRATANTE (plataforma):
- Razão social: ${company.legal_name}
- Nome fantasia: ${company.trade_name ?? '-'}
- CNPJ: ${company.cnpj}
- Endereço: ${company.address ?? '-'}, ${company.city ?? '-'}/${company.state ?? '-'} ${company.zip ?? ''}
- E-mail: ${company.email ?? '-'}

CONTRATADO(A) (artista):
- Nome artístico: ${artist.name}
- Nome civil: ${artist.legal_name}
- CPF/CNPJ: ${artist.legal_document}
- Endereço: ${artist.legal_address ?? '-'}, ${artist.legal_city ?? '-'}/${artist.legal_state ?? '-'} ${artist.legal_zip ?? ''}
- Gênero musical: ${artist.genre ?? '-'}

OBJETO E CONDIÇÕES COMERCIAIS:
- Plano da plataforma contratado: ${planDef.label} — ${planDef.tagline}
- Serviços incluídos no plano (cumulativos):
${planBenefits.map((b) => `  - ${b}`).join('\n')}
- Comissão da plataforma sobre o faturamento das assinaturas: ${commissionPct}%
- Planos de assinatura do fã-clube do artista e valores mensais:
${fanPlansText}

INSTRUÇÕES DE CONTEÚDO (inclua, no mínimo, cláusulas sobre):
1. Qualificação das partes.
2. Objeto do contrato (gestão de fã-clube digital, hospedagem de conteúdo, intermediação de assinaturas).
3. Descrição detalhada dos serviços conforme o plano contratado.
4. Licença de uso de imagem, nome artístico, marca e conteúdos — escopo, finalidade e limites (Lei 9.610/98).
5. Titularidade dos direitos autorais e conexos: o artista permanece titular de suas obras; a plataforma recebe licença limitada para exibição no fã-clube.
6. Remuneração, comissão de ${commissionPct}%, forma de repasse, prazos de pagamento e retenções tributárias.
7. Obrigações da contratante e do(a) contratado(a).
8. Proteção de dados pessoais (LGPD): papéis de controlador/operador, finalidades, direitos dos titulares e segurança.
9. Prazo, renovação, rescisão, multa e hipóteses de rescisão motivada.
10. Confidencialidade.
11. Propriedade intelectual da plataforma.
12. Disposições gerais, foro de eleição e legislação aplicável.
13. Local e data: ${company.city ?? '-'}, ${today}.

Gere o contrato completo agora.`

  let contentMd = ''
  try {
    const { text } = await generateText({
      model: CONTRACT_MODEL,
      prompt,
      temperature: 0.3,
      topP: 0.9,
      maxOutputTokens: 4096,
    })
    contentMd = text.trim()
  } catch (e) {
    console.log('[v0] contract ai generation failed:', (e as Error).message)
    return NextResponse.json({ error: 'Falha ao gerar o contrato pela IA.' }, { status: 502 })
  }

  if (!contentMd) return NextResponse.json({ error: 'A IA não retornou conteúdo.' }, { status: 502 })

  const title = `Contrato de Prestação de Serviços — ${artist.name}`
  const generatedAt = new Date().toLocaleString('pt-BR')

  // Renderiza o PDF com as duas logos (artista à esquerda, empresa à direita).
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderToBuffer(
      React.createElement(ContractDocument, {
        title,
        contentMd,
        companyLogoUrl: company.logo_url,
        artistLogoUrl: artist.logo_url,
        companyName: company.trade_name || company.legal_name,
        artistName: artist.name,
        generatedAt,
      }),
    )
  } catch (e) {
    console.log('[v0] pdf render failed:', (e as Error).message)
    return NextResponse.json({ error: 'Falha ao renderizar o PDF do contrato.' }, { status: 500 })
  }

  const pdfPath = `${artistId}/contrato-${Date.now()}.pdf`
  const { error: upErr } = await svc.storage.from('contracts').upload(pdfPath, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: false,
  })
  if (upErr) {
    console.log('[v0] contract pdf upload error:', upErr.message)
    return NextResponse.json({ error: 'Falha ao armazenar o PDF.' }, { status: 500 })
  }

  const companySnapshot = {
    legal_name: company.legal_name,
    trade_name: company.trade_name,
    cnpj: company.cnpj,
    address: company.address,
    city: company.city,
    state: company.state,
    zip: company.zip,
    email: company.email,
    logo_url: company.logo_url,
  }
  const artistSnapshot = {
    name: artist.name,
    legal_name: artist.legal_name,
    legal_document: artist.legal_document,
    legal_address: artist.legal_address,
    legal_city: artist.legal_city,
    legal_state: artist.legal_state,
    legal_zip: artist.legal_zip,
    logo_url: artist.logo_url,
  }

  const { data: inserted, error: insErr } = await svc
    .from('contracts')
    .insert({
      artist_id: artistId,
      status: 'pending',
      title,
      content_md: contentMd,
      pdf_path: pdfPath,
      plan,
      commission_pct: commissionPct,
      plan_values: planValues,
      company_snapshot: companySnapshot,
      artist_snapshot: artistSnapshot,
    })
    .select('id')
    .single()

  if (insErr || !inserted) {
    console.log('[v0] contract insert error:', insErr?.message)
    return NextResponse.json({ error: 'Falha ao salvar o contrato.' }, { status: 500 })
  }

  const token = encodeContractToken(inserted.id as string)

  return NextResponse.json({
    contractId: inserted.id,
    token,
    reviewPath: `/contrato/${token}`,
  })
}
