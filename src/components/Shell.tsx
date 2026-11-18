import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { USER } from '../data/regions'
import { rankRun } from '../engine/rank'
import { useStore } from '../store'
import { EmbLogo, IconTower, Wordmark } from './icons'
import { toast, ToastHost } from './ui'

function Header() {
  const [open, setOpen] = useState(false)
  const reset = useStore((s) => s.reset)
  const nav = useNavigate()
  return (
    <header className="hdr">
      <Link to="/sq/new"><Wordmark /></Link>
      <span className="sep" />
      <span className="product">Site Qualification</span>
      <span className="grow" />
      <span className="builtby">BUILT BY <EmbLogo /></span>
      <div style={{ position: 'relative' }}>
        <span className="avatar" onClick={() => setOpen((v) => !v)}>{USER.initials}</span>
        {open && (
          <div className="menu" onMouseLeave={() => setOpen(false)}>
            <div style={{ padding: '8px 10px 10px' }}>
              <b>{USER.name}</b>
              <div className="small">{USER.role}</div>
            </div>
            <div className="hr" />
            <button onClick={() => { reset(); setOpen(false); toast('Demo reset. Runs, saved sites and config are back to the start.'); nav('/sq/new') }}>Reset demo data</button>
          </div>
        )}
      </div>
    </header>
  )
}

function LeftNav() {
  const loc = useLocation()
  const { runId } = useParams()
  const runs = useStore((s) => s.runs)
  const config = useStore((s) => s.config)
  const planned = useStore((s) => s.planned)
  const run = runs.find((r) => r.run_id === runId) ?? runs[0]
  const count = run ? rankRun(run, config).reduce((n, c) => n + c.ranked.length, 0) : 0
  const p = loc.pathname
  const subs: { label: string; to?: string; active: boolean; count?: number; step: string }[] = [
    { step: '01', label: 'Set up a run', to: '/sq/new', active: p === '/sq/new' },
    { step: '02', label: 'Pipeline', to: run ? `/sq/run/${run.run_id}` : undefined, active: /^\/sq\/run\/[^/]+$/.test(p) },
    { step: '03', label: 'Candidates', to: run ? `/sq/run/${run.run_id}/candidates` : undefined, active: p.endsWith('/candidates'), count: run ? count : undefined },
    { step: '04', label: 'Planned & settings', to: '/sq/library', active: p === '/sq/library', count: planned.length },
  ]
  return (
    <nav className="nav">
      <div className="inner">
        <div className="label muted">Agent</div>
        <div className="nav-item active"><IconTower /> Site Qualification</div>
        {subs.map((s) =>
          s.to ? (
            <Link key={s.label} to={s.to} className={`nav-sub${s.active ? ' active' : ''}`}>
              <span className="step">{s.step}</span>
              {s.label}
              {s.count !== undefined && <span className="count">{s.count}</span>}
            </Link>
          ) : (
            <div key={s.label} className="nav-sub disabled" title="Run a qualification first">
              <span className="step">{s.step}</span>
              {s.label}
            </div>
          ),
        )}
      </div>
      <div className="me">
        <span className="avatar grey">{USER.initials}</span>
        <div>
          <b>{USER.name}</b>
          <span>{USER.role}</span>
        </div>
      </div>
    </nav>
  )
}

export function Shell() {
  const loc = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [loc.pathname])
  return (
    <div className="app">
      <Header />
      <div className="body">
        <LeftNav />
        <main className="main" ref={mainRef}>
          <Outlet />
        </main>
      </div>
      <ToastHost />
    </div>
  )
}

export function PageHead({ crumb, title, sub, actions }: { crumb: ReactNode; title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="ph">
      <div>
        <div className="crumb">{crumb}</div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  )
}
