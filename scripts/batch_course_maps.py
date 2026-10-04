from __future__ import annotations

import math
import random
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


W, H = 720, 1080
DATE = "2026-09-06"
ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "tmp" / "osm_course_maps"
OUT = ROOT / "output" / "course_maps"

COURSES = {
    "Mount_Hood_Golf_Course": (42.45153, -71.03695),
    "Agawam_Municipal_Golf_Course": (42.07235, -72.68436),
    "Maplegate_Country_Club": (42.11022, -71.44264),
    "Acushnet_River_Valley_Golf_Course": (41.71371, -70.89375),
    "The_Meadow_at_Peabody": (42.51404, -70.93884),
}

PALETTES = {
    "Classic": {"bg": "#f5f0e4", "fairway": "#86a969", "green": "#b9d598", "bunker": "#dfc99a", "water": "#6398a3", "tee": "#789b58", "path": "#b79564", "ink": "#526248"},
    "Modern": {"bg": "#f5f7ef", "fairway": "#72ba59", "green": "#a7d96f", "bunker": "#efc663", "water": "#43b4cf", "tee": "#4e9148", "path": "#e0a65c", "ink": "#173f32"},
    "Sketch": {"bg": "#fbfbf8", "fairway": "#eeeeea", "green": "#f8f8f5", "bunker": "#e8e8e4", "water": "#e4e4e1", "tee": "#f2f2ef", "path": "#d7d7d2", "ink": "#3d3d3a"},
}


def fetch_osm(name: str, lat: float, lon: float) -> Path:
    DATA.mkdir(parents=True, exist_ok=True)
    path = DATA / f"{name}.osm"
    if path.exists() and path.stat().st_size > 10000:
        return path
    # Roughly 2 km in every direction, enough for a full 18-hole property.
    dy, dx = 0.012, 0.016
    bbox = f"{lon-dx},{lat-dy},{lon+dx},{lat+dy}"
    url = "https://api.openstreetmap.org/api/0.6/map?" + urllib.parse.urlencode({"bbox": bbox})
    req = urllib.request.Request(url, headers={"User-Agent": "FairwayStudioMapBuilder/1.0"})
    with urllib.request.urlopen(req, timeout=120) as response:
        path.write_bytes(response.read())
    return path


def parse_osm(path: Path, center_lat: float):
    root = ET.parse(path).getroot()
    nodes = {n.attrib["id"]: (float(n.attrib["lon"]), float(n.attrib["lat"])) for n in root.findall("node")}
    ways = []
    for way in root.findall("way"):
        tags = {t.attrib["k"]: t.attrib["v"] for t in way.findall("tag")}
        pts = [nodes[nd.attrib["ref"]] for nd in way.findall("nd") if nd.attrib["ref"] in nodes]
        if len(pts) >= 2:
            ways.append((tags, pts))
    return ways


def meters(points, lat0):
    scale_x = 111320 * math.cos(math.radians(lat0))
    return [(lon * scale_x, lat * 110540) for lon, lat in points]


def segment_distance(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    if dx == dy == 0:
        return math.dist(p, a)
    t = max(0, min(1, ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / (dx*dx + dy*dy)))
    return math.dist(p, (a[0] + t*dx, a[1] + t*dy))


def line_distance(p, line):
    return min(segment_distance(p, line[i-1], line[i]) for i in range(1, len(line)))


def centroid(points):
    return (sum(p[0] for p in points)/len(points), sum(p[1] for p in points)/len(points))


def classify(tags):
    golf = tags.get("golf", "")
    natural = tags.get("natural", "")
    leisure = tags.get("leisure", "")
    if golf in {"fairway", "driving_range"}: return "fairway"
    if golf == "green": return "green"
    if golf in {"bunker", "waste_bunker"}: return "bunker"
    if golf == "tee": return "tee"
    if golf in {"water_hazard", "lateral_water_hazard"} or natural == "water": return "water"
    if golf in {"cartpath", "path"}: return "path"
    if leisure == "golf_course": return "rough"
    return None


def hole_number(tags):
    raw = tags.get("ref") or tags.get("name", "")
    digits = "".join(c for c in raw if c.isdigit())
    if not digits: return None
    n = int(digits)
    return n if 1 <= n <= 18 else None


def organize(ways, lat0):
    holes = {}
    features = []
    for tags, raw in ways:
        pts = meters(raw, lat0)
        if tags.get("golf") == "hole":
            n = hole_number(tags)
            if n:
                holes[n] = {"line": pts, "par": tags.get("par", ""), "yards": tags.get("dist", tags.get("distance", "")), "features": []}
        else:
            kind = classify(tags)
            if kind and kind != "rough": features.append((kind, pts))
    for kind, pts in features:
        c = centroid(pts)
        if holes:
            n = min(holes, key=lambda h: line_distance(c, holes[h]["line"]))
            if line_distance(c, holes[n]["line"]) <= 180:
                holes[n]["features"].append((kind, pts))
    return holes


def transform_for_hole(hole):
    line = hole["line"]
    all_pts = list(line)
    for _, pts in hole["features"]: all_pts.extend(pts)
    a, b = line[0], line[-1]
    angle = math.atan2(b[1]-a[1], b[0]-a[0])
    rot = math.pi/2 - angle
    cx, cy = centroid(line)
    def rotate(p):
        x, y = p[0]-cx, p[1]-cy
        return (x*math.cos(rot)-y*math.sin(rot), x*math.sin(rot)+y*math.cos(rot))
    rotated = [rotate(p) for p in all_pts]
    minx, maxx = min(x for x,_ in rotated), max(x for x,_ in rotated)
    miny, maxy = min(y for _,y in rotated), max(y for _,y in rotated)
    usable_w, usable_h = 590, 865
    scale = min(usable_w/max(maxx-minx, 1), usable_h/max(maxy-miny, 1))
    ox = 65 + (usable_w-(maxx-minx)*scale)/2 - minx*scale
    oy = 125 + (usable_h-(maxy-miny)*scale)/2 + maxy*scale
    def tr(points): return [(ox+x*scale, oy-y*scale) for x,y in map(rotate, points)]
    return tr


def paper_texture(img, seed):
    rng = random.Random(seed)
    px = img.load()
    for _ in range(15000):
        x, y = rng.randrange(W), rng.randrange(H)
        r, g, b = px[x, y]
        d = rng.choice((-5, -3, 2, 4))
        px[x, y] = tuple(max(0, min(255, v+d)) for v in (r,g,b))


def draw_polygon(draw, pts, fill, outline, width, style, seed):
    if len(pts) < 3: return
    if style == "Classic":
        rng = random.Random(seed)
        for _ in range(4):
            jitter = [(x+rng.uniform(-2,2), y+rng.uniform(-2,2)) for x,y in pts]
            draw.polygon(jitter, fill=fill)
        draw.line(pts+[pts[0]], fill=outline, width=width, joint="curve")
    else:
        draw.polygon(pts, fill=fill, outline=outline)
        draw.line(pts+[pts[0]], fill=outline, width=width, joint="curve")


def font(size, bold=False):
    options = [
        Path("C:/Windows/Fonts/georgiab.ttf" if bold else "C:/Windows/Fonts/georgia.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
    ]
    for p in options:
        if p.exists(): return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def render(course, n, hole, style, output):
    p = PALETTES[style]
    img = Image.new("RGB", (W,H), p["bg"])
    if style in {"Classic", "Sketch"}: paper_texture(img, hash((course,n,style)) & 0xffff)
    draw = ImageDraw.Draw(img, "RGBA")
    tr = transform_for_hole(hole)
    order = {"water":0, "fairway":1, "path":2, "tee":3, "bunker":4, "green":5}
    feats = sorted(hole["features"], key=lambda f: order.get(f[0], 9))
    for idx, (kind, raw) in enumerate(feats):
        pts = tr(raw)
        if kind == "path":
            draw.line(pts, fill=p["path"], width=12 if style!="Sketch" else 5, joint="curve")
            continue
        fill = p[kind]
        outline = p["ink"]
        alpha = 205 if style=="Classic" else 255
        draw_polygon(draw, pts, fill+format(alpha,'02x'), outline, 3 if style=="Modern" else 2, style, n*100+idx)
        if style == "Sketch" and kind in {"fairway","bunker","water"}:
            xs, ys = [q[0] for q in pts], [q[1] for q in pts]
            step = 18 if kind=="fairway" else 11
            overlay = img.copy()
            hatch = ImageDraw.Draw(overlay)
            for x in range(int(min(xs))-500, int(max(xs))+500, step):
                hatch.line((x,min(ys),x+int(max(ys)-min(ys)),max(ys)), fill="#777773", width=1)
            mask = Image.new("L", (W,H), 0)
            ImageDraw.Draw(mask).polygon(pts, fill=255)
            img.paste(overlay, (0,0), mask)
            draw = ImageDraw.Draw(img, "RGBA")
    line = tr(hole["line"])
    draw.line(line, fill=p["ink"]+("88" if style=="Classic" else "bb"), width=3 if style!="Modern" else 5, joint="curve")
    # Tee marker and pin make each hole's playing direction immediately legible.
    tx,ty=line[0]; gx,gy=line[-1]
    draw.rounded_rectangle((tx-20,ty-10,tx+20,ty+10), radius=8, fill=p["tee"], outline=p["ink"], width=2)
    draw.line((gx,gy+16,gx,gy-25), fill=p["ink"], width=3)
    draw.polygon([(gx,gy-25),(gx+24,gy-17),(gx,gy-9)], fill="#c84f45", outline=p["ink"])
    display = course.replace("_", " ")
    draw.text((42,30), display.upper(), font=font(20,True), fill="#27382b")
    draw.text((42,66), f"HOLE {n}", font=font(30,True), fill="#27382b")
    sub = style.upper()
    if hole.get("par"): sub += f"  ·  PAR {hole['par']}"
    draw.text((W-42,72), sub, font=font(15,False), fill="#27382b", anchor="ra")
    draw.line((42,108,W-42,108), fill="#8d9a88", width=1)
    draw.text((42,H-44), "FAIRWAY STUDIO", font=font(13,True), fill="#69736a")
    draw.text((W-42,H-44), "MAP DATA © OPENSTREETMAP CONTRIBUTORS", font=font(11), fill="#69736a", anchor="ra")
    if style == "Modern": img = ImageEnhance.Color(img).enhance(1.15)
    if style == "Sketch": img = img.filter(ImageFilter.SMOOTH)
    output.parent.mkdir(parents=True, exist_ok=True)
    img.save(output, "JPEG", quality=94, optimize=True, dpi=(300,300))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for course, (lat, lon) in COURSES.items():
        print(f"Fetching {course}...", flush=True)
        osm = fetch_osm(course, lat, lon)
        holes = organize(parse_osm(osm, lat), lat)
        missing = sorted(set(range(1,19))-set(holes))
        if missing:
            raise RuntimeError(f"{course}: missing mapped holes {missing}")
        for n in range(1,19):
            for style in PALETTES:
                name = f"{course}_Hole{n:02d}_{style}_{DATE}.jpg"
                render(course, n, holes[n], style, OUT/name)
                total += 1
    print(f"Created {total} JPG files in {OUT}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
