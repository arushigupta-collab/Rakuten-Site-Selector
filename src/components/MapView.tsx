import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { BLOCKERS } from '../data/regions'
import { dest } from '../engine/geo'
import type { LatLon, Poly } from '../engine/geo'

export type Draw = (g: L.LayerGroup, map: L.Map) => void

type Props = {
  height: number | string
  draw: Draw
  deps: unknown[]
  /** bounds to fit; refits only when fitKey changes */
  fit?: LatLon[]
  fitKey?: string
  legend?: ReactNode
  tag?: ReactNode
  showBlockers?: boolean
}

export const C = {
  text: '#11151C', secondary: '#4F5866', muted: '#8A92A1', red: '#BF0000', info: '#1A4FBF', pass: '#0B7A5A', fail: '#C01128', retake: '#92600A',
}

export function MapView({ height, draw, deps, fit, fitKey, legend, tag, showBlockers = true }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const group = useRef<L.LayerGroup | null>(null)
  const lastFit = useRef<string | undefined>(undefined)
  const lastBounds = useRef<L.LatLngBounds | null>(null)

  useEffect(() => {
    if (!el.current) return
    const m = L.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: true }).setView([35.66, 139.71], 13)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19, maxNativeZoom: 16, attribution: 'Tiles © Esri',
    }).addTo(m)
    if (showBlockers)
      for (const b of BLOCKERS)
        L.polygon(b.poly.map(([lon, lat]) => [lat, lon] as [number, number]), {
          color: b.constraint_type === 'water' ? '#7d93b5' : '#7f9a82', weight: 1, dashArray: '3 3', fillOpacity: 0.12, interactive: false,
        }).addTo(m)
    group.current = L.layerGroup().addTo(m)
    map.current = m
    const ro = new ResizeObserver(() => {
      m.invalidateSize()
      if (lastBounds.current) m.fitBounds(lastBounds.current, { padding: [28, 28], maxZoom: 17 })
    })
    ro.observe(el.current)
    return () => {
      ro.disconnect()
      // remove layers first so the canvas renderer cancels its pending redraw before the map goes
      m.eachLayer((l) => {
        m.removeLayer(l)
      })
      m.remove()
      map.current = null
      group.current = null
      lastBounds.current = null
      // a rebuilt map (StrictMode remount, blocker toggle) must fit again
      lastFit.current = undefined
    }
  }, [showBlockers])

  useEffect(() => {
    const m = map.current
    const g = group.current
    if (!m || !g) return
    g.clearLayers()
    draw(g, m)
    if (fit && fit.length && fitKey !== lastFit.current) {
      lastFit.current = fitKey
      lastBounds.current = L.latLngBounds(fit.map((p) => [p.lat, p.lon] as [number, number]))
      m.fitBounds(lastBounds.current, { padding: [28, 28], maxZoom: 17 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return (
    <div className="map" style={{ height }}>
      <div ref={el} style={{ position: 'absolute', inset: 0 }} />
      {tag && <div className="map-tag">{tag}</div>}
      {legend && <div className="map-legend">{legend}</div>}
    </div>
  )
}

// ---------- drawing helpers ----------

const ll = (p: LatLon) => [p.lat, p.lon] as [number, number]

export function wedge(center: LatLon, az: number, half: number, r: number, rMin = 0): [number, number][] {
  const pts: [number, number][] = []
  for (let a = az - half; a <= az + half + 0.01; a += 3) pts.push(ll(dest(center, a, r)))
  if (rMin > 0) for (let a = az + half; a >= az - half - 0.01; a -= 3) pts.push(ll(dest(center, a, rMin)))
  else pts.push(ll(center))
  return pts
}

export function drawRing(g: L.LayerGroup, center: LatLon, r: number, opts: { az?: number; cone?: number; rMin?: number } = {}) {
  L.circle(ll(center), { radius: r, color: C.info, weight: 1.5, dashArray: '6 5', fill: false, interactive: false }).addTo(g)
  if (opts.rMin) L.circle(ll(center), { radius: opts.rMin, color: C.info, weight: 1, dashArray: '2 4', fill: false, interactive: false }).addTo(g)
  if (opts.az !== undefined && opts.cone)
    L.polygon(wedge(center, opts.az, opts.cone, r, opts.rMin), { color: C.info, weight: 1, fillColor: C.info, fillOpacity: 0.07, interactive: false }).addTo(g)
}

export function drawMast(g: L.LayerGroup, p: LatLon, az?: number, label?: string) {
  if (az !== undefined)
    L.polyline([ll(p), ll(dest(p, az, 140))], { color: C.info, weight: 2.5, interactive: false }).addTo(g)
  const m = L.marker(ll(p), { icon: L.divIcon({ className: 'mast-icon', html: '<div></div>', iconSize: [14, 14] }) }).addTo(g)
  if (label) m.bindTooltip(label, { direction: 'top', offset: [0, -8] })
}

export function drawGap(g: L.LayerGroup, poly: Poly, selected = true) {
  L.polygon(poly.map(([lon, lat]) => [lat, lon] as [number, number]), {
    color: selected ? C.fail : C.muted, weight: selected ? 2 : 1.2, fillColor: C.fail, fillOpacity: selected ? 0.1 : 0.04, dashArray: selected ? undefined : '4 4',
  }).addTo(g)
}

export function drawPin(g: L.LayerGroup, p: LatLon, n: number, kind: 'p1' | 'p2' | 'sel', onClick?: () => void) {
  const size = kind === 'sel' ? 26 : 22
  const m = L.marker(ll(p), {
    icon: L.divIcon({ className: `pin-label ${kind}`, html: `<div>${n || "P"}</div>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
    zIndexOffset: kind === 'sel' ? 1000 : 0,
  }).addTo(g)
  if (onClick) m.on('click', onClick)
}

export function drawSectors(g: L.LayerGroup, p: LatLon, sectors: { azimuth_deg: number; sector_index: number }[], reach: number, selected: boolean) {
  for (const s of sectors) {
    const primary = s.sector_index === 0
    L.polygon(wedge(p, s.azimuth_deg, 32, primary ? reach : reach * 0.55), {
      color: selected ? (primary ? C.red : C.secondary) : C.muted,
      weight: 1,
      fillColor: selected ? (primary ? C.red : C.secondary) : C.muted,
      fillOpacity: selected ? (primary ? 0.14 : 0.08) : 0.05,
      interactive: false,
    }).addTo(g)
  }
}

export function drawDots(g: L.LayerGroup, pts: LatLon[], color: string, opacity = 1, r = 2.6) {
  for (const p of pts) L.circleMarker(ll(p), { radius: r, stroke: false, fillColor: color, fillOpacity: opacity, interactive: false }).addTo(g)
}

export const LegendDot = ({ color, label, square }: { color: string; label: string; square?: boolean }) => (
  <span>
    <i className="dot" style={{ background: color, borderRadius: square ? 2 : 999 }} />
    {label}
  </span>
)
