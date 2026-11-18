import { dest } from '../engine/geo'
import type { LatLon } from '../engine/geo'
import type { Blocker, CongestedCell, Config, CoverageGap, Ds9Site, Morphology, Region } from '../engine/types'

export type RegionMeta = {
  key: Region
  country: 'Japan' | 'India'
  label: string
  cities: string
  ds9Rows: string
  ds5Rows: string
  ds5Fresh: string
  ds6Rows: string
  scanCap: string
  scanCov: string
  epsg: number
}

/** Regions loaded in the demo. Each has its own cells, gaps, blockers, DS9 sites and population hotspots. */
export const REGIONS: RegionMeta[] = [
  { key: 'KANTO', country: 'Japan', ds5Fresh: 'census 2025, monthly', epsg: 32654, label: 'Kanto', cities: 'Tokyo, Yokohama', ds9Rows: '48,912', ds5Rows: '1,204,377', ds6Rows: '109M', scanCap: 'SCAN-1112', scanCov: 'SCAN-1109' },
  { key: 'KANSAI', country: 'Japan', ds5Fresh: 'census 2025, monthly', epsg: 32653, label: 'Kansai', cities: 'Osaka, Kyoto, Kobe', ds9Rows: '27,604', ds5Rows: '702,118', ds6Rows: '64M', scanCap: 'SCAN-1111', scanCov: 'SCAN-1108' },
  { key: 'CHUBU', country: 'Japan', ds5Fresh: 'census 2025, monthly', epsg: 32653, label: 'Chubu', cities: 'Nagoya', ds9Rows: '19,388', ds5Rows: '538,940', ds6Rows: '51M', scanCap: 'SCAN-1111', scanCov: 'SCAN-1107' },
  { key: 'KYUSHU', country: 'Japan', ds5Fresh: 'census 2025, monthly', epsg: 32652, label: 'Kyushu', cities: 'Fukuoka, Kitakyushu', ds9Rows: '14,756', ds5Rows: '461,205', ds6Rows: '43M', scanCap: 'SCAN-1110', scanCov: 'SCAN-1107' },
  { key: 'MUMBAI', country: 'India', ds5Fresh: 'WorldPop 2025, monthly', epsg: 32643, label: 'Mumbai', cities: 'Mumbai, Thane', ds9Rows: '36,215', ds5Rows: '918,442', ds6Rows: '72M', scanCap: 'SCAN-1113', scanCov: 'SCAN-1110' },
  { key: 'DELHI_NCR', country: 'India', ds5Fresh: 'WorldPop 2025, monthly', epsg: 32643, label: 'Delhi NCR', cities: 'New Delhi, Gurugram, Noida', ds9Rows: '41,870', ds5Rows: '1,086,903', ds6Rows: '95M', scanCap: 'SCAN-1113', scanCov: 'SCAN-1110' },
  { key: 'BENGALURU', country: 'India', ds5Fresh: 'WorldPop 2025, monthly', epsg: 32643, label: 'Bengaluru', cities: 'Bengaluru', ds9Rows: '24,532', ds5Rows: '655,710', ds6Rows: '58M', scanCap: 'SCAN-1112', scanCov: 'SCAN-1109' },
]
export const regionMeta = (k: Region | undefined) => REGIONS.find((r) => r.key === (k ?? 'KANTO'))!

/** Mock congested cells (DS9 cells flagged by the capacity scan) */
export const CELLS: CongestedCell[] = [
  { region: 'KANTO', cell_id: 'IND1301000017', area: 'Shibuya', site_lat: 35.6581, site_lon: 139.7017, cell_azimuth_deg: 330, morphology: 'DU', prb_util_pct: 94, busy_hour: '19:00', users_busy_hour: 2184 },
  { region: 'KANTO', cell_id: 'IND1301000023', area: 'Shinjuku', site_lat: 35.6909, site_lon: 139.7003, cell_azimuth_deg: 120, morphology: 'DU', prb_util_pct: 91, busy_hour: '18:00', users_busy_hour: 2410 },
  { region: 'KANTO', cell_id: 'IND1301000031', area: 'Ikebukuro', site_lat: 35.7295, site_lon: 139.7109, cell_azimuth_deg: 200, morphology: 'DU', prb_util_pct: 97, busy_hour: '20:00', users_busy_hour: 1962 },
  { region: 'KANTO', cell_id: 'IND1301000044', area: 'Shinagawa', site_lat: 35.6285, site_lon: 139.7387, cell_azimuth_deg: 300, morphology: 'U', prb_util_pct: 88, busy_hour: '08:00', users_busy_hour: 1745 },
  { region: 'KANTO', cell_id: 'IND1301000052', area: 'Roppongi', site_lat: 35.6628, site_lon: 139.7314, cell_azimuth_deg: 160, morphology: 'DU', prb_util_pct: 89, busy_hour: '22:00', users_busy_hour: 1388 },
  { region: 'KANTO', cell_id: 'IND1401000008', area: 'Yokohama Minatomirai', site_lat: 35.4577, site_lon: 139.6326, cell_azimuth_deg: 60, morphology: 'U', prb_util_pct: 86, busy_hour: '13:00', users_busy_hour: 1290 },
  { region: 'KANTO', cell_id: 'IND1301000067', area: 'Ueno', site_lat: 35.7138, site_lon: 139.7774, cell_azimuth_deg: 270, morphology: 'U', prb_util_pct: 84, busy_hour: '17:00', users_busy_hour: 1176 },
  { region: 'KANTO', cell_id: 'IND1301000071', area: 'Odaiba', site_lat: 35.627, site_lon: 139.7757, cell_azimuth_deg: 0, morphology: 'SU', prb_util_pct: 82, busy_hour: '15:00', users_busy_hour: 964 },
  // Kansai
  { region: 'KANSAI', cell_id: 'IND2701000012', area: 'Osaka Umeda', site_lat: 34.7025, site_lon: 135.4959, cell_azimuth_deg: 200, morphology: 'DU', prb_util_pct: 95, busy_hour: '19:00', users_busy_hour: 2310 },
  { region: 'KANSAI', cell_id: 'IND2701000026', area: 'Namba', site_lat: 34.6659, site_lon: 135.5013, cell_azimuth_deg: 30, morphology: 'DU', prb_util_pct: 93, busy_hour: '20:00', users_busy_hour: 2050 },
  { region: 'KANSAI', cell_id: 'IND2701000038', area: 'Tennoji', site_lat: 34.6465, site_lon: 135.5133, cell_azimuth_deg: 340, morphology: 'U', prb_util_pct: 87, busy_hour: '18:00', users_busy_hour: 1520 },
  { region: 'KANSAI', cell_id: 'IND2601000009', area: 'Kyoto Station', site_lat: 34.9858, site_lon: 135.7588, cell_azimuth_deg: 0, morphology: 'U', prb_util_pct: 88, busy_hour: '17:00', users_busy_hour: 1380 },
  { region: 'KANSAI', cell_id: 'IND2801000015', area: 'Kobe Sannomiya', site_lat: 34.6946, site_lon: 135.1955, cell_azimuth_deg: 150, morphology: 'DU', prb_util_pct: 89, busy_hour: '18:00', users_busy_hour: 1260 },
  // Chubu
  { region: 'CHUBU', cell_id: 'IND2301000011', area: 'Nagoya Meieki', site_lat: 35.1709, site_lon: 136.8815, cell_azimuth_deg: 90, morphology: 'DU', prb_util_pct: 94, busy_hour: '18:00', users_busy_hour: 2120 },
  { region: 'CHUBU', cell_id: 'IND2301000024', area: 'Sakae', site_lat: 35.1681, site_lon: 136.9089, cell_azimuth_deg: 180, morphology: 'DU', prb_util_pct: 92, busy_hour: '20:00', users_busy_hour: 1880 },
  { region: 'CHUBU', cell_id: 'IND2301000037', area: 'Kanayama', site_lat: 35.143, site_lon: 136.9007, cell_azimuth_deg: 0, morphology: 'U', prb_util_pct: 86, busy_hour: '08:00', users_busy_hour: 1240 },
  { region: 'CHUBU', cell_id: 'IND2301000049', area: 'Osu', site_lat: 35.159, site_lon: 136.903, cell_azimuth_deg: 270, morphology: 'U', prb_util_pct: 85, busy_hour: '15:00', users_busy_hour: 980 },
  // Kyushu
  { region: 'KYUSHU', cell_id: 'IND4001000014', area: 'Hakata Station', site_lat: 33.5902, site_lon: 130.4207, cell_azimuth_deg: 300, morphology: 'DU', prb_util_pct: 93, busy_hour: '19:00', users_busy_hour: 1960 },
  { region: 'KYUSHU', cell_id: 'IND4001000027', area: 'Tenjin', site_lat: 33.5911, site_lon: 130.399, cell_azimuth_deg: 180, morphology: 'DU', prb_util_pct: 96, busy_hour: '20:00', users_busy_hour: 2240 },
  { region: 'KYUSHU', cell_id: 'IND4002000035', area: 'Kokura', site_lat: 33.8868, site_lon: 130.8826, cell_azimuth_deg: 90, morphology: 'U', prb_util_pct: 87, busy_hour: '18:00', users_busy_hour: 1310 },
  { region: 'KYUSHU', cell_id: 'IND4001000048', area: 'Yakuin', site_lat: 33.5825, site_lon: 130.4025, cell_azimuth_deg: 200, morphology: 'DU', prb_util_pct: 88, busy_hour: '21:00', users_busy_hour: 1120 },
  // Mumbai
  { region: 'MUMBAI', cell_id: 'INMH010000012', area: 'Bandra Kurla Complex', site_lat: 19.0607, site_lon: 72.8634, cell_azimuth_deg: 220, morphology: 'DU', prb_util_pct: 95, busy_hour: '19:00', users_busy_hour: 2480 },
  { region: 'MUMBAI', cell_id: 'INMH010000026', area: 'Dadar', site_lat: 19.0178, site_lon: 72.8478, cell_azimuth_deg: 0, morphology: 'DU', prb_util_pct: 97, busy_hour: '20:00', users_busy_hour: 2610 },
  { region: 'MUMBAI', cell_id: 'INMH010000038', area: 'Andheri East', site_lat: 19.1136, site_lon: 72.8697, cell_azimuth_deg: 270, morphology: 'DU', prb_util_pct: 90, busy_hour: '18:00', users_busy_hour: 1980 },
  { region: 'MUMBAI', cell_id: 'INMH010000047', area: 'Lower Parel', site_lat: 18.9953, site_lon: 72.83, cell_azimuth_deg: 90, morphology: 'DU', prb_util_pct: 91, busy_hour: '21:00', users_busy_hour: 1540 },
  // Delhi NCR
  { region: 'DELHI_NCR', cell_id: 'INDL010000021', area: 'Connaught Place', site_lat: 28.6315, site_lon: 77.2167, cell_azimuth_deg: 270, morphology: 'DU', prb_util_pct: 94, busy_hour: '19:00', users_busy_hour: 2350 },
  { region: 'DELHI_NCR', cell_id: 'INDL010000034', area: 'Karol Bagh', site_lat: 28.6519, site_lon: 77.1909, cell_azimuth_deg: 90, morphology: 'DU', prb_util_pct: 96, busy_hour: '20:00', users_busy_hour: 2120 },
  { region: 'DELHI_NCR', cell_id: 'INHR020000045', area: 'Gurugram Cyber City', site_lat: 28.495, site_lon: 77.089, cell_azimuth_deg: 45, morphology: 'U', prb_util_pct: 88, busy_hour: '13:00', users_busy_hour: 1720 },
  { region: 'DELHI_NCR', cell_id: 'INUP030000052', area: 'Noida Sector 18', site_lat: 28.57, site_lon: 77.326, cell_azimuth_deg: 300, morphology: 'DU', prb_util_pct: 89, busy_hour: '18:00', users_busy_hour: 1430 },
  // Bengaluru
  { region: 'BENGALURU', cell_id: 'INKA010000015', area: 'MG Road', site_lat: 12.9756, site_lon: 77.605, cell_azimuth_deg: 250, morphology: 'DU', prb_util_pct: 93, busy_hour: '19:00', users_busy_hour: 2040 },
  { region: 'BENGALURU', cell_id: 'INKA010000027', area: 'Koramangala', site_lat: 12.9352, site_lon: 77.6245, cell_azimuth_deg: 0, morphology: 'DU', prb_util_pct: 95, busy_hour: '21:00', users_busy_hour: 1980 },
  { region: 'BENGALURU', cell_id: 'INKA010000039', area: 'Whitefield ITPL', site_lat: 12.9866, site_lon: 77.7366, cell_azimuth_deg: 180, morphology: 'U', prb_util_pct: 87, busy_hour: '10:00', users_busy_hour: 1610 },
  { region: 'BENGALURU', cell_id: 'INKA010000046', area: 'Indiranagar', site_lat: 12.9719, site_lon: 77.6412, cell_azimuth_deg: 120, morphology: 'DU', prb_util_pct: 90, busy_hour: '20:00', users_busy_hour: 1350 },
]

/** Mock coverage gaps (polygons in [lon, lat]) */
export const GAPS: CoverageGap[] = [
  {
    region: 'KANTO', gap_id: 'GAP-SETAGAYA-001', area: 'Setagaya, Sangenjaya west', morphology: 'SU', reported_by: 'Drive test 04 Nov', rsrp_p10_dbm: -118,
    poly: [[139.655, 35.638], [139.668, 35.6365], [139.6705, 35.6455], [139.659, 35.6485], [139.6525, 35.644], [139.655, 35.638]],
  },
  {
    region: 'KANTO', gap_id: 'GAP-KOTO-002', area: 'Koto, Toyosu waterfront', morphology: 'U', reported_by: 'Customer complaints, 37 in 30 days', rsrp_p10_dbm: -121,
    poly: [[139.7885, 35.6465], [139.8015, 35.647], [139.8035, 35.6575], [139.791, 35.659], [139.7865, 35.6525], [139.7885, 35.6465]],
  },
  {
    region: 'KANTO', gap_id: 'GAP-NERIMA-003', area: 'Nerima, Shakujii park north', morphology: 'SU', reported_by: 'MDT crowd data, Oct', rsrp_p10_dbm: -116,
    poly: [[139.5925, 35.7375], [139.6055, 35.736], [139.608, 35.7445], [139.5975, 35.748], [139.5905, 35.7435], [139.5925, 35.7375]],
  },
  {
    region: 'KANSAI', gap_id: 'GAP-SUITA-004', area: 'Suita, Banpaku park east', morphology: 'SU', reported_by: 'Drive test 06 Nov', rsrp_p10_dbm: -117,
    poly: [[135.536, 34.806], [135.548, 34.8052], [135.5505, 34.8128], [135.5405, 34.8162], [135.5345, 34.8118], [135.536, 34.806]],
  },
  {
    region: 'KANSAI', gap_id: 'GAP-SAKAI-005', area: 'Sakai, Daisen kofun south', morphology: 'U', reported_by: 'Customer complaints, 29 in 30 days', rsrp_p10_dbm: -119,
    poly: [[135.481, 34.5525], [135.4945, 34.552], [135.497, 34.5605], [135.486, 34.5635], [135.4795, 34.5585], [135.481, 34.5525]],
  },
  {
    region: 'CHUBU', gap_id: 'GAP-CHIKUSA-006', area: 'Chikusa, Higashiyama park north', morphology: 'SU', reported_by: 'MDT crowd data, Oct', rsrp_p10_dbm: -116,
    poly: [[136.968, 35.1585], [136.981, 35.158], [136.9835, 35.1665], [136.972, 35.1695], [136.966, 35.1645], [136.968, 35.1585]],
  },
  {
    region: 'CHUBU', gap_id: 'GAP-MINATO-007', area: 'Minato, Nagoya port east', morphology: 'U', reported_by: 'Drive test 02 Nov', rsrp_p10_dbm: -120,
    poly: [[136.8835, 35.0935], [136.8965, 35.093], [136.899, 35.1015], [136.887, 35.104], [136.8815, 35.0985], [136.8835, 35.0935]],
  },
  {
    region: 'KYUSHU', gap_id: 'GAP-HIGASHI-008', area: 'Higashi-ku, Island City', morphology: 'U', reported_by: 'Customer complaints, 22 in 30 days', rsrp_p10_dbm: -118,
    poly: [[130.408, 33.6555], [130.4215, 33.655], [130.424, 33.6635], [130.412, 33.666], [130.4065, 33.661], [130.408, 33.6555]],
  },
  {
    region: 'KYUSHU', gap_id: 'GAP-SAWARA-009', area: 'Sawara, Momochi seaside', morphology: 'SU', reported_by: 'MDT crowd data, Oct', rsrp_p10_dbm: -115,
    poly: [[130.346, 33.5855], [130.359, 33.585], [130.3615, 33.5935], [130.35, 33.5958], [130.344, 33.591], [130.346, 33.5855]],
  },
  {
    region: 'MUMBAI', gap_id: 'GAP-POWAI-010', area: 'Powai, lake east', morphology: 'U', reported_by: 'Customer complaints, 41 in 30 days', rsrp_p10_dbm: -119,
    poly: [[72.9095, 19.1185], [72.9225, 19.118], [72.925, 19.1265], [72.913, 19.129], [72.9075, 19.124], [72.9095, 19.1185]],
  },
  {
    region: 'MUMBAI', gap_id: 'GAP-BORIVALI-011', area: 'Borivali, national park edge', morphology: 'SU', reported_by: 'Drive test 08 Nov', rsrp_p10_dbm: -117,
    poly: [[72.853, 19.2245], [72.8665, 19.224], [72.869, 19.2325], [72.857, 19.2355], [72.851, 19.2305], [72.853, 19.2245]],
  },
  {
    region: 'DELHI_NCR', gap_id: 'GAP-MAYURVIHAR-012', area: 'Mayur Vihar, Yamuna floodplain', morphology: 'U', reported_by: 'MDT crowd data, Oct', rsrp_p10_dbm: -118,
    poly: [[77.2835, 28.6005], [77.2965, 28.6], [77.299, 28.6085], [77.287, 28.611], [77.2815, 28.6055], [77.2835, 28.6005]],
  },
  {
    region: 'DELHI_NCR', gap_id: 'GAP-ARAVALLI-013', area: 'Gurugram, Aravalli park south', morphology: 'SU', reported_by: 'Drive test 05 Nov', rsrp_p10_dbm: -116,
    poly: [[77.1045, 28.465], [77.1175, 28.4645], [77.12, 28.473], [77.108, 28.4755], [77.1025, 28.47], [77.1045, 28.465]],
  },
  {
    region: 'BENGALURU', gap_id: 'GAP-BELLANDUR-014', area: 'Bellandur, lake north', morphology: 'U', reported_by: 'Customer complaints, 33 in 30 days', rsrp_p10_dbm: -120,
    poly: [[77.6595, 12.94], [77.6725, 12.9395], [77.675, 12.948], [77.663, 12.9505], [77.6575, 12.945], [77.6595, 12.94]],
  },
  {
    region: 'BENGALURU', gap_id: 'GAP-HEBBAL-015', area: 'Hebbal, lake west', morphology: 'SU', reported_by: 'MDT crowd data, Oct', rsrp_p10_dbm: -115,
    poly: [[77.5715, 13.039], [77.5845, 13.0385], [77.587, 13.047], [77.575, 13.0495], [77.5695, 13.044], [77.5715, 13.039]],
  },
]

/** DS8 hard blockers */
export const BLOCKERS: Blocker[] = [
  { region: 'KANTO', name: 'Yoyogi Park', constraint_type: 'forests', poly: [[139.6935, 35.662], [139.7, 35.663], [139.701, 35.6735], [139.6925, 35.6735], [139.6895, 35.668], [139.6935, 35.662]] },
  { region: 'KANTO', name: 'Meiji Jingu forest', constraint_type: 'forests', poly: [[139.6935, 35.6738], [139.703, 35.674], [139.704, 35.68], [139.696, 35.683], [139.6925, 35.678], [139.6935, 35.6738]] },
  { region: 'KANTO', name: 'Shinjuku Gyoen', constraint_type: 'forests', poly: [[139.704, 35.683], [139.716, 35.683], [139.7165, 35.688], [139.705, 35.6885], [139.704, 35.683]] },
  { region: 'KANTO', name: 'Ueno Park', constraint_type: 'forests', poly: [[139.768, 35.712], [139.7735, 35.7115], [139.7745, 35.7185], [139.768, 35.719], [139.766, 35.7155], [139.768, 35.712]] },
  { region: 'KANTO', name: 'Yokohama inner harbour', constraint_type: 'water', poly: [[139.638, 35.453], [139.66, 35.453], [139.66, 35.475], [139.641, 35.4705], [139.6365, 35.461], [139.638, 35.453]] },
  { region: 'KANTO', name: 'Tokyo Bay, Odaiba north', constraint_type: 'water', poly: [[139.765, 35.6325], [139.79, 35.6325], [139.79, 35.642], [139.765, 35.642], [139.765, 35.6325]] },
  { region: 'KANTO', name: 'Shinonome canal', constraint_type: 'water', poly: [[139.7855, 35.6455], [139.806, 35.6455], [139.806, 35.6485], [139.7855, 35.6485], [139.7855, 35.6455]] },
  { region: 'KANTO', name: 'Shakujii Park pond', constraint_type: 'water', poly: [[139.595, 35.7365], [139.6, 35.736], [139.6005, 35.7395], [139.5955, 35.74], [139.595, 35.7365]] },
  { region: 'KANSAI', name: 'Dojima river', constraint_type: 'water', poly: [[135.484, 34.6935], [135.505, 34.6935], [135.505, 34.6958], [135.484, 34.6958], [135.484, 34.6935]] },
  { region: 'KANSAI', name: 'Kobe port, Meriken', constraint_type: 'water', poly: [[135.188, 34.68], [135.208, 34.68], [135.208, 34.689], [135.188, 34.689], [135.188, 34.68]] },
  { region: 'KANSAI', name: 'Expo 70 Commemorative Park', constraint_type: 'forests', poly: [[135.524, 34.803], [135.537, 34.8035], [135.538, 34.8135], [135.526, 34.8145], [135.522, 34.809], [135.524, 34.803]] },
  { region: 'KANSAI', name: 'Daisen kofun', constraint_type: 'forests', poly: [[135.4845, 34.5605], [135.4905, 34.5605], [135.4915, 34.5675], [135.4855, 34.568], [135.4835, 34.564], [135.4845, 34.5605]] },
  { region: 'CHUBU', name: 'Hori river', constraint_type: 'water', poly: [[136.8925, 35.158], [136.8955, 35.158], [136.8958, 35.184], [136.8928, 35.184], [136.8925, 35.158]] },
  { region: 'CHUBU', name: 'Higashiyama forest', constraint_type: 'forests', poly: [[136.97, 35.15], [136.986, 35.1495], [136.9875, 35.1595], [136.974, 35.1605], [136.9685, 35.1555], [136.97, 35.15]] },
  { region: 'CHUBU', name: 'Nagoya port, Garden pier', constraint_type: 'water', poly: [[136.876, 35.0845], [136.898, 35.0845], [136.898, 35.0925], [136.876, 35.0925], [136.876, 35.0845]] },
  { region: 'KYUSHU', name: 'Mikasa river', constraint_type: 'water', poly: [[130.413, 33.582], [130.4152, 33.582], [130.4155, 33.6], [130.4133, 33.6], [130.413, 33.582]] },
  { region: 'KYUSHU', name: 'Ohori Park pond', constraint_type: 'water', poly: [[130.373, 33.583], [130.379, 33.583], [130.3795, 33.5895], [130.3735, 33.5898], [130.373, 33.583]] },
  { region: 'KYUSHU', name: 'Island City channel', constraint_type: 'water', poly: [[130.402, 33.6495], [130.428, 33.6495], [130.428, 33.6535], [130.402, 33.6535], [130.402, 33.6495]] },
  { region: 'KYUSHU', name: 'Momochi beach', constraint_type: 'water', poly: [[130.338, 33.5965], [130.366, 33.5965], [130.366, 33.6035], [130.338, 33.6035], [130.338, 33.5965]] },
  { region: 'MUMBAI', name: 'Mithi river', constraint_type: 'water', poly: [[72.848, 19.0545], [72.868, 19.0545], [72.868, 19.0572], [72.848, 19.0572], [72.848, 19.0545]] },
  { region: 'MUMBAI', name: 'Powai Lake', constraint_type: 'water', poly: [[72.899, 19.124], [72.909, 19.1235], [72.912, 19.13], [72.906, 19.136], [72.899, 19.132], [72.899, 19.124]] },
  { region: 'MUMBAI', name: 'Sanjay Gandhi National Park', constraint_type: 'forests', poly: [[72.866, 19.222], [72.885, 19.222], [72.886, 19.245], [72.867, 19.245], [72.866, 19.222]] },
  { region: 'DELHI_NCR', name: 'Central Ridge', constraint_type: 'forests', poly: [[77.188, 28.624], [77.2055, 28.624], [77.2055, 28.642], [77.19, 28.645], [77.186, 28.635], [77.188, 28.624]] },
  { region: 'DELHI_NCR', name: 'Yamuna river', constraint_type: 'water', poly: [[77.272, 28.59], [77.284, 28.59], [77.285, 28.62], [77.273, 28.62], [77.272, 28.59]] },
  { region: 'DELHI_NCR', name: 'Aravalli Biodiversity Park', constraint_type: 'forests', poly: [[77.098, 28.4765], [77.12, 28.4765], [77.121, 28.492], [77.1, 28.492], [77.098, 28.4765]] },
  { region: 'BENGALURU', name: 'Cubbon Park', constraint_type: 'forests', poly: [[77.589, 12.97], [77.599, 12.9705], [77.5995, 12.982], [77.59, 12.982], [77.588, 12.976], [77.589, 12.97]] },
  { region: 'BENGALURU', name: 'Bellandur Lake', constraint_type: 'water', poly: [[77.652, 12.925], [77.678, 12.926], [77.68, 12.9385], [77.66, 12.9405], [77.651, 12.934], [77.652, 12.925]] },
  { region: 'BENGALURU', name: 'Hebbal Lake', constraint_type: 'water', poly: [[77.584, 13.039], [77.594, 13.0385], [77.596, 13.047], [77.588, 13.0505], [77.583, 13.046], [77.584, 13.039]] },
]

/** Population hotspots (station areas), people per km² at peak */
export const HOTSPOTS: { lat: number; lon: number; w: number }[] = [
  { lat: 35.658, lon: 139.7016, w: 30000 }, { lat: 35.6896, lon: 139.7006, w: 35000 }, { lat: 35.7295, lon: 139.7109, w: 25000 },
  { lat: 35.6285, lon: 139.7388, w: 20000 }, { lat: 35.6628, lon: 139.7314, w: 18000 }, { lat: 35.4658, lon: 139.6223, w: 22000 },
  { lat: 35.7138, lon: 139.7774, w: 18000 }, { lat: 35.625, lon: 139.7756, w: 8000 }, { lat: 35.6436, lon: 139.6713, w: 12000 },
  { lat: 35.655, lon: 139.796, w: 10000 }, { lat: 35.7356, lon: 139.6517, w: 9000 }, { lat: 35.6655, lon: 139.712, w: 14000 },
  { lat: 35.6975, lon: 139.716, w: 12000 }, { lat: 35.461, lon: 139.637, w: 9000 }, { lat: 35.743, lon: 139.6, w: 7000 },
  // Kansai
  { lat: 34.7025, lon: 135.4959, w: 34000 }, { lat: 34.6659, lon: 135.5013, w: 30000 }, { lat: 34.6465, lon: 135.5133, w: 20000 },
  { lat: 34.9858, lon: 135.7588, w: 18000 }, { lat: 34.6946, lon: 135.1955, w: 20000 }, { lat: 34.6745, lon: 135.501, w: 22000 },
  { lat: 34.81, lon: 135.543, w: 7000 }, { lat: 34.558, lon: 135.488, w: 8000 },
  // Chubu
  { lat: 35.1709, lon: 136.8815, w: 33000 }, { lat: 35.1681, lon: 136.9089, w: 28000 }, { lat: 35.143, lon: 136.9007, w: 18000 },
  { lat: 35.159, lon: 136.903, w: 16000 }, { lat: 35.164, lon: 136.975, w: 7000 }, { lat: 35.1, lon: 136.89, w: 8000 },
  // Kyushu
  { lat: 33.5902, lon: 130.4207, w: 30000 }, { lat: 33.5911, lon: 130.399, w: 32000 }, { lat: 33.8868, lon: 130.8826, w: 17000 },
  { lat: 33.5825, lon: 130.4025, w: 15000 }, { lat: 33.66, lon: 130.415, w: 8000 }, { lat: 33.59, lon: 130.352, w: 9000 },
  // Mumbai
  { lat: 19.0607, lon: 72.8634, w: 36000 }, { lat: 19.0178, lon: 72.8478, w: 42000 }, { lat: 19.1136, lon: 72.8697, w: 34000 },
  { lat: 18.9953, lon: 72.83, w: 30000 }, { lat: 19.123, lon: 72.916, w: 15000 }, { lat: 19.23, lon: 72.858, w: 12000 },
  // Delhi NCR
  { lat: 28.6315, lon: 77.2167, w: 33000 }, { lat: 28.6519, lon: 77.1909, w: 38000 }, { lat: 28.495, lon: 77.089, w: 22000 },
  { lat: 28.57, lon: 77.326, w: 26000 }, { lat: 28.606, lon: 77.29, w: 14000 }, { lat: 28.47, lon: 77.11, w: 9000 },
  // Bengaluru
  { lat: 12.9756, lon: 77.605, w: 30000 }, { lat: 12.9352, lon: 77.6245, w: 32000 }, { lat: 12.9866, lon: 77.7366, w: 20000 },
  { lat: 12.9719, lon: 77.6412, w: 26000 }, { lat: 12.945, lon: 77.667, w: 13000 }, { lat: 13.044, lon: 77.578, w: 10000 },
]

export const BASE_DENSITY: Record<Morphology, number> = { DU: 11000, U: 7500, SU: 4200, R: 900 }

/** DS9 inventory. Built from per-cell specs so each cell lands on the outcome it is meant to demonstrate. */
type Spec = { offset: number; dist: number; status?: 'ONAIR' | 'PLANNED' }
const SITE_SPECS: Record<string, Spec[]> = {
  // in-cone driver of ISD first, then off-cone sites that cause S4 separation rejections
  IND1301000017: [{ offset: 12, dist: 1000 }, { offset: 75, dist: 330 }, { offset: -80, dist: 420 }, { offset: 100, dist: 560 }, { offset: 180, dist: 700 }],
  IND1301000023: [{ offset: -18, dist: 1200 }, { offset: 70, dist: 380 }, { offset: -72, dist: 300 }, { offset: 110, dist: 650 }, { offset: 160, dist: 800 }],
  IND1301000031: [{ offset: 6, dist: 72 }, { offset: 90, dist: 600 }, { offset: -100, dist: 750 }], // small cell
  IND1301000044: [{ offset: 22, dist: 1100 }, { offset: 3, dist: 180, status: 'PLANNED' }, { offset: -85, dist: 500 }], // already planned
  IND1301000052: [{ offset: -8, dist: 190 }, { offset: 85, dist: 400 }, { offset: 170, dist: 600 }], // micro
  IND1401000008: [{ offset: 15, dist: 1300 }, { offset: -78, dist: 420 }, { offset: 82, dist: 500 }, { offset: -110, dist: 520 }],
  IND1301000067: [{ offset: -10, dist: 1100 }, { offset: 70, dist: 350 }, { offset: -76, dist: 460 }, { offset: 105, dist: 540 }],
  IND1301000071: [{ offset: 20, dist: 1500 }, { offset: -70, dist: 520 }, { offset: 80, dist: 640 }],
  // Kansai
  IND2701000012: [{ offset: 10, dist: 1600 }, { offset: 75, dist: 340 }, { offset: -80, dist: 430 }, { offset: 105, dist: 580 }, { offset: 180, dist: 720 }],
  IND2701000026: [{ offset: -5, dist: 68 }, { offset: 95, dist: 580 }, { offset: -95, dist: 700 }], // small cell
  IND2701000038: [{ offset: 18, dist: 1150 }, { offset: -4, dist: 170, status: 'PLANNED' }, { offset: -80, dist: 520 }], // already planned
  IND2601000009: [{ offset: 8, dist: 210 }, { offset: 85, dist: 420 }, { offset: -160, dist: 620 }], // micro
  IND2801000015: [{ offset: -14, dist: 1300 }, { offset: 72, dist: 360 }, { offset: -78, dist: 410 }, { offset: 120, dist: 600 }],
  // Chubu
  IND2301000011: [{ offset: -12, dist: 1800 }, { offset: 70, dist: 380 }, { offset: -75, dist: 330 }, { offset: 115, dist: 640 }, { offset: 170, dist: 780 }],
  IND2301000024: [{ offset: 8, dist: 75 }, { offset: 90, dist: 560 }, { offset: -95, dist: 690 }], // small cell
  IND2301000037: [{ offset: 20, dist: 1150 }, { offset: 2, dist: 175, status: 'PLANNED' }, { offset: -82, dist: 510 }], // already planned
  IND2301000049: [{ offset: -6, dist: 200 }, { offset: 80, dist: 410 }, { offset: 170, dist: 600 }], // micro
  // Kyushu
  IND4001000014: [{ offset: 12, dist: 1800 }, { offset: 75, dist: 350 }, { offset: -82, dist: 440 }, { offset: 110, dist: 600 }, { offset: 175, dist: 760 }],
  IND4001000027: [{ offset: -6, dist: 70 }, { offset: 90, dist: 590 }, { offset: -100, dist: 700 }], // small cell
  IND4002000035: [{ offset: 15, dist: 1200 }, { offset: -3, dist: 185, status: 'PLANNED' }, { offset: -85, dist: 500 }], // already planned
  IND4001000048: [{ offset: 10, dist: 205 }, { offset: 85, dist: 420 }, { offset: -165, dist: 610 }], // micro
  // Mumbai
  INMH010000012: [{ offset: 10, dist: 1500 }, { offset: 75, dist: 340 }, { offset: -80, dist: 430 }, { offset: 105, dist: 580 }, { offset: 180, dist: 720 }],
  INMH010000026: [{ offset: -5, dist: 66 }, { offset: 95, dist: 560 }, { offset: -95, dist: 680 }], // small cell
  INMH010000038: [{ offset: 18, dist: 1100 }, { offset: -4, dist: 165, status: 'PLANNED' }, { offset: -80, dist: 500 }], // already planned
  INMH010000047: [{ offset: 8, dist: 195 }, { offset: 85, dist: 410 }, { offset: -160, dist: 600 }], // micro
  // Delhi NCR
  INDL010000021: [{ offset: -12, dist: 2000 }, { offset: 70, dist: 380 }, { offset: -75, dist: 340 }, { offset: 115, dist: 640 }, { offset: 170, dist: 780 }],
  INDL010000034: [{ offset: 6, dist: 72 }, { offset: 90, dist: 600 }, { offset: -100, dist: 720 }], // small cell
  INHR020000045: [{ offset: 20, dist: 1250 }, { offset: 2, dist: 180, status: 'PLANNED' }, { offset: -82, dist: 520 }], // already planned
  INUP030000052: [{ offset: -6, dist: 210 }, { offset: 80, dist: 420 }, { offset: 170, dist: 610 }], // micro
  // Bengaluru
  INKA010000015: [{ offset: 12, dist: 1600 }, { offset: 75, dist: 350 }, { offset: -82, dist: 440 }, { offset: 110, dist: 600 }, { offset: 175, dist: 760 }],
  INKA010000027: [{ offset: -6, dist: 70 }, { offset: 90, dist: 590 }, { offset: -100, dist: 700 }], // small cell
  INKA010000039: [{ offset: 15, dist: 1200 }, { offset: -3, dist: 185, status: 'PLANNED' }, { offset: -85, dist: 500 }], // already planned
  INKA010000046: [{ offset: 10, dist: 205 }, { offset: 85, dist: 420 }, { offset: -165, dist: 610 }], // micro
}

function buildSites(): Ds9Site[] {
  const out: Ds9Site[] = []
  let n = 100
  for (const c of CELLS) {
    // the congested cell's own mast
    out.push({ nename: `${c.cell_id}_S001_001`, latitude: c.site_lat, longitude: c.site_lon, netype: 'MACRO_SUB6_CELL', nestatus: 'ONAIR', deleted: 0 })
    for (const s of SITE_SPECS[c.cell_id] ?? []) {
      const p = dest({ lat: c.site_lat, lon: c.site_lon }, (c.cell_azimuth_deg + s.offset + 360) % 360, s.dist)
      n += 1
      out.push({
        nename: `${c.cell_id.slice(0, 8)}${String(n).padStart(5, '0')}_S001_001`,
        latitude: +p.lat.toFixed(6),
        longitude: +p.lon.toFixed(6),
        netype: 'MACRO_SUB6_CELL',
        nestatus: s.status ?? 'ONAIR',
        deleted: 0,
      })
    }
  }
  // gap surroundings: a few far sites so coverage isolation varies
  const gapSites: [string, number, number][] = [
    ['IND13010', 35.6335, 139.6492], ['IND13010', 35.6525, 139.6815], ['IND13010', 35.6372, 139.6798],
    ['IND13010', 35.6405, 139.7935], ['IND13010', 35.6655, 139.8045], ['IND13010', 35.6612, 139.7825],
    ['IND13010', 35.7298, 139.5893], ['IND13010', 35.7512, 139.6133], ['IND13010', 35.7395, 139.6198],
    ['IND27010', 34.7985, 135.5262], ['IND27010', 34.8235, 135.5418], ['IND27010', 34.8055, 135.5612],
    ['IND27010', 34.5452, 135.4728], ['IND27010', 34.5698, 135.5045], ['IND27010', 34.5512, 135.5068],
    ['IND23010', 35.1712, 136.9612], ['IND23010', 35.1528, 136.9935], ['IND23010', 35.1748, 136.9895],
    ['IND23010', 35.1085, 136.8752], ['IND23010', 35.1062, 136.9068], ['IND23010', 35.0965, 136.9135],
    ['IND40010', 33.6448, 130.4255], ['IND40010', 33.6705, 130.4302], ['IND40010', 33.6612, 130.3975],
    ['IND40010', 33.5772, 130.3415], ['IND40010', 33.5885, 130.3702], ['IND40010', 33.5795, 130.3625],
    ['INMH0100', 19.1105, 72.9268], ['INMH0100', 19.1342, 72.9201], ['INMH0100', 19.1158, 72.9052],
    ['INMH0100', 19.2178, 72.8492], ['INMH0100', 19.2412, 72.8588], ['INMH0100', 19.2265, 72.8415],
    ['INDL0100', 28.5932, 77.2988], ['INDL0100', 28.6165, 77.3012], ['INDL0100', 28.6042, 77.3085],
    ['INHR0200', 28.4572, 77.1098], ['INHR0200', 28.4688, 77.0955], ['INHR0200', 28.4612, 77.1265],
    ['INKA0100', 12.9532, 77.6648], ['INKA0100', 12.9468, 77.6862], ['INKA0100', 12.9365, 77.6805],
    ['INKA0100', 13.0302, 77.5735], ['INKA0100', 13.0558, 77.5772], ['INKA0100', 13.0425, 77.5612],
  ]
  for (const [pre, lat, lon] of gapSites) {
    n += 1
    out.push({ nename: `${pre}${String(n).padStart(5, '0')}_S001_001`, latitude: lat, longitude: lon, netype: 'MACRO_SUB6_CELL', nestatus: 'ONAIR', deleted: 0 })
  }
  return out
}

export const DS9: Ds9Site[] = buildSites()

export function datasetsFor(region: Region) {
  const m = regionMeta(region)
  const blockers = BLOCKERS.filter((b) => b.region === region).length
  return [
    { key: 'DS9', name: 'RAN inventory', table: 'v_inventory_network_elements', rows: m.ds9Rows, fresh: 'synced 12 Nov, 06:00', note: 'Live and planned sites, same-family matching' },
    { key: 'DS5', name: 'Population density', table: 'ds5_population_mesh_250m', rows: m.ds5Rows, fresh: m.ds5Fresh, note: 'Night population, morphology DU / U / SU / R' },
    { key: 'DS6', name: 'Terrain & building height', table: `DS_Staging_${region.toLowerCase()}_dhm`, rows: m.ds6Rows, fresh: 'tile cache 3 of 4 warm', note: `DTM / DHM / DLU, EPSG:${m.epsg} reprojected` },
    { key: 'DS8', name: 'Geographic constraints', table: 'ds8_constraints', rows: String(blockers), fresh: 'scenario S1', note: 'Water and forests are hard blockers' },
  ]
}

export const regionFit = (region: Region): LatLon[] => [
  ...CELLS.filter((c) => c.region === region).map((c) => ({ lat: c.site_lat, lon: c.site_lon })),
  ...GAPS.filter((g) => g.region === region).flatMap((g) => g.poly.map(([lon, lat]) => ({ lat, lon }))),
]

export const DEFAULT_CONFIG: Config = {
  version: 7,
  scenario: 'S1',
  forward_cone_half_angle_deg: 60,
  locality_guard_max_m: 3000,
  ring_factor: 0.6,
  cone_isd_min_m: 50,
  co_location_threshold_m: 10,
  calculate_config_for: 'all',
  max_candidates_per_cell: 8,
  scoring_weights: { proximity: 0.4, isolation: 0.3, population: 0.3 },
  score_range: { min: 0.68, max: 1.0 },
  height_clearance_m: 3,
  default_antenna_height_m: 20,
  max_electrical_tilt_deg: 12,
  height_sample_percentile: 80,
  clutter_defaults: {
    DU: { isd_m: 900, grid_spacing_m: 40, min_dist_from_cell_m: 120 },
    U: { isd_m: 1200, grid_spacing_m: 50, min_dist_from_cell_m: 150 },
    SU: { isd_m: 1800, grid_spacing_m: 70, min_dist_from_cell_m: 200 },
    R: { isd_m: 3000, grid_spacing_m: 100, min_dist_from_cell_m: 300 },
  },
}

export const CONFIG_HISTORY_SEED = [
  { version: 7, change: 'Score range floor raised to 0.68', by: 'H. Sato', at: '28 Oct' },
  { version: 6, change: 'Ring factor 0.5 → 0.6 for MACRO', by: 'H. Sato', at: '09 Sep' },
  { version: 5, change: 'calculate_config_for added, default all', by: 'EMB Global', at: '09 Jul' },
]

export const USER = { name: 'M. Tanaka', initials: 'MT', role: 'Network planner' }
