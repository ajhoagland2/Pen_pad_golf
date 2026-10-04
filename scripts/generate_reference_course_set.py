from __future__ import annotations

import math
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

W, H = 720, 1080
DATE = "2026-09-06"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "reference_designed_courses"

COURSES = [
    ("Pine_Crescent", 4, 382, [(360,930),(330,760),(300,570),(320,390),(410,205)], "left", 3, 22),
    ("Blue_Heron_Bend", 4, 405, [(350,930),(425,770),(470,585),(455,390),(365,210)], "right", 3, 18),
    ("Granite_Ridge", 5, 515, [(350,930),(300,790),(345,650),(420,520),(390,360),(330,205)], "none", 5, 28),
    ("Willow_Cove", 3, 168, [(350,900),(380,690),(410,470),(375,225)], "left", 4, 16),
    ("Maple_Run", 4, 365, [(360,930),(310,780),(280,620),(330,455),(405,210)], "right", 2, 30),
    ("Foxglove_Links", 5, 528, [(360,935),(430,810),(455,660),(390,535),(315,390),(350,205)], "both", 4, 12),
    ("Silver_Brook", 4, 398, [(360,930),(400,790),(375,645),(315,500),(300,350),(370,205)], "left", 4, 24),
    ("Copper_Dune", 3, 176, [(350,920),(330,700),(355,480),(410,220)], "none", 6, 10),
    ("Hemlock_Gate", 4, 412, [(350,935),(295,785),(310,630),(390,500),(455,350),(395,205)], "right", 3, 34),
    ("Juniper_Hollow", 4, 344, [(360,930),(420,790),(430,620),(365,470),(300,325),(335,205)], "both", 2, 26),
    ("Otter_Pond", 5, 542, [(350,935),(300,805),(285,650),(345,510),(430,380),(405,205)], "left", 5, 20),
    ("Birch_Lantern", 3, 191, [(360,920),(410,700),(385,485),(335,220)], "right", 5, 14),
    ("Sundown_Meadow", 4, 374, [(350,930),(315,785),(340,630),(415,490),(440,340),(385,205)], "none", 4, 32),
    ("Quarry_Crossing", 4, 421, [(355,935),(425,800),(450,650),(405,520),(330,390),(300,205)], "both", 5, 16),
    ("Cattail_Point", 5, 553, [(350,935),(305,810),(320,670),(390,550),(455,420),(420,300),(345,205)], "right", 4, 25),
    ("Rolling_Oak", 4, 389, [(360,930),(410,790),(385,635),(320,500),(300,350),(365,205)], "left", 3, 36),
    ("Eagle_Fen", 3, 184, [(350,920),(305,705),(330,485),(390,220)], "both", 6, 18),
    ("Lantern_Falls", 5, 536, [(355,935),(420,815),(435,675),(385,555),(310,440),(300,310),(370,205)], "left", 5, 30),
]


def font(size, bold=False):
    path = Path("C:/Windows/Fonts/georgiab.ttf" if bold else "C:/Windows/Fonts/georgia.ttf")
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def smooth(points, samples=12, closed=True):
    pts = points + ([points[0]] if closed else [])
    out = []
    for i in range(len(pts)-1):
        a, b = pts[i], pts[i+1]
        for j in range(samples):
            t = j/samples
            s = t*t*(3-2*t)
            out.append((a[0]*(1-s)+b[0]*s, a[1]*(1-s)+b[1]*s))
    return out


def fairway_polygon(center, widths):
    left, right = [], []
    for i, p in enumerate(center):
        a = center[max(0,i-1)]; b = center[min(len(center)-1,i+1)]
        dx,dy=b[0]-a[0],b[1]-a[1]; length=max(1,math.hypot(dx,dy))
        nx,ny=-dy/length,dx/length; width=widths[i]
        left.append((p[0]+nx*width,p[1]+ny*width)); right.append((p[0]-nx*width,p[1]-ny*width))
    return smooth(left+right[::-1], 8)


def ellipse(cx,cy,rx,ry,angle=0,n=42):
    c,s=math.cos(angle),math.sin(angle)
    return [(cx+math.cos(t)*rx*c-math.sin(t)*ry*s,cy+math.cos(t)*rx*s+math.sin(t)*ry*c) for t in [2*math.pi*i/n for i in range(n)]]


def blob(cx,cy,rx,ry,angle,seed,n=28):
    rng=random.Random(seed); pts=[]; c,s=math.cos(angle),math.sin(angle)
    for i in range(n):
        t=2*math.pi*i/n; wobble=.86+rng.random()*.25
        x=math.cos(t)*rx*wobble; y=math.sin(t)*ry*wobble
        pts.append((cx+x*c-y*s,cy+x*s+y*c))
    return smooth(pts,3)


def layout(idx, config):
    name,par,yards,center,water_side,bunkers,trees=config
    rng=random.Random(4500+idx)
    widths=[58,90,105,112,94,70,55][:len(center)]
    if len(widths)<len(center): widths += [65]*(len(center)-len(widths))
    fair=fairway_polygon(center,widths)
    green=ellipse(center[-1][0],center[-1][1],72 if par!=3 else 78,52,(-.25+idx*.11)%1-.5)
    tee=ellipse(center[0][0],center[0][1],45,24,0)
    hazards=[]
    for j in range(bunkers):
        k=1+(j%(len(center)-1)); p=center[k]
        side=-1 if (j+idx)%2 else 1
        off=widths[k]+22+rng.randint(-8,25)
        a=center[max(0,k-1)]; b=center[min(len(center)-1,k+1)]
        dx,dy=b[0]-a[0],b[1]-a[1]; L=max(1,math.hypot(dx,dy)); nx,ny=-dy/L,dx/L
        hazards.append(blob(p[0]+nx*off*side,p[1]+ny*off*side,22+rng.randint(0,15),48+rng.randint(0,20),math.atan2(dy,dx),idx*20+j))
    water=[]
    if water_side!="none":
        sides=[-1,1] if water_side=="both" else ([-1] if water_side=="left" else [1])
        for side in sides:
            mid=center[len(center)//2]; a=center[1]; b=center[-2]
            dx,dy=b[0]-a[0],b[1]-a[1]; L=max(1,math.hypot(dx,dy)); nx,ny=-dy/L,dx/L
            wc=(mid[0]+nx*side*155,mid[1]+ny*side*155)
            water.append(blob(wc[0],wc[1],75 if len(sides)==1 else 48,185 if par!=3 else 120,math.atan2(dy,dx),900+idx+side))
    tree_pts=[]
    outline=fair[::max(1,len(fair)//trees)]
    for j,p in enumerate(outline[:trees]):
        if rng.random()>.2: tree_pts.append((p[0]+rng.randint(-14,14),p[1]+rng.randint(-14,14),rng.randint(18,25)))
    return {"name":name,"par":par,"yards":yards,"fairway":fair,"green":green,"tee":tee,"bunkers":hazards,"water":water,"trees":tree_pts,"center":center}


def paper(img, seed):
    rng=random.Random(seed); px=img.load()
    for _ in range(11000):
        x,y=rng.randrange(W),rng.randrange(H); r,g,b=px[x,y]; d=rng.choice((-4,-2,2,3))
        px[x,y]=(max(0,min(255,r+d)),max(0,min(255,g+d)),max(0,min(255,b+d)))


def polygon_layers(draw, pts, fill, outline, style, seed, width=3):
    if style=="Classic":
        rng=random.Random(seed)
        for k in range(5):
            jitter=[(x+rng.uniform(-3,3),y+rng.uniform(-3,3)) for x,y in pts]
            draw.polygon(jitter,fill=fill+("28" if k else "68"))
        draw.line(pts+[pts[0]],fill=outline+"88",width=width,joint="curve")
    elif style=="Modern":
        draw.polygon(pts,fill=fill,outline=outline)
        draw.line(pts+[pts[0]],fill=outline,width=width,joint="curve")
    else:
        draw.polygon(pts,fill="#ffffffd9",outline=outline)
        draw.line(pts+[pts[0]],fill=outline+"bb",width=max(2,width-1),joint="curve")


def clipped_hatch(img, pts, spacing=16):
    overlay=img.copy(); d=ImageDraw.Draw(overlay); xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    for x in range(int(min(xs))-1000,int(max(xs))+1000,spacing): d.line((x,min(ys),x+int(max(ys)-min(ys)),max(ys)),fill="#a3a39e",width=1)
    mask=Image.new("L",(W,H),0); ImageDraw.Draw(mask).polygon(pts,fill=105); img.paste(overlay,(0,0),mask)


def tree(draw,x,y,r,style,seed):
    rng=random.Random(seed)
    if style=="Modern":
        for k in range(7):
            a=2*math.pi*k/7; cx=x+math.cos(a)*r*.55; cy=y+math.sin(a)*r*.5
            draw.ellipse((cx-r*.55,cy-r*.55,cx+r*.55,cy+r*.55),fill="#2f9848",outline="#123f31",width=3)
        draw.ellipse((x-r*.35,y-r*.45,x+r*.35,y+r*.25),fill="#73cf3f")
    elif style=="Classic":
        for k in range(10):
            cx=x+rng.uniform(-r*.55,r*.55);cy=y+rng.uniform(-r*.5,r*.5);rr=rng.uniform(r*.38,r*.65)
            draw.ellipse((cx-rr,cy-rr,cx+rr,cy+rr),fill="#315d3550")
        draw.ellipse((x-r,y-r*.9,x+r,y+r*.9),outline="#4d664d66",width=1)
    else:
        for k in range(9):
            a=2*math.pi*k/9;cx=x+math.cos(a)*r*.55;cy=y+math.sin(a)*r*.5
            draw.ellipse((cx-r*.48,cy-r*.48,cx+r*.48,cy+r*.48),outline="#71716d99",width=1)


def render(design, number, style):
    palettes={
      "Classic":("#f5f1e6","#8fac78","#b9d59b","#d9bf8d","#62909a","#6f8f50","#496245"),
      "Modern":("#f4f6ef","#65c83f","#a3df5f","#ffc94e","#36b6d7","#54ae34","#103f31"),
      "Sketch":("#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ddddda","#62625f")}
    bg,fair,green,sand,water,tee,ink=palettes[style]
    img=Image.new("RGB",(W,H),bg)
    if style!="Modern":paper(img,number*77+len(style))
    d=ImageDraw.Draw(img,"RGBA")
    d.text((42,38),f"COURSE {number:02d}  ·  PAR {design['par']}",font=font(22,True),fill="#27382b")
    d.text((W-42,43),f"{design['yards']} YARDS",font=font(16),fill="#27382b",anchor="ra")
    d.line((0,96,W,96),fill="#b9bcb4",width=1)
    for j,p in enumerate(design["water"]): polygon_layers(d,p,water,ink,style,number*50+j,4)
    polygon_layers(d,design["fairway"],fair,ink,style,number*90,7 if style=="Modern" else 5)
    if style=="Modern":
        mask=Image.new("L",(W,H),0);ImageDraw.Draw(mask).polygon(design["fairway"],fill=255)
        stripes=img.copy();sd=ImageDraw.Draw(stripes)
        for x in range(0,W,44):sd.rectangle((x,100,x+22,H),fill="#55ba38")
        img.paste(stripes,(0,0),mask);d=ImageDraw.Draw(img,"RGBA")
    elif style=="Sketch": clipped_hatch(img,design["fairway"],22);d=ImageDraw.Draw(img,"RGBA")
    for j,p in enumerate(design["bunkers"]):
        polygon_layers(d,p,sand,ink,style,number*120+j,4 if style=="Modern" else 2)
        if style=="Sketch":clipped_hatch(img,p,12);d=ImageDraw.Draw(img,"RGBA")
    polygon_layers(d,design["green"],green,ink,style,number*160,5 if style=="Modern" else 2)
    polygon_layers(d,design["tee"],tee,ink,style,number*180,4 if style=="Modern" else 2)
    for j,(x,y,r) in enumerate(design["trees"]): tree(d,x,y,r,style,number*100+j)
    gx,gy=design["center"][-1]
    d.ellipse((gx-9,gy+13,gx+9,gy+20),fill="#263a2b44")
    d.line((gx,gy+17,gx,gy-35),fill=ink,width=3)
    d.polygon([(gx,gy-35),(gx+31,gy-24),(gx,gy-13)],fill="#d65349",outline=ink)
    tx,ty=design["center"][0];d.ellipse((tx-5,ty-5,tx+5,ty+5),fill="#fff",outline=ink)
    d.text((42,H-35),design["name"].replace("_"," ").upper(),font=font(13,True),fill="#69736a")
    d.text((W-42,H-35),f"FAIRWAY STUDIO · {style.upper()}",font=font(12),fill="#69736a",anchor="ra")
    if style=="Classic":img=img.filter(ImageFilter.GaussianBlur(.35))
    if style=="Modern":img=ImageEnhance.Color(img).enhance(1.08)
    path=OUT/f"{design['name']}_Hole{number:02d}_{style}_{DATE}.jpg"
    path.parent.mkdir(parents=True,exist_ok=True);img.save(path,"JPEG",quality=95,optimize=True,dpi=(300,300))


def main():
    for i,cfg in enumerate(COURSES,1):
        design=layout(i,cfg)
        for style in ("Classic","Modern","Sketch"):render(design,i,style)
    print(f"Created {len(COURSES)*3} JPG files in {OUT}")

if __name__=="__main__":main()
