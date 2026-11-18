import { BASE_DENSITY, BLOCKERS, DS9, HOTSPOTS } from '../data/regions'
import { angDiff, bearing, centroid, dest, fromOffset, haversine, inPolygon } from './geo'
import type { LatLon, Poly } from './geo'
import { noise2 } from './seed'
import type {
  CellResult, Config, CongestedCell, CoverageGap, GridPoint, Morphology, PlannedRow, Sector, SiteType, StepCount, Survivor,
} from './types'

const fmt = (n: number) => Math.round(n).toLocaleString('en-US')

// ---------- synthetic DS5 / DS6 surfaces ----------

/** People per km² (night population), DS5 stand-in */
export function density(p: LatLon, morph: Morphology): number {
  let d = BASE_DENSITY[morph] * 0.45
  for (const h of HOTSPOTS) {
    const dist = haversine(p, h)
    d += h.w * Math.exp(-(dist * dist) / (2 * 650 * 650))
  }
  // 250 m mesh texture
  const gx = Math.floor(p.lon * 444)
  const gy = Math.floor(p.lat * 444)
  return d * (0.75 + 0.5 * noise2(gx, gy, 3))
}

/** Building height in metres at a point, DS6 stand-in (50 m mesh) */
export function buildingHeight(p: LatLon, morph: Morphology): number {
  const gx = Math.floor(p.lon * 2222)
  const gy = Math.floor(p.lat * 2222)
  const r = noise2(gx, gy, 9)
  const [base, span] = morph === 'DU' ? [14, 48] : morph === 'U' ? [8, 30] : morph === 'SU' ? [5, 16] : [0, 8]
  return r < 0.08 ? 0 : base + span * r * r
}

function blockerAt(p: LatLon): string | undefined {
  for (const b of BLOCKERS) if ((b.constraint_type === 'water' || b.constraint_type === 'forests') && inPolygon(p, b.poly)) return b.name
  return undefined
}

function percentile(xs: number[], q: number): number {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor((q / 100) * s.length))]
}

// ---------- shared steps ----------

/** S1: regular grid at cell centres (half-step offset) inside the ring */
function gridStamp(center: LatLon, radius: number, spacing: number): LatLon[] {
  const pts: LatLon[] = []
  const n = Math.ceil(radius / spacing)
  for (let i = -n; i < n; i++)
    for (let j = -n; j < n; j++) {
      const e = (i + 0.5) * spacing
      const nn = (j + 0.5) * spacing
      if (e * e + nn * nn <= radius * radius) pts.push(fromOffset(center, e, nn))
    }
  return pts
}

/** S3 constraint relocation: try a 3×3 subsample of the grid cell, nearest valid sub-point wins */
function relocate(p: LatLon, spacing: number): LatLon | undefined {
  let best: LatLon | undefined
  let bestD = Infinity
  for (let i = -1; i <= 1; i++)
    for (let j = -1; j <= 1; j++) {
      if (!i && !j) continue
      const q = fromOffset(p, (i * spacing) / 3, (j * spacing) / 3)
      if (!blockerAt(q)) {
        const d = Math.hypot(i, j)
        if (d < bestD) {
          bestD = d
          best = q
        }
      }
    }
  return best
}

type Blocking = { nename: string; lat: number; lon: number }

function blockingSet(planned: PlannedRow[]): Blocking[] {
  return [
    ...DS9.filter((s) => s.deleted === 0 && (s.nestatus === 'ONAIR' || s.nestatus === 'PLANNED') && s.netype.startsWith('MACRO')).map((s) => ({ nename: s.nename, lat: s.latitude, lon: s.longitude })),
    ...planned.map((p) => ({ nename: p.nename, lat: p.latitude, lon: p.longitude })),
  ]
}

function nearestOf(p: LatLon, set: Blocking[]): { d: number; s: Blocking } {
  let best = set[0]
  let bd = Infinity
  for (const s of set) {
    if (!Number.isFinite(s.lat) || !Number.isFinite(s.lon)) continue // NaN-safe, as in the real S4
    const d = haversine(p, s)
    if (d < bd) {
      bd = d
      best = s
    }
  }
  return { d: bd, s: best }
}

/** S7 secondary sectors: sliding 3-slice window over the 300° arc outside the primary ±30° */
function secondarySectors(p: LatLon, primaryAz: number, morph: Morphology, reach: number): { az: number; pop: number }[] {
  const slices: { az: number; pop: number }[] = []
  for (let k = 0; k < 15; k++) {
    const az = (primaryAz + 30 + 10 + k * 20) % 360
    let pop = 0
    for (const r of [reach * 0.3, reach * 0.6, reach * 0.9]) pop += density(dest(p, az, r), morph)
    slices.push({ az, pop })
  }
  const windows = slices.map((_, i) => (i <= 12 ? { i, pop: slices[i].pop + slices[i + 1].pop + slices[i + 2].pop, az: slices[i + 1].az } : null)).filter(Boolean) as { i: number; pop: number; az: number }[]
  windows.sort((a, b) => b.pop - a.pop)
  const s1 = windows[0]
  const s2 = windows.find((w) => Math.abs(w.i - s1.i) >= 3) ?? windows[1]
  const scale = (reach * reach * Math.PI * (60 / 360)) / 1e6 / 9
  return [s1, s2].map((w) => ({ az: Math.round(w.az), pop: Math.round(w.pop * scale) }))
}

// ---------- capacity pipeline ----------

export function runCapacityCell(cell: CongestedCell, cfg: Config, planned: PlannedRow[]): CellResult {
  const center = { lat: cell.site_lat, lon: cell.site_lon }
  const az = cell.cell_azimuth_deg
  const morph = cell.morphology
  const cd = cfg.clutter_defaults[morph]
  const cone = cfg.forward_cone_half_angle_deg
  const steps: StepCount[] = []

  // ----- S0 ring setup -----
  const active = DS9.filter((s) => s.deleted === 0 && s.nestatus === 'ONAIR' && s.netype.startsWith('MACRO'))
  const nearestAny = Math.min(...active.map((s) => haversine(center, { lat: s.latitude, lon: s.longitude })).filter((d) => d > cfg.co_location_threshold_m))
  let isd = cd.isd_m
  let isdSource = `morphology fallback (${morph})`
  let inConeNearest: { d: number; nename: string; lat: number; lon: number } | undefined
  if (nearestAny <= cfg.locality_guard_max_m) {
    for (const s of active) {
      const sp = { lat: s.latitude, lon: s.longitude }
      const d = haversine(center, sp)
      if (d <= cfg.co_location_threshold_m || d < cfg.cone_isd_min_m) continue
      if (Math.abs(angDiff(bearing(center, sp), az)) > cone) continue
      if (!inConeNearest || d < inConeNearest.d) inConeNearest = { d, nename: s.nename, lat: s.latitude, lon: s.longitude }
    }
    if (inConeNearest) {
      isd = inConeNearest.d
      isdSource = `${inConeNearest.nename.slice(0, 13)} at ${fmt(inConeNearest.d)} m in the ±${cone}° cone`
    }
  }
  // small-cell check uses the raw nearest in-cone (including < cone_isd_min_m is excluded above, so re-check with min 10 m)
  let solution: SiteType = 'MACRO'
  let ringR = isd * cfg.ring_factor
  let ringMin = cd.min_dist_from_cell_m
  if (inConeNearest && inConeNearest.d < 100) solution = 'SMALL_CELL'
  else if (inConeNearest && inConeNearest.d < 250) {
    solution = 'MICRO'
    ringR = 250
    ringMin = 100
  }

  const base: Omit<CellResult, 'outcome' | 'steps' | 'points' | 'survivors'> = {
    ref_id: cell.cell_id, kind: 'cell', area: cell.area, morphology: morph, center, azimuth: az,
    isd_m: Math.round(isd), isd_source: isdSource, ring_r_m: Math.round(ringR), ring_min_m: ringMin, solution_type: solution,
  }

  // planned-site check runs before classification
  const plannedSites = [
    ...DS9.filter((s) => s.nestatus === 'PLANNED' && s.deleted === 0).map((s) => ({ nename: s.nename, lat: s.latitude, lon: s.longitude, source: 'DS9', h: 26, tilt: 5.4 })),
    ...planned.map((p) => ({ nename: p.nename, lat: p.latitude, lon: p.longitude, source: 'inventory_planned (MySQL)', h: 30, tilt: 5.1 })),
  ]
  const hit = plannedSites
    .map((p) => ({ p, d: haversine(center, p) }))
    .filter(({ p, d }) => d <= ringR && Math.abs(angDiff(bearing(center, p), az)) <= cone)
    .sort((a, b) => a.d - b.d)[0]
  if (hit) {
    steps.push({ key: 'S0', name: 'Ring setup', in: 1, out: 0, note: `A planned site already sits ${fmt(hit.d)} m into the cone. Stopped here, no new candidates.` })
    return {
      ...base, outcome: 'already_planned', steps, points: [], survivors: [],
      planned: {
        cell_id: cell.cell_id, planned_nename: hit.p.nename, planned_lat: hit.p.lat, planned_lon: hit.p.lon, dist_m: +hit.d.toFixed(1),
        source: hit.p.source, suggestion: 'Rakuten AI already proposed a site for this', antenna_height_m: hit.p.h, electrical_tilt_deg: hit.p.tilt, beam_far_edge_m: Math.round(hit.d * 1.7),
      },
    }
  }

  if (solution === 'SMALL_CELL' && inConeNearest) {
    steps.push({ key: 'S0', name: 'Ring setup', in: 1, out: 0, note: `Nearest in-cone site is ${fmt(inConeNearest.d)} m away, under 100 m. A macro would sit on top of it, so small-cell placement is suggested instead.` })
    return {
      ...base, outcome: 'small_cell', steps, points: [], survivors: [],
      small_cell: {
        cell_id: cell.cell_id, cell_lat: cell.site_lat, cell_lon: cell.site_lon, azimuth: az, morphology: morph, isd_m: Math.round(isd), ring_r_m: Math.round(ringR),
        reason: `nearest in-cone site ${Math.round(inConeNearest.d)}m < 100m -- SMALL_CELL_PLACEMENT suggested`, suggestion: 'SMALL_CELL_PLACEMENT',
        nearest_in_cone_m: +inConeNearest.d.toFixed(1), nearest_site_lat: inConeNearest.lat, nearest_site_lon: inConeNearest.lon, nearest_site_nename: inConeNearest.nename,
      },
    }
  }
  steps.push({
    key: 'S0', name: 'Ring setup', in: 1, out: 1,
    note: solution === 'MICRO'
      ? `Nearest in-cone site is ${fmt(isd)} m away, so this is a MICRO problem. Fixed ring 100 to 250 m.`
      : `ISD ${fmt(isd)} m from ${isdSource}. MACRO, ring ${fmt(ringR)} m (ISD × ${cfg.ring_factor}).`,
  })

  // ----- S1 grid -----
  const spacing = solution === 'MICRO' ? 25 : cd.grid_spacing_m
  const grid = gridStamp(center, ringR, spacing)
  steps.push({ key: 'S1', name: 'Grid stamp', in: 1, out: grid.length, note: `${fmt(grid.length)} points at ${spacing} m spacing across the ring.` })

  // ----- S2 geometry -----
  const points: GridPoint[] = []
  const s2: { p: LatLon; prio: 'P1' | 'P2'; gp: GridPoint }[] = []
  let inner = 0
  let behind = 0
  for (const p of grid) {
    const d = haversine(center, p)
    const off = Math.abs(angDiff(bearing(center, p), az))
    const gp: GridPoint = { lat: p.lat, lon: p.lon, status: 'ok' }
    points.push(gp)
    if (d < ringMin) {
      gp.status = 'inner'
      inner++
    } else if (off > 90) {
      gp.status = 'behind'
      behind++
    } else s2.push({ p, prio: off <= cone ? 'P1' : 'P2', gp })
  }
  const p1n = s2.filter((x) => x.prio === 'P1').length
  steps.push({ key: 'S2', name: 'Geometry pre-filter', in: grid.length, out: s2.length, note: `${fmt(behind)} behind the sector, ${fmt(inner)} within ${ringMin} m of the mast. ${fmt(p1n)} P1 inside ±${cone}°, ${fmt(s2.length - p1n)} P2.` })

  // ----- S3 terrain / constraints -----
  const s3: typeof s2 = []
  let blocked = 0
  let relocated = 0
  const blockNames = new Set<string>()
  for (const x of s2) {
    const b = blockerAt(x.p)
    if (!b) {
      s3.push(x)
      continue
    }
    const r = relocate(x.p, spacing)
    if (r) {
      relocated++
      x.gp.relocated = true
      s3.push({ ...x, p: r })
    } else {
      blocked++
      blockNames.add(b)
      x.gp.status = 'blocked'
      x.gp.blocker = b
    }
  }
  steps.push({
    key: 'S3', name: 'Terrain & constraints', in: s2.length, out: s3.length,
    note: blocked || relocated ? `${fmt(blocked)} inside ${[...blockNames].join(', ') || 'blockers'}${relocated ? `, ${relocated} nudged to a dry sub-point` : ''}.` : 'No water or forest inside the ring.',
  })

  // ----- S4 separation -----
  const blocking = blockingSet(planned)
  const sep = ringMin
  const s4: (typeof s2[number] & { nearest: number; nearestName: string })[] = []
  let sepRej = 0
  for (const x of s3) {
    const nn = nearestOf(x.p, blocking)
    if (nn.d < sep) {
      sepRej++
      x.gp.status = 'separation'
    } else s4.push({ ...x, nearest: nn.d, nearestName: nn.s.nename })
  }
  steps.push({ key: 'S4', name: 'Site separation', in: s3.length, out: s4.length, note: `${fmt(sepRej)} within ${sep} m of a live or planned site (DS9 + inventory_planned).` })

  // ----- S5 height & tilt -----
  const s5 = s4.map((x) => {
    const dToCell = haversine(x.p, center)
    const brg = bearing(x.p, center)
    const hs: number[] = []
    for (let a = -30; a <= 30; a += 10)
      for (let r = 20; r <= Math.max(30, dToCell / 2); r += 25) {
        const h = buildingHeight(dest(x.p, brg + a, r), morph)
        if (h > 0) hs.push(h)
      }
    const h = Math.min(60, Math.max(cfg.default_antenna_height_m, percentile(hs, cfg.height_sample_percentile) + cfg.height_clearance_m))
    const tilt = Math.min(cfg.max_electrical_tilt_deg, (Math.atan(h / Math.max(dToCell, 1)) * 180) / Math.PI)
    return { ...x, dToCell, brg, h, tilt }
  })
  const hMin = Math.min(...s5.map((x) => x.h))
  const hMax = Math.max(...s5.map((x) => x.h))
  steps.push({ key: 'S5', name: 'Height & tilt', in: s4.length, out: s5.length, note: s5.length ? `Antenna heights ${Math.round(hMin)} to ${Math.round(hMax)} m from DS6 rooftops in a ±30° cone, tilt = atan(h / d).` : 'Nothing left to size.' })

  // ----- S6 scoring (raw components; composite is computed at read time) -----
  const pops = s5.map((x) => {
    let pop = 0
    for (let a = -30; a <= 30; a += 10)
      for (let r = 25; r <= x.dToCell; r += 40) {
        const q = dest(x.p, x.brg + a, r)
        if (Math.abs(angDiff(bearing(center, q), az)) > cone && haversine(center, q) > 30) continue
        pop += density(q, morph) * ((r * (Math.PI / 18) * 40) / 1e6)
      }
    return pop
  })
  const maxPop = Math.max(1, ...pops)
  const survivors: Survivor[] = s5.map((x, i) => {
    const sProx = Math.min(1, Math.max(0, 1 - (x.dToCell - ringMin) / Math.max(1, ringR - ringMin)))
    const sIso = Math.min(1, Math.max(0, (x.nearest - sep) / (2 * sep)))
    const sPop = pops[i] / maxPop
    const primaryAz = Math.round(x.brg)
    const sec = secondarySectors(x.p, primaryAz, morph, Math.max(200, x.dToCell))
    const sectors: Sector[] = [
      { sector_index: 0, azimuth_deg: primaryAz, electrical_tilt_deg: +x.tilt.toFixed(1), mechanical_tilt_deg: 0, total_tilt_deg: +x.tilt.toFixed(1), antenna_height_m: Math.round(x.h), population_covered: Math.round(pops[i]) },
      ...sec.map((s, k) => ({ sector_index: k + 1, azimuth_deg: s.az, electrical_tilt_deg: null, mechanical_tilt_deg: 0, total_tilt_deg: null, antenna_height_m: Math.round(x.h), population_covered: s.pop })),
    ]
    return {
      candidate_id: '', lat: +x.p.lat.toFixed(6), lon: +x.p.lon.toFixed(6), priority: x.prio, site_type: solution,
      dist_to_centroid_m: +x.dToCell.toFixed(1), nearest_site_m: +x.nearest.toFixed(1), nearest_site_nename: x.nearestName,
      population_covered: Math.round(pops[i]), vertical_beamwidth_deg: solution === 'MICRO' ? 12 : 7, horizontal_beamwidth_deg: 65,
      beam_near_edge_m: 0, beam_far_edge_m: +x.dToCell.toFixed(1), antenna_height_m: Math.round(x.h), electrical_tilt_deg: +x.tilt.toFixed(1),
      score_prox: +sProx.toFixed(3), score_iso: +sIso.toFixed(3), score_pop: +sPop.toFixed(3), sectors, relocated: !!x.gp.relocated,
    }
  })
  // stable ids by initial raw order
  survivors.forEach((s, i) => (s.candidate_id = `CAND_CAP_${cell.cell_id}_${String(i).padStart(4, '0')}`))
  steps.push({ key: 'S6', name: 'Scoring & ranking', in: s5.length, out: Math.min(s5.length, cfg.max_candidates_per_cell), note: `Proximity ${cfg.scoring_weights.proximity.toFixed(2)}, isolation ${cfg.scoring_weights.isolation.toFixed(2)}, population ${cfg.scoring_weights.population.toFixed(2)}. Top ${cfg.max_candidates_per_cell} kept, P1 first.` })
  steps.push({ key: 'S7', name: 'Sector configuration', in: Math.min(s5.length, cfg.max_candidates_per_cell), out: Math.min(s5.length, cfg.max_candidates_per_cell), note: 'Primary sector points back at the congested cell; two secondaries follow the busiest 60° windows.' })

  return { ...base, outcome: survivors.length ? 'candidates' : 'none', steps, points, survivors }
}

// ---------- coverage pipeline ----------

export function runCoverageGap(gap: CoverageGap, cfg: Config, planned: PlannedRow[]): CellResult {
  const morph = gap.morphology
  const cd = cfg.clutter_defaults[morph]
  const c = centroid(gap.poly)
  const circum = Math.max(...gap.poly.map(([lon, lat]) => haversine(c, { lat, lon })))
  const ringR = Math.min(circum * 1.5, Math.max(circum, circum * 1.15))
  const steps: StepCount[] = []
  steps.push({ key: 'S0', name: 'Ring setup', in: 1, out: 1, note: `Gap centroid is the reference. Circumradius ${fmt(circum)} m, ring clamped to ${fmt(ringR)} m. Coverage is always MACRO.` })
  const spacing = cd.grid_spacing_m * 1.2
  const grid = gridStamp(c, ringR, spacing)
  steps.push({ key: 'S1', name: 'Grid stamp', in: 1, out: grid.length, note: `${fmt(grid.length)} points at ${Math.round(spacing)} m spacing.` })
  const points: GridPoint[] = grid.map((p) => ({ ...p, status: 'ok' }))
  const s2 = points.map((gp) => ({ gp, p: { lat: gp.lat, lon: gp.lon } as LatLon, prio: (inPolygon(gp, gap.poly) ? 'P1' : 'P2') as 'P1' | 'P2' }))
  const p1n = s2.filter((x) => x.prio === 'P1').length
  steps.push({ key: 'S2', name: 'Geometry pre-filter', in: grid.length, out: s2.length, note: `No sector to stand behind for a gap. ${fmt(p1n)} P1 inside the polygon, ${fmt(s2.length - p1n)} P2 around it.` })

  const s3: typeof s2 = []
  let blocked = 0
  const names = new Set<string>()
  for (const x of s2) {
    const b = blockerAt(x.p)
    if (b) {
      blocked++
      names.add(b)
      x.gp.status = 'blocked'
      x.gp.blocker = b
    } else s3.push(x)
  }
  steps.push({ key: 'S3', name: 'Terrain & constraints', in: s2.length, out: s3.length, note: blocked ? `${fmt(blocked)} inside ${[...names].join(', ')}.` : 'No water or forest inside the ring.' })

  const blocking = blockingSet(planned)
  const sep = cd.min_dist_from_cell_m
  const s4: (typeof s2[number] & { nearest: number; nearestName: string })[] = []
  let rej = 0
  for (const x of s3) {
    const nn = nearestOf(x.p, blocking)
    if (nn.d < sep) {
      rej++
      x.gp.status = 'separation'
    } else s4.push({ ...x, nearest: nn.d, nearestName: nn.s.nename })
  }
  steps.push({ key: 'S4', name: 'Site separation', in: s3.length, out: s4.length, note: `${fmt(rej)} within ${sep} m of a live or planned site.` })

  const s5 = s4.map((x) => {
    const d = haversine(x.p, c)
    const brg = bearing(x.p, c)
    const hs: number[] = []
    for (let a = -30; a <= 30; a += 15) for (let r = 20; r <= 200; r += 30) hs.push(buildingHeight(dest(x.p, brg + a, r), morph))
    const h = Math.min(50, Math.max(cfg.default_antenna_height_m, percentile(hs.filter((v) => v > 0), cfg.height_sample_percentile) + cfg.height_clearance_m))
    const tilt = Math.min(cfg.max_electrical_tilt_deg, (Math.atan(h / Math.max(d, 150)) * 180) / Math.PI)
    return { ...x, d, brg, h, tilt }
  })
  steps.push({ key: 'S5', name: 'Height & tilt', in: s4.length, out: s5.length, note: 'Tilt aimed at the gap centroid (LOS target).' })

  const pops = s5.map((x) => {
    let pop = 0
    for (let a = 0; a < 360; a += 30)
      for (let r = 40; r <= 400; r += 60) {
        const q = dest(x.p, a, r)
        pop += density(q, morph) * (inPolygon(q, gap.poly) ? 1 : 0.25) * ((r * (Math.PI / 6) * 60) / 1e6)
      }
    return pop
  })
  const maxPop = Math.max(1, ...pops)
  const survivors: Survivor[] = s5.map((x, i) => {
    const sProx = Math.min(1, Math.max(0, 1 - x.d / ringR))
    const sIso = Math.min(1, Math.max(0, (x.nearest - sep) / (2 * sep)))
    const sPop = pops[i] / maxPop
    const primaryAz = Math.round(x.brg)
    const sec = secondarySectors(x.p, primaryAz, morph, 350)
    return {
      candidate_id: `CAND_COV_${gap.gap_id}_${String(i).padStart(4, '0')}`, lat: +x.p.lat.toFixed(6), lon: +x.p.lon.toFixed(6), priority: x.prio, site_type: 'MACRO',
      dist_to_centroid_m: +x.d.toFixed(1), nearest_site_m: +x.nearest.toFixed(1), nearest_site_nename: x.nearestName, population_covered: Math.round(pops[i]),
      beam_near_edge_m: 0, beam_far_edge_m: Math.round(Math.max(x.d, 300)), antenna_height_m: Math.round(x.h), electrical_tilt_deg: +x.tilt.toFixed(1),
      score_prox: +sProx.toFixed(3), score_iso: +sIso.toFixed(3), score_pop: +sPop.toFixed(3), relocated: false,
      sectors: [
        { sector_index: 0, azimuth_deg: primaryAz, electrical_tilt_deg: +x.tilt.toFixed(1), mechanical_tilt_deg: 0, total_tilt_deg: +x.tilt.toFixed(1), antenna_height_m: Math.round(x.h), population_covered: Math.round(pops[i] / 3) },
        ...sec.map((s, k) => ({ sector_index: k + 1, azimuth_deg: s.az, electrical_tilt_deg: null, mechanical_tilt_deg: 0, total_tilt_deg: null, antenna_height_m: Math.round(x.h), population_covered: s.pop })),
      ],
    }
  })
  steps.push({ key: 'S6', name: 'Scoring & ranking', in: s5.length, out: Math.min(s5.length, cfg.max_candidates_per_cell), note: `Top ${cfg.max_candidates_per_cell} kept, P1 inside the gap first.` })
  steps.push({ key: 'S7', name: 'Sector configuration', in: Math.min(s5.length, cfg.max_candidates_per_cell), out: Math.min(s5.length, cfg.max_candidates_per_cell), note: 'Primary sector faces the gap centroid.' })

  return {
    ref_id: gap.gap_id, kind: 'gap', area: gap.area, morphology: morph, center: c, gapPoly: gap.poly as Poly, isd_m: cd.isd_m, isd_source: 'gap circumradius',
    ring_r_m: Math.round(ringR), ring_min_m: 0, solution_type: 'MACRO', outcome: survivors.length ? 'candidates' : 'none', steps, points, survivors,
  }
}

