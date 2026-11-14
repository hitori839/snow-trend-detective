"""Turn raw daily data into winter indicators + trend tests -> web/data.json
Winter = Dec(prev year)..Mar, labelled by the January year (e.g. 2024 = Dec 2023-Mar 2024).
Indicators (per winter):
  snow_days   days with snowfall (JMA >= 1 cm, POWER snowfall >= 1 mm water equivalent)
  powder      snow days with daily mean temperature <= -5 C  (light, dry snow)
  heavy       snow days with daily mean temperature >  -2 C  (wet, heavy snow)
  share       powder / snow_days  (%)
  icy         days with max > 0 C and min < 0 C (melt by day, freeze at night)
  maxdepth    deepest snow on the ground (JMA only, cm)
  coldest     coldest morning: min temperature and wind chill (JMA only)
Trend: Mann-Kendall test (tie-corrected) + Sen's slope (per decade)."""
import os, json, math, glob
from stations import STATIONS
from grid import CELLS
ROOT = os.path.join(os.path.dirname(__file__), "..")
W0, W1 = 1992, 2026

def mk(x):
    v = [(i, a) for i, a in enumerate(x) if a is not None]
    n = len(v)
    if n < 10: return None
    s = 0
    for i in range(n - 1):
        for j in range(i + 1, n):
            d = v[j][1] - v[i][1]; s += (d > 0) - (d < 0)
    vals = [a for _, a in v]; ties = {}
    for a in vals: ties[a] = ties.get(a, 0) + 1
    var = (n * (n - 1) * (2 * n + 5) - sum(t * (t - 1) * (2 * t + 5) for t in ties.values())) / 18
    z = 0 if s == 0 else (s - (1 if s > 0 else -1)) / math.sqrt(var)
    p = math.erfc(abs(z) / math.sqrt(2))
    sl = sorted((v[j][1] - v[i][1]) / (v[j][0] - v[i][0]) for i in range(n - 1) for j in range(i + 1, n))
    m = len(sl); sen = sl[m // 2] if m % 2 else (sl[m // 2 - 1] + sl[m // 2]) / 2
    return {"p": round(p, 4), "slope10": round(sen * 10, 2), "n": n}

def winters(days):
    """days: dict date(YYYYMMDD)->dict(tmean,tmax,tmin,snow,wind,depth); returns per-winter indicators"""
    out = {k: [] for k in ("snow_days", "powder", "heavy", "share", "icy", "maxdepth", "cold_t", "cold_wc", "cold_date")}
    for w in range(W0, W1 + 1):
        sel = [(k, d) for k, d in days.items() if (k[:4] == str(w - 1) and k[4:6] == "12") or (k[:4] == str(w) and k[4:6] in ("01", "02", "03"))]
        if len(sel) < 100:
            for k in out: out[k].append(None)
            continue
        sd = pw = hv = ic = 0; md = None; cold = None
        for k, d in sel:
            tm, tx, tn, sn = d.get("tmean"), d.get("tmax"), d.get("tmin"), d.get("snow")
            if sn is not None and sn >= 1:
                sd += 1
                if tm is not None and tm <= -5: pw += 1
                if tm is not None and tm > -2: hv += 1
            if tx is not None and tn is not None and tx > 0 and tn < 0: ic += 1
            if d.get("depth") is not None: md = max(md or 0, d["depth"])
            if tn is not None and (cold is None or tn < cold[0]): cold = (tn, d.get("wind"), k)
        out["snow_days"].append(sd); out["powder"].append(pw); out["heavy"].append(hv); out["icy"].append(ic)
        out["share"].append(round(100 * pw / sd, 1) if sd else None)
        out["maxdepth"].append(md)
        if cold:
            t, v, k = cold
            wc = None
            if v is not None:
                kmh = max(v * 3.6, 4.8)
                wc = round(13.12 + 0.6215 * t - 11.37 * kmh ** 0.16 + 0.3965 * t * kmh ** 0.16, 1)
            out["cold_t"].append(t); out["cold_wc"].append(wc); out["cold_date"].append(f"{k[:4]}-{k[4:6]}-{k[6:]}")
        else:
            out["cold_t"].append(None); out["cold_wc"].append(None); out["cold_date"].append(None)
    return out

TREND_KEYS = ("snow_days", "powder", "heavy", "share", "icy", "maxdepth", "cold_t")

JAXA = json.load(open(os.path.join(ROOT, "data", "raw", "jaxa_winter_precip.json")))

def power_series(path):
    j = json.load(open(path)); p = j["p"]; days = {}
    for k in p["T2M"]:
        g = lambda name: (None if p[name][k] <= -900 else p[name][k])
        days[k] = {"tmean": g("T2M"), "tmax": g("T2M_MAX"), "tmin": g("T2M_MIN"), "snow": g("PRECSNOLAND"), "wind": g("WS2M"), "prec": g("PRECTOTCORR")}
    s = winters(days)
    # winter precipitation (mm), for the JAXA cross-check (2001-2026)
    pr = []
    for w in range(W0, W1 + 1):
        v = [d["prec"] for k, d in days.items() if d["prec"] is not None and ((k[:4] == str(w - 1) and k[4:6] == "12") or (k[:4] == str(w) and k[4:6] in ("01", "02", "03")))]
        pr.append(round(sum(v), 1) if len(v) > 100 else None)
    s["precip"] = pr
    return j, s

def jma_series(b):
    path = os.path.join(ROOT, "data", "raw", "jma", f"{b}.json")
    if not os.path.exists(path): return None
    raw = json.load(open(path)); days = {}
    for ym, rows in raw.items():
        y, m = ym.split("-")
        for r in rows:
            days[f"{y}{m}{r['d']:02d}"] = {"tmean": r["tmean"], "tmax": r["tmax"], "tmin": r["tmin"], "snow": r["snowfall"], "wind": r["wind"], "depth": r["depth"]}
    return winters(days)

def trends(s): return {k: mk(s[k]) for k in TREND_KEYS if any(v is not None for v in s[k])}

cells = []
for la, lo in CELLS:
    f = os.path.join(ROOT, "data", "raw", "power", f"{la:.3f}_{lo:.3f}.json")
    if not os.path.exists(f): continue
    j, s = power_series(f)
    jx = JAXA.get(f"{la:.3f}_{lo:.3f}", {})
    jser = [jx.get(str(w)) for w in range(W0, W1 + 1)]
    cut = 2001 - W0
    cells.append({"lat": la, "lon": lo, "elev": round(j["elev"]), "series": s, "trend": trends(s),
                  "precip_check": {"nasa": mk(s["precip"][cut:]), "jaxa": mk(jser[cut:]), "jaxa_series": jser}})
stations = []
for p, b, ja, en, la, lo in STATIONS:
    s = jma_series(b)
    if s is None: continue
    f = os.path.join(ROOT, "data", "raw", "power", f"{la:.3f}_{lo:.3f}.json")
    ps = power_series(f)[1] if os.path.exists(f) else None
    stations.append({"id": b, "ja": ja, "en": en, "lat": la, "lon": lo, "series": s, "trend": trends(s),
                     "power": {"series": ps, "trend": trends(ps)} if ps else None})
os.makedirs(os.path.join(ROOT, "docs"), exist_ok=True)
json.dump({"winters": list(range(W0, W1 + 1)), "cells": cells, "stations": stations,
           "meta": {"powder_t": -5, "heavy_t": -2, "season": "Dec-Mar"}}, open(os.path.join(ROOT, "docs", "data.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print("cells", len(cells), "stations", len(stations))
for st in stations:
    t = st["trend"]; pt = (st["power"] or {}).get("trend", {})
    print(st["en"], {k: (t[k]["slope10"], t[k]["p"]) for k in ("powder", "heavy", "share", "icy", "maxdepth") if t.get(k)}, "| POWER", {k: (pt[k]["slope10"], pt[k]["p"]) for k in ("powder", "heavy", "share", "icy") if pt.get(k)})
