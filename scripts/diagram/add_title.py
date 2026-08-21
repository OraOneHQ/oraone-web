# Composites a title bar onto architecture-diagram.png (rendered from
# architecture.mmd via mermaid-cli) and saves the result as the doc asset.
from PIL import Image, ImageDraw, ImageFont
import os

src = r"C:\Users\Admin\Desktop\OraOne\scripts\diagram\architecture-diagram.png"
dst = r"C:\Users\Admin\Desktop\OraOne\docs\assets\architecture-overview.png"
os.makedirs(os.path.dirname(dst), exist_ok=True)

diagram = Image.open(src).convert("RGB")
w, h = diagram.size

header_h = 170
canvas = Image.new("RGB", (w, h + header_h), "white")
canvas.paste(diagram, (0, header_h))

draw = ImageDraw.Draw(canvas)
try:
    title_font = ImageFont.truetype("arialbd.ttf", 46)
    sub_font = ImageFont.truetype("arial.ttf", 28)
except Exception:
    title_font = ImageFont.load_default()
    sub_font = ImageFont.load_default()

title = "OraOne \u2014 System Architecture, Chat Feature Flow & Deployment Pipeline"
sub = "Numbered edges (1-9) trace one live chat conversation end-to-end. Sections 6-7 show the CI/CD and production deployment path."

tb = draw.textbbox((0, 0), title, font=title_font)
draw.text(((w - (tb[2]-tb[0])) / 2, 45), title, fill="#0F172A", font=title_font)
sb = draw.textbbox((0, 0), sub, font=sub_font)
draw.text(((w - (sb[2]-sb[0])) / 2, 110), sub, fill="#64748B", font=sub_font)

canvas.save(dst)
print("saved", canvas.size)
