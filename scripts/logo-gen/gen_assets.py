"""Generate OraOne brand/icon assets from the master logo PNG.

Input : frontend/public/assets/_logo_full_src.png (transparent horizontal lockup)
Output: brand-logo.png, oraone-mark.png, favicon-16/32.png, favicon.svg,
        apple-touch-icon.png, oraone-app-icon.png, og-image.png
"""
import os
import io
import base64
import numpy as np
from PIL import Image

ASSETS = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "assets")
ASSETS = os.path.abspath(ASSETS)
# Master source: the trimmed full horizontal lockup (transparent PNG).
SRC = os.path.join(ASSETS, "brand-logo.png")

src = Image.open(SRC).convert("RGBA")
W, H = src.size
arr = np.array(src)
alpha = arr[:, :, 3]


def trim(im):
    bb = im.getbbox()
    return im.crop(bb) if bb else im


# --- full horizontal logo (tightly trimmed) ---
full = trim(src)
full.save(os.path.join(ASSETS, "brand-logo.png"))

# --- crop the emblem (swirl + sparkle) ---
# The emblem is ~as wide as the logo is tall; its faint glow merges into the
# wordmark, so crop geometrically at 0.96x the content height, then trim.
col_has = (alpha > 90).any(axis=0)
xs = np.where(col_has)[0]
left = int(xs[0])
Hc = int(full.height)
emblem_right = left + round(0.92 * Hc)
print("left:", left, "Hc:", Hc, "emblem_right:", emblem_right)

# --- crop + square the emblem (the swirl mark) ---
emblem = trim(src.crop((left, 0, emblem_right, H)))
ew, eh = emblem.size
side = max(ew, eh)
sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
sq.paste(emblem, ((side - ew) // 2, (side - eh) // 2), emblem)
# On-page mark: 384px is ample for the largest display use (~128px @3x).
sq.resize((384, 384), Image.LANCZOS).save(
    os.path.join(ASSETS, "oraone-mark.png"), optimize=True
)
print("emblem_right:", emblem_right, "emblem:", emblem.size, "square:", side)


def icon(size, bg=None, pad=0.0):
    inner = round(size * (1 - 2 * pad))
    m = sq.resize((inner, inner), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), bg if bg else (0, 0, 0, 0))
    off = (size - inner) // 2
    out.paste(m, (off, off), m)
    return out


NAVY = (10, 27, 58, 255)
icon(16).save(os.path.join(ASSETS, "favicon-16.png"), optimize=True)
icon(32).save(os.path.join(ASSETS, "favicon-32.png"), optimize=True)
icon(180, NAVY, 0.14).save(os.path.join(ASSETS, "apple-touch-icon.png"), optimize=True)
icon(512, NAVY, 0.14).save(os.path.join(ASSETS, "oraone-app-icon.png"), optimize=True)

# --- favicon.svg embedding a 128px raster emblem ---
emb = icon(128)
buf = io.BytesIO()
emb.save(buf, "PNG")
b64 = base64.b64encode(buf.getvalue()).decode()
svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">'
    f'<image width="128" height="128" href="data:image/png;base64,{b64}"/></svg>'
)
with open(os.path.join(ASSETS, "favicon.svg"), "w", encoding="utf-8") as f:
    f.write(svg)

# --- og-image: soft light gradient + centered full logo ---
OGW, OGH = 1200, 630
top = np.array([248, 250, 255], float)
bot = np.array([228, 238, 255], float)
grad = np.zeros((OGH, OGW, 3), np.uint8)
for y in range(OGH):
    t = y / (OGH - 1)
    grad[y, :, :] = (top * (1 - t) + bot * t).astype(np.uint8)
og = Image.fromarray(grad, "RGB").convert("RGBA")
lw, lh = full.size
scale = min((OGW * 0.78) / lw, (OGH * 0.52) / lh)
lr = full.resize((round(lw * scale), round(lh * scale)), Image.LANCZOS)
og.alpha_composite(lr, ((OGW - lr.width) // 2, (OGH - lr.height) // 2))
og.convert("RGB").save(os.path.join(ASSETS, "og-image.png"), optimize=True)
print("done ->", ASSETS)
