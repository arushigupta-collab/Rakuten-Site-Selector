import type { LatLon, Poly } from './geo'

export type Morphology = 'DU' | 'U' | 'SU' | 'R'
export type ProblemType = 'CAPACITY' | 'COVERAGE'
export type SiteType = 'MACRO' | 'MICRO' | 'SMALL_CELL'
export type Region = 'KANTO' | 'KANSAI' | 'CHUBU' | 'KYUSHU' | 'MUMBAI' | 'DELHI_NCR' | 'BENGALURU'

export type CongestedCell = {
  region: Region
  cell_id: string
  area: string
  site_lat: number
  site_lon: number
  cell_azimuth_deg: number
  morphology: Morphology
  prb_util_pct: number
  busy_hour: string
  users_busy_hour: number
}

export type CoverageGap = {
  region: Region
  gap_id: string
  area: string
  morphology: Morphology
  poly: Poly
  reported_by: string
  rsrp_p10_dbm: number
}

export type Ds9Site = {
  nename: string
  latitude: number
  longitude: number
  netype: string
  nestatus: 'ONAIR' | 'PLANNED'
  deleted: 0 | 1
}

export type Blocker = { region: Region; name: string; constraint_type: 'water' | 'forests' | 'protected'; poly: Poly }

export type Weights = { proximity: number; isolation: number; population: number }

export type ClutterDefaults = { isd_m: number; grid_spacing_m: number; min_dist_from_cell_m: number }

export type Config = {
  version: number
  scenario: string
  forward_cone_half_angle_deg: number
  locality_guard_max_m: number
  ring_factor: number
  cone_isd_min_m: number
  co_location_threshold_m: number
  calculate_config_for: number | 'all'
  max_candidates_per_cell: number
  scoring_weights: Weights
  score_range: { min: number; max: number }
  height_clearance_m: number
  default_antenna_height_m: number
  max_electrical_tilt_deg: number
  height_sample_percentile: number
  clutter_defaults: Record<Morphology, ClutterDefaults>
}

export type PointStatus = 'inner' | 'behind' | 'blocked' | 'separation' | 'ok'

export type GridPoint = { lat: number; lon: number; status: PointStatus; relocated?: boolean; blocker?: string }

export type Sector = {
  sector_index: number
  azimuth_deg: number
  electrical_tilt_deg: number | null
  mechanical_tilt_deg: number
  total_tilt_deg: number | null
  antenna_height_m: number
  population_covered: number
}

/** A survivor of S4, with raw component scores. Ranking happens at read time so config changes re-rank. */
export type Survivor = {
  candidate_id: string
  lat: number
  lon: number
  priority: 'P1' | 'P2'
  site_type: SiteType
  dist_to_centroid_m: number
  nearest_site_m: number
  nearest_site_nename: string
  population_covered: number
  vertical_beamwidth_deg?: number
  horizontal_beamwidth_deg?: number
  beam_near_edge_m: number
  beam_far_edge_m: number
  antenna_height_m: number
  electrical_tilt_deg: number
  score_prox: number
  score_iso: number
  score_pop: number
  sectors: Sector[]
  relocated: boolean
}

export type StepCount = { key: string; name: string; in: number; out: number; note: string }

export type Outcome = 'candidates' | 'small_cell' | 'already_planned' | 'none'

export type SmallCellSuggestion = {
  cell_id: string
  cell_lat: number
  cell_lon: number
  azimuth: number
  morphology: Morphology
  isd_m: number
  ring_r_m: number
  reason: string
  suggestion: 'SMALL_CELL_PLACEMENT'
  nearest_in_cone_m: number
  nearest_site_lat: number
  nearest_site_lon: number
  nearest_site_nename: string
}

export type SiteAlreadyPlanned = {
  cell_id: string
  planned_nename: string
  planned_lat: number
  planned_lon: number
  dist_m: number
  source: string
  suggestion: string
  antenna_height_m: number
  electrical_tilt_deg: number
  beam_far_edge_m: number
}

export type CellResult = {
  ref_id: string
  kind: 'cell' | 'gap'
  area: string
  morphology: Morphology
  center: LatLon
  azimuth?: number
  gapPoly?: Poly
  isd_m: number
  isd_source: string
  ring_r_m: number
  ring_min_m: number
  solution_type: SiteType
  outcome: Outcome
  steps: StepCount[]
  points: GridPoint[]
  survivors: Survivor[]
  small_cell?: SmallCellSuggestion
  planned?: SiteAlreadyPlanned
}

export type Overturn = { candidate_id: string; ref_id: string; from: number; to: number; reason: string; by: string; at: string }

export type Run = {
  run_id: string
  problem_type: ProblemType
  /** missing on runs saved before regions were added; treat as KANTO */
  region?: Region
  created_at: string
  config_version: number
  duration_ms: number
  cells: CellResult[]
  revealed: boolean
  saved: boolean
  overturns: Overturn[]
}

export type PlannedRow = {
  nename: string
  candidate_id: string
  latitude: number
  longitude: number
  nestatus: 'PLANNED'
  netype: string
  run_id: string
  source_cell: string
  priority: 'P1' | 'P2'
  score_composite: number
  saved_by: string
  saved_at: string
}

export type RankedCandidate = Survivor & { score_composite: number; rank: number; raw_composite: number; overturned?: Overturn }
