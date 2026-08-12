#!/usr/bin/env python3
"""
generate_gif.py

Fetches real public GitHub contribution data for @tusharcancodehere and
generates an animated, retro space-shooter combat GIF (assets/starship-activity.gif).

Dimensions: 900 x 260 px
FPS: 14 (30 frames, 70ms per frame loop)
Style: Renaissance manuscript x retro arcade shooter x hacker terminal
Zero external image dependencies, pure Python PIL vector/shape renderer.
"""

import math
import os
import json
import urllib.request
from PIL import Image, ImageDraw, ImageFont

USERNAME = "tusharcancodehere"
CONTRIB_API = f"https://github-contributions-api.jogruber.de/v4/{USERNAME}"
ASSETS_DIR = os.path.join(os.path.dirname(__file__), "..", "assets")
GIF_PATH = os.path.join(ASSETS_DIR, "starship-activity.gif")

# Palette definitions
COLOR_BG          = (5, 5, 4)        # #050504
COLOR_CARD        = (23, 19, 15)     # #17130F
COLOR_BORDER      = (107, 84, 51)    # #6B5433
COLOR_GOLD        = (214, 168, 74)   # #D6A84A
COLOR_BRIGHT_GOLD = (240, 200, 90)   # #F0C85A
COLOR_PARCHMENT   = (232, 224, 208)  # #E8E0D0
COLOR_TEAL        = (22, 139, 120)   # #168B78
COLOR_GREEN       = (94, 143, 69)    # #5E8F45
COLOR_MAGENTA     = (155, 23, 72)    # #9B1748
COLOR_DIM         = (111, 101, 87)   # #6F6557
COLOR_CELL_EMPTY  = (27, 22, 18)     # #1B1612

def fetch_contributions():
    try:
        req = urllib.request.Request(
            CONTRIB_API,
            headers={"User-Agent": "renaissance-gif-generator/1.0"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data
    except Exception as e:
        print(f"Warning: Failed to fetch live contributions: {e}")
        return None

def build_52_weeks_dataset(data):
    total = 223
    raw_list = []

    if data:
        if isinstance(data.get("contributions"), list):
            raw_list = data["contributions"]
        if data.get("total"):
            if isinstance(data["total"], int):
                total = data["total"]
            elif isinstance(data["total"], dict):
                total = sum(data["total"].values())

    # Build 364 daily grid cells (52 weeks x 7 days)
    cells = []
    for week in range(52):
        for day in range(7):
            idx = week * 7 + day
            count = 0
            if raw_list and idx < len(raw_list):
                count = raw_list[idx].get("count", 0)
            cells.append({"week": week, "day": day, "count": count})
    return cells, total

function_main = True

def main():
    print(f"Fetching contribution data for @{USERNAME}...")
    contrib_data = fetch_contributions()
    cells, total_contribs = build_52_weeks_dataset(contrib_data)
    print(f"Total contributions: {total_contribs}. Generating 30 frames for GIF...")

    os.makedirs(ASSETS_DIR, exist_ok=True)

    # Pre-generate stars for background
    stars = []
    for i in range(50):
        sx = (i * 23 + 17) % 880 + 10
        sy = (i * 37 + 11) % 240 + 10
        speed = (i % 3) + 1
        brightness = (i * 50 + 100) % 155 + 100
        stars.append({"x": sx, "y": sy, "speed": speed, "b": brightness})

    frames = []
    NUM_FRAMES = 30
    W, H = 900, 260

    try:
        font_main  = ImageFont.truetype("arial.ttf", 12)
        font_bold  = ImageFont.truetype("arialbd.ttf", 13)
        font_small = ImageFont.truetype("arial.ttf", 10)
    except IOError:
        font_main = font_bold = font_small = ImageFont.load_default()

    for frame_idx in range(NUM_FRAMES):
        t_ratio = frame_idx / float(NUM_FRAMES)
        angle_rad = t_ratio * 2.0 * math.pi

        img = Image.new("RGB", (W, H), COLOR_BG)
        draw = ImageDraw.Draw(img)

        # Card inner surface & border
        draw.rounded_rectangle([2, 2, W - 3, H - 3], radius=14, fill=COLOR_CARD, outline=COLOR_BORDER, width=1)
        draw.line([30, 2, W - 30, 2], fill=COLOR_GOLD, width=1)

        # Drifting starfield
        for st in stars:
            sy = (st["y"] + frame_idx * st["speed"]) % (H - 20) + 10
            c_val = st["b"]
            draw.ellipse([st["x"] - 1, sy - 1, st["x"] + 1, sy + 1], fill=(c_val, c_val, c_val // 2))

        # Header HUD
        draw.text((30, 14), "CONTRIBUTION COMBAT SIGNAL", fill=COLOR_GOLD, font=font_bold)
        draw.text((30, 32), "Starship Combat Log // Real GitHub Telemetry", fill=COLOR_PARCHMENT, font=font_small)
        draw.text((W - 30, 14), f"COMBAT POWER: {total_contribs} CONTRIBUTIONS", fill=COLOR_BRIGHT_GOLD, font=font_bold, anchor="ra")
        draw.line([30, 48, W - 30, 48], fill=COLOR_BORDER, width=1)

        # Grid offsets for 52-week Alien Fleet
        startX = 46
        startY = 60
        cellW = 15.4
        cellH = 12.5

        # Render 364 alien fleet cells
        for cell in cells:
            w_idx = cell["week"]
            d_idx = cell["day"]
            cnt   = cell["count"]

            wave_y = math.sin(angle_rad + w_idx * 0.12) * 1.5
            cx = startX + w_idx * cellW + 6
            cy = startY + d_idx * cellH + 5 + wave_y

            if cnt == 0:
                if (w_idx * 7 + d_idx) % 6 == 0:
                    draw.ellipse([cx - 1, cy - 1, cx + 1, cy + 1], fill=COLOR_DIM)
                else:
                    draw.rectangle([cx - 3, cy - 3, cx + 3, cy + 3], fill=COLOR_CELL_EMPTY)
            elif cnt in (1, 2):
                # Scout Alien
                pts = [(cx - 4, cy - 2), (cx, cy - 4), (cx + 4, cy - 2), (cx + 5, cy + 2), (cx, cy + 4), (cx - 5, cy + 2)]
                draw.polygon(pts, fill=(79, 65, 47), outline=(111, 85, 45))
            elif cnt in (3, 4, 5):
                # Cruiser Alien
                pts = [(cx - 5, cy - 3), (cx, cy - 5), (cx + 5, cy - 3), (cx + 6, cy + 3), (cx, cy + 5), (cx - 6, cy + 3)]
                draw.polygon(pts, fill=(111, 85, 45), outline=COLOR_GOLD)
                draw.ellipse([cx - 1.5, cy - 1.5, cx + 1.5, cy + 1.5], fill=COLOR_BRIGHT_GOLD)
            elif cnt in (6, 7, 8):
                # Heavy Alien
                pts = [(cx - 6, cy - 4), (cx, cy - 6), (cx + 6, cy - 4), (cx + 6, cy + 4), (cx, cy + 6), (cx - 6, cy + 4)]
                draw.polygon(pts, fill=COLOR_GOLD, outline=COLOR_BRIGHT_GOLD)
                draw.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=COLOR_GREEN)
            else:
                # Destroyed Alien (Green & Gold Explosion Burst)
                burst_r = 4 + (frame_idx % 4)
                draw.ellipse([cx - burst_r, cy - burst_r, cx + burst_r, cy + burst_r], fill=COLOR_GREEN, outline=COLOR_BRIGHT_GOLD)
                draw.line([cx - burst_r, cy, cx + burst_r, cy], fill=COLOR_PARCHMENT, width=1)
                draw.line([cx, cy - burst_r, cx, cy + burst_r], fill=COLOR_PARCHMENT, width=1)

        # Player Starship position sweeping gently left/right
        ship_x = 450 + math.sin(angle_rad) * 45
        ship_y = 205

        # Cannon Laser Shots traveling upward
        laser1_y = (205 - (frame_idx * 14) % 150)
        laser2_y = (205 - ((frame_idx + 15) * 14) % 150)

        for ly in (laser1_y, laser2_y):
            if ly > 55:
                draw.line([ship_x - 6, ly, ship_x - 6, ly + 14], fill=COLOR_BRIGHT_GOLD, width=2)
                draw.line([ship_x + 6, ly, ship_x + 6, ly + 14], fill=COLOR_BRIGHT_GOLD, width=2)
                # Impact aura if reaching top alien rows
                if ly < 90:
                    draw.ellipse([ship_x - 12, ly - 6, ship_x + 12, ly + 6], fill=None, outline=COLOR_GREEN, width=1)
                    draw.ellipse([ship_x - 4, ly - 4, ship_x + 4, ly + 4], fill=COLOR_BRIGHT_GOLD)

        # Render Player Starship
        # Engine Flame Pulse
        flame_len = 8 + (frame_idx % 3) * 3
        draw.polygon([(ship_x - 5, ship_y + 8), (ship_x, ship_y + 8 + flame_len), (ship_x + 5, ship_y + 8)], fill=COLOR_GREEN)
        draw.polygon([(ship_x - 2, ship_y + 8), (ship_x, ship_y + 6 + flame_len), (ship_x + 2, ship_y + 8)], fill=COLOR_BRIGHT_GOLD)

        # Starship Hull (Angular Retro Fighter)
        hull_pts = [
            (ship_x, ship_y - 18),
            (ship_x - 14, ship_y + 8),
            (ship_x - 7, ship_y + 8),
            (ship_x - 5, ship_y + 12),
            (ship_x + 5, ship_y + 12),
            (ship_x + 7, ship_y + 8),
            (ship_x + 14, ship_y + 8),
        ]
        draw.polygon(hull_pts, fill=COLOR_GOLD, outline=COLOR_BRIGHT_GOLD)
        # Cockpit Dome
        draw.ellipse([ship_x - 3.5, ship_y - 8, ship_x + 3.5, ship_y + 2], fill=COLOR_TEAL, outline=COLOR_PARCHMENT)

        # Label under Starship
        draw.text((ship_x, ship_y + 24), "RENAISSANCE FLAGSHIP", fill=COLOR_GOLD, font=font_small, anchor="mm")

        # Bottom HUD Legend
        draw.text((30, H - 18), "364-DAY COMBAT MATRIX // REAL CONTRIBUTION DATA", fill=COLOR_DIM, font=font_small)

        # Status Legend Items (Bottom Right)
        lx = W - 320
        ly = H - 20
        draw.text((lx, ly), "STATUS:", fill=COLOR_DIM, font=font_small)
        draw.rectangle([lx + 48, ly + 2, lx + 54, ly + 8], fill=COLOR_CELL_EMPTY)
        draw.text((lx + 58, ly), "0 Space", fill=COLOR_DIM, font=font_small)

        draw.polygon([(lx + 104, ly + 2), (lx + 108, ly), (lx + 112, ly + 2), (lx + 110, ly + 8), (lx + 106, ly + 8)], fill=(79, 65, 47))
        draw.text((lx + 116, ly), "1-2 Patrol", fill=COLOR_DIM, font=font_small)

        draw.polygon([(lx + 168, ly + 2), (lx + 172, ly), (lx + 176, ly + 2), (lx + 174, ly + 8), (lx + 170, ly + 8)], fill=(111, 85, 45), outline=COLOR_GOLD)
        draw.text((lx + 180, ly), "3-5 Engaged", fill=COLOR_DIM, font=font_small)

        draw.ellipse([lx + 242, ly + 1, lx + 249, ly + 8], fill=COLOR_GREEN)
        draw.text((lx + 252, ly), "9+ Destroyed", fill=COLOR_GREEN, font=font_small)

        frames.append(img)

    # Save animated GIF
    print(f"Saving animated GIF to {GIF_PATH}...")
    frames[0].save(
        GIF_PATH,
        save_all=True,
        append_images=frames[1:],
        duration=70,  # 70ms per frame = ~14.2 FPS
        loop=0,
        optimize=True
    )
    file_size = os.path.getsize(GIF_PATH)
    print(f"Success! Animated GIF saved ({file_size} bytes).")

if __name__ == "__main__":
    main()
