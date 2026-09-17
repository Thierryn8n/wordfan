import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Análise minuciosa da rota entre dois shows usando a API gratuita da NVIDIA
 * (endpoint OpenAI-compatível em integrate.api.nvidia.com).
 *
 * O usuário pediu explicitamente a IA da NVIDIA — por isso chamamos direto,
 * fora do AI Gateway. A resposta é transmitida (streaming) para o texto
 * aparecer em tempo real na tela.
 */

const MODELS = [
  'nvidia/nemotron-3-super-120b-a12b',
  'nvidia/nemotron-3-ultra-550b-a55b',
]

// Separa, no stream de texto, a fase de raciocínio da resposta final.
const CONTENT_MARKER = '\u0000__RESPOSTA__\u0000'

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

  // Tenta cada modelo até um começar a transmitir com sucesso.
  let upstream: Response | null = null
  let usedModel = ''
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
          stream: true,
        }),
        cache: 'no-store',
      })

      if (!res.ok || !res.body) {
        lastErr = `NVIDIA (${model}): ${res.status}`
        continue
      }
      upstream = res
      usedModel = model
      break
    } catch {
      lastErr = 'Falha de conexão com a NVIDIA.'
    }
  }

  if (!upstream || !upstream.body) {
    return NextResponse.json({ error: lastErr }, { status: 502 })
  }

  // Converte o SSE (formato OpenAI) da NVIDIA num stream de texto puro,
  // removendo eventuais blocos <think> de modelos de raciocínio.
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const reader = upstream.body.getReader()

  let buffer = ''
  let contentStarted = false

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read()
      if (done) {
        controller.close()
        return
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (payload === '[DONE]') {
          controller.close()
          return
        }
        try {
          const json = JSON.parse(payload)
          const delta = json?.choices?.[0]?.delta ?? {}
          const reasoning: string = delta.reasoning_content ?? ''
          const content: string = (delta.content ?? '').replace(/<\/?think>/gi, '')

          // Fase de raciocínio: transmite ao vivo para dar feedback imediato.
          if (reasoning && !contentStarted) {
            controller.enqueue(encoder.encode(reasoning))
          }
          // Primeira vez que chega a resposta final: marca a virada de fase.
          if (content) {
            if (!contentStarted) {
              contentStarted = true
              controller.enqueue(encoder.encode(CONTENT_MARKER))
            }
            controller.enqueue(encoder.encode(content))
          }
        } catch {
          // ignora linhas parciais/inesperadas
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => {})
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Model': usedModel,
    },
  })
}
