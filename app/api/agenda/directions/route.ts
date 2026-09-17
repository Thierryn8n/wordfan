import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface DirectionsBody {
  originText?: string
  destinationText?: string
}

function metersToText(m: number) {
  if (m >= 1000) {
    return `${(m / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`
  }
  return `${m} m`
}

/** "3600s" → "1 h 0 min". */
function secondsToText(raw: string | number) {
  const total = typeof raw === 'number' ? raw : parseInt(String(raw).replace('s', ''), 10)
  if (!Number.isFinite(total)) return '—'
  const h = Math.floor(total / 3600)
  const min = Math.round((total % 3600) / 60)
  if (h > 0) return `${h} h ${min} min`
  return `${min} min`
}

export async function POST(req: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'GOOGLE_MAPS_API_KEY não configurada.' }, { status: 500 })
  }

  let body: DirectionsBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })
  }

  const origin = (body.originText ?? '').trim()
  const destination = (body.destinationText ?? '').trim()
  if (!origin || !destination) {
    return NextResponse.json({ error: 'Informe origem e destino.' }, { status: 400 })
  }

  const fieldMask = [
    'routes.duration',
    'routes.distanceMeters',
    'routes.description',
    'routes.polyline.encodedPolyline',
    'routes.legs.startLocation',
    'routes.legs.endLocation',
    'routes.legs.steps.navigationInstruction',
    'routes.legs.steps.distanceMeters',
    'routes.legs.steps.staticDuration',
  ].join(',')

  let data: any
  try {
    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify({
        origin: { address: origin },
        destination: { address: destination },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        languageCode: 'pt-BR',
        regionCode: 'BR',
        units: 'METRIC',
        polylineEncoding: 'ENCODED_POLYLINE',
      }),
      cache: 'no-store',
    })
    data = await res.json()
    if (!res.ok) {
      const msg = data?.error?.message || `Google Routes retornou ${res.status}`
      return NextResponse.json({ error: msg }, { status: 502 })
    }
  } catch {
    return NextResponse.json({ error: 'Falha ao consultar o Google Maps.' }, { status: 502 })
  }

  const route = data.routes?.[0]
  if (!route) {
    return NextResponse.json(
      { error: 'Nenhuma rota encontrada entre esses endereços.' },
      { status: 422 },
    )
  }

  const leg = route.legs?.[0]
  const start = leg?.startLocation?.latLng ?? {}
  const end = leg?.endLocation?.latLng ?? {}

  const steps = (leg?.steps ?? [])
    .map((s: any) => ({
      instruction: s.navigationInstruction?.instructions ?? '',
      distance: typeof s.distanceMeters === 'number' ? metersToText(s.distanceMeters) : '',
      duration: s.staticDuration ? secondsToText(s.staticDuration) : '',
    }))
    .filter((s: any) => s.instruction)

  return NextResponse.json({
    origin: {
      address: origin,
      lat: start.latitude ?? 0,
      lng: start.longitude ?? 0,
    },
    destination: {
      address: destination,
      lat: end.latitude ?? 0,
      lng: end.longitude ?? 0,
    },
    distance: metersToText(route.distanceMeters ?? 0),
    distanceValue: route.distanceMeters ?? 0,
    duration: secondsToText(route.duration ?? '0s'),
    summary: route.description ?? '',
    polyline: route.polyline?.encodedPolyline ?? '',
    steps,
  })
}
