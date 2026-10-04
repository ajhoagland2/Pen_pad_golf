from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "assets" / "pen-pad-golf-cover-art-v4.png"
OUT_DIR = ROOT / "output" / "booklet"
PNG_OUT = OUT_DIR / "pen-pad-golf-booklet-cover-v4.png"
JPG_OUT = OUT_DIR / "pen-pad-golf-booklet-cover-v4.jpg"
PDF_OUT = OUT_DIR / "pen-pad-golf-booklet-cover-v4.pdf"

W, H = 1650, 2550
DARK = "#18372B"
GREEN = "#596F43"
CREAM = "#FFF8E8"


def display_font(size: int):
    candidates = [
        Path("C:/Windows/Fonts/impact.ttf"),
        Path("C:/Windows/Fonts/ariblk.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


def body_font(size: int, bold: bool = False):
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/calibrib.ttf" if bold else "C:/Windows/Fonts/calibri.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


def fit(draw, text, max_width, start_size, min_size=24, display=False):
    for size in range(start_size, min_size - 1, -2):
        candidate = display_font(size) if display else body_font(size, bold=True)
        if draw.textbbox((0, 0), text, font=candidate)[2] <= max_width:
            return candidate
    return display_font(min_size) if display else body_font(min_size, bold=True)


def build():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    art = Image.open(ART).convert("RGB")
    scale = max(W / art.width, H / art.height)
    art = art.resize((round(art.width * scale), round(art.height * scale)), Image.Resampling.LANCZOS)
    left = (art.width - W) // 2
    top = (art.height - H) // 2
    cover = art.crop((left, top, left + W, top + H))
    draw = ImageDraw.Draw(cover, "RGBA")

    # Bold stacked typography mirrors the instructions page.
    draw.text((W // 2, 66), "THE ORIGINAL", anchor="ma", font=display_font(82), fill=DARK)
    title = "PEN PAD GOLF"
    title_font = fit(draw, title, W - 250, 160, 100, display=True)
    draw.text((W // 2, 160), title, anchor="ma", font=title_font, fill=GREEN)

    subtitle = "Not just a notepad, A game that just needs a pen"
    subtitle_font = fit(draw, subtitle, W - 300, 38, 27)
    draw.text((W // 2, 351), subtitle, anchor="ma", font=subtitle_font, fill=DARK)

    # The generated art already contains the painted ribbon and accent marks.
    footer = "USE THE FEWEST STROKES TO WIN!"
    footer_font = fit(draw, footer, 900, 43, 30)
    draw.text((W // 2, 2372), footer, anchor="mm", font=footer_font, fill=CREAM)

    cover.save(PNG_OUT, quality=95, dpi=(300, 300))
    cover.save(JPG_OUT, "JPEG", quality=95, subsampling=0, dpi=(300, 300))
    cover.save(PDF_OUT, "PDF", resolution=300.0)
    print(PNG_OUT)
    print(JPG_OUT)
    print(PDF_OUT)


if __name__ == "__main__":
    build()
