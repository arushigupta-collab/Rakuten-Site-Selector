# Site Qualification demo (Rakuten × EMB Global)

An interactive, front-end-only demo of the **Site Qualification** agent, running on mock data for seven regions: Kanto, Kansai, Chubu and Kyushu in Japan, and Mumbai, Delhi NCR and Bengaluru in India.
It follows the Milestone 4 docs (site qualification API + tech documentation v2, 9 Jul 2026) and the
visual language of the Image Audit reference screens (kept in a local `reference/` folder, not committed).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static build in dist/, opens from any static host (hash routing, relative paths)
```

Needs internet for Google Fonts (IBM Plex Mono) and the Esri light-grey map tiles. Without tiles the maps still draw
rings, points and pins on a plain grid.

## Screens

| Route | Screen | What it shows |
|---|---|---|
| `#/sq/new` | 01 Set up a run | Region picker, Capacity (congested cells) or Coverage (gap polygons), data sources, weights |
| `#/sq/run/:id` | 02 Pipeline | S0 to S7 animating, map filtering per step, capacity vs coverage step table, agent log in the `/agent/chat` SSE style |
| `#/sq/run/:id/candidates` | 03 Candidates | Ranked list, map with sectors, score breakdown, reasons, overturn, save, export |
| `#/sq/library` | 04 Planned & settings | `inventory_planned`, run history, live re-ranking by weights, config versions |

## How the mock works

`src/engine/` runs the documented pipeline for real on synthetic data, so results respond to input:

- **S0** ISD from the nearest live same-family site in the ±60° cone → MACRO / MICRO / SMALL_CELL; planned-site short-circuit
- **S1** grid stamp · **S2** half-plane + inner exclusion, P1/P2 · **S3** DS8 water/forest blockers with 3×3 relocation
- **S4** separation from DS9 + `inventory_planned` · **S5** antenna height from DS6-like rooftops, tilt = atan(h/d)
- **S6** proximity / isolation / population, weighted, rescaled into `score_range` · **S7** primary + 2 secondary sectors
- Export JSON produces the v2 `POST /candidate` response envelope.

Data lives in `src/data/regions.ts`. Each region has congested cells, coverage gaps, DS9 sites, DS8 blockers and population hotspots,
and every region shows the same four S0 outcomes (macro, micro, small cell, already planned):

| Region | Cities | Cells | Gaps | Small cell | Already planned | Micro | Blockers that bite |
|---|---|---|---|---|---|---|---|
| KANTO | Tokyo, Yokohama | 8 | 3 | Ikebukuro | Shinagawa | Roppongi | Yoyogi Park, Tokyo Bay, Shinonome canal |
| KANSAI | Osaka, Kyoto, Kobe | 5 | 2 | Namba | Tennoji | Kyoto Station | Dojima river, Kobe port, Daisen kofun |
| CHUBU | Nagoya | 4 | 2 | Sakae | Kanayama | Osu | Hori river, Higashiyama forest, Nagoya port |
| KYUSHU | Fukuoka, Kitakyushu | 4 | 2 | Tenjin | Kokura | Yakuin | Mikasa river, Island City channel, Momochi beach |
| MUMBAI | Mumbai, Thane | 4 | 2 | Dadar | Andheri East | Lower Parel | Mithi river, Powai Lake, Sanjay Gandhi National Park |
| DELHI_NCR | New Delhi, Gurugram, Noida | 4 | 2 | Karol Bagh | Gurugram Cyber City | Noida Sector 18 | Central Ridge, Yamuna river, Aravalli Biodiversity Park |
| BENGALURU | Bengaluru | 4 | 2 | Koramangala | Whitefield ITPL | Indiranagar | Cubbon Park, Bellandur Lake, Hebbal Lake |

The region picker groups these under Japan and India. Indian regions use WorldPop for DS5 and UTM 43N (EPSG:32643) for DS6.

State persists in `localStorage`; use the avatar menu → **Reset demo data** before presenting.

## 3-minute demo script

1. **Set up** (the app opens here): nothing is preselected. In Capacity, tick Shibuya, Ikebukuro and Shinagawa. Point out the data sources and weights. Run.
2. **Pipeline**: watch Shibuya filter down step by step (Yoyogi Park removes points at S3). The table under the map shows how each step
   differs for capacity and coverage, with the live step highlighted. Switch the tab to Ikebukuro
   (small cell: a site 72 m inside the cone) and Shinagawa (a planned site is already there). See candidates.
3. **Candidates**: open #1, walk through the three scores, the sectors and "Why this rank". Select #3 →
   **Overturn with a reason** → move to #2. Show the Diverted tab.
4. **Save top 3 to planned** → confirm the one-way commit. You land on Planned & settings with the new rows.
5. **Settings**: drag Population up to ~0.55 and watch the draft top 6 re-order. Publish as v8.
6. Go back to **Set up** and run Shibuya again: it now stops at S0 as "already planned" because of the sites you saved.
7. Optional: switch to **Coverage**, run `GAP-KOTO-002`, show the gap polygon and the canal blocker.
8. Optional: change **Region** to Kansai and run Umeda, Namba and Tennoji. Same three outcomes, different city;
   the Dojima river removes points at S3. Run history on Planned & settings shows the region of every run.

## Assumptions

- Font: same stack as global.rakuten.com, `RakutenSansUI, Arial, sans-serif`. Rakuten Sans is licensed, so its files are not
  bundled: put `RakutenSansUI_W_Rg.woff2` and `RakutenSansUI_W_Bd.woff2` in `public/fonts/` and it loads. Until then it renders in Arial.
  IBM Plex Mono is still used for IDs, dates, counts and scores.
- Rakuten and EMB Global marks are set as text. Swap in official SVG logos if available.
- Persona is "M. Tanaka, Network planner".
- Live timings shown (e.g. "1m 08s") are simulated from the doc's DS6 cache-miss guidance; the demo itself runs in seconds.
