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

# Cause: did winters warm, and how much of the heavy-snow increase does warming explain?
# 1) winter (Dec-Mar) mean temperature trend, NASA cells and JMA stations
# 2) year-to-year link (both series detrended) between winter mean temperature and heavy-snow days at each station
# 3) explained change = (days per degree) x (35-year warming), compared with the observed 35-year change
def winter_mean(days):
    out = []
    for w in range(W0, W1 + 1):
        v = [d["tmean"] for k, d in days.items() if d.get("tmean") is not None and ((k[:4] == str(w - 1) and k[4:6] == "12") or (k[:4] == str(w) and k[4:6] in ("01", "02", "03")))]
        out.append(sum(v) / len(v) if len(v) > 100 else None)
    return out
def ols(x, y):
    n = len(x); mx = sum(x) / n; my = sum(y) / n; sxx = sum((a - mx) ** 2 for a in x)
    b = sum((a - mx) * (c - my) for a, c in zip(x, y)) / sxx
    return b, b * math.sqrt(sxx / sum((c - my) ** 2 for c in y))
def detrend(v, t):
    b, _ = ols(t, v); mt = sum(t) / len(t); mv = sum(v) / len(v)
    return [c - (mv + b * (a - mt)) for a, c in zip(t, v)]
cell_t = [mk(winter_mean(d)) for d in _pdays]
_wm_cells = [winter_mean(d) for d in _pdays]
hok_series = [round(sum(x[i] for x in _wm_cells if x[i] is not None) / max(1, sum(1 for x in _wm_cells if x[i] is not None)), 2) for i in range(W1 - W0 + 1)]
CAUSE = {"hok_temp": hok_series, "hok_trend": mk(hok_series),
         "cells_up": sum(1 for t in cell_t if t and t["slope10"] > 0), "cells_sig_up": sum(1 for t in cell_t if t and t["slope10"] > 0 and t["p"] < .05), "n_cells": len(cell_t),
         "stations": []}
obs_sum = exp_sum = 0.0
for (p_, b_, ja_, en_, la_, lo_), dd in zip([x for x in STATIONS if os.path.exists(os.path.join(ROOT, "data", "raw", "jma", f"{x[1]}.json"))], _jdays):
    st = next(x for x in stations if x["id"] == b_)
    tm = winter_mean(dd); hv = st["series"]["heavy"]
    yrs = [W0 + i for i in range(len(tm)) if tm[i] is not None and hv[i] is not None]
    T_ = [tm[y - W0] for y in yrs]; H_ = [hv[y - W0] for y in yrs]
    per_deg, r = ols(detrend(T_, yrs), detrend(H_, yrs))
    warm = ols(yrs, T_)[0] * (yrs[-1] - yrs[0]); obs = ols(yrs, H_)[0] * (yrs[-1] - yrs[0])
    tt = mk(tm)
    CAUSE["stations"].append({"id": b_, "en": en_, "temp_trend": tt, "days_per_degC": round(per_deg, 2), "r": round(r, 2),
                              "warming_degC": round(warm, 2), "observed_change": round(obs, 2), "explained_change": round(per_deg * warm, 2)})
    obs_sum += obs; exp_sum += per_deg * warm
CAUSE["explained_share"] = round(exp_sum / obs_sum, 3) if obs_sum else None
# add winter precipitation (NASA POWER at the station point): heavy ~ temperature + precipitation (both detrended)
import numpy as np
def _detr(v, t):
    b = np.polyfit(t, v, 1); return np.asarray(v, float) - np.polyval(b, t)
tp_sum = 0.0
for x in CAUSE["stations"]:
    st = next(y for y in stations if y["id"] == x["id"])
    if not st.get("power"): continue
    P_ = st["power"]["series"]["precip"]; H_ = st["series"]["heavy"]; dd = _jdays[[s_[1] for s_ in STATIONS if os.path.exists(os.path.join(ROOT, "data", "raw", "jma", f"{s_[1]}.json"))].index(x["id"])]
    T_ = winter_mean(dd)
    idx = [i for i in range(len(H_)) if H_[i] is not None and T_[i] is not None and P_[i] is not None]
    yr = np.array([W0 + i for i in idx], float); h = np.array([H_[i] for i in idx], float); t = np.array([T_[i] for i in idx]); pr = np.array([P_[i] for i in idx])
    A = np.column_stack([_detr(t, yr), _detr(pr, yr), np.ones(len(yr))]); coef = np.linalg.lstsq(A, _detr(h, yr), rcond=None)[0]
    span = yr[-1] - yr[0]; dT = np.polyfit(yr, t, 1)[0] * span; dP = np.polyfit(yr, pr, 1)[0] * span
    x["precip_change_mm"] = round(float(dP), 1); x["explained_change_tp"] = round(float(coef[0] * dT + coef[1] * dP), 2)
    tp_sum += coef[0] * dT + coef[1] * dP
CAUSE["explained_share_tp"] = round(tp_sum / obs_sum, 3) if obs_sum else None
CAUSE["stations_precip_up"] = sum(1 for x in CAUSE["stations"] if x.get("precip_change_mm", 0) > 0)
# where does the change happen? winter mean temperature of each NASA cell vs its heavy-snow trend
for c, wm in zip(cells, _wm_cells):
    v = [a for a in wm if a is not None]; c["tmean"] = round(sum(v) / len(v), 2)
ZONES = []
for lo_, hi_ in ((-99, -7), (-7, -5), (-5, -3), (-3, 99)):
    g = [c for c in cells if lo_ <= c["tmean"] < hi_ and c["trend"].get("heavy")]
    if g: ZONES.append({"lo": lo_, "hi": hi_, "n": len(g), "heavy_slope": round(sum(c["trend"]["heavy"]["slope10"] for c in g) / len(g), 2),
                        "sig_up": sum(1 for c in g if c["trend"]["heavy"]["slope10"] > 0 and c["trend"]["heavy"]["p"] < .05)})
CAUSE["zones"] = ZONES
# the same question worldwide (scripts/fetch_world.py -> docs/world.json, 5-degree land grid)
WZ = []
_wp = os.path.join(ROOT, "docs", "world.json")
if os.path.exists(_wp):
    WP = json.load(open(_wp))["points"]
    for lo_, hi_ in ((-99, -15), (-15, -10), (-10, -5), (-5, -2), (-2, 99)):
        g = [q for q in WP if lo_ <= q["tmean"] < hi_ and q["heavy"]]
        if g: WZ.append({"lo": lo_, "hi": hi_, "n": len(g), "heavy_slope": round(sum(q["heavy"]["slope10"] for q in g) / len(g), 2),
                         "light_slope": round(sum(q["light"]["slope10"] for q in g if q["light"]) / max(1, len([q for q in g if q["light"]])), 2),
                         "sig_up": sum(1 for q in g if q["heavy"]["slope10"] > 0 and q["heavy"]["p"] < .05), "sig_down": sum(1 for q in g if q["heavy"]["slope10"] < 0 and q["heavy"]["p"] < .05)})
CAUSE["world_zones"] = WZ
CAUSE["stations_warm_sig"] = sum(1 for x in CAUSE["stations"] if x["temp_trend"]["slope10"] > 0 and x["temp_trend"]["p"] < .05)
CAUSE["stations_positive_link"] = sum(1 for x in CAUSE["stations"] if x["days_per_degC"] > 0)
print("cause", json.dumps({k: v for k, v in CAUSE.items() if k not in ("hok_temp", "stations", "zones", "world_zones")}))
print("zones", CAUSE["zones"]); print("world zones", CAUSE["world_zones"])

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
# ---- open data for city and research use: one row per NASA cell / JMA station ----
import csv
OUTD = os.path.join(ROOT, "docs", "data"); os.makedirs(OUTD, exist_ok=True)
def m10(v, first=True):
    x = [a for a in v if a is not None]; x = x[:10] if first else [a for a in v[-10:] if a is not None]
    return round(sum(x) / len(x), 2) if x else ""
CELL_KEYS = ["heavy", "powder", "icy", "share", "snow_days", "cov_apr", "cov_dec"]
with open(os.path.join(OUTD, "cells_trends.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["lat", "lon", "elev_m"] + [f"{k}_{c}" for k in CELL_KEYS for c in ("early_mean", "late_mean", "slope_per_decade", "p", "q_fdr")])
    for c in cells:
        row = [c["lat"], c["lon"], c["elev"]]
        for k in CELL_KEYS:
            t = c["trend"].get(k) or {}; ser = c["series"].get(k, [])
            row += [m10(ser), m10(ser, False), t.get("slope10", ""), t.get("p", ""), t.get("q", "")]
        w.writerow(row)
ST_KEYS = ["heavy", "powder", "icy", "share", "slr", "storm_wet", "storm_powder", "maxdepth", "cov_apr"]
with open(os.path.join(OUTD, "stations_trends.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["jma_block", "name_en", "name_ja", "lat", "lon"] + [f"{k}_{c}" for k in ST_KEYS for c in ("early_mean", "late_mean", "slope_per_decade", "p")]
               + ["winter_temp_slope_per_decade", "winter_temp_p", "heavy_days_per_degC", "heavy_observed_change_35y", "heavy_change_explained_by_warming"])
    cs = {x["id"]: x for x in CAUSE["stations"]}
    for st in stations:
        row = [st["id"], st["en"], st["ja"], st["lat"], st["lon"]]
        for k in ST_KEYS:
            t = st["trend"].get(k) or {}; ser = st["series"].get(k, [])
            row += [m10(ser), m10(ser, False), t.get("slope10", ""), t.get("p", "")]
        cc = cs.get(st["id"], {})
        row += [cc.get("temp_trend", {}).get("slope10", ""), cc.get("temp_trend", {}).get("p", ""), cc.get("days_per_degC", ""), cc.get("observed_change", ""), cc.get("explained_change", "")]
        w.writerow(row)
print("open data written:", os.listdir(OUTD))
json.dump({"winters": list(range(W0, W1 + 1)), "cells": cells, "stations": stations,
           "hokkaido": {"series": modis("hokkaido", None), "trend": {k: mk(v) for k, v in modis("hokkaido", None).items()}},
           "field": FIELD, "falls": falls, "sensitivity": SENS, "cause": CAUSE,
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
