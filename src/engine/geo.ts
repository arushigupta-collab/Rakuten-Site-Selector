export type LatLon = { lat: number; lon: number }

const R = 6371000
const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

export function haversine(a: LatLon, b: LatLon): number {
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Bearing from a to b, degrees clockwise from north, 0..360 */
export function bearing(a: LatLon, b: LatLon): number {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat))
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon))
  return (deg(Math.atan2(y, x)) + 360) % 360
}

/** Point reached from p travelling dist metres on bearing brg */
export function dest(p: LatLon, brg: number, dist: number): LatLon {
  const d = dist / R
  const t = rad(brg)
  const la1 = rad(p.lat)
  const lo1 = rad(p.lon)
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(t))
  const lo2 = lo1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2))
  return { lat: deg(la2), lon: deg(lo2) }
}

/** Signed smallest difference a-b in degrees, -180..180 */
export function angDiff(a: number, b: number): number {
  return ((a - b + 540) % 360) - 180
}

/** Polygon as [lon, lat] pairs (WKT order) */
export type Poly = [number, number][]

export function inPolygon(p: LatLon, poly: Poly): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > p.lat !== yj > p.lat && p.lon < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function centroid(poly: Poly): LatLon {
  let lat = 0
  let lon = 0
  const closed = poly[0][0] === poly[poly.length - 1][0] && poly[0][1] === poly[poly.length - 1][1]
  const pts = closed ? poly.slice(0, -1) : poly
  for (const [x, y] of pts) {
    lon += x
    lat += y
  }
  return { lat: lat / pts.length, lon: lon / pts.length }
}

export function toWkt(poly: Poly): string {
  const ring = poly[0][0] === poly[poly.length - 1][0] && poly[0][1] === poly[poly.length - 1][1] ? poly : [...poly, poly[0]]
  return `POLYGON((${ring.map(([x, y]) => `${x.toFixed(4)} ${y.toFixed(4)}`).join(', ')}))`
}

/** Local metric offset of b from a (east, north) in metres */
export function offsetM(a: LatLon, b: LatLon): { e: number; n: number } {
  return {
    e: (b.lon - a.lon) * 111320 * Math.cos(rad(a.lat)),
    n: (b.lat - a.lat) * 110540,
  }
}

export function fromOffset(a: LatLon, e: number, n: number): LatLon {
  return { lat: a.lat + n / 110540, lon: a.lon + e / (111320 * Math.cos(rad(a.lat))) }
}
