"""World snow-quality trends on a 5-degree grid (land only) from NASA POWER daily data, 1991-2026.
Same rules as Hokkaido: snow day = PRECSNOLAND >= 1 mm; light snow = daily mean <= -5 C; heavy = > -2 C.
Northern hemisphere winter = Dec-Mar (labelled by January, 1992-2026); southern = Jun-Sep (1991-2025).
Land mask: the earth-topology image used by the globe (ocean = black). Output: docs/world.json"""
import os, io, json, math, time, urllib.request, concurrent.futures as cf
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), "..")
RAW = os.path.join(ROOT, "data", "raw", "world"); os.makedirs(RAW, exist_ok=True)
OUT = os.path.join(ROOT, "docs", "world.json")
TOPO = "https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img/earth-topology.png"
API = ("https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,PRECSNOLAND&community=AG"
       "&latitude={la}&longitude={lo}&start=19910501&end=20260430&format=JSON")

def get(url, tries=4):
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "snow-trend-detective (NASA Space Apps 2026)"}), timeout=120) as r:
                return r.read()
        except Exception:
            if k == tries - 1: raise
            time.sleep(3 * (k + 1))

def mk(x):
    v = [(i, a) for i, a in enumerate(x) if a is not None]; n = len(v)
    if n < 10: return None
    s = 0; sl = []
    for i in range(n - 1):
        for j in range(i + 1, n):
            d = v[j][1] - v[i][1]; s += (d > 0) - (d < 0); sl.append(d / (v[j][0] - v[i][0]))
    ties = {}
    for _, a in v: ties[a] = ties.get(a, 0) + 1
    var = (n * (n - 1) * (2 * n + 5) - sum(t * (t - 1) * (2 * t + 5) for t in ties.values())) / 18
    z = 0 if s == 0 else (s - (1 if s > 0 else -1)) / math.sqrt(var)
    sl.sort(); m = len(sl); sen = sl[m // 2] if m % 2 else (sl[m // 2 - 1] + sl[m // 2]) / 2
    return {"p": round(math.erfc(abs(z) / math.sqrt(2)), 4), "slope10": round(sen * 10, 2)}

# land mask
topo = Image.open(io.BytesIO(get(TOPO))).convert("L"); W, H = topo.size
def is_land(la, lo):
    x = int((lo + 180) / 360 * W) % W; y = min(H - 1, int((90 - la) / 180 * H)); return topo.getpixel((x, y)) > 8
pts = [(la, lo) for la in range(30, 75, 5) for lo in range(-180, 180, 5) if is_land(la, lo)]
pts += [(la, lo) for la in (-35, -40, -45, -50, -55) for lo in range(-180, 180, 5) if is_land(la, lo)]
print("land points", len(pts), flush=True)

def one(pt):
    la, lo = pt; f = os.path.join(RAW, f"{la}_{lo}.json")
    if os.path.exists(f): j = json.load(open(f))
    else:
        j = json.loads(get(API.format(la=la, lo=lo)))["properties"]["parameter"]; json.dump(j, open(f, "w"))
    T, S = j["T2M"], j["PRECSNOLAND"]; south = la < 0
    def winter(k, w):
        return (k[:4] == str(w) and k[4:6] in ("06", "07", "08", "09")) if south else ((k[:4] == str(w - 1) and k[4:6] == "12") or (k[:4] == str(w) and k[4:6] in ("01", "02", "03")))
    W_ = range(1991, 2026) if south else range(1992, 2027)
    heavy, light, snow, tm = [], [], [], []
    for w in W_:
        ks = [k for k in T if winter(k, w) and T[k] > -900]
        if len(ks) < 100: heavy.append(None); light.append(None); snow.append(None); tm.append(None); continue
        sd = [k for k in ks if S.get(k, -999) >= 1]
        snow.append(len(sd)); heavy.append(sum(1 for k in sd if T[k] > -2)); light.append(sum(1 for k in sd if T[k] <= -5))
        tm.append(round(sum(T[k] for k in ks) / len(ks), 2))
    sn = [x for x in snow if x is not None]
    if not sn or sum(sn) / len(sn) < 5: return None          # too little snow to talk about snow quality
    return {"lat": la, "lon": lo, "snow": round(sum(sn) / len(sn), 1), "tmean": round(sum(x for x in tm if x is not None) / len([x for x in tm if x is not None]), 2),
            "heavy": mk(heavy), "light": mk(light), "temp": mk(tm),
            "heavy_early": round(sum(x for x in heavy[:10] if x is not None) / max(1, len([x for x in heavy[:10] if x is not None])), 1),
            "heavy_late": round(sum(x for x in heavy[-10:] if x is not None) / max(1, len([x for x in heavy[-10:] if x is not None])), 1)}

res = []; done = 0
with cf.ThreadPoolExecutor(max_workers=5) as ex:
    for r in ex.map(lambda p: (lambda: one(p))() if True else None, pts):
        done += 1
        if r: res.append(r)
        if done % 20 == 0: print("done", done, "kept", len(res), flush=True)
json.dump({"points": res, "grid_deg": 5, "source": "NASA POWER daily (MERRA-2) T2M, PRECSNOLAND"}, open(OUT, "w"), separators=(",", ":"))
up = [r for r in res if r["heavy"] and r["heavy"]["slope10"] > 0]; sig = [r for r in up if r["heavy"]["p"] < .05]
dn = [r for r in res if r["heavy"] and r["heavy"]["slope10"] < 0 and r["heavy"]["p"] < .05]
print("snowy points", len(res), "heavy up", len(up), "sig up", len(sig), "sig down", len(dn), flush=True)
