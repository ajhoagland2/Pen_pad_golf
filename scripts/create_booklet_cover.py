from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
HERO = ROOT / "assets" / "pen-pad-golf-cover-hero.png"
OUT_DIR = ROOT / "output" / "booklet"
PNG_OUT = OUT_DIR / "pen-pad-golf-booklet-cover.png"
PDF_OUT = OUT_DIR / "pen-pad-golf-booklet-cover.pdf"

W, H = 1650, 2550
CREAM = "#F5EEDC"
DEEP_GREEN = "#183B2A"
MID_GREEN = "#46633D"
GOLD = "#B78B38"
RUST = "#A84B2F"
INK = "#15291F"


def font(size: int, bold: bool = False, serif: bool = False):
    windir = Path("C:/Windows/Fonts")
    candidates = (
        ["georgiab.ttf", "timesbd.ttf"] if serif and bold else
        ["georgia.ttf", "times.ttf"] if serif else
        ["arialbd.ttf", "calibrib.ttf"] if bold else
        ["arial.ttf", "calibri.ttf"]
    )
    for name in candidates:
        path = windir / name
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def rounded_panel(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def fit_text(draw, text, max_width, starting_size, min_size=30, bold=False, serif=False):
    for size in range(starting_size, min_size - 1, -2):
        f = font(size, bold=bold, serif=serif)
        if draw.textbbox((0, 0), text, font=f)[2] <= max_width:
            return f
    return font(min_size, bold=bold, serif=serif)


def build():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    hero = Image.open(HERO).convert("RGB")

    canvas = Image.new("RGB", (W, H), CREAM)
    # Fill the cover while preserving the generated art's portrait framing.
    scale = max(W / hero.width, H / hero.height)
    hero = hero.resize((round(hero.width * scale), round(hero.height * scale)), Image.Resampling.LANCZOS)
    left = (hero.width - W) // 2
    top = (hero.height - H) // 2
    hero = hero.crop((left, top, left + W, top + H))
    canvas.paste(hero)

    draw = ImageDraw.Draw(canvas, "RGBA")

    # Title plaque.
    rounded_panel(draw, (105, 90, W - 105, 555), 34, (247, 241, 224, 242), (183, 139, 56, 255), 6)
    draw.text((W // 2, 142), "the Original", anchor="ma", font=font(46, bold=True), fill=GOLD, stroke_width=0)
    title = "Pen Pad Gold"
    title_font = fit_text(draw, title, W - 300, 140, 90, bold=True, serif=True)
    draw.text((W // 2, 204), title, anchor="ma", font=title_font, fill=DEEP_GREEN, stroke_width=1, stroke_fill=DEEP_GREEN)
    draw.line((310, 386, W - 310, 386), fill=GOLD, width=4)
    tagline = "THE TABLETOP GOLF GAME YOU PLAY WITH A PEN"
    tagline_font = fit_text(draw, tagline, W - 330, 35, 26, bold=True)
    draw.text((W // 2, 425), tagline, anchor="ma", font=tagline_font, fill=INK)

    # Small mechanic callout directly on the hero.
    rounded_panel(draw, (420, 1125, W - 150, 1257), 65, (24, 59, 42, 235))
    draw.text((W - 650, 1191), "FLICK  •  LAND  •  SCORE", anchor="mm", font=font(35, bold=True), fill="#FFF8E8")

    # Marketing rollout panel.
    panel_top = 1335
    rounded_panel(draw, (85, panel_top, W - 85, H - 85), 42, (247, 241, 224, 247), (24, 59, 42, 255), 7)
    draw.text((145, panel_top + 64), "MARKETING OBJECTIVE", font=font(31, bold=True), fill=GOLD)
    draw.text((145, panel_top + 116), "Demonstrate the game first.", font=font(60, bold=True, serif=True), fill=DEEP_GREEN)
    draw.text((145, panel_top + 205), "Build demand in channels where a quick flick becomes an instant sale.", font=font(29), fill=INK)

    channels = [
        "Golf tournaments and charity outings",
        "Independent golf-course pro shops",
        "Corporate gift and promotional-product buyers",
        "Office gift shops and museum-style novelty stores",
        "Etsy and a simple direct website",
        "Amazon after consistent sales",
        "Larger distributors only after proven reorder activity",
    ]

    y = panel_top + 300
    for idx, channel in enumerate(channels, 1):
        cy = y + 43
        draw.ellipse((145, y, 231, y + 86), fill=MID_GREEN if idx < 6 else DEEP_GREEN)
        draw.text((188, cy), str(idx), anchor="mm", font=font(34, bold=True), fill="#FFF8E8")
        item_font = fit_text(draw, channel, W - 425, 34, 27, bold=(idx == 1))
        draw.text((270, cy), channel, anchor="lm", font=item_font, fill=INK)
        if idx < len(channels):
            draw.line((270, y + 101, W - 150, y + 101), fill=(70, 99, 61, 65), width=2)
        y += 101

    # Bottom brand rule.
    draw.line((145, H - 150, W - 145, H - 150), fill=GOLD, width=4)
    draw.text((W // 2, H - 130), "A SMALL GAME WITH A BIG FIRST IMPRESSION", anchor="ma", font=font(24, bold=True), fill=RUST)

    canvas.save(PNG_OUT, quality=95, dpi=(300, 300))
    canvas.save(PDF_OUT, "PDF", resolution=300.0)
    print(PNG_OUT)
    print(PDF_OUT)


if __name__ == "__main__":
    build()
