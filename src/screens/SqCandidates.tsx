import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { C, drawGap, drawMast, drawPin, drawRing, drawSectors, LegendDot, MapView } from '../components/MapView'
import { PageHead } from '../components/Shell'
import { IconDown, IconDownload, IconPin, IconUp } from '../components/icons'
import { Dialog, fmtDate, fmtN, Mono, PrioTag, Tag, toast } from '../components/ui'
import { downloadJson, toResponse } from '../engine/api'
import { explain, rankCell } from '../engine/rank'
import type { CellResult, RankedCandidate } from '../engine/types'
import { useStore } from '../store'
import { outcomeTag } from './SqPipeline'

type Filter = 'all' | 'P1' | 'P2' | 'div'

function ScoreRow({ label, raw, weight, hint }: { label: string; raw: number; weight: number; hint: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 54px 130px', alignItems: 'center', gap: 16, padding: '12px 0', borderTop: '1px solid var(--border-soft)' }}>
      <div>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div className="small">{hint}</div>
      </div>
      <div className="bar" style={{ height: 8 }}><i style={{ width: `${raw * 100}%` }} /></div>
      <Mono>{raw.toFixed(3)}</Mono>
      <Mono className="sec-t">× {weight.toFixed(2)} = {(raw * weight).toFixed(3)}</Mono>
    </div>
  )
}

function Diverted({ cell }: { cell: CellResult }) {
  const sc = cell.small_cell
  const pl = cell.planned
  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ padding: 20 }}>
        <div className={`callout ${sc ? 'retake' : 'info'}`}>
          <span className="ic"><IconPin size={20} /></span>
          <div style={{ flex: 1 }}>
            <h2>{sc ? 'Small cell placement' : 'Already planned'}</h2>
            <div className="note">{sc ? 'A macro here would sit on top of an existing site. A small cell relieves the sector without the overlap.' : 'A planned site already covers this cone. Another one would count the same relief twice.'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{ fontSize: 28, color: sc ? 'var(--retake)' : 'var(--info)' }}>{Math.round(sc ? sc.nearest_in_cone_m : pl!.dist_m)} m</div>
            <div className="small">{sc ? 'nearest in-cone site' : 'planned site distance'}</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18, padding: '0 20px 20px', flex: 1 }}>
        <MapView
          height="100%"
          fit={[cell.center, sc ? { lat: sc.nearest_site_lat, lon: sc.nearest_site_lon } : { lat: pl!.planned_lat, lon: pl!.planned_lon }, { lat: cell.center.lat + 0.003, lon: cell.center.lon + 0.003 }, { lat: cell.center.lat - 0.003, lon: cell.center.lon - 0.003 }]}
          fitKey={cell.ref_id}
          deps={[cell.ref_id]}
          draw={(g) => {
            drawRing(g, cell.center, sc ? 100 : cell.ring_r_m, { az: cell.azimuth, cone: 60 })
            drawMast(g, cell.center, cell.azimuth, cell.ref_id)
            if (sc) drawMast(g, { lat: sc.nearest_site_lat, lon: sc.nearest_site_lon }, undefined, sc.nearest_site_nename)
            if (pl) drawPin(g, { lat: pl.planned_lat, lon: pl.planned_lon }, 0, 'sel')
          }}
        />
        <div className="box" style={{ alignSelf: 'start' }}>
          <dl className="kv" style={{ gridTemplateColumns: '110px 1fr', fontSize: 13 }}>
            <dt>Cell</dt><dd><Mono>{cell.ref_id}</Mono></dd>
            <dt>Morphology</dt><dd>{cell.morphology}</dd>
            {sc && <><dt>Nearest site</dt><dd><Mono>{sc.nearest_site_nename.slice(0, 13)}</Mono></dd><dt>ISD</dt><dd><Mono>{sc.isd_m} m</Mono></dd><dt>Reason</dt><dd className="mono" style={{ fontSize: 12 }}>{sc.reason}</dd></>}
            {pl && <><dt>Planned</dt><dd><Mono>{pl.planned_nename.slice(0, 22)}</Mono></dd><dt>Source</dt><dd>{pl.source}</dd><dt>Height</dt><dd><Mono>{pl.antenna_height_m} m</Mono></dd><dt>Tilt</dt><dd><Mono>{pl.electrical_tilt_deg}°</Mono></dd></>}
          </dl>
        </div>
      </div>
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="note">{sc ? 'Small cells are planned outside this agent. Hand this to the street-furniture team.' : 'To plan again here, remove the planned site from inventory first.'}</span>
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => toast(sc ? 'Sent to the small-cell queue (demo).' : 'Opened in planned inventory (demo).')}>{sc ? 'Send to small-cell queue' : 'Open planned site'}</button>
      </div>
    </div>
  )
}

export default function SqCandidates() {
  const { runId } = useParams()
  const nav = useNavigate()
  const run = useStore((s) => s.runs.find((r) => r.run_id === runId))
  const config = useStore((s) => s.config)
  const overturn = useStore((s) => s.overturn)
  const savePlanned = useStore((s) => s.savePlanned)
  const withCands = run?.cells.filter((c) => c.outcome === 'candidates') ?? []
  const diverted = run?.cells.filter((c) => c.outcome === 'small_cell' || c.outcome === 'already_planned') ?? []
  const [refId, setRefId] = useState(withCands[0]?.ref_id ?? run?.cells[0]?.ref_id)
  const [filter, setFilter] = useState<Filter>(withCands.length ? 'all' : 'div')
  const [selId, setSelId] = useState<string | undefined>()
  const [divRef, setDivRef] = useState(diverted[0]?.ref_id)
  const [ovOpen, setOvOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [ovTo, setOvTo] = useState(1)
  const [ovReason, setOvReason] = useState('')

  const cell = run?.cells.find((c) => c.ref_id === refId)
  const ranked = useMemo(() => (run && cell ? rankCell(cell, config, run.overturns) : []), [run, cell, config])
  const toSave = useMemo(() => (run ? withCands.flatMap((c) => rankCell(c, config, run.overturns).filter((x) => x.priority === 'P1').slice(0, 3).map((x) => ({ ...x, cell: c.ref_id }))) : []), [run, withCands, config])
  if (!run) return <Navigate to="/sq/new" replace />
  if (!run.revealed) return <Navigate to={`/sq/run/${run.run_id}`} replace />

  const list = filter === 'P1' || filter === 'P2' ? ranked.filter((c) => c.priority === filter) : ranked
  const sel: RankedCandidate | undefined = ranked.find((c) => c.candidate_id === selId) ?? list[0]
  const divCell = diverted.find((c) => c.ref_id === divRef)
  const w = config.scoring_weights
  const ex = sel && cell ? explain(sel, cell, ranked, config) : undefined
  const p1 = ranked.filter((c) => c.priority === 'P1').length
  const isCap = run.problem_type === 'CAPACITY'

  return (
    <div className="page">
      <PageHead
        crumb={<>Site Qualification · <Mono>{run.region ?? 'KANTO'}</Mono> · <Mono>{run.run_id}</Mono> · config <Mono>v{config.version}</Mono></>}
        title="Candidates"
        actions={
          <>
            {withCands.length > 1 && filter !== 'div' && (
              <div className="seg">
                {withCands.map((c) => (
                  <button key={c.ref_id} className={c.ref_id === refId ? 'on' : ''} onClick={() => { setRefId(c.ref_id); setSelId(undefined) }}>{c.area.split(',')[0]}</button>
                ))}
              </div>
            )}
            <button className="btn" onClick={() => { downloadJson(`${run.run_id}.json`, toResponse(run, config)); toast(`Exported ${run.run_id}.json in the /candidate response shape`) }}>
              <IconDownload /> Export JSON
            </button>
            <button className="btn primary" disabled={run.saved || !toSave.length} onClick={() => setSaveOpen(true)}>
              {run.saved ? 'Saved to planned' : `Save top ${toSave.length} to planned`}
            </button>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 'var(--gap)', flex: 1, minHeight: 0 }}>
        {/* list */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: 16 }} className="chips">
            {([['all', `All ${ranked.length}`], ['P1', `P1 ${p1}`], ['P2', `P2 ${ranked.length - p1}`], ['div', `Diverted ${diverted.length}`]] as [Filter, string][]).map(([k, l]) => (
              <button key={k} className={`chip${filter === k ? ' on' : ''}`} disabled={k === 'div' && !diverted.length} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
          <div style={{ overflow: 'auto', flex: 1 }}>
            {filter === 'div'
              ? diverted.map((c) => (
                  <div key={c.ref_id} className={`row-item${c.ref_id === divRef ? ' sel' : ''}`} onClick={() => setDivRef(c.ref_id)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Mono>{c.ref_id}</Mono>
                      <div className="note">{c.area} · {c.outcome === 'small_cell' ? `site ${Math.round(c.small_cell!.nearest_in_cone_m)} m in cone` : `planned ${Math.round(c.planned!.dist_m)} m away`}</div>
                    </div>
                    {outcomeTag(c)}
                  </div>
                ))
              : list.map((c) => (
                  <div key={c.candidate_id} className={`row-item${sel?.candidate_id === c.candidate_id ? ' sel' : ''}`} onClick={() => setSelId(c.candidate_id)}>
                    <span className="mono" style={{ width: 26, fontSize: 18, fontWeight: 500, color: sel?.candidate_id === c.candidate_id ? 'var(--red)' : 'var(--text)' }}>{c.rank}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Mono className="sec-t">…{c.candidate_id.slice(-18)}</Mono>
                      <div className="note">
                        {fmtN(c.population_covered)} people · {Math.round(c.dist_to_centroid_m)} m{c.overturned ? ' · moved by planner' : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <PrioTag p={c.priority} />
                      <Mono>{c.score_composite.toFixed(3)}</Mono>
                    </div>
                  </div>
                ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', padding: '14px 20px', display: 'flex', gap: 28 }}>
            <div className="stat"><b>{p1}</b><span>P1</span></div>
            <div className="stat"><b className="sec-t">{ranked.length - p1}</b><span>P2</span></div>
            <div className="stat"><b className="retake-t">{diverted.length}</b><span>Diverted</span></div>
          </div>
        </div>

        {/* detail */}
        {filter === 'div' && divCell ? (
          <Diverted cell={divCell} />
        ) : sel && cell && ex ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)', minWidth: 0 }}>
            <div className="callout pass" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <span className="ic" style={{ background: sel.priority === 'P1' ? 'var(--text)' : 'var(--secondary)', fontFamily: 'var(--mono)', fontSize: 18 }}>{sel.rank}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <h2 style={{ color: 'var(--text)', fontSize: 20 }}><Mono>{sel.candidate_id}</Mono></h2>
                  <PrioTag p={sel.priority} />
                  {isCap && <Tag kind="neutral">{sel.site_type}</Tag>}
                  {sel.overturned && <Tag kind="retake">Overturned</Tag>}
                </div>
                <div className="note" style={{ marginTop: 2 }}>
                  {isCap ? 'Relief for' : 'Fills'} <Mono>{cell.ref_id}</Mono> · {cell.area} · <Mono>{sel.lat.toFixed(5)}, {sel.lon.toFixed(5)}</Mono>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 30, lineHeight: 1 }}>{sel.score_composite.toFixed(3)}</div>
                <div className="small" style={{ marginTop: 4 }}>Composite, range {config.score_range.min.toFixed(2)} to {config.score_range.max.toFixed(2)}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 'var(--gap)' }}>
              <MapView
                height={330}
                fit={[cell.center, ...ranked]}
                fitKey={run.run_id + cell.ref_id}
                deps={[cell.ref_id, sel.candidate_id, ranked.map((r) => r.candidate_id).join()]}
                draw={(g) => {
                  if (cell.gapPoly) drawGap(g, cell.gapPoly)
                  drawRing(g, cell.center, cell.ring_r_m, { az: cell.azimuth, cone: cell.azimuth !== undefined ? config.forward_cone_half_angle_deg : undefined, rMin: cell.ring_min_m })
                  if (cell.kind === 'cell') drawMast(g, cell.center, cell.azimuth, cell.ref_id)
                  drawSectors(g, sel, sel.sectors, Math.max(160, Math.min(sel.beam_far_edge_m, 500)), true)
                  ranked.forEach((c) => drawPin(g, c, c.rank, c.candidate_id === sel.candidate_id ? 'sel' : c.priority === 'P1' ? 'p1' : 'p2', () => setSelId(c.candidate_id)))
                }}
                legend={<><LegendDot color={C.red} label="Selected, primary sector" /><LegendDot color={C.text} label="P1" /><LegendDot color={C.secondary} label="P2" /></>}
              />
              <div className="panel pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="label">The site</div>
                <dl className="kv" style={{ gridTemplateColumns: '1fr auto', fontSize: 13, rowGap: 9 }}>
                  <dt>{isCap ? 'To congested cell' : 'To gap centroid'}</dt><dd><Mono>{Math.round(sel.dist_to_centroid_m)} m</Mono></dd>
                  <dt>Nearest site</dt><dd><Mono>{Math.round(sel.nearest_site_m)} m</Mono></dd>
                  <dt>People in beam</dt><dd><Mono>{fmtN(sel.population_covered)}</Mono></dd>
                  <dt>Antenna height</dt><dd><Mono>{sel.antenna_height_m} m</Mono></dd>
                  <dt>Electrical tilt</dt><dd><Mono>{sel.electrical_tilt_deg}°</Mono></dd>
                  {isCap && <><dt>Beamwidth V / H</dt><dd><Mono>{sel.vertical_beamwidth_deg}° / {sel.horizontal_beamwidth_deg}°</Mono></dd></>}
                  <dt>Beam far edge</dt><dd><Mono>{Math.round(sel.beam_far_edge_m)} m</Mono></dd>
                </dl>
              </div>
            </div>

            <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-h">
                <h3>Why it ranks here</h3>
                <span className="meta">config <Mono>v{config.version}</Mono> · run {fmtDate(run.created_at)}</span>
              </div>
              <div style={{ padding: '0 20px 6px' }}>
                <ScoreRow label="Proximity" raw={sel.score_prox} weight={w.proximity} hint={isCap ? 'close to the congested cell' : 'close to the gap centroid'} />
                <ScoreRow label="Isolation" raw={sel.score_iso} weight={w.isolation} hint="clear of live and planned sites" />
                <ScoreRow label="Population" raw={sel.score_pop} weight={w.population} hint="people inside the primary beam" />
              </div>
              <div style={{ margin: '8px 20px 0', display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 12, columnGap: 16, padding: '16px 0', borderTop: '1px solid var(--border)' }}>
                <span className="label" style={{ paddingTop: 2 }}>What we saw</span><span>{ex.saw}</span>
                <span className="label" style={{ paddingTop: 2 }}>Why this rank</span><span>{ex.why}</span>
                <span className="label" style={{ paddingTop: 2 }}>Worth checking</span><span>{ex.watch}</span>
              </div>
              <div style={{ margin: '0 20px 16px' }}>
                <table className="tbl" style={{ fontSize: 13 }}>
                  <thead><tr><th>Sector</th><th>Azimuth</th><th>E-tilt</th><th>Height</th><th>People</th></tr></thead>
                  <tbody>
                    {sel.sectors.map((s) => (
                      <tr key={s.sector_index}>
                        <td>{s.sector_index === 0 ? 'Primary, faces the cell' : `Secondary ${s.sector_index}`}</td>
                        <td><Mono>{s.azimuth_deg}°</Mono></td>
                        <td><Mono>{s.electrical_tilt_deg === null ? '–' : `${s.electrical_tilt_deg}°`}</Mono></td>
                        <td><Mono>{s.antenna_height_m} m</Mono></td>
                        <td><Mono>{fmtN(s.population_covered)}</Mono></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 'auto', padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="note">{run.saved ? 'This run is saved. Later runs here will see these sites as planned.' : 'Disagree with the order? Move it, and say why. The score stays as computed.'}</span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                  <button className="btn" disabled={run.saved} onClick={() => { setOvTo(Math.max(1, sel.rank - 1)); setOvReason(''); setOvOpen(true) }}>Overturn with a reason</button>
                  <button className="btn" onClick={() => { const n = ranked.find((c) => c.rank === sel.rank + 1) ?? ranked[0]; setSelId(n.candidate_id) }}>Next candidate</button>
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="panel pad note">No candidates for this selection.</div>
        )}
      </div>

      {ovOpen && sel && cell && (
        <Dialog
          title={`Move #${sel.rank} to a new place`}
          sub="The composite score is not changed. The order is, and the reason is kept with the run and shown to whoever reads it next."
          onClose={() => setOvOpen(false)}
          actions={
            <>
              <button className="btn" onClick={() => setOvOpen(false)}>Cancel</button>
              <button
                className="btn primary"
                disabled={ovReason.trim().length < 8 || ovTo === sel.rank}
                onClick={() => {
                  overturn(run.run_id, { candidate_id: sel.candidate_id, ref_id: cell.ref_id, from: sel.rank, to: ovTo, reason: ovReason.trim() })
                  setOvOpen(false)
                  toast(`Moved to #${ovTo}. Reason recorded.`)
                }}
              >
                Move it
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="field">
              <span>New position</span>
              <div className="chips">
                {ranked.map((c) => (
                  <button key={c.rank} className={`chip${ovTo === c.rank ? ' on' : ''}`} onClick={() => setOvTo(c.rank)}>
                    {c.rank < sel.rank ? <IconUp /> : c.rank > sel.rank ? <IconDown /> : null}
                    <span className="mono">{c.rank}</span>
                  </button>
                ))}
              </div>
            </label>
            <label className="field">
              <span>Reason</span>
              <textarea className="input" placeholder="e.g. Landlord already agreed rooftop access for the 2025 LTE upgrade" value={ovReason} onChange={(e) => setOvReason(e.target.value)} />
            </label>
            <div className="small">At least 8 characters. Saved against {sel.candidate_id}.</div>
          </div>
        </Dialog>
      )}

      {saveOpen && (
        <Dialog
          title={`Save ${toSave.length} sites to planned inventory`}
          sub={<>This is a one-way commit. Every later run treats these as planned sites: they block new candidates within separation distance, and a cell whose cone already holds one is skipped at S0.</>}
          onClose={() => setSaveOpen(false)}
          actions={
            <>
              <button className="btn" onClick={() => setSaveOpen(false)}>Not yet</button>
              <button
                className="btn primary"
                onClick={() => {
                  const rows = savePlanned(run.run_id)
                  setSaveOpen(false)
                  toast(`${rows.length} sites written to inventory_planned`)
                  nav('/sq/library')
                }}
              >
                Save {toSave.length} to planned
              </button>
            </>
          }
        >
          <table className="tbl" style={{ fontSize: 13 }}>
            <thead><tr><th>From</th><th>Candidate</th><th>Score</th></tr></thead>
            <tbody>
              {toSave.map((c) => (
                <tr key={c.candidate_id}>
                  <td><Mono>{c.cell}</Mono></td>
                  <td><Mono>#{c.rank} …{c.candidate_id.slice(-4)}</Mono> <PrioTag p={c.priority} /></td>
                  <td><Mono>{c.score_composite.toFixed(3)}</Mono></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="small" style={{ marginTop: 10 }}>Top 3 P1 per {isCap ? 'cell' : 'gap'}, after any overturns.</div>
        </Dialog>
      )}
      {!withCands.length && !diverted.length && <Link to="/sq/new">Start a new run</Link>}
    </div>
  )
}
