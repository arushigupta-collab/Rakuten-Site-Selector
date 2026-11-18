import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHead } from '../components/Shell'
import { IconDown, IconUp } from '../components/icons'
import { fmtDate, fmtDur, Mono, PrioTag, Tag, toast } from '../components/ui'
import { rankCell, rankRun } from '../engine/rank'
import type { Config, Weights } from '../engine/types'
import { useStore } from '../store'

const KEYS: (keyof Weights)[] = ['proximity', 'isolation', 'population']
const LABEL: Record<keyof Weights, string> = { proximity: 'Proximity', isolation: 'Isolation', population: 'Population' }

function rebalance(w: Weights, k: keyof Weights, v: number): Weights {
  const others = KEYS.filter((x) => x !== k)
  const rest = others.reduce((s, x) => s + w[x], 0)
  const left = Math.max(0, 1 - v)
  const out = { ...w, [k]: v } as Weights
  for (const o of others) out[o] = rest > 0 ? (w[o] / rest) * left : left / others.length
  // round to 2dp keeping the sum at exactly 1.00
  for (const o of KEYS) out[o] = Math.round(out[o] * 100) / 100
  const drift = 1 - KEYS.reduce((s, x) => s + out[x], 0)
  out[others[0]] = Math.round((out[others[0]] + drift) * 100) / 100
  return out
}

export default function SqLibrary() {
  const { planned, runs, config, configHistory, publishConfig } = useStore()
  const [tab, setTab] = useState<'planned' | 'runs'>('planned')
  const [draft, setDraft] = useState<Config>(config)
  const [selPlanned, setSelPlanned] = useState<string | undefined>(planned[0]?.nename)
  const dirty = JSON.stringify(draft) !== JSON.stringify(config)

  const latest = runs.find((r) => r.revealed && r.cells.some((c) => c.outcome === 'candidates'))
  const pcell = latest?.cells.find((c) => c.outcome === 'candidates')
  const preview = useMemo(() => {
    if (!latest || !pcell) return []
    const before = rankCell(pcell, config, latest.overturns)
    const after = rankCell(pcell, draft, latest.overturns)
    return after.slice(0, 6).map((c) => {
      const b = before.find((x) => x.candidate_id === c.candidate_id)
      return { c, from: b?.rank, delta: b ? b.rank - c.rank : undefined }
    })
  }, [latest, pcell, config, draft])

  const changeText = () => {
    const parts: string[] = []
    if (KEYS.some((k) => draft.scoring_weights[k] !== config.scoring_weights[k])) parts.push(`Weights ${KEYS.map((k) => draft.scoring_weights[k].toFixed(2)).join(' / ')}`)
    if (draft.ring_factor !== config.ring_factor) parts.push(`ring factor ${config.ring_factor} → ${draft.ring_factor}`)
    if (draft.forward_cone_half_angle_deg !== config.forward_cone_half_angle_deg) parts.push(`cone ±${draft.forward_cone_half_angle_deg}°`)
    if (draft.max_candidates_per_cell !== config.max_candidates_per_cell) parts.push(`keep ${draft.max_candidates_per_cell} per cell`)
    return parts.join(', ') || 'No change'
  }

  return (
    <div className="page">
      <PageHead
        crumb={<>Site Qualification · <Mono>ALL REGIONS</Mono></>}
        title="Planned inventory & settings"
        sub="Every site a planner has committed, the runs behind them, and the settings that rank the next run. Saved sites block future suggestions the same way live ones do."
        actions={
          <>
            <span className="tag dark" style={{ height: 40, padding: '0 14px', textTransform: 'none', fontFamily: 'var(--mono)', fontWeight: 400, fontSize: 13 }}>
              v{config.version} live · {configHistory[0]?.at} by {configHistory[0]?.by}
            </span>
            <Link to="/sq/new" className="btn primary">Start a new run</Link>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--gap)', flex: 1, minHeight: 0 }}>
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="seg">
              <button className={tab === 'planned' ? 'on' : ''} onClick={() => setTab('planned')}>Planned inventory <Mono className="sec-t">{planned.length}</Mono></button>
              <button className={tab === 'runs' ? 'on' : ''} onClick={() => setTab('runs')}>Run history <Mono className="sec-t">{runs.length}</Mono></button>
            </div>
            <span className="meta note" style={{ marginLeft: 'auto' }}>{tab === 'planned' ? <>table <Mono>inventory_planned</Mono> · App DB</> : 'Last 12 runs in this browser'}</span>
          </div>
          <div style={{ overflow: 'auto', flex: 1 }}>
            {tab === 'planned' ? (
              <table className="tbl nowrap">
                <thead>
                  <tr><th>nename</th><th>Priority</th><th>Score</th><th>Lat, lon</th><th>Saved</th></tr>
                </thead>
                <tbody>
                  {planned.map((p) => (
                    <tr key={p.nename} className={`clickable${selPlanned === p.nename ? ' sel' : ''}`} onClick={() => setSelPlanned(p.nename)}>
                      <td><Mono className={selPlanned === p.nename ? '' : ''}>{p.nename}</Mono></td>
                      <td><span style={{ display: 'inline-flex', gap: 6 }}><PrioTag p={p.priority} /><Tag>{p.netype}</Tag></span></td>
                      <td><Mono>{p.score_composite.toFixed(3)}</Mono></td>
                      <td><Mono className="sec-t">{p.latitude.toFixed(4)}<br />{p.longitude.toFixed(4)}</Mono></td>
                      <td className="note">{p.saved_by}<div className="small"><Mono>{fmtDate(p.saved_at)}</Mono></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : runs.length ? (
              <table className="tbl nowrap">
                <thead>
                  <tr><th>Run</th><th>Type</th><th>Region</th><th>Inputs</th><th>Outcome</th><th>Live time</th><th>Started</th><th /></tr>
                </thead>
                <tbody>
                  {runs.map((r) => {
                    const rk = rankRun(r, config)
                    const n = rk.reduce((s, x) => s + x.ranked.length, 0)
                    const div = r.cells.filter((c) => c.outcome === 'small_cell' || c.outcome === 'already_planned').length
                    return (
                      <tr key={r.run_id}>
                        <td><Mono>{r.run_id}</Mono></td>
                        <td><Tag kind="neutral">{r.problem_type}</Tag></td>
                        <td><Mono className="sec-t">{r.region ?? 'KANTO'}</Mono></td>
                        <td><Mono className="sec-t">{r.cells.length}</Mono></td>
                        <td className="note">{n} candidates{div ? `, ${div} diverted` : ''}{r.saved ? ' · saved' : ''}{r.overturns.length ? ` · ${r.overturns.length} overturned` : ''}</td>
                        <td><Mono>{fmtDur(r.duration_ms)}</Mono></td>
                        <td><Mono className="sec-t">{fmtDate(r.created_at)}</Mono></td>
                        <td><Link className="link" to={r.revealed ? `/sq/run/${r.run_id}/candidates` : `/sq/run/${r.run_id}`}>Open</Link></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="note" style={{ padding: 20 }}>No runs yet. <Link className="link" to="/sq/new">Start one</Link>.</div>
            )}
          </div>
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex' }}>
            <span className="note">{tab === 'planned' ? 'A planned site within a cell\'s ring and ±60° cone stops that cell at S0 on its next run.' : 'Runs are re-ranked with the live config when you open them. Ring and cone changes need a fresh run.'}</span>
          </div>
        </div>

        {/* settings rail */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="panel-h" style={{ alignItems: 'center' }}>
            <h3>Ranking settings</h3>
            {dirty && <Tag kind="retake">Draft</Tag>}
            <span className="meta"><Mono>capacity.yaml</Mono></span>
          </div>
          <div style={{ padding: '0 20px 16px', overflow: 'auto' }}>
            <div className="label" style={{ marginBottom: 12 }}>Scoring weights · must add to 1.00</div>
            {KEYS.map((k) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 2 }}>
                  <span>{LABEL[k]}</span>
                  <Mono>{draft.scoring_weights[k].toFixed(2)}</Mono>
                </div>
                <input type="range" min={0} max={1} step={0.05} value={draft.scoring_weights[k]} onChange={(e) => setDraft({ ...draft, scoring_weights: rebalance(draft.scoring_weights, k, +e.target.value) })} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 6 }}>
              <label className="field"><span style={{ fontSize: 12 }}>Ring factor</span>
                <select className="select" style={{ height: 36, fontSize: 13, fontFamily: 'var(--mono)' }} value={draft.ring_factor} onChange={(e) => setDraft({ ...draft, ring_factor: +e.target.value })}>
                  {[0.5, 0.6, 0.7, 0.8].map((v) => <option key={v}>{v}</option>)}
                </select>
              </label>
              <label className="field"><span style={{ fontSize: 12 }}>Cone ±°</span>
                <select className="select" style={{ height: 36, fontSize: 13, fontFamily: 'var(--mono)' }} value={draft.forward_cone_half_angle_deg} onChange={(e) => setDraft({ ...draft, forward_cone_half_angle_deg: +e.target.value })}>
                  {[45, 60, 75].map((v) => <option key={v}>{v}</option>)}
                </select>
              </label>
              <label className="field"><span style={{ fontSize: 12 }}>Keep / cell</span>
                <select className="select" style={{ height: 36, fontSize: 13, fontFamily: 'var(--mono)' }} value={draft.max_candidates_per_cell} onChange={(e) => setDraft({ ...draft, max_candidates_per_cell: +e.target.value })}>
                  {[5, 8, 10].map((v) => <option key={v}>{v}</option>)}
                </select>
              </label>
            </div>
            <p className="note" style={{ margin: '14px 0 0' }}>Change these and the ranking moves with them. Nothing is retrained and no code is rebuilt.</p>

            <div className="hr" style={{ margin: '18px 0 14px' }} />
            <div className="label" style={{ marginBottom: 10 }}>
              {pcell ? <>Top 6 for <Mono>{pcell.ref_id}</Mono> under the draft</> : 'Preview'}
            </div>
            {preview.length ? (
              preview.map(({ c, delta }) => (
                <div key={c.candidate_id} style={{ display: 'grid', gridTemplateColumns: '22px 1fr 44px 56px', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13 }}>
                  <Mono>{c.rank}</Mono>
                  <Mono className="sec-t">…{c.candidate_id.slice(-4)} <PrioTag p={c.priority} /></Mono>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }} className={delta === undefined ? 'info-t' : delta > 0 ? 'pass-t' : delta < 0 ? 'fail-t' : 'muted-t'}>
                    {delta === undefined ? <Mono>new</Mono> : delta > 0 ? <><IconUp /><Mono>{delta}</Mono></> : delta < 0 ? <><IconDown /><Mono>{-delta}</Mono></> : <Mono>–</Mono>}
                  </span>
                  <Mono>{c.score_composite.toFixed(3)}</Mono>
                </div>
              ))
            ) : (
              <div className="note">Run a capacity or coverage qualification to preview re-ranking here.</div>
            )}
          </div>
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
            <button className="btn" disabled={!dirty} onClick={() => setDraft(config)}>Discard</button>
            <button
              className="btn primary"
              style={{ flex: 1 }}
              disabled={!dirty}
              onClick={() => {
                publishConfig(draft, changeText())
                setDraft({ ...draft, version: config.version + 1 })
                toast(`Published v${config.version + 1}. Open runs re-rank straight away.`)
              }}
            >
              Publish as v{config.version + 1}
            </button>
          </div>
          <div style={{ padding: '14px 20px 18px', borderTop: '1px solid var(--border-soft)' }}>
            <div className="label" style={{ marginBottom: 10 }}>History</div>
            {configHistory.slice(0, 4).map((h) => (
              <div key={h.version} style={{ display: 'grid', gridTemplateColumns: '34px 1fr auto', gap: 10, fontSize: 13, padding: '4px 0' }}>
                <Mono className="muted-t">v{h.version}</Mono>
                <span>{h.change}</span>
                <span className="sec-t">{h.at}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
