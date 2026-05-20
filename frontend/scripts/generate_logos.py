"""
generate_logos.py
Generates all required web app logo/favicon assets from the existing logo.png.
Requires: Pillow (pip install Pillow)
Usage: python scripts/generate_logos.py
"""

import os
from PIL import Image

PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "..", "public")
ASSETS_IMG_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "img")
LOGO_SRC = os.path.join(ASSETS_IMG_DIR, "logo.png")

WHITE = (255, 255, 255, 255)
TRANSP = (0, 0, 0, 0)

def make_square_icon(size: int, fill_bg=False) -> Image.Image:
    """
    Load the source logo, scale it to fit within size x size, and pad it.
    If fill_bg is True, pad with white, else transparent.
    """
    img = Image.open(LOGO_SRC).convert("RGBA")
    
    # Scale down preserving aspect ratio
    img.thumbnail((size, size), Image.Resampling.LANCZOS)
    
    # Create background
    bg_color = WHITE if fill_bg else TRANSP
    bg = Image.new("RGBA", (size, size), bg_color)
    
    # Paste centered
    offset = ((size - img.width) // 2, (size - img.height) // 2)
    # If fill_bg is True, we paste using the image itself as mask to handle transparency properly
    bg.paste(img, offset, img)
    return bg

def save_png(img: Image.Image, path: str):
    img.save(path, "PNG", optimize=True)
    print(f"  [OK] {os.path.relpath(path)}")

def save_ico(sizes, path: str):
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

    print(f"Generating assets from {LOGO_SRC}...")

    ico16 = make_square_icon(16)
    save_png(ico16, os.path.join(PUBLIC_DIR, "favicon-16x16.png"))

    ico32 = make_square_icon(32)
    save_png(ico32, os.path.join(PUBLIC_DIR, "favicon-32x32.png"))

    ico48 = make_square_icon(48)
    save_ico(
        [(16, ico16), (32, ico32), (48, ico48)],
        os.path.join(PUBLIC_DIR, "favicon.ico"),
    )

    apple = make_square_icon(180, fill_bg=True)
    save_png(apple.convert("RGB"), os.path.join(PUBLIC_DIR, "apple-touch-icon.png"))

    logo192 = make_square_icon(192)
    save_png(logo192, os.path.join(PUBLIC_DIR, "logo-192.png"))

    logo512 = make_square_icon(512)
    save_png(logo512, os.path.join(PUBLIC_DIR, "logo-512.png"))

    print("\nAll assets regenerated successfully using the original logo.")

if __name__ == "__main__":
    main()

