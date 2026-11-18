import { CELLS, GAPS } from '../data/regions'
import { toWkt } from './geo'
import { runCapacityCell, runCoverageGap } from './pipeline'
import { rankRun } from './rank'
import { hashStr, hex6 } from './seed'
import type { Config, PlannedRow, ProblemType, Region, Run } from './types'

function ts(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

/** Local stand-in for POST /candidate. The UI animates the steps afterwards. */
export function runCandidate(problem: ProblemType, region: Region, ids: string[], cfg: Config, planned: PlannedRow[]): Run {
  const t0 = performance.now()
  const now = new Date()
  const prefix = problem === 'CAPACITY' ? 'CAP' : 'COV'
  const run_id = `RUN-${prefix}-${ts(now)}-${hex6(hashStr(ids.join(',') + now.getTime()))}`
  const cells =
    problem === 'CAPACITY'
      ? ids.map((id) => runCapacityCell(CELLS.find((c) => c.cell_id === id)!, cfg, planned))
      : ids.map((id) => runCoverageGap(GAPS.find((g) => g.gap_id === id)!, cfg, planned))
  const compute = performance.now() - t0
  return {
    run_id, problem_type: problem, region, created_at: now.toISOString(), config_version: cfg.version,
    // simulated: DS6 cache miss on the first tile dominates real runs
    duration_ms: Math.round(compute + 41000 + ids.length * 9000),
    cells, revealed: false, saved: false, overturns: [],
  }
}

/** The documented v2 response envelope, for Export JSON */
export function toResponse(run: Run, cfg: Config) {
  const ranked = rankRun(run, cfg)
  const isCap = run.problem_type === 'CAPACITY'
  const candidates = ranked
    .flatMap(({ cell, ranked }) =>
      ranked.map((c) => ({
        candidate_id: c.candidate_id,
        candidate_name: `${isCap ? 'CAP' : 'COV'}_${cell.ref_id} -- Candidate ${c.rank} [${c.priority}]`,
        lat: c.lat, lon: c.lon, priority: c.priority,
        ...(isCap ? { site_type: c.site_type } : {}),
        dist_to_centroid_m: c.dist_to_centroid_m, nearest_site_m: c.nearest_site_m, population_covered: c.population_covered,
        ...(isCap ? { vertical_beamwidth_deg: c.vertical_beamwidth_deg, horizontal_beamwidth_deg: c.horizontal_beamwidth_deg } : {}),
        beam_near_edge_m: c.beam_near_edge_m, beam_far_edge_m: c.beam_far_edge_m,
        score_prox: c.score_prox, score_iso: c.score_iso, score_pop: c.score_pop, score_composite: c.score_composite,
        sectors: c.sectors,
        ...(!isCap ? { ranking_explanation: `<b>Proximity</b> ${c.score_prox} · <b>Isolation</b> ${c.score_iso} · <b>Population</b> ${c.score_pop}` } : {}),
      })),
    )
    .sort((a, b) => (a.priority === b.priority ? b.score_composite - a.score_composite : a.priority === 'P1' ? -1 : 1))
  return {
    run_id: run.run_id,
    request: isCap
      ? { problem_type: 'CAPACITY', congested_cells: run.cells.map((c) => ({ cell_id: c.ref_id, site_lat: c.center.lat, site_lon: c.center.lon, cell_azimuth_deg: c.azimuth })), region: run.region ?? 'KANTO' }
      : { problem_type: 'COVERAGE', coverage_gaps: run.cells.map((c) => ({ gap_id: c.ref_id, polygon_wkt: toWkt(c.gapPoly!) })), region: run.region ?? 'KANTO' },
    candidates,
    small_cell_suggestions: run.cells.filter((c) => c.small_cell).map((c) => c.small_cell),
    site_already_planned: run.cells.filter((c) => c.planned).map((c) => c.planned),
    viz_urls: run.cells.filter((c) => c.outcome === 'candidates').map((c) => `/artifact/runs/${run.run_id}/pipeline_viz_${c.ref_id}.html`),
  }
}

export function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
