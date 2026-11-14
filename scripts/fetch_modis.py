"""NASA MODIS (Terra) monthly average snow cover (%) over Hokkaido, from NASA GIBS map tiles.
Layer: MODIS_Terra_L3_Snow_Cover_Monthly_Average_Pct (zoom 6, ~1.8 km pixels at 43 N).
Tile colours are turned back into percent with the official GIBS colour map (MODIS_NDSI_Snow_Cover, values 1-100).
Transparent pixels are 0 % on land (or sea / no data). Land = pixels that show snow in any month.
Output data/raw/modis_snow.json: {"YYYY-MM": {"hokkaido": %, "cells": {"lat_lon": %}, "stations": {block: %}}}"""
import os, io, json, math, time, re, urllib.request
import numpy as np
from PIL import Image
from stations import STATIONS
from grid import CELLS, inside
ROOT = os.path.join(os.path.dirname(__file__), "..")
RAW = os.path.join(ROOT, "data", "raw", "modis"); os.makedirs(RAW, exist_ok=True)
OUT = os.path.join(ROOT, "data", "raw", "modis_snow.json")
LAYER = "MODIS_Terra_L3_Snow_Cover_Monthly_Average_Pct"
URL = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/%s/default/{t}/GoogleMapsCompatible_Level6/6/{y}/{x}.png" % LAYER
CMAP = "https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_NDSI_Snow_Cover.xml"
Z = 6

def get(url):
    for k in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "snow-trend-detective"}), timeout=60) as r:
                return r.read()
        except Exception as e:
            if k == 3: raise
            time.sleep(2)

def tile_xy(la, lo):
    n = 2 ** Z; x = (lo + 180) / 360 * n
    y = (1 - math.log(math.tan(math.radians(la)) + 1 / math.cos(math.radians(la))) / math.pi) / 2 * n
    return x, y

# colour -> percent lookup
cm = get(CMAP).decode()
LUT = {}
for rgb, val in re.findall(r'rgb="(\d+,\d+,\d+)" transparent="false" sourceValue="\[(\d+)\]"', cm):
    if 1 <= int(val) <= 100: LUT[tuple(map(int, rgb.split(",")))] = int(val)

json.dump(sorted([list(k) + [v] for k, v in LUT.items()], key=lambda r: r[3]), open(os.path.join(ROOT, "data", "raw", "modis_lut.json"), "w"))
x0, y0 = tile_xy(45.7, 139.3); x1, y1 = tile_xy(41.2, 146.2)
TX, TY = range(int(x0), int(x1) + 1), range(int(y0), int(y1) + 1)

def mosaic(t):
    """percent array (NaN = transparent) for month t (YYYY-MM-01); None if the month is missing"""
    rows = []
    for ty in TY:
        row = []
        for tx in TX:
            f = os.path.join(RAW, f"{t[:7]}_{ty}_{tx}.png")
            if not os.path.exists(f):
                try: b = get(URL.format(t=t, y=ty, x=tx))
                except Exception: return None
                open(f, "wb").write(b)
            im = np.array(Image.open(f).convert("RGBA"))
            a = np.full(im.shape[:2], np.nan)
            op = im[..., 3] > 0
            for (r, g, bb), v in LUT.items():
                a[op & (im[..., 0] == r) & (im[..., 1] == g) & (im[..., 2] == bb)] = v
            row.append(a)
        rows.append(np.hstack(row))
    return np.vstack(rows)

def pix(la, lo):
    x, y = tile_xy(la, lo)
    return int((y - TY[0]) * 256), int((x - TX[0]) * 256)

months = [f"{y}-{m:02d}-01" for y in range(2000, 2027) for m in (11, 12, 1, 2, 3, 4)
          if not (y == 2000 and m < 11) and not (y == 2026 and m == 11 or y == 2026 and m == 12)]
months = sorted(set(months))
arrs = {}
for t in months:
    a = mosaic(t)
    if a is None: print("missing", t[:7], flush=True); continue
    arrs[t[:7]] = a; print("ok", t[:7], flush=True)

land = np.zeros(next(iter(arrs.values())).shape, bool)
for a in arrs.values(): land |= ~np.isnan(a)
H, W = land.shape
# pixel centres -> lat/lon, Hokkaido mask
ys, xs = np.mgrid[0:H, 0:W]
lon = (TX[0] + (xs + .5) / 256) / 2 ** Z * 360 - 180
lat = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * (TY[0] + (ys + .5) / 256) / 2 ** Z))))
hok = land & np.vectorize(inside)(lon, lat)

def area_mean(a, m):
    v = np.where(np.isnan(a), 0, a)[m & land]
    return round(float(v.mean()), 1) if v.size else None

res = {}
for k, a in arrs.items():
    r = {"hokkaido": area_mean(a, hok), "cells": {}, "stations": {}}
    for la, lo in CELLS:
        m = (abs(lat - la) <= .25) & (abs(lon - lo) <= .25)
        r["cells"][f"{la:.3f}_{lo:.3f}"] = area_mean(a, m)
    for _, b, _, _, la, lo in STATIONS:
        m = (abs(lat - la) * 111 <= 10) & (abs(lon - lo) * 111 * math.cos(math.radians(la)) <= 10)  # ~20 km box
        r["stations"][str(b)] = area_mean(a, m)
    res[k] = r
json.dump(res, open(OUT, "w"), separators=(",", ":"))
print("months", len(res), "land px", int(land.sum()), "hokkaido px", int(hok.sum()))
