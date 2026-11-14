"""JAXA GSMaP (gauge-adjusted, v6) monthly precipitation via JAXA Earth API -> winter (Dec-Mar) precipitation (mm) per cell/station, winters 2001-2026.
Monthly value is a mean rate (mm/h); multiplied by the hours in each month."""
import os, json, calendar, io, contextlib
import numpy as np
from jaxa.earth import je
from grid import CELLS
from stations import STATIONS
ROOT = os.path.join(os.path.dirname(__file__), "..")
LAT0, LON0, RES = 46.0, 139.5, 0.1
pts = {f"{la:.3f}_{lo:.3f}": (la, lo) for la, lo in CELLS}
pts.update({f"st{b}": (la, lo) for _, b, _, _, la, lo in STATIONS})
out = {k: {} for k in pts}
for w in range(2001, 2027):
    with contextlib.redirect_stdout(io.StringIO()):
        d = (je.ImageCollection(collection="JAXA.EORC_GSMaP_standard.Gauge.00Z-23Z.v6_monthly", ssl_verify=True)
             .filter_date(dlim=[f"{w-1}-12-01T00:00:00", f"{w}-03-31T00:00:00"])
             .filter_resolution(ppu=10).filter_bounds(bbox=[139.5, 41.0, 146.0, 46.0]).select(band="PRECIP").get_images())
    img = d.raster.img[..., 0]
    if img.shape[0] != 4: print("warn", w, img.shape); 
    hours = np.array([calendar.monthrange(y, m)[1] * 24 for y, m in ((w - 1, 12), (w, 1), (w, 2), (w, 3))][:img.shape[0]])
    tot = np.nansum(img * hours[:, None, None], axis=0)
    for k, (la, lo) in pts.items():
        r0, r1 = int((LAT0 - (la + 0.25)) / RES), int((LAT0 - (la - 0.25)) / RES)
        c0, c1 = int((lo - 0.25 - LON0) / RES), int((lo + 0.25 - LON0) / RES)
        out[k][w] = round(float(np.nanmean(tot[max(r0, 0):r1, max(c0, 0):c1])), 1)
    print(w, round(float(np.nanmean(tot)), 1), flush=True)
json.dump(out, open(os.path.join(ROOT, "data", "raw", "jaxa_winter_precip.json"), "w"))
