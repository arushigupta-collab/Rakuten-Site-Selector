import type { CellResult, Config, Overturn, RankedCandidate, Run, Survivor, Weights } from './types'

export function rawComposite(s: Survivor, w: Weights): number {
  return s.score_prox * w.proximity + s.score_iso * w.isolation + s.score_pop * w.population
}

/** S6 ranking: composite, rescale into score_range, P1 desc then P2 desc, shortlist, then planner overturns. */
export function rankCell(cell: CellResult, cfg: Config, overturns: Overturn[] = []): RankedCandidate[] {
  if (!cell.survivors.length) return []
  const w = cfg.scoring_weights
  const raws = cell.survivors.map((s) => rawComposite(s, w))
  const { min, max } = cfg.score_range
  const wsum = w.proximity + w.isolation + w.population || 1
  const scored = cell.survivors.map((s, i) => ({
    ...s,
    raw_composite: raws[i],
    // raw composite (0..1) rescaled into score_range so downstream systems see a consistent scale
    score_composite: +(min + (raws[i] / wsum) * (max - min)).toFixed(3),
    rank: 0,
  }))
  const p1 = scored.filter((s) => s.priority === 'P1').sort((a, b) => b.raw_composite - a.raw_composite)
  const p2 = scored.filter((s) => s.priority === 'P2').sort((a, b) => b.raw_composite - a.raw_composite)
  // mirror the documented example shape: up to 6 P1 then 2 P2 when both exist
  const n = cfg.max_candidates_per_cell
  const p2Take = Math.min(p2.length, Math.max(n - p1.length, Math.min(2, Math.floor(n / 4))))
  let list: RankedCandidate[] = [...p1.slice(0, n - p2Take), ...p2.slice(0, p2Take)]
  // apply overturns in order
  for (const o of overturns.filter((o) => o.ref_id === cell.ref_id)) {
    const idx = list.findIndex((c) => c.candidate_id === o.candidate_id)
    if (idx < 0) continue
    const [c] = list.splice(idx, 1)
    list.splice(Math.max(0, Math.min(list.length, o.to - 1)), 0, { ...c, overturned: o })
  }
  list = list.map((c, i) => ({ ...c, rank: i + 1 }))
  return list
}

export function rankRun(run: Run, cfg: Config) {
  return run.cells.map((c) => ({ cell: c, ranked: rankCell(c, cfg, run.overturns) }))
}

/** Plain-language reasoning, in the reference screens' voice */
export function explain(c: RankedCandidate, cell: CellResult, all: RankedCandidate[], cfg: Config): { saw: string; why: string; watch: string } {
  const w = cfg.scoring_weights
  const parts = [
    { k: 'close to the congested cell', v: c.score_prox * w.proximity, raw: c.score_prox },
    { k: 'well clear of other sites', v: c.score_iso * w.isolation, raw: c.score_iso },
    { k: 'under a lot of people', v: c.score_pop * w.population, raw: c.score_pop },
  ].sort((a, b) => b.v - a.v)
  const weakest = [...parts].sort((a, b) => a.raw - b.raw)[0]
  const next = all.find((x) => x.rank === c.rank + 1)
  const prev = all.find((x) => x.rank === c.rank - 1)
  const target = cell.kind === 'cell' ? 'the congested cell' : 'the gap centroid'
  const saw = `${c.dist_to_centroid_m.toFixed(0)} m from ${target}, nearest live or planned site ${c.nearest_site_m.toFixed(0)} m away, about ${c.population_covered.toLocaleString('en-US')} people inside the primary beam. Rooftops around it put the antenna at ${c.antenna_height_m} m, so the beam tilts ${c.electrical_tilt_deg}° down to reach ${target}.`
  const why = c.overturned
    ? `Moved from #${c.overturned.from} to #${c.overturned.to} by ${c.overturned.by}: "${c.overturned.reason}". The score is unchanged; only the order is.`
    : `It ranks #${c.rank} mainly because it is ${parts[0].k} and ${parts[1].k}.${prev ? ` It sits below #${prev.rank} by ${(prev.raw_composite - c.raw_composite).toFixed(3)} raw points.` : ''}${next ? ` It beats #${next.rank} by ${(c.raw_composite - next.raw_composite).toFixed(3)}.` : ''}`
  const watch = c.priority === 'P2'
    ? `P2: it sits outside the ±${cfg.forward_cone_half_angle_deg}° offload cone, so it relieves less of the sector's traffic than any P1.`
    : weakest.raw < 0.4
      ? `Weakest on being ${weakest.k} (${weakest.raw.toFixed(2)}). Worth a site walk before committing.`
      : c.relocated
        ? 'The grid point fell in a blocker and was nudged to the nearest dry sub-point. Check the access road.'
        : 'Nothing stands out against it. Check rooftop access and lease before committing.'
  return { saw, why, watch }
}
