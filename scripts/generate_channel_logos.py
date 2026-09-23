#!/usr/bin/env python3
"""
scripts/generate_channel_logos.py
Standardizes all Live TV channel logos onto the new 221x126 dark vignette background.
Supports high-resolution SVG rendering via @resvg/resvg-js, intelligent contrast enhancement,
and balanced multi-line layout stacking for ultra-wide channel banners.
"""

import os
import sys
import subprocess
import urllib.request
import io
import time
import re
from PIL import Image

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ASSETS_DIR = os.path.join(ROOT_DIR, 'assets', 'canli')
USER_BG_PATH = os.path.join(ROOT_DIR, 'assets', 'canli_background.png')

TMP_DIR = "/tmp/anthology_channel_gen"
os.makedirs(TMP_DIR, exist_ok=True)
os.makedirs(ASSETS_DIR, exist_ok=True)

USER_AGENT = "AnthologyStaticBot/1.0 (https://github.com/falsisdev/anthology; contact@falsis.dev)"

CHANNELS = [
    # --- Ulusal Kanallar ---
    {
        "name": "TRT 1",
        "file": "trt1.png",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/TRT_1_logo_%282021-%29.svg/960px-TRT_1_logo_%282021-%29.svg.png",
        "max_w": 145,
        "max_h": 68,
    },
    {
        "name": "ATV",
        "file": "atv.png",
        "url": "https://i.imgur.com/HyVUwFC.png",
    },
    {
        "name": "Kanal D",
        "file": "kanald.png",
        "url": "https://i.imgur.com/9o1atM6.png",
    },
    {
        "name": "Show TV",
        "file": "showtv.png",
        "url": "https://i.imgur.com/1l7SCCu.png",
    },
    {
        "name": "Star TV",
        "file": "startv.png",
        "url": "https://i.imgur.com/9O3DHRB.png",
    },
    {
        "name": "NOW TV",
        "file": "now.png",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/NOW_TV_%28Turkey%29_wordmark-red.svg/960px-NOW_TV_%28Turkey%29_wordmark-red.svg.png",
        "max_w": 150,
        "max_h": 52,
    },
    {
        "name": "TV8",
        "file": "tv8.png",
        "url": "https://upload.wikimedia.org/wikipedia/tr/thumb/6/68/Tv8_Yeni_Logo.png/960px-Tv8_Yeni_Logo.png",
    },
    {
        "name": "Kanal 7",
        "file": "kanal7.png",
        "url": "https://i.imgur.com/0gq9xOm.png",
    },
    {
        "name": "Beyaz TV",
        "file": "beyaztv.png",
        "url": "https://i.imgur.com/uykIdML.png",
    },
    {
        "name": "Teve2",
        "file": "teve2.png",
        "url": "https://upload.wikimedia.org/wikipedia/tr/c/ca/Teve2_logo.png",
    },
    {
        "name": "A2 TV",
        "file": "a2.png",
        "url": "https://iatv.tmgrup.com.tr/site/v2/a2tv/i/a2tv-logo.png",
        "max_h": 80,
    },
    {
        "name": "360 TV",
        "file": "tv360.png",
        "url": "https://turkmedya.com.tr/assets/img/logo/logo_360tv.png",
    },
    {
        "name": "TRT 2",
        "file": "trt2.png",
        "url": "https://www.trt2.com.tr/images/logo.svg",
        "is_svg": True,
        "max_w": 145,
        "max_h": 58,
    },
    {
        "name": "TRT Avaz",
        "file": "trtavaz.png",
        "local": os.path.join(ROOT_DIR, "assets", "canli", "trtavaz.png"),
        "already_composited": True,
    },
    {
        "name": "TRT Türk",
        "file": "trtturk.png",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/TRT_T%C3%BCrk_logo.svg/960px-TRT_T%C3%BCrk_logo.svg.png",
    },
    {
        "name": "TRT Genç",
        "file": "trtgenc.png",
        "url": "https://cdn-i.pr.trt.com.tr/trtgenc/images/brand/trt-genc-logo.svg",
        "is_svg": True,
        "svg_recolor": [('fill="#EAEAEA"', 'fill="#FFFFFF"')],
        "max_w": 160,
        "max_h": 52,
    },
    {
        "name": "DMAX",
        "file": "dmax.png",
        "local": os.path.join(ROOT_DIR, "assets", "canli", "dmax.png"),
        "already_composited": True,
    },
    {
        "name": "TYT Türk",
        "file": "tytturk.png",
        "local": os.path.join(ROOT_DIR, "assets", "canli", "tytturk.png"),
        "already_composited": True,
    },
    {
        "name": "Diyanet TV",
        "file": "diyanettv.png",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Diyanet_TV_logo.svg/960px-Diyanet_TV_logo.svg.png",
        "max_w": 160,
        "max_h": 60,
    },

    # --- Haber Kanalları ---
    {
        "name": "TRT Haber",
        "file": "trthaber.png",
        "url": "https://upload.wikimedia.org/wikipedia/commons/7/72/TRT_Haber_Eyl%C3%BCl_2020_Logo.svg",
        "is_svg": True,
        "svg_recolor": [("#1D1D1B", "#FFFFFF")],
        "stack_h_split": 275,
        "gap": 10,
        "max_w": 140,
        "max_h": 68,
    },
    {
        "name": "A Haber",
        "file": "ahaber.png",
        "url": "https://upload.wikimedia.org/wikipedia/commons/7/7c/Ahaber_Logo.png",
    },
    {
        "name": "NTV",
        "file": "ntv.png",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/NTV_%28Turkey%29_logo.svg/960px-NTV_%28Turkey%29_logo.svg.png",
    },
    {
        "name": "Habertürk",
        "file": "haberturk.png",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Habert%C3%BCrk_TV_logo.svg/960px-Habert%C3%BCrk_TV_logo.svg.png",
        "max_w": 145,
        "max_h": 72,
    },
    {
        "name": "Halk TV",
        "file": "halktv.png",
        "url": "https://i.imgur.com/xM0HA30.png",
    },
    {
        "name": "Tele 1",
        "file": "tele1.png",
        "url": "https://upload.wikimedia.org/wikipedia/tr/4/43/Tele1_logosu.png",
    },
    {
        "name": "TGRT Haber",
        "file": "tgrthaber.png",
        "url": "https://upload.wikimedia.org/wikipedia/commons/e/e1/TGRT_Haber_logosu.png",
        "dark_to_white": True,
        "max_w": 135,
        "max_h": 70,
    },
    {
        "name": "Haber Global",
        "file": "haberglobal.png",
        "url": "https://i.imgur.com/fu6XeGS.png",
    },
    {
        "name": "24 TV",
        "file": "24tv.png",
        "url": "https://turkmedya.com.tr/assets/img/logo/logo_24tv.png",
    },
    {
        "name": "Bloomberg HT",
        "file": "bloomberght.png",
        "url": "https://i.imgur.com/bmkXfIE.png",
    },
    {
        "name": "Bengü Türk",
        "file": "benguturk.png",
        "url": "https://www.benguturk.com/assets/logo-white.svg",
        "is_svg": True,
    },
    {
        "name": "Flash Haber",
        "file": "flashhaber.png",
        "url": "https://flashhabertv.com.tr/wp-content/uploads/2022/08/LOGO-SON.png",
    },
    {
        "name": "Lider Haber",
        "file": "liderhaber.png",
        "url": "https://i.imgur.com/5B42KwY.png",
    },
    {
        "name": "Türk Haber",
        "file": "turkhaber.png",
        "local": os.path.join(ROOT_DIR, "assets", "canli", "turkhaber.png"),
        "already_composited": True,
    },
    {
        "name": "Finans Türk",
        "file": "finansturk.png",
        "local": os.path.join(ROOT_DIR, "assets", "canli", "finansturk.png"),
        "already_composited": True,
    },

    # --- Spor Kanalları ---
    {
        "name": "A Spor",
        "file": "aspor.png",
        "url": "https://i.imgur.com/ZhkZzLf.png",
    },
    {
        "name": "HT Spor",
        "file": "htspor.png",
        "url": "https://im.haberturk.com/assets/brand-logo/ht-spor-white.svg",
        "is_svg": True,
        "max_w": 125,
        "max_h": 72,
    },
    {
        "name": "TRT Spor",
        "file": "trtspor.png",
        "extra_files": ["trt.png"],
        "url": "https://i.imgur.com/6tv0zxh.png",
    },
    {
        "name": "TRT Spor Yıldız",
        "file": "trtsporyildiz.png",
        "local": os.path.join(ROOT_DIR, "assets", "canli", "trtsporyildiz.png"),
        "already_composited": True,
    },
    {
        "name": "TV8,5",
        "file": "tv85.png",
        "url": "https://i.imgur.com/QuelSsc.png",
    },
    {
        "name": "BeIN Sports",
        "file": "beinsports.png",
        "extra_files": ["beinsports.jpg"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/BeIN_Sports_logo.svg/960px-BeIN_Sports_logo.svg.png",
    },
    {
        "name": "S Sport",
        "file": "ssport.png",
        "url": "https://upload.wikimedia.org/wikipedia/commons/9/91/S_Sport_Plus_Logo.png",
    },
    {
        "name": "Tivibu Spor",
        "file": "tivibuspor.png",
        "extra_files": ["tivibuspor.jpg"],
        "url": "https://upload.wikimedia.org/wikipedia/tr/3/36/Tivibu_spor_logosu.jpg",
        "remove_black_bg": True,
        "crop_bbox": (11, 141, 415, 293),
        "max_w": 155,
        "max_h": 58,
    },
    {
        "name": "Smart Spor",
        "file": "smartspor.png",
        "url": "https://i.imgur.com/blu6v6P.png",
    },
    {
        "name": "Euro Sport",
        "file": "eurosport.png",
        "url": "https://upload.wikimedia.org/wikipedia/commons/c/c6/Eurosport_Logo_%282011-2015%29.svg",
        "is_svg": True,
        "max_w": 150,
        "max_h": 60,
    },
    {
        "name": "Exxen Spor",
        "file": "exxenspor.png",
        "extra_files": ["exxenspor.jpg", "exxen.png"],
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Exxen.png/960px-Exxen.png",
    },
    {
        "name": "Tabii Spor",
        "file": "tabiispor.png",
        "url": "https://cms-tabii-public-image.tabii.com/int/38058.png",
    },
    {
        "name": "TJK TV",
        "file": "tjktv.png",
        "url": "https://upload.wikimedia.org/wikipedia/tr/b/b7/T%C3%BCrkiye_Jokey_Kul%C3%BCb%C3%BC.png",
        "max_w": 86,
        "max_h": 86,
    },
    {
        "name": "NBA TV",
        "file": "nbatv.png",
        "url": "https://upload.wikimedia.org/wikipedia/en/d/d2/NBA_TV.svg",
        "is_svg": True,
        "max_w": 80,
        "max_h": 76,
    },
    {
        "name": "FB TV",
        "file": "fbtv.png",
        "url": "https://i.imgur.com/qBVqtYd.png",
    },
    {
        "name": "GS TV",
        "file": "gstv.png",
        "url": "https://upload.wikimedia.org/wikipedia/tr/a/a1/Gstv-yeni.PNG",
        "remove_white_bg": True,
    },
    {
        "name": "Sports TV",
        "file": "sportstv.png",
        "url": "https://i.imgur.com/tGTVcVe.jpg",
        "remove_white_bg": True,
    },
    {
        "name": "CBC Sport",
        "file": "cbcsport.png",
        "url": "https://i.imgur.com/3mEdjuq.png",
    },
    {
        "name": "iDMAN Tv",
        "file": "idmantv.png",
        "url": "https://i.imgur.com/fM9FOrZ.png",
    },
    {
        "name": "Ekol Sports",
        "file": "ekolsports.png",
        "local": os.path.join(ROOT_DIR, "assets", "canli", "ekolsports.png"),
        "already_composited": True,
    },
    {
        "name": "Real Madrid TV",
        "file": "realmadridtv.png",
        "local": os.path.join(ROOT_DIR, "assets", "canli", "realmadridtv.png"),
        "already_composited": True,
    },
    {
        "name": "Sport Fishing TV",
        "file": "sportfishingtv.png",
        "local": os.path.join(ROOT_DIR, "assets", "canli", "sportfishingtv.png"),
        "already_composited": True,
    },

    # --- Belgesel & Çocuk & Müzik ---
    {
        "name": "TRT Belgesel",
        "file": "trtbelgesel.png",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/TRT_Belgesel_logo_%282019-%29.svg/960px-TRT_Belgesel_logo_%282019-%29.svg.png",
    },
    {
        "name": "Çiftçi TV",
        "file": "ciftcitv.png",
        "url": "https://www.ciftcitv.com/assets/images/logo_white.svg",
        "is_svg": True,
        "max_w": 145,
        "max_h": 70,
    },
    {
        "name": "TRT Çocuk",
        "file": "trtcocuk.png",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/TRT_%C3%87ocuk_logo_%282021%29.svg/960px-TRT_%C3%87ocuk_logo_%282021%29.svg.png",
    },
    {
        "name": "Minika Çocuk",
        "file": "minikacocuk.png",
        "local": os.path.join(ROOT_DIR, "scratch", "raw_logos", "minikacocuk.png"),
        "max_w": 145,
        "max_h": 68,
    },
    {
        "name": "Minika GO",
        "file": "minikago.png",
        "local": os.path.join(ROOT_DIR, "scratch", "raw_logos", "minikago.png"),
        "max_w": 140,
        "max_h": 70,
    },
    {
        "name": "TRT EBA",
        "file": "trteba.png",
        "local": os.path.join(ROOT_DIR, "scratch", "raw_logos", "trteba.png"),
        "dark_to_white": True,
        "max_w": 145,
        "max_h": 60,
    },
    {
        "name": "TRT EBA İlkokul",
        "file": "trtebailkokul.png",
        "local": os.path.join(ROOT_DIR, "scratch", "raw_logos", "trtebailkokul.png"),
        "dark_to_white": True,
        "max_w": 145,
        "max_h": 68,
    },
    {
        "name": "TRT EBA Ortaokul",
        "file": "trtebaortaokul.png",
        "local": os.path.join(ROOT_DIR, "scratch", "raw_logos", "trtebaortaokul.png"),
        "dark_to_white": True,
        "max_w": 145,
        "max_h": 68,
    },
    {
        "name": "TRT EBA Lise",
        "file": "trtebalise.png",
        "local": os.path.join(ROOT_DIR, "scratch", "raw_logos", "trtebalise.png"),
        "dark_to_white": True,
        "max_w": 145,
        "max_h": 68,
    },
    {
        "name": "Travelxp",
        "file": "travelxp.png",
        "local": os.path.join(ROOT_DIR, "assets", "canli", "travelxp.png"),
        "already_composited": True,
    },
    {
        "name": "Kral Pop TV",
        "file": "kralpop.png",
        "local": os.path.join(ROOT_DIR, "scratch", "kralpop_raw.png"),
        "remove_white_bg": True,
        "max_w": 155,
        "max_h": 55,
    },
    {
        "name": "PowerTürk TV",
        "file": "powerturk.png",
        "local": os.path.join(ROOT_DIR, "scratch", "raw_logos", "powerturk.png"),
        "max_w": 150,
        "max_h": 65,
    },
    {
        "name": "Power TV",
        "file": "powertv.png",
        "local": os.path.join(ROOT_DIR, "scratch", "raw_logos", "powertv.png"),
        "remove_white_bg": True,
        "max_w": 150,
        "max_h": 50,
    },
    {
        "name": "Number 1 TV",
        "file": "number1.png",
        "local": os.path.join(ROOT_DIR, "scratch", "raw_logos", "number1.png"),
        "max_w": 135,
        "max_h": 75,
    },
    {
        "name": "TRT Müzik",
        "file": "trtmuzik.png",
        "url": "https://upload.wikimedia.org/wikipedia/commons/f/f2/TRT_M%C3%BCzik_logo.svg",
        "is_svg": True,
        "max_w": 160,
        "max_h": 52,
    },
    {
        "name": "Power Dance",
        "file": "powerdance.png",
        "local": os.path.join(ROOT_DIR, "assets", "canli", "powerdance.png"),
        "already_composited": True,
    },
    {
        "name": "Power Love",
        "file": "powerlove.png",
        "local": os.path.join(ROOT_DIR, "assets", "canli", "powerlove.png"),
        "already_composited": True,
    },
    {
        "name": "Mahsunsports",
        "file": "mahsunsports.png",
        "local": os.path.join(ROOT_DIR, "assets", "canli", "mahsunsports.png"),
        "already_composited": True,
    },

    # --- Ek Ulusal / Haber Kanalları ---
    {
        "name": "TRT World",
        "file": "trtworld.png",
        "local": os.path.join(ROOT_DIR, "scratch", "raw_logos", "trtworld.png"),
        "max_w": 145,
        "max_h": 60,
    },
    {
        "name": "TRT Kurdî",
        "file": "trtkurdi.png",
        "local": os.path.join(ROOT_DIR, "scratch", "raw_logos", "trtkurdi.png"),
        "max_w": 145,
        "max_h": 60,
    },
    {
        "name": "TRT Arabi",
        "file": "trtarabi.png",
        "local": os.path.join(ROOT_DIR, "scratch", "raw_logos", "trtarabi.png"),
        "max_w": 145,
        "max_h": 60,
    },
    {
        "name": "TV100",
        "file": "tv100.png",
        "url": "https://s.tv100.com/assets/web/images/logo.svg",
        "is_svg": True,
        "svg_recolor": [("#262626", "#ffffff")],
        "max_w": 150,
        "max_h": 60,
    },
    {
        "name": "TVNET",
        "file": "tvnet.png",
        "url": "https://upload.wikimedia.org/wikipedia/commons/5/5a/Tvnet_logo_%282022%29.svg",
        "is_svg": True,
        "max_w": 85,
        "max_h": 85,
    },
    {
        "name": "Ülke TV",
        "file": "ulketv.png",
        "url": "https://upload.wikimedia.org/wikipedia/commons/2/28/%C3%9Clke_TV_logo.svg",
        "is_svg": True,
        "svg_recolor": [("#343433", "#ffffff")],
        "max_w": 150,
        "max_h": 50,
    },
    {
        "name": "Ekotürk",
        "file": "ekoturk.png",
        "url": "https://www.ekoturk.com/wp-content/themes/eko-news/images/ekoturk-logo-v2.png",
        "max_w": 155,
        "max_h": 50,
    },

    # --- Anthology Default Fallback ---
    {
        "name": "Default TV",
        "file": "default_tv.png",
        "local": os.path.join(ROOT_DIR, "assets", "logo_1_transparent.png"),
    }
]

def render_svg_resvg(svg_string, width=800):
    """Renders SVG content to an RGBA PIL Image using @resvg/resvg-js."""
    node_script = f"""
    const {{ Resvg }} = require('/tmp/node_modules/@resvg/resvg-js');
    const fs = require('fs');
    const resvg = new Resvg(fs.readFileSync(0, 'utf8'), {{ fitTo: {{ mode: 'width', value: {width} }} }});
    process.stdout.write(resvg.render().asPng());
    """
    p = subprocess.Popen(
        ['node', '-e', node_script],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    stdout, stderr = p.communicate(input=svg_string.encode('utf-8'))
    if p.returncode != 0:
        raise RuntimeError(f"Resvg render error: {stderr.decode('utf-8')}")
    return Image.open(io.BytesIO(stdout)).convert('RGBA')

def remove_white_background(im, threshold=240):
    """Converts white or near-white background to transparent."""
    im = im.convert("RGBA")
    data = list(im.getdata())
    new_data = []
    for item in data:
        r, g, b, a = item
        if r > threshold and g > threshold and b > threshold:
            new_data.append((255, 255, 255, 0))
        elif r > threshold - 20 and g > threshold - 20 and b > threshold - 20:
            avg = (r + g + b) // 3
            alpha = int(255 * (threshold - avg) / 20)
            new_data.append((r, g, b, min(a, max(0, alpha))))
        else:
            new_data.append(item)
    im.putdata(new_data)
    return im

def remove_black_background(im, low_thresh=25, high_thresh=55):
    """Converts dark / black background to transparent with smooth alpha roll-off."""
    im = im.convert("RGBA")
    data = list(im.getdata())
    new_data = []
    for r, g, b, a in data:
        max_c = max(r, g, b)
        if max_c < low_thresh:
            new_data.append((r, g, b, 0))
        elif max_c < high_thresh:
            alpha = int(255 * (max_c - low_thresh) / (high_thresh - low_thresh))
            new_data.append((r, g, b, min(a, max(0, alpha))))
        else:
            new_data.append((r, g, b, a))
    im.putdata(new_data)
    return im

def dark_to_white(im, threshold=45):
    """Converts dark / black text pixels to pure white while preserving alpha."""
    im = im.convert("RGBA")
    data = list(im.getdata())
    new_data = []
    for r, g, b, a in data:
        if a > 30 and r < threshold and g < threshold and b < threshold:
            new_data.append((255, 255, 255, a))
        else:
            new_data.append((r, g, b, a))
    im.putdata(new_data)
    return im

def fetch_image(item):
    """Retrieves and prepares the logo Image object for an item."""
    if item.get("already_composited"):
        return Image.open(item["local"]).convert("RGBA")

    if "local" in item:
        im = Image.open(item["local"]).convert("RGBA")
    else:
        url = item["url"]
        headers = {"User-Agent": USER_AGENT}
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read()

        if item.get("is_svg") or url.endswith(".svg"):
            svg_text = content.decode("utf-8")
            if item.get("svg_remove_regex"):
                svg_text = re.sub(item["svg_remove_regex"], "", svg_text)
            if item.get("svg_recolor"):
                for old_pat, new_pat in item["svg_recolor"]:
                    svg_text = svg_text.replace(old_pat, new_pat)
            
            im = render_svg_resvg(svg_text, width=800)
            
            if item.get("stack_h_split"):
                split_x = item["stack_h_split"]
                gap = item.get("gap", 10)
                
                im_left = im.crop((0, 0, split_x, im.height))
                left_part = im_left.crop(im_left.getbbox()) if im_left.getbbox() else im_left
                
                im_right = im.crop((split_x, 0, im.width, im.height))
                right_part = im_right.crop(im_right.getbbox()) if im_right.getbbox() else im_right
                
                sw = max(left_part.width, right_part.width)
                sh = left_part.height + gap + right_part.height
                stacked = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
                stacked.paste(left_part, ((sw - left_part.width) // 2, 0), left_part)
                stacked.paste(right_part, ((sw - right_part.width) // 2, left_part.height + gap), right_part)
                return stacked
            
            return im

        im = Image.open(io.BytesIO(content)).convert("RGBA")
    
    if item.get("crop_bbox"):
        im = im.crop(item["crop_bbox"])
    
    if item.get("remove_white_bg"):
        im = remove_white_background(im)
    elif item.get("remove_black_bg"):
        im = remove_black_background(im)
    
    if item.get("dark_to_white"):
        im = dark_to_white(im)
        
    return im

def composite_on_background(bg_im, logo_im, custom_max_w=None, custom_max_h=None):
    """
    Crops transparent borders, scales appropriately and centers logo on 221x126 background.
    """
    logo = logo_im.convert("RGBA")
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)

    w, h = logo.size
    aspect = w / h if h > 0 else 1.0

    if custom_max_w and custom_max_h:
        max_w, max_h = custom_max_w, custom_max_h
    elif aspect > 2.6:
        max_w, max_h = 160, 54
    elif aspect < 1.15:
        max_w, max_h = 88, 76
    else:
        max_w, max_h = 148, 74

    ratio = min(max_w / w, max_h / h)
    new_w = max(1, int(w * ratio))
    new_h = max(1, int(h * ratio))

    logo_resized = logo.resize((new_w, new_h), Image.Resampling.LANCZOS)

    card = bg_im.copy().convert("RGBA")
    offset_x = (card.width - new_w) // 2
    offset_y = (card.height - new_h) // 2
    card.paste(logo_resized, (offset_x, offset_y), logo_resized)
    return card

def main():
    print(f"Loading base background from: {USER_BG_PATH}")
    bg_base = Image.open(USER_BG_PATH).convert("RGBA")
    print(f"Base size: {bg_base.size}")

    # Allow filtering by arguments if passed: e.g. python3 scripts/generate_channel_logos.py haberturk.png
    filter_files = set(sys.argv[1:]) if len(sys.argv) > 1 else None
    channels_to_run = [c for c in CHANNELS if not filter_files or c["file"] in filter_files]

    success_count = 0
    fail_count = 0

    for idx, item in enumerate(channels_to_run, 1):
        name = item["name"]
        filename = item["file"]
        print(f"[{idx}/{len(channels_to_run)}] Processing {name} ({filename})... ", end="", flush=True)

        try:
            if item.get("already_composited"):
                card = fetch_image(item)
            else:
                logo_im = fetch_image(item)
                card = composite_on_background(
                    bg_base, 
                    logo_im, 
                    custom_max_w=item.get("max_w"), 
                    custom_max_h=item.get("max_h")
                )

            target_files = [filename] + item.get("extra_files", [])
            for tf in target_files:
                p1 = os.path.join(ASSETS_DIR, tf)

                if tf.endswith(".jpg") or tf.endswith(".jpeg"):
                    card_rgb = card.convert("RGB")
                    card_rgb.save(p1, "JPEG", quality=95)
                else:
                    card.save(p1, "PNG", optimize=True)

            print("✅ DONE")
            success_count += 1
        except Exception as e:
            print(f"❌ FAILED: {e}")
            fail_count += 1

        time.sleep(0.15)

    print("\n==================================================")
    print(f"Channel Logo Generation Finished: {success_count} succeeded, {fail_count} failed.")
    print("==================================================")

    if fail_count > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
