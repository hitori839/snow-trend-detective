"""Download NASA POWER daily data (MERRA-2 based) for each Hokkaido cell, 1991-11-01..2026-04-30."""
import os, json, time, urllib.request
from grid import CELLS
from stations import STATIONS
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "power")
P = "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,PRECSNOLAND,SNODP,WS2M"
pts = list(CELLS) + [(la, lo) for _, _, _, _, la, lo in STATIONS]
for la, lo in pts:
    path = os.path.join(OUT, f"{la:.3f}_{lo:.3f}.json")
    if os.path.exists(path): continue
    url = f"https://power.larc.nasa.gov/api/temporal/daily/point?parameters={P}&community=AG&latitude={la}&longitude={lo}&start=19911101&end=20260430&format=JSON"
    for a in range(3):
        try:
            d = json.load(urllib.request.urlopen(url, timeout=120)); break
        except Exception as e:
            print("retry", la, lo, e); time.sleep(5)
    else: continue
    json.dump({"lat": la, "lon": lo, "elev": d["geometry"]["coordinates"][2], "p": d["properties"]["parameter"]}, open(path, "w"))
    print("ok", la, lo, flush=True)
