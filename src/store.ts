import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { StateStorage } from 'zustand/middleware'
import { CONFIG_HISTORY_SEED, DEFAULT_CONFIG, USER } from './data/regions'
import { rankCell } from './engine/rank'
import type { Config, Overturn, PlannedRow, Run } from './engine/types'

type ConfigEntry = { version: number; change: string; by: string; at: string }

type State = {
  runs: Run[]
  planned: PlannedRow[]
  config: Config
  configHistory: ConfigEntry[]
  addRun: (r: Run) => void
  markRevealed: (id: string) => void
  overturn: (runId: string, o: Omit<Overturn, 'by' | 'at'>) => void
  savePlanned: (runId: string) => PlannedRow[]
  publishConfig: (c: Config, change: string) => void
  reset: () => void
}

const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      /* storage full or blocked: demo keeps working in memory */
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  },
}

const SEED_PLANNED: PlannedRow[] = [
  { nename: 'CAND_CAP_IND1301000088_0003', candidate_id: 'CAND_CAP_IND1301000088_0003', latitude: 35.6702, longitude: 139.7629, nestatus: 'PLANNED', netype: 'MACRO', run_id: 'RUN-CAP-20261029101422-4E91C0', source_cell: 'IND1301000088', priority: 'P1', score_composite: 0.902, saved_by: 'H. Sato', saved_at: '2026-10-29T10:21:00Z' },
  { nename: 'CAND_COV_GAP-ARAKAWA-007_0011', candidate_id: 'CAND_COV_GAP-ARAKAWA-007_0011', latitude: 35.7361, longitude: 139.7834, nestatus: 'PLANNED', netype: 'MACRO', run_id: 'RUN-COV-20261021153010-09B2AF', source_cell: 'GAP-ARAKAWA-007', priority: 'P1', score_composite: 0.884, saved_by: 'M. Tanaka', saved_at: '2026-10-21T15:40:00Z' },
]

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      runs: [],
      planned: SEED_PLANNED,
      config: DEFAULT_CONFIG,
      configHistory: CONFIG_HISTORY_SEED,
      addRun: (r) => set((s) => ({ runs: [r, ...s.runs].slice(0, 12) })),
      markRevealed: (id) => set((s) => ({ runs: s.runs.map((r) => (r.run_id === id ? { ...r, revealed: true } : r)) })),
      overturn: (runId, o) =>
        set((s) => ({
          runs: s.runs.map((r) => (r.run_id === runId ? { ...r, overturns: [...r.overturns, { ...o, by: USER.name, at: new Date().toISOString() }] } : r)),
        })),
      savePlanned: (runId) => {
        const s = get()
        const run = s.runs.find((r) => r.run_id === runId)
        if (!run || run.saved) return []
        const rows: PlannedRow[] = []
        for (const cell of run.cells) {
          const top = rankCell(cell, s.config, run.overturns).filter((c) => c.priority === 'P1').slice(0, 3)
          for (const c of top)
            rows.push({
              nename: c.candidate_id, candidate_id: c.candidate_id, latitude: c.lat, longitude: c.lon, nestatus: 'PLANNED', netype: c.site_type,
              run_id: run.run_id, source_cell: cell.ref_id, priority: c.priority, score_composite: c.score_composite, saved_by: USER.name, saved_at: new Date().toISOString(),
            })
        }
        set({ planned: [...rows, ...s.planned], runs: s.runs.map((r) => (r.run_id === runId ? { ...r, saved: true } : r)) })
        return rows
      },
      publishConfig: (c, change) =>
        set((s) => {
          const version = s.config.version + 1
          const d = new Date()
          const at = `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString('en-GB', { month: 'short' })}`
          return { config: { ...c, version }, configHistory: [{ version, change, by: USER.name, at }, ...s.configHistory] }
        }),
      reset: () => set({ runs: [], planned: SEED_PLANNED, config: DEFAULT_CONFIG, configHistory: CONFIG_HISTORY_SEED }),
    }),
    { name: 'sq-demo-v1', storage: createJSONStorage(() => safeStorage) },
  ),
)

export const useLatestRun = () => useStore((s) => s.runs[0])
