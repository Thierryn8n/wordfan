import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Análise minuciosa da rota entre dois shows usando a API gratuita da NVIDIA
 * (endpoint OpenAI-compatível em integrate.api.nvidia.com).
 *
 * O usuário pediu explicitamente a IA da NVIDIA — por isso chamamos direto,
 * fora do AI Gateway.
 */

const MODELS = [
  'nvidia/nemotron-3-super-120b-a12b',
  'nvidia/nemotron-3-ultra-550b-a55b',
  'nvidia/nemotron-nano-3-30b-a3b',
]

interface AnalyzeBody {
  origin?: string
  destination?: string
  distance?: string
  duration?: string
  summary?: string
  originShow?: string
  destinationShow?: string
  showDateISO?: string
  steps?: { instruction: string; distance: string; duration: string }[]
}

export async function POST(req: Request) {
  const key = process.env.NVIDIA_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'NVIDIA_API_KEY não configurada.' }, { status: 500 })
  }

  let body: AnalyzeBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })
  }

  const showDate = body.showDateISO
    ? new Date(body.showDateISO).toLocaleString('pt-BR', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'America/Sao_Paulo',
      })
    : 'não informado'

  const stepsText = (body.steps ?? [])
    .slice(0, 40)
    .map((s, i) => `${i + 1}. ${s.instruction} (${s.distance}, ${s.duration})`)
    .join('\n')

  const system = [
    'Você é um road manager (produtor de estrada) experiente de turnês musicais no Brasil.',
    'Analise minuciosamente a rota rodoviária entre dois shows e produza um briefing prático para o motorista e a equipe.',
    'Responda SEMPRE em português do Brasil, em Markdown, de forma objetiva e acionável.',
    'Use exatamente estas seções com títulos ##:',
    '## Resumo da viagem',
    '## Horário de saída recomendado (para chegar com folga antes do show)',
    '## Paradas estratégicas (combustível, alimentação, descanso)',
    '## Riscos e atenção (trechos perigosos, pedágios, clima, horário de pico)',
    '## Checklist antes de sair',
    'Seja específico com base na distância e duração informadas. Não invente pedágios ou trechos que não pode inferir; quando incerto, oriente o que verificar.',
  ].join('\n')

  const user = [
    `Show de ORIGEM: ${body.originShow ?? '—'}`,
    `Endereço de origem: ${body.origin ?? '—'}`,
    '',
    `Próximo show (DESTINO): ${body.destinationShow ?? '—'}`,
    `Endereço de destino: ${body.destination ?? '—'}`,
    `Data e hora do próximo show: ${showDate}`,
    '',
    `Distância total: ${body.distance ?? '—'}`,
    `Duração estimada dirigindo: ${body.duration ?? '—'}`,
    `Vias principais: ${body.summary || '—'}`,
    '',
    'Etapas da rota:',
    stepsText || '(sem detalhamento de etapas)',
  ].join('\n')

  let lastErr = 'Falha ao chamar a IA da NVIDIA.'

  for (const model of MODELS) {
    try {
      const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0.4,
          top_p: 0.9,
          max_tokens: 1400,
          stream: false,
        }),
        cache: 'no-store',
      })

      if (!res.ok) {
        lastErr = `NVIDIA (${model}): ${res.status}`
        continue
      }

      const data = await res.json()
      const content: string = data?.choices?.[0]?.message?.content ?? ''
      if (!content.trim()) {
        lastErr = 'A IA retornou uma resposta vazia.'
        continue
      }
      // Remove blocos de "raciocínio" de modelos reasoning, se houver.
      const clean = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
      return NextResponse.json({ analysis: clean, model })
    } catch {
      lastErr = 'Falha de conexão com a NVIDIA.'
    }
  }

  return NextResponse.json({ error: lastErr }, { status: 502 })
}
