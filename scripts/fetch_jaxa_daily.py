"""JAXA GSMaP (gauge-adjusted v6) DAILY precipitation at the 10 JMA stations, Dec-Mar 2001-2026 (JAXA Earth API).
Daily value = mean rate (mm/h) x 24. Saved per station as {YYYYMMDD: mm}."""
import os, json, io, contextlib, datetime as dt
import numpy as np
from jaxa.earth import je
from stations import STATIONS
ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "data", "raw", "jaxa_daily.json")
LAT0, LON0, RES = 46.0, 139.5, 0.1
res = json.load(open(OUT)) if os.path.exists(OUT) else {str(b): {} for _, b, *_ in STATIONS}
def chunks(w):
    d0 = dt.date(w - 1, 12, 1); d1 = dt.date(w, 3, 31)
    while d0 <= d1:
        e = min(d0 + dt.timedelta(days=59), d1); yield d0, e; d0 = e + dt.timedelta(days=1)
for w in range(2001, 2027):
    for a, b in chunks(w):
        if res[str(STATIONS[0][1])].get(a.strftime("%Y%m%d")) is not None: continue
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                d = (je.ImageCollection(collection="JAXA.EORC_GSMaP_standard.Gauge.00Z-23Z.v6_daily", ssl_verify=True)
                     .filter_date(dlim=[a.isoformat() + "T00:00:00", b.isoformat() + "T23:59:59"])
                     .filter_resolution(ppu=10).filter_bounds(bbox=[139.5, 41.0, 146.0, 46.0]).select(band="PRECIP").get_images())
        except Exception as e:
            print("fail", a, e, flush=True); continue
        img = d.raster.img[..., 0]; n = img.shape[0]
        days = [a + dt.timedelta(days=i) for i in range((b - a).days + 1)]
        if n != len(days): print("warn", a, n, len(days), flush=True); days = days[:n]
        for _, sb, _, _, la, lo in STATIONS:
            r, c = int((LAT0 - la) / RES), int((lo - LON0) / RES)
            for i, day in enumerate(days):
                v = img[i, max(r - 1, 0):r + 2, max(c - 1, 0):c + 2]
                res[str(sb)][day.strftime("%Y%m%d")] = None if np.all(np.isnan(v)) else round(float(np.nanmean(v)) * 24, 2)
        json.dump(res, open(OUT, "w")); print("ok", a, b, n, flush=True)
