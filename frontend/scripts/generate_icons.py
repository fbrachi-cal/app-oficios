import os
from PIL import Image

def generate_icons():
    # Resolve paths relative to this script's directory for portability
    script_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.dirname(script_dir)
    
    logo_path = os.path.join(frontend_dir, "src", "assets", "img", "logo.png")
    res_dir = os.path.join(frontend_dir, "android", "app", "src", "main", "res")

    if not os.path.exists(logo_path):
        print(f"Error: logo not found at {logo_path}")
        return

    # 1. Open original logo
    img = Image.open(logo_path)
    
    # 2. Crop house mark: bounding box is (2, 44, 339, 228)
    house = img.crop((2, 44, 339, 228))
    
    # 3. Create square version with transparent padding
    width, height = house.size
    square_size = max(width, height)
    square_house = Image.new("RGBA", (square_size, square_size), (0, 0, 0, 0))
    x_offset = (square_size - width) // 2
    y_offset = (square_size - height) // 2
    square_house.paste(house, (x_offset, y_offset))
    
    # Define sizes (density, legacy_size, adaptive_foreground_size)
    densities = [
        ("mipmap-mdpi", 48, 108),
        ("mipmap-hdpi", 72, 162),
        ("mipmap-xhdpi", 96, 216),
        ("mipmap-xxhdpi", 144, 324),
        ("mipmap-xxxhdpi", 192, 432)
    ]
    
    for density, legacy_size, adaptive_size in densities:
        density_dir = os.path.join(res_dir, density)
        os.makedirs(density_dir, exist_ok=True)
        
        # A. Generate legacy ic_launcher.png (with ~10% padding)
        legacy_inner_size = int(legacy_size * 0.85)
        legacy_inner = square_house.resize((legacy_inner_size, legacy_inner_size), Image.Resampling.LANCZOS)
        legacy_icon = Image.new("RGBA", (legacy_size, legacy_size), (0, 0, 0, 0))
        offset = (legacy_size - legacy_inner_size) // 2
        legacy_icon.paste(legacy_inner, (offset, offset))
        legacy_icon.save(os.path.join(density_dir, "ic_launcher.png"), "PNG")
        
        # B. Generate legacy ic_launcher_round.png
        legacy_icon.save(os.path.join(density_dir, "ic_launcher_round.png"), "PNG")
        
        # C. Generate adaptive ic_launcher_foreground.png (with 65% safe zone scaling)
        adaptive_inner_size = int(adaptive_size * 0.65)
        adaptive_inner = square_house.resize((adaptive_inner_size, adaptive_inner_size), Image.Resampling.LANCZOS)
        adaptive_icon = Image.new("RGBA", (adaptive_size, adaptive_size), (0, 0, 0, 0))
        offset = (adaptive_size - adaptive_inner_size) // 2
        adaptive_icon.paste(adaptive_inner, (offset, offset))
        adaptive_icon.save(os.path.join(density_dir, "ic_launcher_foreground.png"), "PNG")
        
        print(f"Generated icons for {density}")

if __name__ == "__main__":
    generate_icons()
