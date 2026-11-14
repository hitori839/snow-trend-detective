# 0.5-degree analysis cells covering Hokkaido (rough coastline polygon, lon/lat)
HOKKAIDO = [(139.8,42.2),(140.0,41.4),(140.6,41.4),(141.2,41.8),(141.0,42.3),(141.6,42.6),(142.5,42.2),(143.3,41.9),(143.9,42.6),(145.0,42.9),(145.8,43.3),(145.3,43.6),(145.2,44.1),(144.3,44.0),(143.4,44.4),(142.6,45.0),(141.9,45.5),(141.6,45.4),(141.7,44.4),(141.4,43.7),(140.4,43.3),(140.3,42.9),(139.8,42.6)]
def inside(x, y, poly=HOKKAIDO):
    c = False
    for i in range(len(poly)):
        x1, y1 = poly[i]; x2, y2 = poly[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
    return c
CELLS = [(round(la, 2), round(lo, 2)) for la in [41.5 + 0.5 * i for i in range(9)] for lo in [139.5 + 0.5 * j for j in range(13)] if inside(lo, la)]
if __name__ == "__main__": print(len(CELLS), CELLS)
