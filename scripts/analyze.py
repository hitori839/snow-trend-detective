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
  cov_dec / cov_apr  NASA MODIS (Terra) satellite snow cover (%) in December / April, 2001-2026
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

TREND_KEYS = ("snow_days", "powder", "heavy", "share", "icy", "maxdepth", "cold_t", "cov_dec", "cov_apr", "storm_wet", "storm_powder", "storm_all", "slr")

JAXA = json.load(open(os.path.join(ROOT, "data", "raw", "jaxa_winter_precip.json")))
# NASA MODIS monthly snow cover (%), from scripts/fetch_modis.py. December of the previous year and April of the winter year.
MODIS = json.load(open(os.path.join(ROOT, "data", "raw", "modis_snow.json")))
def modis(kind, key):
    """kind: 'cells' | 'stations' | 'hokkaido'; returns {'cov_dec': [...], 'cov_apr': [...]} over W0..W1 (None before 2001)"""
    def one(ym):
        r = MODIS.get(ym)
        if r is None: return None
        return r["hokkaido"] if kind == "hokkaido" else r[kind].get(key)
    return {"cov_dec": [one(f"{w - 1}-12") for w in range(W0, W1 + 1)], "cov_apr": [one(f"{w}-04") for w in range(W0, W1 + 1)],
            "cov_feb": [one(f"{w}-02") for w in range(W0, W1 + 1)]}

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
    s = winters(days); s["_days"] = days
    return s

# JAXA GSMaP daily precipitation at stations (scripts/fetch_jaxa_daily.py), 2001-2026.
# Big-precipitation day = JAXA >= 10 mm/day (water). With the JMA daily mean temperature:
#   storm_wet    big day with mean > -2 C  (wet, heavy snowstorm or rain)
#   storm_powder big day with mean <= -5 C (big powder snowfall)
JD_PATH = os.path.join(ROOT, "data", "raw", "jaxa_daily.json")
JD = json.load(open(JD_PATH)) if os.path.exists(JD_PATH) else {}
def snow_ratio(b, days):
    """Physical check of 'heavier snow': cm of new snow per mm of water (JMA snowfall / JAXA GSMaP precipitation).
    Uses snow days (JMA snowfall >= 1 cm, JAXA >= 1 mm, daily mean <= 1 C). Lower ratio = denser, heavier snow.
    Caveats: satellites tend to under-catch snowfall; JMA snowfall is derived from snow-depth sensors."""
    pr = JD.get(str(b)); out = []
    for w in range(W0, W1 + 1):
        if pr is None or w < 2001: out.append(None); continue
        S = P = 0.0
        for k, d in days.items():
            if not ((k[:4] == str(w - 1) and k[4:6] == "12") or (k[:4] == str(w) and k[4:6] in ("01", "02", "03"))): continue
            pp, sn, tm = pr.get(k), d.get("snow"), d.get("tmean")
            if pp is None or sn is None or tm is None: continue
            if sn >= 1 and pp >= 1 and tm <= 1: S += sn; P += pp
        out.append(round(S / P, 3) if P > 50 else None)
    return {"slr": out}

def jaxa_storms(b, days):
    pr = JD.get(str(b)); out = {"storm_wet": [], "storm_powder": [], "storm_all": []}
    for w in range(W0, W1 + 1):
        if pr is None or w < 2001:
            for k in out: out[k].append(None)
            continue
        keys = [k for k in days if (k[:4] == str(w - 1) and k[4:6] == "12") or (k[:4] == str(w) and k[4:6] in ("01", "02", "03"))]
        have = [k for k in keys if pr.get(k) is not None and days[k].get("tmean") is not None]
        if len(have) < 100:
            for k in out: out[k].append(None)
            continue
        big = [k for k in have if pr[k] >= 10]
        out["storm_all"].append(len(big))
        out["storm_wet"].append(sum(days[k]["tmean"] > -2 for k in big))
        out["storm_powder"].append(sum(days[k]["tmean"] <= -5 for k in big))
    return out

def trends(s): return {k: mk(s[k]) for k in TREND_KEYS if k in s and any(v is not None for v in s[k])}

cells = []
for la, lo in CELLS:
    f = os.path.join(ROOT, "data", "raw", "power", f"{la:.3f}_{lo:.3f}.json")
    if not os.path.exists(f): continue
    j, s = power_series(f)
    s.update(modis("cells", f"{la:.3f}_{lo:.3f}"))
    jx = JAXA.get(f"{la:.3f}_{lo:.3f}", {})
    jser = [jx.get(str(w)) for w in range(W0, W1 + 1)]
    cut = 2001 - W0
    cells.append({"lat": la, "lon": lo, "elev": round(j["elev"]), "series": s, "trend": trends(s),
                  "precip_check": {"nasa": mk(s["precip"][cut:]), "jaxa": mk(jser[cut:]), "jaxa_series": jser}})
stations = []
for p, b, ja, en, la, lo in STATIONS:
    s = jma_series(b)
    if s is None: continue
    s.update(modis("stations", str(b)))
    _d = s.pop("_days"); s.update(jaxa_storms(b, _d)); s.update(snow_ratio(b, _d))
    f = os.path.join(ROOT, "data", "raw", "power", f"{la:.3f}_{lo:.3f}.json")
    ps = power_series(f)[1] if os.path.exists(f) else None
    stations.append({"id": b, "ja": ja, "en": en, "lat": la, "lon": lo, "series": s, "trend": trends(s),
                     "power": {"series": ps, "trend": trends(ps)} if ps else None})
# Many cells are tested at once, so some "significant" cells could appear by chance.
# 1) Benjamini-Hochberg false discovery rate: q-value per cell (q < 0.05 = still significant after correction)
# 2) Field significance: how likely is it to see this many cells significant in the same direction by chance?
#    Shuffle test: the order of winters is shuffled in the same way for every cell (keeps the spatial correlation
#    between neighbouring cells), 500 times; p_field = share of shuffles with at least as many significant cells.
def bh(ps):
    idx = sorted(range(len(ps)), key=lambda i: ps[i]); m = len(ps); q = [None] * m; prev = 1.0
    for r in range(m - 1, -1, -1):
        i = idx[r]; prev = min(prev, ps[i] * m / (r + 1)); q[i] = round(prev, 4)
    return q
import random
def field_test(key, n_perm=500, seed=1):
    """share of shuffles (same winter order applied to every cell, which keeps the spatial correlation)
    with at least as many cells significant (p<0.05) in the observed main direction"""
    ser = [c["series"][key] for c in cells if c["trend"].get(key)]
    obs = [mk(x) for x in ser]
    up = sum(t["slope10"] > 0 and t["p"] < .05 for t in obs); dn = sum(t["slope10"] < 0 and t["p"] < .05 for t in obs)
    sign = 1 if up >= dn else -1; n_obs = max(up, dn)
    rnd = random.Random(seed); L = len(ser[0]); hit = 0
    for _ in range(n_perm):
        order = list(range(L)); rnd.shuffle(order)
        cnt = 0
        for x in ser:
            t = mk([x[i] for i in order])
            if t and t["p"] < .05 and t["slope10"] * sign > 0: cnt += 1
        if cnt >= n_obs: hit += 1
    return {"cells_sig": n_obs, "direction": "up" if sign > 0 else "down", "of": len(ser), "p_field": round((hit + 1) / (n_perm + 1), 4)}
FIELD = {}
for key in ("heavy", "powder", "icy", "share", "cov_apr", "cov_dec"):
    tt = [c["trend"].get(key) for c in cells]
    qs = bh([t["p"] for t in tt if t])
    k = 0
    for t in tt:
        if t: t["q"] = qs[k]; k += 1
    f = field_test(key)
    f["cells_fdr"] = sum(1 for t in tt if t and t["q"] < .05 and (t["slope10"] > 0) == (f["direction"] == "up"))
    FIELD[key] = f
    print("field", key, f, flush=True)
# Sensitivity: do the conclusions depend on the -2 C / -5 C rules of thumb?
def count_days(days, cond):
    out = []
    for w in range(W0, W1 + 1):
        sel = [d for k, d in days.items() if (k[:4] == str(w - 1) and k[4:6] == "12") or (k[:4] == str(w) and k[4:6] in ("01", "02", "03"))]
        if len(sel) < 100: out.append(None); continue
        out.append(sum(1 for d in sel if d.get("tmean") is not None and d.get("snow") is not None and d["snow"] >= 1 and cond(d["tmean"])))
    return out
SENS = {"heavy": [], "powder": []}
_jdays = []
for p_, b, *_ in STATIONS:
    path = os.path.join(ROOT, "data", "raw", "jma", f"{b}.json")
    if not os.path.exists(path): continue
    raw = json.load(open(path)); dd = {}
    for ym, rows in raw.items():
        y, m = ym.split("-")
        for r in rows: dd[f"{y}{m}{r['d']:02d}"] = {"tmean": r["tmean"], "snow": r["snowfall"]}
    _jdays.append(dd)
_pdays = []
for la, lo in CELLS:
    f = os.path.join(ROOT, "data", "raw", "power", f"{la:.3f}_{lo:.3f}.json")
    if not os.path.exists(f): continue
    pp = json.load(open(f))["p"]
    _pdays.append({k: {"tmean": None if pp["T2M"][k] <= -900 else pp["T2M"][k], "snow": None if pp["PRECSNOLAND"][k] <= -900 else pp["PRECSNOLAND"][k]} for k in pp["T2M"]})
for th in (-3, -2, -1, 0):
    js = [mk(count_days(d, lambda t: t > th)) for d in _jdays]; ns = [mk(count_days(d, lambda t: t > th)) for d in _pdays]
    SENS["heavy"].append({"t": th, "jma_up": sum(t["slope10"] > 0 for t in js if t), "jma_sig_up": sum(t["slope10"] > 0 and t["p"] < .05 for t in js if t),
                          "nasa_sig_up": sum(t["slope10"] > 0 and t["p"] < .05 for t in ns if t), "nasa_sig_down": sum(t["slope10"] < 0 and t["p"] < .05 for t in ns if t), "n_jma": len(js), "n_nasa": len(ns)})
for th in (-4, -5, -6, -7):
    js = [mk(count_days(d, lambda t: t <= th)) for d in _jdays]; ns = [mk(count_days(d, lambda t: t <= th)) for d in _pdays]
    SENS["powder"].append({"t": th, "jma_down": sum(t["slope10"] < 0 for t in js if t), "nasa_sig_down": sum(t["slope10"] < 0 and t["p"] < .05 for t in ns if t),
                           "nasa_sig_up": sum(t["slope10"] > 0 and t["p"] < .05 for t in ns if t), "n_jma": len(js), "n_nasa": len(ns)})
print("sensitivity", json.dumps(SENS))

# Impact: Sapporo fall-injury ambulance transports (Dec-Mar) vs JMA Sapporo snow indicators.
# Both rise over time (ageing population, more icy/heavy days), so we also correlate year-to-year CHANGES.
def pearson(x, y):
    mx, my = sum(x) / len(x), sum(y) / len(y)
    sx = math.sqrt(sum((a - mx) ** 2 for a in x)); sy = math.sqrt(sum((b - my) ** 2 for b in y))
    return sum((a - mx) * (b - my) for a, b in zip(x, y)) / (sx * sy)
def perm_p(x, y, n=5000, seed=2):
    r0 = abs(pearson(x, y)); rnd = random.Random(seed); y = list(y); hit = 0
    for _ in range(n):
        rnd.shuffle(y)
        if abs(pearson(x, y)) >= r0: hit += 1
    return (hit + 1) / (n + 1)
FALLS = {}
for line in open(os.path.join(ROOT, "data", "sapporo_falls.csv"), encoding="utf-8"):
    if line[0].isdigit(): w, v = line.strip().split(","); FALLS[int(w)] = int(v)
sap = next(s for s in stations if s["en"] == "Sapporo")
falls = {"winters": sorted(FALLS), "transports": [FALLS[w] for w in sorted(FALLS)], "trend": mk([FALLS[w] for w in sorted(FALLS)]), "link": {}}
for key in ("heavy", "icy"):
    pairs = [(w, sap["series"][key][w - W0], FALLS[w]) for w in sorted(FALLS) if W0 <= w <= W1 and sap["series"][key][w - W0] is not None]
    x = [a for _, a, _ in pairs]; y = [b for _, _, b in pairs]
    dx = [x[i + 1] - x[i] for i in range(len(x) - 1)]; dy = [y[i + 1] - y[i] for i in range(len(y) - 1)]
    falls["link"][key] = {"n": len(x), "r_raw": round(pearson(x, y), 2), "p_raw": round(perm_p(x, y), 3),
                          "r_change": round(pearson(dx, dy), 2), "p_change": round(perm_p(dx, dy), 3)}
print("falls", json.dumps(falls["link"]), falls["trend"])
_sl = [st["trend"].get("slr") for st in stations]
print("snow ratio: down", sum(1 for t in _sl if t and t["slope10"] < 0), "sig down", sum(1 for t in _sl if t and t["slope10"] < 0 and t["p"] < .05), "of", sum(1 for t in _sl if t))
os.makedirs(os.path.join(ROOT, "docs"), exist_ok=True)
json.dump({"winters": list(range(W0, W1 + 1)), "cells": cells, "stations": stations,
           "hokkaido": {"series": modis("hokkaido", None), "trend": {k: mk(v) for k, v in modis("hokkaido", None).items()}},
           "field": FIELD, "falls": falls, "sensitivity": SENS,
           "modis_lut": json.load(open(os.path.join(ROOT, "data", "raw", "modis_lut.json"))),
           "meta": {"powder_t": -5, "heavy_t": -2, "season": "Dec-Mar"}}, open(os.path.join(ROOT, "docs", "data.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print("cells", len(cells), "stations", len(stations))
print("Hokkaido MODIS", json.dumps(data_hok := {k: mk(v) for k, v in modis("hokkaido", None).items()}))
for k in ("cov_dec", "cov_apr"):
    tt = [c["trend"].get(k) for c in cells]; tt = [t for t in tt if t]
    print(k, "cells down", sum(t["slope10"] < 0 for t in tt), "sig down", sum(t["slope10"] < 0 and t["p"] < .05 for t in tt), "sig up", sum(t["slope10"] > 0 and t["p"] < .05 for t in tt), "of", len(tt))
for st in stations:
    t = st["trend"]; pt = (st["power"] or {}).get("trend", {})
    print(st["en"], {k: (t[k]["slope10"], t[k]["p"]) for k in ("powder", "heavy", "share", "icy", "maxdepth", "cov_apr", "storm_wet", "storm_powder", "storm_all") if t.get(k)}, "| POWER", {k: (pt[k]["slope10"], pt[k]["p"]) for k in ("powder", "heavy", "share", "icy") if pt.get(k)})
