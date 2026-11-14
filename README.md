# わが街の雪質カルテ — My Town Snow-Quality Chart

NASA Space Apps Challenge 2026 · **Be An Earth System Trend Detective** · Team **Snow Trend Detective** (Kim Dohyun, solo, Sapporo local event, online from Korea)

**Question:** Is Hokkaido's light, dry snow turning into heavy, wet snow?
**Answer:** Yes. Hokkaido's snow is getting wetter and heavier, and leaving earlier in spring — and about two thirds of the rise in heavy-snow days is explained by warmer, wetter winters.

**Live app:** https://hitori839.github.io/snow-trend-detective/ (Japanese / English / Korean, works on phones, installable)

---

## What it does
- **Home – 3D Earth (NASA Blue Marble):** click anywhere on Earth, use your location, or search any place in any language. Inside Hokkaido you get the full multi-source analysis; anywhere else (*world mode*) 35 winters of NASA POWER data are fetched and analysed live in the browser with the same rules.
- **In a nutshell:** one sentence plus the five changes confirmed across Hokkaido, with your town's numbers.
- **7-day snow-quality forecast:** the forecast read with the same rules; ⚠️ marks rain or wet snow followed by a freeze — the conditions of Sapporo's worst fall-injury days.
- **Snow-quality chart:** one card per change — Hokkaido-wide verdict first, this town second, then a "So what" action (roof clearing, grit, community snow help, spring season planning). Includes the roof load of 1 m of new snow.
- **Snow timeline:** one slider from 1992 (observed: deepest snow drawn against a 170 cm person, coldest morning's wind chill, NASA MODIS snow map of that winter) to the next 7 days (forecast) to 1–10 years ahead (today's trend extended, with its 95 % range and a map; clearly *not* a forecast), plus what becomes more or less likely in that place.
- **Why & where (research):** cause decomposition, other candidate causes (AO, ENSO), where snow changes most, the same test on 178 snowy land points worldwide, what becomes more or less common (with sources), and what we still cannot say.
- **Why it matters:** Sapporo fall-injury ambulance transports (record 1,813 in winter 2025) next to heavy-snow days.
- **Open data:** per-cell and per-station results as CSV/JSON for city snow planning and research.

## Key results (winters Dec–Mar, 1992–2026)
| Finding | Evidence |
|---|---|
| Heavy-snow days (snow at a daily mean > −2 °C) rose | 10/10 JMA stations up (3 significant); 15/43 NASA cells significantly up, 0 down; chance level 1.2 % (500-run shuffle test keeping spatial correlation) |
| The snow itself got heavier | cm of new snow per mm of water (JMA snowfall ÷ JAXA GSMaP) fell at 9/10 stations, 5 significant (Niseko 2.74 → 1.96); roof load of 1 m new snow in Sapporo ≈ 55 → 64 kg/m² |
| Wet heavy storms (≥ 10 mm/day, mean > −2 °C) rose | 10/10 stations (2001–2026); Sapporo 3.2 → 4.6 days/winter |
| Icy-road days rose | 15/43 cells significantly up (chance 2 %) |
| Spring snow leaves earlier | NASA MODIS April snow cover −13.1 points/decade (p = 0.003); 42/42 cells down, 30 significant |
| Why | Winters warmed +0.3 °C/decade (43/43 cells up, 10/10 stations significant). Warming alone explains ≈ 46 % of the heavy-snow rise; adding winter precipitation (up at 10/10 stations) ≈ 66 % |
| Where | Cells already warmer than −3 °C changed most (+1.9 days/decade); the cold interior below −7 °C barely changed → towns now at −5 to −3 °C are likely next. Worldwide, heavy snow rises where winters average −10 to −2 °C — Hokkaido (≈ −4 °C) sits in that band |
| Quantity vs quality | The amount of snow barely changed (snow days: no clear trend; deepest snow mostly unchanged) — its quality did |
| Other causes | Arctic Oscillation and El Niño (NOAA CPC indices) have no 35-year trend (p = 0.78, 1.0) and add R² +0.02 year to year; a warmer Sea of Japan (+1.36 °C/century, JMA) is the likely remainder |
| What follows | More roof load, falls on icy roads, wet snow on lines and trees, wet-snow avalanches and snow-clearing accidents; shorter snow season and less light snow (our data + cited studies) |
| Not yet certain | Light-snow (powder) days lean down but chance level 6 % > 5 %; ⚠️ forecast not validated (no daily accident data) |
| Robustness | Heavy-snow cut-off moved to −3/−2/−1/0 °C: same conclusion; Benjamini–Hochberg FDR; directions match *Climate Change in Japan 2025* (MEXT & JMA), Chapter 6 |

## Data
- **NASA POWER** daily point data (MERRA-2): T2M, T2M_MAX, T2M_MIN, PRECSNOLAND, PRECTOTCORR, WS2M — 43 cells (0.5°) over Hokkaido, 10 station points, 178 world points; and live in the browser for world mode. https://power.larc.nasa.gov/
- **NASA MODIS** Terra monthly snow cover via **NASA GIBS** (MODIS_Terra_L3_Snow_Cover_Monthly_Average_Pct), converted back to percent with the official GIBS colour map. https://gibs.earthdata.nasa.gov/
- **NASA Blue Marble** imagery for the globe (via three-globe).
- **JAXA GSMaP** gauge-adjusted v6, monthly and daily, via JAXA Earth API (`jaxa-earth`). https://data.earth.jaxa.jp/
- **Japan Meteorological Agency** historical daily data, 10 Hokkaido stations. https://www.data.jma.go.jp/stats/etrn/
- **Sapporo City Fire Bureau** fall-injury statistics (via Winter Life Promotion Council, https://tsurutsuru.jp/toukei1.html) — `data/sapporo_falls.csv`
- **NOAA CPC** Arctic Oscillation and ONI indices (`data/indices/`); JMA sea-surface temperature trends.
- **Open-Meteo** forecast API; place search: Wikidata, Photon (OpenStreetMap), GSI address search; place names: BigDataCloud; map tiles: GSI.
- Literature: MEXT & JMA *Climate Change in Japan 2025*, Ch. 6; Helfricht et al. (2018) HESS; Hedstrom & Pomeroy (1998).

## Method
Snow day = JMA snowfall ≥ 1 cm or NASA snowfall ≥ 1 mm water equivalent. Light snow = snow day with daily mean ≤ −5 °C; heavy = snow day with daily mean > −2 °C (rules of thumb on the steep part of the new-snow density–temperature curve; tested with other cut-offs). One value per winter; Mann–Kendall test (tie-corrected) and Sen's slope per decade. Field significance: winter order shuffled 500 times with the same permutation for every cell. Cause: heavy-snow days regressed on detrended winter temperature and precipitation at each station, multiplied by their 35-year changes.

## Repository
| Path | What |
|---|---|
| `scripts/fetch_power.py` · `fetch_jma.py` · `fetch_jaxa.py` · `fetch_jaxa_daily.py` · `fetch_modis.py` · `fetch_world.py` | download raw data into `data/raw/` (not in git) |
| `scripts/grid.py`, `scripts/stations.py` | the 43 Hokkaido cells and 10 JMA stations |
| `scripts/analyze.py` | all indicators, trend tests, FDR, shuffle test, sensitivity, cause and zone analysis → `docs/data.json`, `docs/data/*.csv` |
| `docs/index.html`, `docs/style.css`, `docs/app.js` | the web app (no build step) |
| `docs/world.json` | 5° world grid results |
| `docs/manifest.webmanifest`, `docs/sw.js` | installable web app / offline cache |
| `data/sapporo_falls.csv` | fall-injury transports with source notes |

## Reproduce
```
python -m pip install numpy pandas pillow jaxa-earth
cd scripts
python fetch_power.py && python fetch_jma.py && python fetch_jaxa.py && python fetch_jaxa_daily.py && python fetch_modis.py && python fetch_world.py
python analyze.py          # -> docs/data.json, docs/data/*.csv
cd ../docs && python -m http.server 8000
```

## Use of AI
The team chose the topic (from a winter trip to Sapporo), decided the app's purpose and every feature that was added, chose the data sources, supplied the visual references for the design and reviewed every result. An AI assistant (Claude, Anthropic) wrote most of the code and data-processing scripts, ran the statistical analyses, suggested refinements and extra checks (the team adopted some, e.g. the snow-per-water ratio, threshold sensitivity, cause decomposition and leading with Hokkaido-wide results), and helped with Japanese, Korean and English text. The team logo was drawn as SVG code generated with the AI assistant. AI-generated code is also noted in the page metadata and footer.
