import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

def create_demo_datasets(base_dir: str):
    os.makedirs(base_dir, exist_ok=True)
    size = (640, 640)

    # -------------------------------------------------------------
    # 1. Preset 1: Coastal Port & Urban (Sentinel-2 Optical)
    # -------------------------------------------------------------
    port_img = Image.new("RGB", size, (50, 75, 45)) # Base green terrain
    draw = ImageDraw.Draw(port_img)

    # Winding river & estuary (dark blue-green water)
    river_points = [
        (0, 300), (120, 280), (220, 320), (320, 310), (450, 340), (520, 420), (640, 460),
        (640, 640), (420, 640), (300, 520), (180, 450), (80, 420), (0, 430)
    ]
    draw.polygon(river_points, fill=(18, 52, 75))

    # Port piers / docks extending into water
    draw.rectangle([340, 340, 380, 490], fill=(120, 125, 130)) # Concrete pier 1
    draw.rectangle([440, 380, 480, 530], fill=(120, 125, 130)) # Concrete pier 2
    draw.rectangle([250, 380, 310, 400], fill=(110, 115, 120)) # Small jetty

    # Cargo vessels in docks
    draw.polygon([(350, 400), (370, 400), (375, 470), (345, 470)], fill=(180, 40, 40)) # Red cargo ship
    draw.polygon([(450, 420), (470, 420), (475, 510), (445, 510)], fill=(30, 90, 160)) # Blue container vessel

    # Container yard (colorful small blocks)
    for row in range(5):
        for col in range(8):
            cx = 330 + col * 14
            cy = 220 + row * 12
            c_color = [(200, 50, 40), (40, 120, 200), (220, 180, 30), (40, 160, 60)][(row + col) % 4]
            draw.rectangle([cx, cy, cx + 11, cy + 9], fill=c_color)

    # Sports Stadium / Arena (oval track and pitch)
    stadium_box = [420, 60, 580, 190]
    draw.ellipse(stadium_box, fill=(190, 80, 50), outline=(230, 230, 230), width=4) # Running track
    draw.ellipse([450, 85, 550, 165], fill=(34, 139, 34)) # Green soccer pitch
    draw.rectangle([495, 85, 505, 165], outline=(255, 255, 255), width=2) # Half line

    # Urban grid & residential blocks
    for ux in range(40, 240, 45):
        for uy in range(40, 220, 40):
            draw.rectangle([ux, uy, ux + 35, uy + 30], fill=(145, 140, 135), outline=(90, 90, 90), width=1)
            # roofs
            draw.rectangle([ux + 4, uy + 4, ux + 31, uy + 26], fill=(175, 120, 100))

    # Highway artery
    draw.line([(0, 250), (640, 230)], fill=(70, 75, 80), width=10)
    draw.line([(0, 250), (640, 230)], fill=(240, 200, 50), width=1)

    port_path = os.path.join(base_dir, "sentinel2_coastal_port.png")
    port_img.filter(ImageFilter.GaussianBlur(radius=0.4)).save(port_path)

    # -------------------------------------------------------------
    # 2. Preset 2: Bi-Temporal Urban Growth Pair (T1: 2021 vs T2: 2024)
    # -------------------------------------------------------------
    # T1: Past (Agricultural & Natural)
    t1_img = Image.new("RGB", size, (70, 110, 55)) # Rich pasture
    draw_t1 = ImageDraw.Draw(t1_img)
    # Field divisions
    for fx in range(0, 640, 130):
        for fy in range(0, 640, 110):
            f_color = [(75, 120, 50), (95, 145, 60), (135, 140, 65), (80, 115, 55)][(fx//130 + fy//110) % 4]
            draw_t1.rectangle([fx, fy, fx + 125, fy + 105], fill=f_color, outline=(50, 70, 40), width=2)

    # Narrow rural road
    draw_t1.line([(0, 310), (640, 330)], fill=(120, 115, 105), width=5)

    t1_path = os.path.join(base_dir, "bitemporal_austin_2021_t1.png")
    t1_img.save(t1_path)

    # T2: Present (Urban Expansion & Commercial Warehouses)
    t2_img = t1_img.copy()
    draw_t2 = ImageDraw.Draw(t2_img)

    # Major asphalt multi-lane highway
    draw_t2.line([(0, 305), (640, 335)], fill=(55, 60, 65), width=16)
    draw_t2.line([(0, 305), (640, 335)], fill=(245, 210, 50), width=2)

    # Massive logistics center / urban expansion (center-right)
    draw_t2.rectangle([210, 120, 540, 280], fill=(160, 165, 170), outline=(80, 85, 90), width=3) # Paved lot
    draw_t2.rectangle([250, 140, 490, 240], fill=(225, 230, 235), outline=(110, 115, 120), width=2) # Mega warehouse roof
    # Skylights on warehouse
    for sl in range(270, 470, 35):
        draw_t2.rectangle([sl, 160, sl + 18, 220], fill=(130, 160, 190))

    # Secondary commercial development lower-left
    draw_t2.rectangle([80, 370, 320, 530], fill=(175, 175, 175), outline=(70, 70, 70), width=2)
    for bx in range(100, 300, 65):
        draw_t2.rectangle([bx, 390, bx + 45, 490], fill=(195, 130, 100), outline=(90, 90, 90), width=2)

    t2_path = os.path.join(base_dir, "bitemporal_austin_2024_t2.png")
    t2_img.save(t2_path)

    # -------------------------------------------------------------
    # 3. Preset 3: Kerala Flood Inundation (Optical + SAR Pair)
    # -------------------------------------------------------------
    # Optical: Sentinel-2 with heavy cloud cover & haze
    opt_flood = Image.new("RGB", size, (65, 95, 60))
    draw_opt = ImageDraw.Draw(opt_flood)
    # Visible river corridor
    draw_opt.line([(100, 0), (220, 200), (310, 400), (450, 640)], fill=(30, 60, 80), width=28)
    # Cloud layer (semi-opaque white blobs)
    cloud_layer = Image.new("RGBA", size, (0, 0, 0, 0))
    c_draw = ImageDraw.Draw(cloud_layer)
    c_draw.ellipse([80, 60, 420, 320], fill=(250, 250, 255, 195))
    c_draw.ellipse([260, 180, 590, 480], fill=(245, 245, 255, 215))
    c_draw.ellipse([140, 360, 460, 610], fill=(240, 240, 250, 180))
    cloud_layer = cloud_layer.filter(ImageFilter.GaussianBlur(radius=18))
    opt_flood = Image.alpha_composite(opt_flood.convert("RGBA"), cloud_layer).convert("RGB")
    opt_path = os.path.join(base_dir, "kerala_flood_optical_s2.png")
    opt_flood.save(opt_path)

    # SAR: Sentinel-1 C-Band (Microwave penetrates clouds, water is black specular, urban is bright double bounce)
    sar_arr = np.random.normal(loc=110, scale=20, size=(size[1], size[0])).astype(np.float32)
    # Vast flooded lowlands (very low backscatter < 45)
    yy, xx = np.ogrid[:size[1], :size[0]]
    flood_basin = ((xx - 280) * 0.7)**2 + ((yy - 330) * 0.9)**2 < 170**2
    sar_arr[flood_basin] = np.random.normal(loc=28, scale=6, size=np.sum(flood_basin))
    # River channel
    for y in range(size[1]):
        rx = int(100 + y * 0.55 + 20 * np.sin(y / 40.0))
        sar_arr[y, max(0, rx-20):min(size[0], rx+20)] = np.random.normal(loc=22, scale=4, size=min(size[0], rx+20)-max(0, rx-20))
    # Bright corner reflectors (surviving bridges, pylons, urban blocks)
    for bx in range(430, 580, 25):
        for by in range(90, 230, 25):
            sar_arr[by:by+12, bx:bx+12] = np.random.normal(loc=240, scale=10, size=(12, 12))
    # Bridge across flood
    sar_arr[310:322, 120:460] = np.random.normal(loc=245, scale=8, size=(12, 340))
    sar_img = Image.fromarray(np.clip(sar_arr, 0, 255).astype(np.uint8), mode="L").convert("RGB")
    sar_path = os.path.join(base_dir, "kerala_flood_sar_s1.png")
    sar_img.save(sar_path)

    # -------------------------------------------------------------
    # 4. Preset 4: BigEarthNet Agricultural Plots (Multispectral Optical)
    # -------------------------------------------------------------
    agri_img = Image.new("RGB", size, (140, 130, 90)) # Arable soil base
    draw_agri = ImageDraw.Draw(agri_img)
    # Circular center-pivot irrigation circles
    draw_agri.ellipse([60, 60, 280, 280], fill=(45, 140, 55)) # Lush circular pivot
    draw_agri.ellipse([340, 80, 560, 300], fill=(160, 150, 70)) # Harvested pivot
    draw_agri.ellipse([180, 340, 440, 600], fill=(60, 165, 75)) # Deep green alfalfa pivot
    # Irrigation canal network
    draw_agri.line([(0, 320), (640, 320)], fill=(20, 80, 120), width=6)
    draw_agri.line([(310, 0), (310, 640)], fill=(20, 80, 120), width=6)
    # Hedgerows & windbreaks
    draw_agri.line([(60, 320), (60, 640)], fill=(30, 80, 30), width=8)
    draw_agri.line([(560, 0), (560, 640)], fill=(30, 80, 30), width=8)

    agri_path = os.path.join(base_dir, "bigearthnet_agricultural_plots.png")
    agri_img.filter(ImageFilter.GaussianBlur(radius=0.5)).save(agri_path)

    print(f"Successfully generated demo datasets in: {base_dir}")

if __name__ == "__main__":
    import sys
    target = sys.argv[1] if len(sys.argv) > 1 else "./backend/demo_data"
    create_demo_datasets(target)
