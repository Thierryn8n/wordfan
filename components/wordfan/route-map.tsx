'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface RouteMapProps {
  polyline: string
  origin: { lat: number; lng: number; label: string }
  destination: { lat: number; lng: number; label: string }
  className?: string
}

/** Decodifica uma polyline codificada (algoritmo do Google, precisão 5). */
function decodePolyline(str: string, precision = 5): [number, number][] {
  let index = 0
  let lat = 0
  let lng = 0
  const coordinates: [number, number][] = []
  const factor = Math.pow(10, precision)

  while (index < str.length) {
    let result = 1
    let shift = 0
    let b: number
    do {
      b = str.charCodeAt(index++) - 63 - 1
      result += b << shift
      shift += 5
    } while (b >= 0x1f)
    lat += result & 1 ? ~(result >> 1) : result >> 1

    result = 1
    shift = 0
    do {
      b = str.charCodeAt(index++) - 63 - 1
      result += b << shift
      shift += 5
    } while (b >= 0x1f)
    lng += result & 1 ? ~(result >> 1) : result >> 1

    coordinates.push([lat / factor, lng / factor])
  }
  return coordinates
}

function pinIcon(color: string, glyph: string) {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:28px;height:28px">
      <div style="position:absolute;inset:0;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:900">${glyph}</div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 26],
  })
}

export default function RouteMap({ polyline, origin, destination, className }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    })
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    const points = decodePolyline(polyline)
    const latlngs: [number, number][] = points.length
      ? points
      : [
          [origin.lat, origin.lng],
          [destination.lat, destination.lng],
        ]

    const line = L.polyline(latlngs, {
      color: '#ec4899',
      weight: 5,
      opacity: 0.9,
    }).addTo(map)

    L.marker([origin.lat, origin.lng], { icon: pinIcon('#10b981', 'A') })
      .addTo(map)
      .bindPopup(origin.label)
    L.marker([destination.lat, destination.lng], { icon: pinIcon('#ec4899', 'B') })
      .addTo(map)
      .bindPopup(destination.label)

    map.fitBounds(line.getBounds(), { padding: [30, 30] })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [polyline, origin, destination])

  return <div ref={containerRef} className={className} />
}
