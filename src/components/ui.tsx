import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { IconCheck } from './icons'

export const Mono = ({ children, className = '' }: { children: ReactNode; className?: string }) => <span className={`mono ${className}`}>{children}</span>

export function Tag({ kind = 'neutral', children }: { kind?: 'pass' | 'fail' | 'retake' | 'info' | 'neutral' | 'dark'; children: ReactNode }) {
  return <span className={`tag ${kind}`}>{children}</span>
}

export const PrioTag = ({ p }: { p: 'P1' | 'P2' }) => <Tag kind={p === 'P1' ? 'dark' : 'neutral'}>{p}</Tag>

export function Check({ on }: { on: boolean }) {
  return <span className={`check${on ? ' on' : ''}`}>{on && <IconCheck size={12} />}</span>
}

export function Dialog({ title, sub, children, onClose, actions }: { title: string; sub?: ReactNode; children?: ReactNode; onClose: () => void; actions: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true">
        <div className="dh">
          <h3>{title}</h3>
          {sub && <div className="note">{sub}</div>}
        </div>
        {children && <div className="db">{children}</div>}
        <div className="df">{actions}</div>
      </div>
    </div>
  )
}

let pushToast: ((m: string) => void) | null = null
export const toast = (m: string) => pushToast?.(m)

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    let t: number
    pushToast = (m) => {
      setMsg(m)
      clearTimeout(t)
      t = window.setTimeout(() => setMsg(null), 3200)
    }
    return () => {
      pushToast = null
    }
  }, [])
  return msg ? (
    <div className="toast">
      <IconCheck /> {msg}
    </div>
  ) : null
}

export const fmtN = (n: number) => Math.round(n).toLocaleString('en-US')
export const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString('en-GB', { month: 'short' })}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
export const fmtDur = (ms: number) => `${Math.floor(ms / 60000)}m ${String(Math.round((ms % 60000) / 1000)).padStart(2, '0')}s`
