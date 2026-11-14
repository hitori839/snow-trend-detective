"""Download JMA daily observations (Dec-Mar, winters 1991/92-2025/26) for Hokkaido stations.
Source: Japan Meteorological Agency, past weather data (www.data.jma.go.jp/stats/etrn). Polite: one request at a time."""
import os, re, time, json, urllib.request
from stations import STATIONS
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "jma")
URL = "https://www.data.jma.go.jp/stats/etrn/view/daily_s1.php?prec_no={p}&block_no={b}&year={y}&month={m}&day=&view="
def num(s):
    s = re.sub(r"[\)\]\s×#/]", "", s)
    try: return float(s)
    except ValueError: return None
for p, b, ja, en, la, lo in STATIONS:
    path = os.path.join(OUT, f"{b}.json")
    data = json.load(open(path)) if os.path.exists(path) else {}
    for y in range(1991, 2027):
        for m in (12, 1, 2, 3):
            if (y == 1991 and m != 12) or (y == 2026 and m == 12): continue
            key = f"{y}-{m:02d}"
            if key in data: continue
            for attempt in range(3):
                try:
                    h = urllib.request.urlopen(URL.format(p=p, b=b, y=y, m=m), timeout=30).read().decode("utf-8")
                    break
                except Exception as e:
                    time.sleep(3)
            else:
                print("fail", b, key); continue
            rows = []
            for r in re.findall(r'<tr class="mtx"[^>]*>(.*?)</tr>', h, re.S):
                c = [re.sub("<[^>]+>", "", x).strip() for x in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", r, re.S)]
                if len(c) >= 19 and c[0].isdigit():
                    rows.append({"d": int(c[0]), "tmean": num(c[6]), "tmax": num(c[7]), "tmin": num(c[8]),
                                 "wind": num(c[11]), "snowfall": num(c[17]), "depth": num(c[18])})
            data[key] = rows
            time.sleep(0.3)
        json.dump(data, open(path, "w"))
    print("done", ja, len(data), flush=True)
