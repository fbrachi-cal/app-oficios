"""
generate_logos.py
Generates all required web app logo/favicon assets from the new Click logo SVG.
Requires: Pillow (pip install Pillow)
Usage: python scripts/generate_logos.py
"""

import struct
import zlib
import math
import os

# ---------------------------------------------------------------------------
# Pure-Python PNG encoder (no dependency on Pillow for the drawing itself,
# but we use Pillow for ICO saving and anti-aliased drawing).
# ---------------------------------------------------------------------------

from PIL import Image, ImageDraw, ImageFont

PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "..", "public")
ASSETS_IMG_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "img")


# ---------------------------------------------------------------------------
# Brand colors
# ---------------------------------------------------------------------------
CORAL   = (244, 105,  90, 255)   # roof  #F4695A
YELLOW  = (245, 197,  24, 255)   # body  #F5C518
TEAL    = (  0, 188, 212, 255)   # door  #00BCD4
SILVER  = (180, 180, 180, 255)   # wordmark silver
WHITE   = (255, 255, 255, 255)
TRANSP  = (  0,   0,   0,   0)


def draw_icon(size: int) -> Image.Image:
    """
    Draw the house icon (without wordmark) at `size` x `size` pixels.
    This is used for favicon-16, favicon-32, apple-touch-icon, 192, 512 variants.
    """
    scale = size / 100.0  # design canvas is 100x100

    img = Image.new("RGBA", (size, size), TRANSP)
    draw = ImageDraw.Draw(img, "RGBA")

    # ------------------------------------------------------------------
    # Helper: scale a coordinate pair
    # ------------------------------------------------------------------
    def s(x, y):
        return (round(x * scale), round(y * scale))

    def sr(x, y, w, h, r):
        """Return bounding box tuple scaled."""
        return [
            round(x * scale), round(y * scale),
            round((x + w) * scale), round((y + h) * scale),
        ]

    # ------------------------------------------------------------------
    # Yellow body (square, rounded)
    # ------------------------------------------------------------------
    radius = max(2, round(6 * scale))
    body_box = sr(20, 46, 56, 54, radius)
    draw.rounded_rectangle(body_box, radius=radius, fill=YELLOW)

    # ------------------------------------------------------------------
    # Teal door/window (overlapping bottom-right of yellow)
    # ------------------------------------------------------------------
    door_box = sr(42, 62, 38, 38, radius)
    draw.rounded_rectangle(door_box, radius=radius, fill=TEAL)

    # ------------------------------------------------------------------
    # Coral roof — thick polyline (two lines: left slope + right slope)
    # Apex at (48, 14), left at (8, 57), right at (88, 57)
    # ------------------------------------------------------------------
    stroke = max(3, round(13 * scale))
    # Draw as a filled polygon with rounded look by drawing a wide line
    apex  = s(48, 14)
    left  = s(8,  57)
    right = s(88, 57)
    draw.line([left, apex, right], fill=CORAL, width=stroke, joint="curve")
    # Round the line caps
    cap_r = stroke // 2
    for pt in [left, apex, right]:
        draw.ellipse(
            [pt[0] - cap_r, pt[1] - cap_r, pt[0] + cap_r, pt[1] + cap_r],
            fill=CORAL
        )

    # ------------------------------------------------------------------
    # Chimney (yellow rectangle above the roof line)
    # ------------------------------------------------------------------
    chimney_box = sr(58, 14, 12, 22, max(2, round(4 * scale)))
    draw.rounded_rectangle(chimney_box, radius=max(2, round(4 * scale)), fill=YELLOW)

    return img


def draw_full_logo(width: int, height: int) -> Image.Image:
    """
    Draw the full logo (house icon + 'click' wordmark) at the given dimensions.
    Aspect ratio of the reference logo is roughly 320:120 ≈ 8:3.
    """
    img = Image.new("RGBA", (width, height), TRANSP)

    # -- Icon portion (left ~37% of width, full height) --
    icon_size = height
    icon = draw_icon(icon_size)
    img.paste(icon, (0, 0), icon)

    # -- Wordmark 'click' --
    draw = ImageDraw.Draw(img)

    # Try to use a system font; fall back to default
    font_size = round(height * 0.65)
    font = None
    font_paths = [
        "C:/Windows/Fonts/arialbd.ttf",  # bold
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibri.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                font = ImageFont.truetype(fp, font_size)
                break
            except Exception:
                pass

    text = "click"
    text_x = icon_size + round(width * 0.04)
    # Vertically center the text
    if font:
        bbox = draw.textbbox((0, 0), text, font=font)
        text_h = bbox[3] - bbox[1]
        text_y = (height - text_h) // 2 - bbox[1]
    else:
        text_y = round(height * 0.2)

    # Silver gradient simulation: draw text twice (lighter on top)
    draw.text((text_x, text_y), text, fill=(200, 200, 200, 255), font=font)

    return img


def save_png(img: Image.Image, path: str):
    img.save(path, "PNG", optimize=True)
    print(f"  [OK] {os.path.relpath(path)}")


def save_ico(sizes, path: str):
    """Create a multi-resolution .ico file from a list of (size, Image) tuples."""
    # Use Pillow's built-in ICO support — save the 32x32 with sizes embedded
    images = [img for _, img in sizes]
    images[0].save(
        path,
        format="ICO",
        sizes=[(s, s) for s, _ in sizes],
        append_images=images[1:],
    )
    print(f"  [OK] {os.path.relpath(path)}")


def main():
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    os.makedirs(ASSETS_IMG_DIR, exist_ok=True)

    print("Generating favicon/icon assets for the Click logo...")
    print()

    # ------------------------------------------------------------------
    # favicon-16x16.png
    # ------------------------------------------------------------------
    ico16 = draw_icon(16)
    save_png(ico16, os.path.join(PUBLIC_DIR, "favicon-16x16.png"))

    # ------------------------------------------------------------------
    # favicon-32x32.png
    # ------------------------------------------------------------------
    ico32 = draw_icon(32)
    save_png(ico32, os.path.join(PUBLIC_DIR, "favicon-32x32.png"))

    # ------------------------------------------------------------------
    # favicon.ico  (multi-res: 16, 32, 48)
    # ------------------------------------------------------------------
    ico48 = draw_icon(48)
    save_ico(
        [(16, ico16), (32, ico32), (48, ico48)],
        os.path.join(PUBLIC_DIR, "favicon.ico"),
    )

    # ------------------------------------------------------------------
    # apple-touch-icon.png  (180x180)
    # ------------------------------------------------------------------
    apple = draw_icon(180)
    # Apple touch icon should have a white background (no transparency)
    apple_bg = Image.new("RGBA", (180, 180), WHITE)
    apple_bg.paste(apple, (0, 0), apple)
    save_png(apple_bg.convert("RGB"), os.path.join(PUBLIC_DIR, "apple-touch-icon.png"))

    # ------------------------------------------------------------------
    # logo-192.png
    # ------------------------------------------------------------------
    logo192 = draw_icon(192)
    save_png(logo192, os.path.join(PUBLIC_DIR, "logo-192.png"))

    # ------------------------------------------------------------------
    # logo-512.png
    # ------------------------------------------------------------------
    logo512 = draw_icon(512)
    save_png(logo512, os.path.join(PUBLIC_DIR, "logo-512.png"))

    # ------------------------------------------------------------------
    # logo.png  (full logo with wordmark, 640x240)
    # ------------------------------------------------------------------
    logo_full = draw_full_logo(640, 240)
    logo_path = os.path.join(PUBLIC_DIR, "logo.png")
    save_png(logo_full, logo_path)

    # Also save to src/assets/img/logo.png (replacing logo_oficios.png)
    logo_src_path = os.path.join(ASSETS_IMG_DIR, "logo.png")
    save_png(logo_full, logo_src_path)

    print()
    print("All assets generated successfully.")
    print()
    print("Summary of generated files:")
    print("  public/favicon.ico")
    print("  public/favicon-16x16.png")
    print("  public/favicon-32x32.png")
    print("  public/apple-touch-icon.png")
    print("  public/logo-192.png")
    print("  public/logo-512.png")
    print("  public/logo.png")
    print("  public/logo.svg  (already created)")
    print("  src/assets/img/logo.png")


if __name__ == "__main__":
    main()
