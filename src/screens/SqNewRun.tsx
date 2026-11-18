import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { C, drawGap, drawMast, LegendDot, MapView } from '../components/MapView'
import { PageHead } from '../components/Shell'
import { IconArrow } from '../components/icons'
import { Check, Mono, Tag } from '../components/ui'
import { CELLS, datasetsFor, GAPS, regionFit, regionMeta, REGIONS } from '../data/regions'
import { runCandidate } from '../engine/api'
import { centroid } from '../engine/geo'
import type { ProblemType, Region } from '../engine/types'
import { useStore } from '../store'

export default function SqNewRun() {
  const nav = useNavigate()
  const config = useStore((s) => s.config)
  const planned = useStore((s) => s.planned)
  const addRun = useStore((s) => s.addRun)
  const [problem, setProblem] = useState<ProblemType>('CAPACITY')
  const [region, setRegion] = useState<Region>('KANTO')
  const meta = regionMeta(region)
  const [selCells, setSelCells] = useState<string[]>([])
  const [selGaps, setSelGaps] = useState<string[]>([])
  const cells = useMemo(() => CELLS.filter((c) => c.region === region), [region])
  const gaps = useMemo(() => GAPS.filter((g) => g.region === region), [region])
  const datasets = useMemo(() => datasetsFor(region), [region])
  const pickRegion = (r: Region) => {
    setRegion(r)
    setSelCells([])
    setSelGaps([])
  }
  const [busy, setBusy] = useState(false)
  const isCap = problem === 'CAPACITY'
  const sel = isCap ? selCells : selGaps
  const toggle = (id: string) => (isCap ? setSelCells : setSelGaps)((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const fitPts = useMemo(() => {
    if (isCap) return cells.filter((c) => sel.includes(c.cell_id)).map((c) => ({ lat: c.site_lat, lon: c.site_lon }))
    return gaps.filter((g) => sel.includes(g.gap_id)).flatMap((g) => g.poly.map(([lon, lat]) => ({ lat, lon })))
  }, [isCap, sel, cells, gaps])

  const start = () => {
    setBusy(true)
    setTimeout(() => {
      const run = runCandidate(problem, region, sel, config, planned)
      addRun(run)
      nav(`/sq/run/${run.run_id}`)
    }, 350)
  }

  const w = config.scoring_weights

  return (
    <div className="page">
      <PageHead
        crumb={<>Site Qualification · <Mono>{region}</Mono> · {meta.cities}</>}
        title="Set up a run"
        sub={isCap
          ? 'Pick the congested cells to relieve. Each one gets its own search ring, is filtered against terrain and existing sites, then ranked with the reasons written out.'
          : 'Pick the coverage gaps to fill. Each polygon gets a search ring around its centroid and the same filtering and ranking as a capacity run.'}
        actions={<Link to="/sq/library" className="btn">Planned &amp; settings</Link>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '272px 1fr var(--rail)', gap: 'var(--gap)', flex: 1, minHeight: 0 }}>
        {/* left */}
        <div className="panel pad" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="label">What kind of problem</div>
          <div className="seg full" style={{ marginTop: -8 }}>
            <button className={isCap ? 'on' : ''} onClick={() => setProblem('CAPACITY')}>Capacity</button>
            <button className={!isCap ? 'on' : ''} onClick={() => setProblem('COVERAGE')}>Coverage</button>
          </div>
          <label className="field">
            <span>Region</span>
            <select className="select" value={region} onChange={(e) => pickRegion(e.target.value as Region)}>
              {(['Japan', 'India'] as const).map((country) => (
                <optgroup key={country} label={country}>
                  {REGIONS.filter((r) => r.country === country).map((r) => (
                    <option key={r.key} value={r.key}>{r.key} · {r.cities}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="box">
            <div className="small" style={{ marginBottom: 10 }}>{isCap ? 'Taken from the capacity scan' : 'Taken from the coverage scan'}</div>
            <dl className="kv" style={{ gridTemplateColumns: '96px 1fr' }}>
              <dt>Scan</dt><dd><Mono>{isCap ? meta.scanCap : meta.scanCov}</Mono></dd>
              <dt>Window</dt><dd><Mono>LAST_7_DAYS</Mono></dd>
              <dt>Grid</dt><dd><Mono>100m</Mono></dd>
              <dt>Flagged</dt><dd><Mono>{isCap ? `${cells.length} cells` : `${gaps.length} gaps`}</Mono></dd>
            </dl>
          </div>
          <p className="note" style={{ margin: 0 }}>
            {isCap
              ? 'A cell is flagged when PRB use stays above 80% through its busy hour for most of the week. Nobody types coordinates by hand.'
              : 'A gap is flagged where the 10th-percentile RSRP stays below −115 dBm. The polygon comes straight from the scan.'}
          </p>
          <div style={{ marginTop: 'auto' }}>
            <div className="label" style={{ marginBottom: 10 }}>How results are kept</div>
            <p className="note" style={{ margin: 0 }}>
              Nothing is written to planned inventory until you confirm on the Candidates screen. Saving is one-way: future runs treat a saved site like a live one.
            </p>
          </div>
        </div>

        {/* centre */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-h">
            <h3>{isCap ? 'Congested cells' : 'Coverage gaps'}</h3>
            <span className="meta">
              {isCap ? cells.length : gaps.length} flagged in {meta.label} · <span style={{ color: 'var(--text)', fontWeight: 600 }}>{sel.length} selected</span>
            </span>
          </div>
          <div style={{ maxHeight: 290, overflow: 'auto' }}>
            {isCap ? (
              <table className="tbl">
                <thead>
                  <tr><th style={{ width: 40 }} /><th>Cell</th><th>Azimuth</th><th>PRB use</th><th>Busy hour</th><th>Morph.</th></tr>
                </thead>
                <tbody>
                  {cells.map((c) => {
                    const on = selCells.includes(c.cell_id)
                    return (
                      <tr key={c.cell_id} className={`clickable${on ? ' sel' : ''}`} onClick={() => toggle(c.cell_id)}>
                        <td><Check on={on} /></td>
                        <td><Mono>{c.cell_id}</Mono><div className="small" style={{ color: 'var(--secondary)' }}>{c.area}</div></td>
                        <td><Mono>{c.cell_azimuth_deg}°</Mono></td>
                        <td><Mono className={c.prb_util_pct >= 90 ? 'fail-t' : ''}>{c.prb_util_pct}%</Mono></td>
                        <td><Mono>{c.busy_hour}</Mono></td>
                        <td><Tag>{c.morphology}</Tag></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <table className="tbl">
                <thead>
                  <tr><th style={{ width: 40 }} /><th>Gap</th><th>RSRP p10</th><th>Morph.</th><th>Reported by</th></tr>
                </thead>
                <tbody>
                  {gaps.map((g) => {
                    const on = selGaps.includes(g.gap_id)
                    return (
                      <tr key={g.gap_id} className={`clickable${on ? ' sel' : ''}`} onClick={() => toggle(g.gap_id)}>
                        <td><Check on={on} /></td>
                        <td><Mono>{g.gap_id}</Mono><div className="small" style={{ color: 'var(--secondary)' }}>{g.area}</div></td>
                        <td><Mono>{g.rsrp_p10_dbm} dBm</Mono></td>
                        <td><Tag>{g.morphology}</Tag></td>
                        <td className="note">{g.reported_by}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div style={{ padding: '16px 20px 0', flex: 1, minHeight: 260, display: 'flex' }}>
            <div style={{ flex: 1 }}>
              <MapView
                height="100%"
                fit={fitPts.length ? fitPts : regionFit(region)}
                fitKey={region + problem + sel.join()}
                deps={[region, problem, sel.join()]}
                draw={(g) => {
                  if (isCap) {
                    for (const c of cells) {
                      const on = sel.includes(c.cell_id)
                      if (on) drawMast(g, { lat: c.site_lat, lon: c.site_lon }, c.cell_azimuth_deg, `${c.cell_id} · ${c.area}`)
                    }
                  } else for (const gp of gaps) if (sel.includes(gp.gap_id)) drawGap(g, gp.poly)
                }}
                legend={isCap
                  ? <><LegendDot color={C.info} label="Congested cell and its azimuth" square /><LegendDot color="#7f9a82" label="DS8 blocker" square /></>
                  : <><LegendDot color={C.fail} label="Gap polygon" square /><LegendDot color="#7d93b5" label="DS8 blocker" square /></>}
                tag={isCap ? sel.map((id) => cells.find((c) => c.cell_id === id)?.area).join(' · ') || 'Nothing selected' : sel.map((id) => { const g = gaps.find((x) => x.gap_id === id)!; const c = centroid(g.poly); return `${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}` }).join(' · ') || 'Nothing selected'}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '18px 20px', marginTop: 18, borderTop: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                {sel.length ? `${sel.length} ${isCap ? (sel.length === 1 ? 'cell' : 'cells') : sel.length === 1 ? 'gap' : 'gaps'} will be qualified` : 'Pick at least one to run'}
              </div>
              <div className="note">against DS9, DS5, DS6 and DS8 with config <Mono>{isCap ? 'capacity' : 'coverage'} v{config.version}</Mono> · about {Math.max(1, sel.length)} min on live data, seconds here</div>
            </div>
            <button className="btn primary lg" style={{ marginLeft: 'auto' }} disabled={!sel.length || busy} onClick={start}>
              {busy ? 'Starting…' : 'Run site qualification'}
            </button>
          </div>
        </div>

        {/* right rail */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 20px 14px' }}>
            <div className="label">What it will be checked against</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="tag dark" style={{ textTransform: 'none', fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 12 }}>{isCap ? 'capacity' : 'coverage'} v{config.version}</span>
              <span className="note">4 sources · 8 steps</span>
            </div>
          </div>
          {datasets.map((d) => (
            <div key={d.key} style={{ padding: '12px 20px', borderTop: '1px solid var(--border-soft)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                <Mono className="muted-t">{d.key}</Mono>
                <span style={{ fontWeight: 600 }}>{d.name}</span>
              </div>
              <div className="note" style={{ marginTop: 2 }}>{d.note}</div>
              <div className="small" style={{ marginTop: 4 }}><Mono>{d.rows}</Mono> rows · {d.fresh}</div>
            </div>
          ))}
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-soft)' }}>
            <div className="label" style={{ marginBottom: 10 }}>Ranking weights</div>
            {([['Proximity', w.proximity], ['Isolation', w.isolation], ['Population', w.population]] as const).map(([k, v]) => (
              <div key={k} style={{ display: 'grid', gridTemplateColumns: '84px 1fr 38px', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 13 }}>
                <span className="note">{k}</span>
                <div className="bar"><i style={{ width: `${v * 100}%` }} /></div>
                <Mono>{v.toFixed(2)}</Mono>
              </div>
            ))}
          </div>
          <div style={{ margin: '4px 20px 0', padding: '12px 14px', borderRadius: 10, background: 'var(--retake-tint)', border: '1px solid #edd9ae', fontSize: 13, color: 'var(--retake)' }}>
            DS6 tile cache is cold for 1 of 4 tiles. On live data that first touch takes 3 to 4 minutes. Here it is simulated.
          </div>
          <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
            <Link to="/sq/library" className="link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Change the weights <IconArrow /></Link>
          </div>
        </div>
      </div>
    </div>
  )
}
