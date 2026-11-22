#!/usr/bin/env python3
"""
scripts/fetch_channel_covers.py
Fetches real channel/brand logos from iptv-org, Wikimedia/Wikipedia, and Bing Images,
then composites every logo onto the standard 221x126 assets/canli_background.png vignette.
"""

import concurrent.futures
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from PIL import Image, ImageStat

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ASSETS_DIR = os.path.join(ROOT_DIR, 'assets', 'canli')
BG_PATH = os.path.join(ROOT_DIR, 'assets', 'canli_background.png')
M3U_PATH = os.path.join(ROOT_DIR, 'providers', 'M3U', 'Liste', 'canli.m3u')
LIVE_M3U_PATH = os.path.abspath(os.path.join(ROOT_DIR, '..', 'anthology-live', 'engine', 'canli.m3u'))
RAW_BASE = 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/'
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

def norm_key(s):
    s = (s or '').lower()
    for a, b in [('ı','i'),('İ','i'),('ü','u'),('Ü','u'),('ö','o'),('Ö','o'),('ş','s'),('Ş','s'),('ğ','g'),('Ğ','g'),('ç','c'),('Ç','c')]:
        s = s.replace(a, b)
    return re.sub(r'[^a-z0-9]', '', s)

def http_get_bytes(url, timeout=10, referer=None):
    headers = {'User-Agent': UA, 'Accept': '*/*'}
    if referer:
        headers['Referer'] = referer
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(), r.headers.get('Content-Type', '')

def http_get_json(url, timeout=12):
    data, _ = http_get_bytes(url, timeout=timeout)
    return json.loads(data.decode('utf-8'))

def remove_white_bg_if_opaque(im, threshold=236):
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    corners = [px[0,0], px[w-1,0], px[0,h-1], px[w-1,h-1]]
    opaque_white_corners = sum(1 for r,g,b,a in corners if a > 230 and r > 225 and g > 225 and b > 225)
    if opaque_white_corners < 3:
        return im
    data = list(im.getdata())
    out = []
    for r, g, b, a in data:
        if r > threshold and g > threshold and b > threshold:
            out.append((255, 255, 255, 0))
        elif r > threshold - 25 and g > threshold - 25 and b > threshold - 25:
            avg = (r + g + b) // 3
            alpha = int(255 * (threshold - avg) / 25)
            out.append((r, g, b, min(a, max(0, alpha))))
        else:
            out.append((r, g, b, a))
    im.putdata(out)
    return im

def brighten_if_too_dark(im):
    """If a transparent logo is predominantly black/very dark, invert dark pixels to crisp white."""
    im = im.convert('RGBA')
    data = list(im.getdata())
    opaque = [(r, g, b) for r, g, b, a in data if a > 80]
    if not opaque:
        return im
    avg_lum = sum(0.299*r + 0.587*g + 0.114*b for r,g,b in opaque) / len(opaque)
    if avg_lum >= 58:
        return im
    out = []
    for r, g, b, a in data:
        if a > 30 and max(r, g, b) < 75:
            out.append((255, 255, 255, a))
        else:
            out.append((r, g, b, a))
    im.putdata(out)
    return im

def composite_on_background(bg_im, logo_im):
    logo = logo_im.convert('RGBA')
    logo = remove_white_bg_if_opaque(logo)
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)
    logo = brighten_if_too_dark(logo)

    w, h = logo.size
    if w == 0 or h == 0:
        raise ValueError('empty logo')
    aspect = w / h
    if aspect > 2.6:
        max_w, max_h = 160, 54
    elif aspect < 1.15:
        max_w, max_h = 88, 76
    else:
        max_w, max_h = 148, 74

    ratio = min(max_w / w, max_h / h)
    new_w = max(1, int(w * ratio))
    new_h = max(1, int(h * ratio))
    logo_resized = logo.resize((new_w, new_h), Image.Resampling.LANCZOS)

    card = bg_im.copy().convert('RGBA')
    ox = (card.width - new_w) // 2
    oy = (card.height - new_h) // 2
    card.paste(logo_resized, (ox, oy), logo_resized)
    return card

def try_decode_image(url):
    try:
        raw, ct = http_get_bytes(url, timeout=8)
        if b'<svg' in raw[:512].lower():
            return None
        im = Image.open(io.BytesIO(raw))
        im.load()
        if im.width < 32 or im.height < 24:
            return None
        return im.convert('RGBA')
    except Exception:
        return None

def search_wikipedia_logo(query):
    for lang in ('tr', 'en'):
        try:
            u = f'https://{lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(query)}&format=json&srlimit=2'
            res = http_get_json(u, timeout=6)
            hits = res.get('query', {}).get('search', [])
            for h in hits[:2]:
                title = h['title']
                pi = f'https://{lang}.wikipedia.org/w/api.php?action=query&titles={urllib.parse.quote(title)}&prop=pageimages&pithumbsize=500&format=json'
                pjson = http_get_json(pi, timeout=6)
                pages = pjson.get('query', {}).get('pages', {})
                for p in pages.values():
                    src = p.get('thumbnail', {}).get('source')
                    if src:
                        im = try_decode_image(src)
                        if im:
                            return im
        except Exception:
            pass
    return None

def search_bing_logo(query):
    """Queries Bing Image Search HTML for transparent PNG logo candidates."""
    q = urllib.parse.quote(query)
    url = f'https://www.bing.com/images/search?q={q}&qft=+filterui:imagesize-medium&form=IRFLTR'
    try:
        raw, _ = http_get_bytes(url, timeout=8)
        html = raw.decode('utf-8', errors='ignore')
        murls = re.findall(r'murl&quot;:&quot;(https?://[^&]+?)&quot;', html)
        for cand in murls[:5]:
            if any(bad in cand.lower() for bad in ('shutterstock', 'istockphoto', 'alamy', 'dreamstime', '123rf', 'depositphotos', 'vectorstock', 'svg')):
                continue
            im = try_decode_image(cand)
            if im:
                return im
    except Exception:
        pass
    return None

# Custom search queries for non-obvious channel/artist/theme names
CUSTOM_QUERIES = {
    'ssportplus1': 'S Sport Plus logo png',
    'ssportplus2': 'S Sport Plus logo png',
    'ssportplus3': 'S Sport Plus logo png',
    'ssportplus4': 'S Sport Plus logo png',
    'ssportplus5': 'S Sport Plus logo png',
    'ssportplus9': 'S Sport Plus logo png',
    'saransport1': 'Saran Sport logo png',
    'tgrteu': 'TGRT EU logo png',
    'automoto': 'Automoto la chaine logo png',
    'cinemaximum1': 'Cinemaximum logo png',
    'cinemaximum4': 'Cinemaximum logo png',
    'cinemaximum7': 'Cinemaximum logo png',
    'cinemaximum9': 'Cinemaximum logo png',
    'cinemaximumbilimkurgu': 'Cinemaximum logo png',
    'cinemaximumbollywood': 'Cinemaximum logo png',
    'moviesmartaction': 'MovieSmart logo png',
    'moviesmartfest': 'MovieSmart logo png',
    'beinseries3': 'beIN Series logo png',
    'beinseries4': 'beIN Series logo png',
    'filmboxaksiyon': 'FilmBox logo png',
    'filmboxkadirinanir': 'Kadir Inanir portrait png',
    'bbcearthpremiere': 'BBC Earth logo png',
    'discoveryid': 'Investigation Discovery logo png',
    'davincikids': 'Da Vinci Kids logo png',
    'iztv': 'beIN IZ TV logo png',
    'smartcocuk': 'Smart Cocuk TV logo png',
    'niloyatv': 'Niloya logo png',
    'pepetv': 'Pepee logo png',
    'pijamamaskelilertv': 'PJ Masks logo png',
    'patronbebek': 'The Boss Baby logo png',
    'sngerbob': 'SpongeBob SquarePants logo png',
    'sirinlertv': 'The Smurfs logo png',
    'tomjerry': 'Tom and Jerry logo png',
    'egeilegaga': 'Ege ile Gaga TRT Cocuk logo png',
    'sevimlidostlar': 'Sevimli Dostlar logo png',
    'pisitv': 'Pisi TV logo png',
    'satrantv': 'Satranc TV logo png',
    'ferditayfur': 'Ferdi Tayfur',
    'ferdiozbegen': 'Ferdi Ozbegen',
    'sezenaksu': 'Sezen Aksu',
    'seldabagcan': 'Selda Bagcan',
    'yildiztilbe': 'Yildiz Tilbe',
    'zerrinozer': 'Zerrin Ozer',
    'palstationyabancimzik': 'Pal Station logo png',
    'max007': 'James Bond 007 logo png',
    'maxstarwars': 'Star Wars logo png',
    'kemalsunal': 'Kemal Sunal',
    'globalboxkemalsunal': 'Kemal Sunal',
    'proturkkemalsunal': 'Kemal Sunal',
    'elazigkanal23': 'Kanal 23 Elazig logo png',
    'elazigkanalfirat': 'Kanal Firat Elazig logo png',
    'astvbursa': 'AS TV Bursa logo png',
    'mavikaradeniz': 'Mavi Karadeniz TV logo png',
    'olayturk': 'Olay Turk TV logo png',
    'aksutvkmaras': 'Aksu TV Kahramanmaras logo png',
    'kayserikaytv': 'Kay TV Kayseri logo png',
    'aksaraykanal68': 'Kanal 68 Aksaray logo png',
    'adiyamanmercantv': 'Mercan TV Adiyaman logo png',
    'pamukkale': 'Pamukkale TV Denizli logo png',
    'kadirga': 'Kadirga TV Trabzon logo png',
    'vizyon58': 'Vizyon 58 Sivas logo png',
    'yenikocaelitv': 'Kocaeli TV logo png',
    'zonguldakkanalz': 'Kanal Z Zonguldak logo png',
    'afyonturk': 'Afyon Turk TV logo png',
    'hrt': 'HRT Akdeniz TV logo png',
    'mersineltv': 'Mersin Kanal logo png',
    'mgctv': 'MGC TV logo png',
    'anadoludernek': 'Anadolu Dernek TV logo png',
    'gurbet24tv': 'Gurbet24 TV logo png',
    'tuncelidersim62tv': 'Dersim TV logo png',
    'turkrock': 'Turk Rock logo png',
    'redboxturkcepop': 'Turkce Pop logo png',
    'xnostaljitrkeklasik': 'Nostalji Turkce Muzik logo png',
    'yesilcam': 'Yesilcam sinema logo png',
    'yesilcam1': 'Yesilcam sinema logo png',
    'yesilcam2': 'Yesilcam sinema logo png',
    'yesilcam3': 'Yesilcam sinema logo png',
}

def main():
    bg_im = Image.open(BG_PATH).convert('RGBA')
    existing_files = {f.lower(): f for f in os.listdir(ASSETS_DIR) if re.search(r'\.(png|jpg|jpeg|webp)$', f, re.I)}

    # Load iptv-org full database
    print('Loading iptv-org channel & logo databases...')
    chans = http_get_json('https://iptv-org.github.io/api/channels.json', timeout=20)
    logos = http_get_json('https://iptv-org.github.io/api/logos.json', timeout=20)

    iptv_by_key = {}
    logo_by_cid = {}
    for l in logos:
        cid = l.get('channel') or ''
        u = l.get('url') or ''
        fmt = (l.get('format') or '').upper()
        if not cid or not u or fmt == 'SVG' or u.lower().endswith('.svg'):
            continue
        is_tr = cid.lower().endswith('.tr')
        if cid not in logo_by_cid or is_tr:
            logo_by_cid[cid] = u
        k = norm_key(re.sub(r'\.[a-z]{2}(?:@.*)?$', '', cid, flags=re.I))
        if k and (k not in iptv_by_key or is_tr):
            iptv_by_key[k] = u

    for c in chans:
        cid = c.get('id') or ''
        u = logo_by_cid.get(cid)
        if not u:
            continue
        is_tr = c.get('country') == 'TR'
        for nm in [c.get('name')] + (c.get('alt_names') or []):
            k = norm_key(nm)
            if k and (k not in iptv_by_key or is_tr):
                iptv_by_key[k] = u

    # Parse canli.m3u
    m3u_lines = open(M3U_PATH, 'r', encoding='utf-8').read().splitlines()
    entries = []
    for idx, line in enumerate(m3u_lines):
        if not line.startswith('#EXTINF'):
            continue
        id_m = re.search(r'tvg-id="([^"]+)"', line, re.I)
        logo_m = re.search(r'tvg-logo="([^"]+)"', line, re.I)
        name_m = re.search(r'",\s*(.+)$', line)
        tvg_id = id_m.group(1) if id_m else ''
        key = norm_key(re.sub(r'\.tr$', '', tvg_id, flags=re.I))
        cur_logo = logo_m.group(1) if logo_m else ''
        name = name_m.group(1).strip() if name_m else key
        entries.append({'idx': idx, 'key': key, 'name': name, 'cur_logo': cur_logo})

    to_build = []
    reused_local = 0
    for e in entries:
        k = e['key']
        # Already points to an existing real local cover in assets/canli/
        if '/assets/canli/' in e['cur_logo'] and '/gen_' not in e['cur_logo']:
            fname = e['cur_logo'].split('/')[-1].lower()
            if fname in existing_files:
                continue
        # Check if assets/canli/<key>.png already exists locally
        if f'{k}.png' in existing_files:
            e['new_logo'] = RAW_BASE + existing_files[f'{k}.png']
            reused_local += 1
            continue
        to_build.append(e)

    print(f'Total entries: {len(entries)} | Reused local: {reused_local} | Need logo build: {len(to_build)}')

    # Shared family assets already composited locally
    LOCAL_FAMILY = {
        'ssportplus': 'ssport.png',
        'sinematvaksiyon': 'sinemaaksiyon.png',
        'sinemayerli': 'sinema2.png',
    }

    brand_cache = {}
    def resolve_and_composite(e):
        k = e['key']
        name = e['name']
        out_name = f'{k}.png'
        out_path = os.path.join(ASSETS_DIR, out_name)

        # 1. Existing external URL or iptv-org match
        cand_urls = []
        if e['cur_logo'] and '/assets/canli/' not in e['cur_logo'] and '/gen_' not in e['cur_logo']:
            cand_urls.append(e['cur_logo'])
        for lookup in (k, norm_key(name)):
            if lookup in iptv_by_key:
                cand_urls.append(iptv_by_key[lookup])
        # Brand fallbacks inside iptv-org
        for prefix, target in [
            ('beinseries', 'beinseriescomedy'),
            ('moviesmart', 'moviesmartclassic'),
            ('filmbox', 'filmbox'),
            ('bbcearth', 'bbcearth'),
            ('davinci', 'davinci'),
            ('discoveryid', 'investigationdiscovery'),
            ('iztv', 'beiniz'),
            ('automoto', 'automotolachaine'),
            ('tgrteu', 'tgrthaber'),
        ]:
            if k.startswith(prefix) and target in iptv_by_key:
                cand_urls.append(iptv_by_key[target])

        im = None
        for u in cand_urls:
            im = try_decode_image(u)
            if im:
                break

        # 2. Custom query or channel name via Wikipedia -> Bing Image Search
        if not im:
            query = CUSTOM_QUERIES.get(k) or f'{name} TV logo png'
            if query in brand_cache:
                im = brand_cache[query]
            else:
                # Try Wikipedia first for cleaner official logos
                wiki_q = CUSTOM_QUERIES.get(k, name).replace(' logo png', '').replace(' TV', '')
                im = search_wikipedia_logo(wiki_q)
                if not im:
                    im = search_bing_logo(query)
                if not im and 'TV' not in name:
                    im = search_bing_logo(f'{name} logo png')
                if im:
                    brand_cache[query] = im

        # 3. Family local composite fallback ONLY if internet lookup failed
        if not im:
            for pfx, lf in LOCAL_FAMILY.items():
                if k.startswith(pfx) and os.path.exists(os.path.join(ASSETS_DIR, lf)):
                    e['new_logo'] = RAW_BASE + lf
                    return 'family'
            # For generic IPTV boxes (Fix Cinema / Global Box / Proturk / Eno / Max / Dream Box / Kingbox / Arena Box)
            # fall back to clean cinema/tv icon search once
            box_q = None
            if 'fixcinema' in k or 'globalbox' in k or 'proturk' in k or 'enovizyon' in k or 'enoaksiyon' in k or 'enowestern' in k or 'arenabox' in k or 'dreambox' in k or 'kingbox' in k or 'digimax' in k or 'sinemax' in k or 'sinevizyon' in k or 'horror' in k or 'salon' in k or 'animation' in k or 'max' in k:
                box_q = 'cinema film reel icon white transparent png'
            elif 'cocuk' in k:
                box_q = 'kids cartoon tv icon white transparent png'
            if box_q:
                if box_q in brand_cache:
                    im = brand_cache[box_q]
                else:
                    im = search_bing_logo(box_q)
                    if im:
                        brand_cache[box_q] = im

        if im:
            card = composite_on_background(bg_im, im)
            card.save(out_path, 'PNG', optimize=True)
            e['new_logo'] = RAW_BASE + out_name
            return 'composited'

        e['new_logo'] = RAW_BASE + 'default_tv.png'
        return 'default'

    stats = {'composited': 0, 'family': 0, 'default': 0}
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        futs = {ex.submit(resolve_and_composite, e): e for e in to_build}
        done = 0
        for fut in concurrent.futures.as_completed(futs):
            res = fut.result()
            stats[res] = stats.get(res, 0) + 1
            done += 1
            if done % 25 == 0 or done == len(to_build):
                print(f'Progress: {done}/{len(to_build)} | stats={stats}')

    # Update both canli.m3u files
    for e in entries:
        if 'new_logo' not in e:
            continue
        idx = e['idx']
        old_line = m3u_lines[idx]
        m3u_lines[idx] = re.sub(r'tvg-logo="[^"]*"', f'tvg-logo="{e["new_logo"]}"', old_line, count=1)

    out_m3u = '\n'.join(m3u_lines) + '\n'
    open(M3U_PATH, 'w', encoding='utf-8').write(out_m3u)
    if os.path.exists(os.path.dirname(LIVE_M3U_PATH)):
        open(LIVE_M3U_PATH, 'w', encoding='utf-8').write(out_m3u)
    print('DONE!', stats)

if __name__ == '__main__':
    main()
