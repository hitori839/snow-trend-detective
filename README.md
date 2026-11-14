# わが街の雪質カルテ — My Town Snow-Quality Chart

NASA Space Apps Challenge 2026 · **Be An Earth System Trend Detective** · Team **Snow Trend Detective** (Sapporo local event, online from Korea)

**Question:** Is Hokkaido's light powder snow turning into heavy, wet snow?

A phone-friendly web app. Pick your location, an address or a town, and it shows how winter snow quality changed from 1992 to 2026 (Dec–Mar):

- ❄️ Powder days, 💧 heavy-snow days, 🧊 icy-road days (melt by day, refreeze at night), 📊 share of powder
- ✅ A change is called **certain** only when NASA data and Japan Meteorological Agency ground observations agree and are both significant; JAXA satellite precipitation is used as a third cross-check
- ⏳ Winter time machine: how deep the snow got on a person, and how cold the coldest morning felt
- ⚖️ Compare two places, 🗺 trend map for the city

**Live demo:** https://hitori839.github.io/snow-trend-detective/

## Data
- NASA POWER daily point data (MERRA-2): T2M, T2M_MAX, T2M_MIN, PRECSNOLAND, PRECTOTCORR, WS2M, 43 cells (0.5°) over Hokkaido
- JAXA GSMaP gauge-adjusted v6 monthly precipitation via JAXA Earth API (2001–2026)
- Japan Meteorological Agency historical daily data, 10 Hokkaido stations
- Address search and map tiles: Geospatial Information Authority of Japan

## Method
Snow day = JMA snowfall ≥ 1 cm / NASA snowfall ≥ 1 mm water equivalent. Powder = snow day with daily mean ≤ −5 °C; heavy = snow day with daily mean > −2 °C (rules of thumb). One value per winter, Mann–Kendall trend test (tie-corrected) and Sen's slope per decade.

## Reproduce
```
cd scripts
python3 fetch_power.py && python3 fetch_jma.py && python3 fetch_jaxa.py   # jaxa-earth package
python3 analyze.py        # -> docs/data.json
cd ../docs && python3 -m http.server
```

## Use of AI
The team chose the topic (from a winter trip to Sapporo), decided the app's purpose and main features (my-town view, place comparison, winter time machine), chose the data sources and reviewed every result. An AI assistant (Claude, Anthropic) was used to write most of the code and data-processing scripts, to suggest refinements to the idea, and to help with Japanese and English text. The team logo was drawn as SVG code generated with the AI assistant. All numbers come from the data above.
