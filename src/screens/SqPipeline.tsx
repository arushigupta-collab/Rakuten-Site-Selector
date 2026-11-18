import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { C, drawDots, drawGap, drawMast, drawPin, drawRing, LegendDot, MapView } from '../components/MapView'
import { PageHead } from '../components/Shell'
import { IconArrow, IconCheck } from '../components/icons'
import { fmtDur, fmtN, Mono, Tag } from '../components/ui'
import { rankCell } from '../engine/rank'
import type { CellResult, GridPoint, Run } from '../engine/types'
import { useStore } from '../store'

const STEP_NAMES = ['Ring setup', 'Grid stamp', 'Geometry pre-filter', 'Terrain & constraints', 'Site separation', 'Height & tilt', 'Scoring & ranking', 'Sector configuration']
const TICK = 950

/** How each step differs between the two problem types, shown side by side under the map */
const COMPARE: { cap: string; cov: string }[] = [
  { cap: 'Ring from the ISD to the nearest live site in the ±60° cone. Can divert to a small cell, or stop if a site is already planned.', cov: 'Ring around the gap centroid, sized from the polygon. Always MACRO, never diverted.' },
  { cap: 'Grid across the ring, spacing set by morphology.', cov: 'Grid across the ring and the gap, spacing set by morphology.' },
  { cap: 'Drops points behind the sector and too close to the mast. P1 inside ±60°, P2 outside.', cov: 'No sector to stand behind. P1 inside the gap polygon, P2 around it.' },
  { cap: 'DS8 water and forest are hard blockers, with a 3×3 nudge before rejecting.', cov: 'Same DS8 blockers and 3×3 nudge.' },
  { cap: 'Keeps distance from live DS9 sites and inventory_planned.', cov: 'Same separation rule.' },
  { cap: 'Height from DS6 rooftops, tilt aimed back at the congested cell.', cov: 'Height from DS6 rooftops, tilt aimed at the gap centroid.' },
  { cap: 'Proximity, isolation, population. P1 first.', cov: 'Same weights. P1 inside the gap first.' },
  { cap: 'Primary sector faces the congested cell, two secondaries follow demand.', cov: 'Primary sector faces the gap centroid, two secondaries follow demand.' },
]

export function outcomeTag(c: CellResult) {
  if (c.outcome === 'small_cell') return <Tag kind="retake">Small cell</Tag>
  if (c.outcome === 'already_planned') return <Tag kind="info">Already planned</Tag>
  if (c.outcome === 'none') return <Tag kind="fail">None found</Tag>
  return <Tag kind="pass">{c.solution_type}</Tag>
}

type Ev = { at: number; k: string; cls: string; v: string }

function buildLog(run: Run, cfg: ReturnType<typeof useStore.getState>['config']): Ev[] {
  const isCap = run.problem_type === 'CAPACITY'
  const tool = isCap ? 'run_capacity_pipeline' : 'run_coverage_pipeline'
  const ev: Ev[] = [
    { at: 0, k: 'text', cls: '', v: `I will run the ${isCap ? 'capacity' : 'coverage'} pipeline for ${run.cells.map((c) => c.ref_id).join(', ')}.` },
    { at: 0, k: 'tool_start', cls: 'tool_start', v: `${tool} · loading DS9, DS5, DS6, DS8 for the bounding box around ${run.cells.length} ${isCap ? 'cell' : 'gap'}${run.cells.length > 1 ? 's' : ''}` },
    { at: 1, k: 'cache', cls: 'warn', v: 'DS6 tile cache miss on 1 of 4 tiles. Cached now, the next run here is fast.' },
  ]
  for (const c of run.cells) {
    if (c.outcome === 'small_cell') ev.push({ at: 1, k: 'S0', cls: 'warn', v: `${c.ref_id}: nearest in-cone site ${Math.round(c.small_cell!.nearest_in_cone_m)} m < 100 m. Diverted to SMALL_CELL_PLACEMENT.` })
    if (c.outcome === 'already_planned') ev.push({ at: 1, k: 'S0', cls: 'warn', v: `${c.ref_id}: planned site ${c.planned!.planned_nename.slice(0, 22)} already sits ${Math.round(c.planned!.dist_m)} m into the cone. Skipped.` })
    const s3 = c.steps.find((s) => s.key === 'S3')
    if (s3 && s3.in !== s3.out) ev.push({ at: 4, k: 'S3', cls: '', v: `${c.ref_id}: ${s3.note}` })
  }
  for (const c of run.cells)
    if (c.outcome === 'candidates') {
      const r = rankCell(c, cfg, run.overturns)
      const p1 = r.filter((x) => x.priority === 'P1').length
      ev.push({ at: 8, k: 'tool_end', cls: 'tool_end', v: `${c.ref_id}: ${r.length} candidates (${p1} P1, ${r.length - p1} P2). Top composite ${r[0]?.score_composite.toFixed(3)}.` })
    }
  ev.push({ at: 8, k: 'text', cls: '', v: 'save_to_planned is off for this session. Nothing is written to inventory_planned until you confirm.' })
  ev.push({ at: 8, k: 'done', cls: 'tool_end', v: `Run finished in ${fmtDur(run.duration_ms)} (simulated live timing).` })
  return ev
}

function pointsAt(points: GridPoint[], t: number) {
  const live: GridPoint[] = []
  const gone: GridPoint[] = []
  const blocked: GridPoint[] = []
  for (const p of points) {
    if (t >= 3 && (p.status === 'inner' || p.status === 'behind')) gone.push(p)
    else if (t >= 4 && p.status === 'blocked') blocked.push(p)
    else if (t >= 5 && p.status === 'separation') gone.push(p)
    else live.push(p)
  }
  return { live, gone, blocked }
}

export default function SqPipeline() {
  const { runId } = useParams()
  const run = useStore((s) => s.runs.find((r) => r.run_id === runId))
  const config = useStore((s) => s.config)
  const markRevealed = useStore((s) => s.markRevealed)
  const [t, setT] = useState(() => (run?.revealed ? 8 : 0))
  const [selRef, setSelRef] = useState(run?.cells.find((c) => c.outcome === 'candidates')?.ref_id ?? run?.cells[0]?.ref_id)

  useEffect(() => {
    if (!run || run.revealed) return
    if (t >= 8) {
      markRevealed(run.run_id)
      return
    }
    const h = setTimeout(() => setT((x) => x + 1), TICK)
    return () => clearTimeout(h)
  }, [t, run, markRevealed])

  const log = useMemo(() => (run ? buildLog(run, config) : []), [run, config])
  if (!run) return <Navigate to="/sq/new" replace />
  const cell = run.cells.find((c) => c.ref_id === selRef) ?? run.cells[0]
  const done = t >= 8
  const halted = cell.outcome === 'small_cell' || cell.outcome === 'already_planned'
  const ranked = rankCell(cell, config, run.overturns)
  const { live, gone, blocked } = pointsAt(cell.points, t)
  const isCap = run.problem_type === 'CAPACITY'
  const total = run.cells.reduce((n, c) => n + rankCell(c, config, run.overturns).length, 0)
  const fit = cell.gapPoly
    ? cell.gapPoly.map(([lon, lat]) => ({ lat, lon })).concat(cell.points.length ? [cell.points[0], cell.points[cell.points.length - 1]] : [])
    : cell.points.length
      ? [cell.center, ...cell.points.filter((_, i) => i % 7 === 0)]
      : [cell.center, { lat: cell.center.lat + 0.004, lon: cell.center.lon + 0.004 }, { lat: cell.center.lat - 0.004, lon: cell.center.lon - 0.004 }]

  return (
    <div className="page">
      <PageHead
        crumb={<>Site Qualification · <Mono>{run.region ?? 'KANTO'}</Mono> · <Mono>{run.run_id}</Mono></>}
        title={done ? 'Pipeline complete' : 'Running the pipeline'}
        sub={done
          ? `${run.cells.length} ${isCap ? 'cell' : 'gap'}${run.cells.length > 1 ? 's' : ''} through eight steps. ${total} candidates kept, ${run.cells.filter((c) => c.outcome === 'small_cell' || c.outcome === 'already_planned').length} diverted before a ring was searched. Nothing has been saved.`
          : 'Each step only removes points, and says why. Nothing is ranked until the last two steps.'}
        actions={
          <>
            <div className="seg">
              {run.cells.map((c) => (
                <button key={c.ref_id} className={c.ref_id === cell.ref_id ? 'on' : ''} onClick={() => setSelRef(c.ref_id)}>
                  <Mono>{c.ref_id}</Mono>
                </button>
              ))}
            </div>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr 280px', gap: 'var(--gap)', flex: 1, minHeight: 0 }}>
        {/* steps */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-h">
            <h3><Mono>{cell.ref_id}</Mono></h3>
            <span style={{ fontSize: 13, color: 'var(--secondary)' }}>{cell.area}</span>
            <span className="meta">{t >= 1 ? outcomeTag(cell) : <Tag>Waiting</Tag>}</span>
          </div>
          <div className="steps">
            {STEP_NAMES.map((name, i) => {
              const s = cell.steps[i]
              const state = !s ? (t > i ? 'skip' : 'wait') : t > i ? (halted ? 'halt' : 'done') : t === i ? 'live' : 'wait'
              return (
                <div key={name} className={`stp ${state === 'skip' ? 'wait' : state}`}>
                  <span className="ix">{state === 'done' ? <IconCheck size={12} /> : `S${i}`}</span>
                  <div>
                    <h4>{name}</h4>
                    <p>{state === 'skip' ? 'Skipped, the cell was diverted at S0.' : state === 'done' || state === 'halt' ? s!.note : state === 'live' ? 'Working…' : ' '}</p>
                  </div>
                  <div className="cnt">
                    {(state === 'done' || state === 'halt') && s && i > 0 && (
                      <>
                        {fmtN(s.out)}
                        {s.in !== s.out && i > 1 && <small>−{fmtN(s.in - s.out)}</small>}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 24 }}>
            {cell.points.length > 0 ? (
              <>
                <div className="stat"><b>{t >= 2 ? fmtN(cell.points.length) : '–'}</b><span>Stamped</span></div>
                <div className="stat"><b>{t >= 5 ? fmtN(cell.survivors.length) : '–'}</b><span>Survived</span></div>
                <div className="stat"><b className={done ? 'pass-t' : ''}>{done ? ranked.length : '–'}</b><span>Kept</span></div>
              </>
            ) : (
              <span className="note">{t >= 1 ? 'No ring was searched for this cell.' : ' '}</span>
            )}
          </div>
        </div>

        {/* map + diversion */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', padding: 16, gap: 14 }}>
          <div style={{ flex: 1, minHeight: 380, display: 'flex' }}>
            <div style={{ flex: 1 }}>
              <MapView
                height="100%"
                fit={fit}
                fitKey={run.run_id + cell.ref_id}
                deps={[cell.ref_id, t, run.run_id, ranked.map((r) => r.candidate_id).join()]}
                draw={(g) => {
                  if (t < 1) {
                    if (cell.kind === 'cell') drawMast(g, cell.center, cell.azimuth)
                    else drawGap(g, cell.gapPoly!)
                    return
                  }
                  if (cell.kind === 'gap') drawGap(g, cell.gapPoly!)
                  if (cell.points.length) drawRing(g, cell.center, cell.ring_r_m, { az: cell.azimuth, cone: cell.azimuth !== undefined ? config.forward_cone_half_angle_deg : undefined, rMin: cell.ring_min_m })
                  if (cell.kind === 'cell') drawMast(g, cell.center, cell.azimuth, cell.ref_id)
                  if (cell.small_cell) drawMast(g, { lat: cell.small_cell.nearest_site_lat, lon: cell.small_cell.nearest_site_lon }, undefined, `${cell.small_cell.nearest_site_nename} · ${Math.round(cell.small_cell.nearest_in_cone_m)} m`)
                  if (cell.planned) drawPin(g, { lat: cell.planned.planned_lat, lon: cell.planned.planned_lon }, 0, 'p2')
                  if (t >= 2) {
                    drawDots(g, gone, C.muted, 0.2, 1.8)
                    drawDots(g, blocked, C.retake, 0.9, 2.4)
                    drawDots(g, live, t >= 7 ? C.secondary : C.text, t >= 7 ? 0.3 : 0.5, 2)
                  }
                  if (t >= 7) ranked.forEach((c) => drawPin(g, c, c.rank, c.priority === 'P1' ? 'p1' : 'p2'))
                }}
                tag={t >= 1 && cell.points.length ? `ring ${fmtN(cell.ring_r_m)} m · ${cell.solution_type}` : cell.area}
                legend={
                  <>
                    <LegendDot color={C.text} label="Still in" />
                    <LegendDot color={C.muted} label="Removed" />
                    <LegendDot color={C.retake} label="Water / forest" />
                    <LegendDot color={C.info} label="Ring & cone" square />
                  </>
                }
              />
            </div>
          </div>
          {t >= 1 && cell.small_cell && (
            <div className="callout retake">
              <span className="ic">!</span>
              <div>
                <b style={{ color: 'var(--retake)' }}>Small cell suggested, not a macro</b>
                <div className="note">
                  <Mono>{cell.small_cell.nearest_site_nename}</Mono> is {Math.round(cell.small_cell.nearest_in_cone_m)} m away inside the ±60° cone. A new macro would overlap it, so the run stops here and suggests a small cell on street furniture instead.
                </div>
              </div>
            </div>
          )}
          {t >= 1 && cell.planned && (
            <div className="callout info">
              <span className="ic">i</span>
              <div>
                <b style={{ color: 'var(--info)' }}>A site is already planned here</b>
                <div className="note">
                  <Mono>{cell.planned.planned_nename}</Mono> from {cell.planned.source} sits {Math.round(cell.planned.dist_m)} m into the cone. Suggesting another would double-count the same relief, so no new candidates are generated.
                </div>
              </div>
            </div>
          )}
          <div className="box" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '12px 14px' }}>
              <div className="label">Capacity and coverage, step by step</div>
              <span className="note" style={{ marginLeft: 'auto' }}>This run is <b style={{ color: 'var(--text)' }}>{isCap ? 'capacity' : 'coverage'}</b></span>
            </div>
            <table className="tbl cmp">
              <thead>
                <tr>
                  <th style={{ width: 112 }}>Step</th>
                  <th className={isCap ? 'cur' : ''}>Capacity · congested cell</th>
                  <th className={!isCap ? 'cur' : ''}>Coverage · gap polygon</th>
                </tr>
              </thead>
              <tbody>
                {STEP_NAMES.map((name, i) => (
                  <tr key={name} className={!done && t === i ? 'live' : ''}>
                    <td><Mono className="muted-t">S{i}</Mono><br />{name}</td>
                    <td className={isCap ? 'cur' : ''}>{COMPARE[i].cap}</td>
                    <td className={!isCap ? 'cur' : ''}>{COMPARE[i].cov}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* agent log */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 20px 14px' }}>
            <div className="label">Agent log</div>
            <div className="note" style={{ marginTop: 6 }}>Streamed the way <Mono>/agent/chat</Mono> sends it.</div>
          </div>
          <div className="hr" />
          <div className="log" style={{ padding: '16px 20px', overflow: 'auto', flex: 1 }}>
            {log.filter((e) => e.at <= t).map((e, i) => (
              <div key={i} className={`ev ${e.cls}`}>
                <span className="k">{e.k}</span>
                <span className="v">{e.v}</span>
              </div>
            ))}
            {!done && <div className="ev"><span className="k">…</span><span className="v sec-t">{STEP_NAMES[t]}</span></div>}
          </div>
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
            {done ? (
              <Link to={`/sq/run/${run.run_id}/candidates`} className="btn primary" style={{ width: '100%' }}>
                See {total} candidates <IconArrow />
              </Link>
            ) : (
              <button className="btn" style={{ width: '100%' }} onClick={() => setT(8)}>Skip to the result</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
