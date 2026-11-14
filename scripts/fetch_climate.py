"""Climate-model projections of snow quality (CMIP6 HighResMIP, daily) via the Open-Meteo Climate API.
Models: MRI-AGCM3-2-S (Japan Meteorological Research Institute, ~20 km) and EC-Earth3P-HR (Europe, ~50 km).
Same rules as the observations: snow day = snowfall >= 1 cm; heavy = snow day with daily mean > -2 C; light = <= -5 C.
Points: the 10 JMA stations and the 43 NASA cells. Output: data/raw/climate/*.json (raw), docs/climate.json (winter series)."""
import os, json, time, urllib.request, sys
sys.path.insert(0, os.path.dirname(__file__))
from stations import STATIONS
from grid import CELLS
ROOT = os.path.join(os.path.dirname(__file__), "..")
RAW = os.path.join(ROOT, "data", "raw", "climate"); os.makedirs(RAW, exist_ok=True)
MODELS = ["MRI_AGCM3_2_S", "EC_Earth3P_HR"]
API = ("https://climate-api.open-meteo.com/v1/climate?latitude={la}&longitude={lo}&start_date=1991-12-01&end_date=2050-03-31"
       "&models=" + ",".join(MODELS) + "&daily=temperature_2m_mean,snowfall_sum")
W = list(range(1992, 2051))

def get(url):
    for k in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "snow-trend-detective (NASA Space Apps 2026)"}), timeout=120) as r:
                return json.loads(r.read())
        except Exception as e:
            time.sleep(20 * (k + 1))
    raise RuntimeError(url)

def winters(d, m):
    t, s = d["temperature_2m_mean_" + m], d["snowfall_sum_" + m]
    idx = {}
    for i, k in enumerate(d["time"]):
        y, mo = int(k[:4]), int(k[5:7])
        w = y + 1 if mo == 12 else y if mo <= 3 else None
        if w: idx.setdefault(w, []).append(i)
    out = {"heavy": [], "light": [], "snow": [], "tmean": []}
    for w in W:
        ii = [i for i in idx.get(w, []) if t[i] is not None and s[i] is not None]
        if len(ii) < 100:
            for k in out: out[k].append(None)
            continue
        sd = [i for i in ii if s[i] >= 1]
        out["snow"].append(len(sd)); out["heavy"].append(sum(1 for i in sd if t[i] > -2)); out["light"].append(sum(1 for i in sd if t[i] <= -5))
        out["tmean"].append(round(sum(t[i] for i in ii) / len(ii), 2))
    return out

pts = [("st", str(b), la, lo) for _, b, _, _, la, lo in STATIONS] + [("cell", f"{la:.3f}_{lo:.3f}", la, lo) for la, lo in CELLS]
res = {"winters": W, "models": MODELS, "stations": {}, "cells": {}}
for kind, key, la, lo in pts:
    f = os.path.join(RAW, f"{kind}_{key}.json")
    if os.path.exists(f): d = json.load(open(f))
    else:
        d = get(API.format(la=la, lo=lo))["daily"]; json.dump(d, open(f, "w")); time.sleep(4)
    res["stations" if kind == "st" else "cells"][key] = {m: winters(d, m) for m in MODELS}
    print(kind, key, flush=True)
json.dump(res, open(os.path.join(ROOT, "data", "raw", "climate_winters.json"), "w"), separators=(",", ":"))
print("done", len(pts))
