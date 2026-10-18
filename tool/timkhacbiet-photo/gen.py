#!/usr/bin/env python3
"""Tạo ảnh chụp như thật cho game "Tìm điểm khác biệt" bằng trình tạo ảnh Google Gemini.

Mỗi màn:
  1. Tạo ảnh A từ mô tả cảnh trong scenes.json (ảnh chụp như thật, 4:3).
  2. Nhờ Gemini tìm các vật thể trong ảnh A (khung bao).
  3. Chọn N vật thể không chồng nhau, cỡ vật hợp với độ khó, rồi nhờ Gemini sửa ảnh
     (xoá vật, đổi màu, thay vật khác, thêm vật nhỏ, đổi chi tiết).
  4. Chỉ lấy đúng phần đã đổi trong khung của từng vật (mặt nạ mềm) dán lên ảnh A -> ảnh B.
     Ngoài các vùng đó ảnh B giống hệt ảnh A, nên không có "điểm khác" ngoài ý muốn.
  5. Lưu ảnh A + các mảnh vá (WebP có kênh trong suốt) và manifest.json cho game.

Cần biến môi trường GEMINI_API_KEY. Cài thư viện: pip install pillow numpy scipy
Ví dụ:  python3 gen.py --levels 1-5        (tạo màn 1..5)
        python3 gen.py --levels 1-100      (tạo tất cả; màn đã có sẽ bỏ qua, thêm --force để làm lại)
        python3 gen.py --verify            (kiểm tra lại các màn đã tạo)
Tuỳ chọn: TKB_IMAGE_MODEL, TKB_VISION_MODEL để chọn mô hình cụ thể.
"""
import argparse, base64, io, json, math, os, random, re, ssl, sys, time, urllib.error, urllib.request

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'game', 'timkhacbiet-photos')
CACHE = os.path.join(HERE, 'cache')
W, H = 1024, 768
API = 'https://generativelanguage.googleapis.com/v1beta'
TIER_NAMES = ['Dễ', 'Vừa', 'Khó', 'Rất khó', 'Siêu khó']

# ---------------------------------------------------------------- độ khó
def lerp(a, b, t):
    return a + (b - a) * t

def cfg_for(n):
    t = (n - 1) / 99
    tier = min(4, (n - 1) // 20)
    diffs = 3 + (n - 1) // 12
    return {
        'n': n, 't': t, 'tier': tier, 'diffs': diffs,
        # ảnh thật khó dò hơn tranh vẽ nên cho thêm chút thời gian
        'time': 5 * round((55 + diffs * 17) / 5),
        # diện tích khung vật được chọn (tỉ lệ so với cả ảnh)
        'amin': lerp(0.012, 0.0012, t), 'amax': lerp(0.14, 0.016, t),
        # số điểm ảnh tối thiểu phải đổi trong một điểm khác (ở 1024x768)
        'minpx': int(lerp(2500, 260, t)),
        'kinds': [
            ['remove', 'recolor', 'remove', 'recolor', 'replace'],
            ['remove', 'recolor', 'replace', 'add', 'recolor'],
            ['remove', 'recolor', 'replace', 'add', 'detail'],
            ['recolor', 'detail', 'remove', 'replace', 'add', 'subtle'],
            ['subtle', 'detail', 'recolor', 'remove', 'subtle', 'replace'],
        ][tier],
    }

STRONG_COLORS = ['bright red', 'royal blue', 'bright yellow', 'emerald green', 'purple', 'orange', 'hot pink', 'pure white', 'black']
ADD_THINGS = ['a small red apple', 'a tiny yellow rubber duck', 'a small blue butterfly', 'a little green leaf', 'a small white flower',
              'a small orange ball', 'a tiny snail', 'a small key', 'a ladybug', 'a small pink candy']

def where(box):
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) / 2 / W, (y0 + y1) / 2 / H
    hz = 'left' if cx < .36 else 'right' if cx > .64 else 'center'
    vt = 'top' if cy < .36 else 'bottom' if cy > .64 else 'middle'
    return ('center' if hz == 'center' and vt == 'middle' else (vt + ' ' + hz if hz != 'center' else vt + ' center' if vt != 'middle' else hz)) + ' of the image'

def edit_text(kind, label, box, rnd):
    loc = f'the {label} ({where(box)})'
    if kind == 'remove':
        return f'Remove {loc} completely; fill its place naturally with what would be behind it.'
    if kind == 'recolor':
        return f'Change the main color of {loc} to {rnd.choice(STRONG_COLORS)}. Keep its shape, texture and lighting.'
    if kind == 'subtle':
        return f'Change the color of {loc} to a clearly different but similar shade (for example a different tone of the same color family). Keep its shape and texture.'
    if kind == 'replace':
        return f'Replace {loc} with a different everyday object of about the same size that fits the scene.'
    if kind == 'add':
        return f'Add {rnd.choice(ADD_THINGS)} on or right next to {loc}, at a realistic scale.'
    if kind == 'detail':
        return f'Make one small but clearly visible change to {loc}: remove one of its parts or change its pattern. Keep the object in place.'
    raise ValueError(kind)

# ---------------------------------------------------------------- gọi API
def ssl_ctx():
    ca = os.environ.get('SSL_CERT_FILE') or ('/root/.ccr/ca-bundle.crt' if os.path.exists('/root/.ccr/ca-bundle.crt') else None)
    return ssl.create_default_context(cafile=ca)

CTX = None

def api(method, path, body=None, tries=7):
    global CTX
    CTX = CTX or ssl_ctx()
    key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    if not key:
        sys.exit('Thiếu biến môi trường GEMINI_API_KEY')
    data = json.dumps(body).encode() if body is not None else None
    for attempt in range(tries):
        req = urllib.request.Request(f'{API}/{path}', data=data, method=method,
                                     headers={'Content-Type': 'application/json', 'x-goog-api-key': key})
        try:
            with urllib.request.urlopen(req, context=CTX, timeout=300) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            msg = e.read().decode('utf-8', 'replace')[:800]
            if e.code in (429, 500, 502, 503, 504) and attempt < tries - 1:
                wait = min(90, 4 * 2 ** attempt) + random.random() * 3
                print(f'    API {e.code}, thử lại sau {wait:.0f}s', flush=True)
                time.sleep(wait)
                continue
            raise RuntimeError(f'API {e.code}: {msg}')
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            if attempt < tries - 1:
                time.sleep(5 * (attempt + 1))
                continue
            raise RuntimeError(f'Lỗi mạng: {e}')

def pick_models():
    names = {}
    page = ''
    while True:
        d = api('GET', 'models?pageSize=1000' + (f'&pageToken={page}' if page else ''))
        for m in d.get('models', []):
            names[m['name'].split('/')[-1]] = m.get('supportedGenerationMethods', [])
        page = d.get('nextPageToken')
        if not page:
            break
    gen = [n for n, ms in names.items() if 'generateContent' in ms]
    def first(prefs, ok):
        for p in prefs:
            if p and p in gen:
                return p
        cand = sorted(n for n in gen if ok(n))
        return cand[-1] if cand else None
    img = first([os.environ.get('TKB_IMAGE_MODEL'), 'gemini-2.5-flash-image', 'gemini-2.5-flash-image-preview', 'gemini-3-pro-image-preview'],
                lambda n: 'image' in n and n.startswith('gemini'))
    vis = first([os.environ.get('TKB_VISION_MODEL'), 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-pro'],
                lambda n: n.startswith('gemini') and not re.search('image|tts|audio|embed|live|lite', n))
    if not img or not vis:
        sys.exit(f'Không tìm thấy mô hình phù hợp. Có: {sorted(gen)}')
    return img, vis

def png_part(img):
    b = io.BytesIO(); img.save(b, 'PNG')
    return {'inline_data': {'mime_type': 'image/png', 'data': base64.b64encode(b.getvalue()).decode()}}

def to_4x3(img):
    img = img.convert('RGB')
    w, h = img.size
    if w / h > 4 / 3:
        nw = round(h * 4 / 3); img = img.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    elif w / h < 4 / 3:
        nh = round(w * 3 / 4); img = img.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    return img.resize((W, H), Image.LANCZOS)

def gen_image(model, parts):
    body = {'contents': [{'role': 'user', 'parts': parts}],
            'generationConfig': {'responseModalities': ['IMAGE'], 'imageConfig': {'aspectRatio': '4:3'}}}
    try:
        r = api('POST', f'models/{model}:generateContent', body)
    except RuntimeError as e:
        if 'API 400' not in str(e):
            raise
        body['generationConfig'] = {'responseModalities': ['TEXT', 'IMAGE']}
        r = api('POST', f'models/{model}:generateContent', body)
    for c in r.get('candidates', []):
        for p in (c.get('content') or {}).get('parts', []):
            d = p.get('inlineData') or p.get('inline_data')
            if d and d.get('data'):
                return to_4x3(Image.open(io.BytesIO(base64.b64decode(d['data']))))
    raise RuntimeError('Không nhận được ảnh: ' + json.dumps(r.get('promptFeedback') or [c.get('finishReason') for c in r.get('candidates', [])])[:300])

def detect(model, img):
    prompt = ('Detect every distinct, clearly visible physical object in this photo (up to 60). Return a JSON array; '
              'each item is {"label": a short unique description with color, e.g. "red mug on the left", '
              '"box_2d": [ymin, xmin, ymax, xmax]} with coordinates normalized to 0-1000. '
              'Do not include large background regions such as sky, wall, floor, ground, water surface or table top.')
    body = {'contents': [{'parts': [png_part(img), {'text': prompt}]}],
            'generationConfig': {'responseMimeType': 'application/json', 'temperature': 0.2}}
    r = api('POST', f'models/{model}:generateContent', body)
    txt = ''.join(p.get('text', '') for c in r.get('candidates', []) for p in (c.get('content') or {}).get('parts', []))
    try:
        items = json.loads(txt)
    except ValueError:
        m = re.search(r'\[.*\]', txt, re.S)
        items = json.loads(m.group(0)) if m else []
    out = []
    for it in items if isinstance(items, list) else []:
        b = it.get('box_2d') if isinstance(it, dict) else None
        if not b or len(b) != 4:
            continue
        y0, x0, y1, x1 = [float(v) for v in b]
        box = (max(0, x0 / 1000 * W), max(0, y0 / 1000 * H), min(W, x1 / 1000 * W), min(H, y1 / 1000 * H))
        if box[2] - box[0] > 8 and box[3] - box[1] > 8:
            out.append({'label': str(it.get('label', 'object'))[:60], 'box': box})
    return out

# ---------------------------------------------------------------- chọn vật & ghép
def area(b):
    return max(0, b[2] - b[0]) * max(0, b[3] - b[1])

def grow(b, f, px):
    w, h = b[2] - b[0], b[3] - b[1]
    return (max(0, b[0] - w * f - px), max(0, b[1] - h * f - px), min(W, b[2] + w * f + px), min(H, b[3] + h * f + px))

def overlap(a, b):
    return a[0] < b[2] and a[2] > b[0] and a[1] < b[3] and a[3] > b[1]

def candidates(objs, cfg):
    tot = W * H
    out = []
    for o in objs:
        b = o['box']
        a = area(b) / tot
        if not (cfg['amin'] <= a <= cfg['amax']):
            continue
        # bỏ các khung bao chứa nhiều vật khác (bàn, kệ...)
        inner = sum(1 for p in objs if p is not o and b[0] <= (p['box'][0] + p['box'][2]) / 2 <= b[2] and b[1] <= (p['box'][1] + p['box'][3]) / 2 <= b[3])
        if inner >= 2:
            continue
        if b[0] < 6 or b[1] < 6 or b[2] > W - 6 or b[3] > H - 6:
            continue
        out.append(o)
    return out

def hit_of(pb):
    """Vùng bấm trúng của một điểm khác: khung phần đã đổi nới 6px, tối thiểu 60x60."""
    x0, y0, x1, y1 = grow(pb, 0, 6)
    cx, cy, hw, hh = (x0 + x1) / 2, (y0 + y1) / 2, max(x1 - x0, 60), max(y1 - y0, 60)
    return (round(max(0, cx - hw / 2)), round(max(0, cy - hh / 2)), round(min(W, cx + hw / 2)), round(min(H, cy + hh / 2)))

def region_box(kind, box):
    return grow(box, 0.45 if kind == 'add' else 0.12, 10)

def extract(A, E, rb, minpx):
    """Tìm phần đã đổi trong vùng rb, trả về (mặt nạ mềm cả ảnh, số điểm ảnh đổi, lý do lỗi)."""
    x0, y0, x1, y1 = [int(round(v)) for v in rb]
    a, e = A[y0:y1, x0:x1], E[y0:y1, x0:x1]
    d = ndimage.gaussian_filter(np.abs(e - a).sum(2), 1.2)
    core = d > 45
    core = ndimage.binary_opening(core, iterations=1)
    core = ndimage.binary_closing(core, iterations=2)
    lab, nl = ndimage.label(core)
    if nl:
        sizes = ndimage.sum(core, lab, range(1, nl + 1))
        keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 40])
    else:
        keep = core
    n = int(keep.sum())
    if n < minpx:
        return None, n, 'đổi quá ít'
    if n > 0.92 * keep.size:
        return None, n, 'đổi cả vùng'
    m = ndimage.binary_dilation(keep, iterations=5).astype(np.float32)
    m = ndimage.gaussian_filter(m, 2.5)
    # mép vùng mềm dần về 0 để không lộ đường cắt
    hh, ww = m.shape
    yy = np.minimum(np.arange(hh), np.arange(hh)[::-1])[:, None]
    xx = np.minimum(np.arange(ww), np.arange(ww)[::-1])[None, :]
    m *= np.clip(np.minimum(yy, xx) / 6.0, 0, 1)
    m = np.clip(m * 1.15, 0, 1)
    # kiểm tra đường nối: ở viền mặt nạ, ảnh sửa phải khớp ảnh gốc (nếu ảnh sửa bị xê dịch cả khung thì sẽ lộ)
    ring = (m > 0.03) & (m < 0.5) & ~ndimage.binary_dilation(keep, iterations=2)
    if ring.sum() > 50 and float(d[ring].mean()) > 32:
        return None, n, 'lệch khung'
    full = np.zeros((H, W), np.float32)
    full[y0:y1, x0:x1] = m
    return full, n, None

def global_drift(A, E, boxes):
    d = ndimage.gaussian_filter(np.abs(E - A).sum(2), 1.2) > 45
    mask = np.ones((H, W), bool)
    for b in boxes:
        x0, y0, x1, y1 = [int(round(v)) for v in b]
        mask[y0:y1, x0:x1] = False
    return float(d[mask].mean()) if mask.any() else 0.0

def edit_batch(model, A_img, items, rnd, strong=False):
    lines = '\n'.join(f'{i + 1}. {edit_text(it["kind"], it["label"], it["box"], rnd)}' for i, it in enumerate(items))
    prompt = ('Edit this photograph. Make ONLY the following change' + ('s' if len(items) > 1 else '') + ':\n' + lines +
              '\nKeep everything else exactly identical: same framing, camera angle, lighting, colors and every other object. '
              'Do not crop, zoom, shift, re-render or restyle the image. The result must stay a realistic photo.' +
              (' The change must be clearly visible.' if strong else ''))
    return gen_image(model, [png_part(A_img), {'text': prompt}])

# ---------------------------------------------------------------- một màn
def build_level(n, scene, models, force=False):
    cfg = cfg_for(n)
    img_model, vis_model = models
    rnd = random.Random(n * 7919)
    cdir = os.path.join(CACHE, f'{n:03d}')
    os.makedirs(cdir, exist_ok=True)
    pa = os.path.join(cdir, 'A.png')
    busy = ['', ' Several separate objects.', ' Many distinct objects.', ' Busy and detailed, many small objects.', ' Extremely busy and cluttered, a large number of small objects.'][cfg['tier']]
    prompt = ('Photorealistic photograph taken with a full-frame DSLR, 35mm lens, natural light, sharp focus, high detail, '
              f'landscape 4:3. {scene}.{busy} All objects are clearly visible. No people, no text, no letters, no logos, no watermark.')
    if os.path.exists(pa) and not force:
        A_img = Image.open(pa).convert('RGB')
    else:
        print('  tạo ảnh A ...', flush=True)
        A_img = gen_image(img_model, [{'text': prompt}])
        A_img.save(pa)
    A = np.asarray(A_img, np.float32)
    pd = os.path.join(cdir, 'objects.json')
    if os.path.exists(pd) and not force:
        objs = json.load(open(pd))
    else:
        print('  tìm vật thể ...', flush=True)
        objs = detect(vis_model, A_img)
        json.dump(objs, open(pd, 'w'), ensure_ascii=False, indent=0)
    cands = candidates(objs, cfg)
    rnd.shuffle(cands)
    print(f'  {len(objs)} vật, {len(cands)} vật hợp cỡ', flush=True)

    B = A.copy()
    taken = []      # vùng đã dùng (không cho chồng nhau)
    diffs = []
    kinds = cfg['kinds'][:]
    rnd.shuffle(kinds)
    ki = 0
    used = set()
    calls = 0
    for rnd_no in range(4):
        need = cfg['diffs'] - len(diffs)
        if need <= 0 or calls > cfg['diffs'] + 6:
            break
        batch = []
        for o in cands:
            if len(batch) >= need:
                break
            if id(o) in used:
                continue
            kind = kinds[ki % len(kinds)]
            rb = region_box(kind, o['box'])
            if any(overlap(grow(rb, 0, 14), t) for t in taken) or any(overlap(grow(rb, 0, 14), region_box(x['kind'], x['box'])) for x in batch):
                continue
            used.add(id(o)); ki += 1
            batch.append({'label': o['label'], 'box': o['box'], 'kind': kind, 'rb': rb})
        if not batch:
            break
        groups = [batch[i:i + 3] for i in range(0, len(batch), 3)] if rnd_no == 0 else [[b] for b in batch]
        for gi, g in enumerate(groups):
            calls += 1
            print(f'  sửa ảnh (lượt {rnd_no + 1}, {len(g)} chỗ: {", ".join(x["kind"] for x in g)}) ...', flush=True)
            try:
                E_img = edit_batch(img_model, A_img, g, rnd, strong=rnd_no > 0)
            except RuntimeError as e:
                print('    lỗi:', str(e)[:200]); continue
            E_img.save(os.path.join(cdir, f'E{rnd_no}_{gi}.png'))
            E = np.asarray(E_img, np.float32)
            drift = global_drift(A, E, [x['rb'] for x in g])
            for it in g:
                m, cnt, why = extract(A, E, it['rb'], cfg['minpx'])
                if m is None:
                    print(f'    bỏ "{it["label"]}" ({it["kind"]}): {why} ({cnt}px, lệch toàn ảnh {drift:.0%})')
                    continue
                ys, xs = np.nonzero(m > 0.02)
                pb = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
                hb = hit_of(pb)
                if any(overlap(grow(hb, 0, 4), t) for t in taken):
                    print(f'    bỏ "{it["label"]}": sát điểm khác đã có'); continue
                B = B * (1 - m[..., None]) + E * m[..., None]
                taken.append(hb)
                diffs.append({'kind': it['kind'], 'label': it['label'], 'mask': m, 'pbox': pb, 'px': cnt})
                print(f'    ✓ "{it["label"]}" ({it["kind"]}, {cnt}px)')
                if len(diffs) >= cfg['diffs']:
                    break
            if len(diffs) >= cfg['diffs']:
                break
    if len(diffs) < 3:
        raise RuntimeError(f'chỉ được {len(diffs)} điểm khác')
    return cfg, A_img, B, diffs, prompt

def save_level(n, name, cfg, A_img, B, diffs):
    os.makedirs(OUT, exist_ok=True)
    fa = f'{n:03d}.webp'
    A_img.save(os.path.join(OUT, fa), 'WEBP', quality=82, method=6)
    Bu = np.clip(B + 0.5, 0, 255).astype(np.uint8)
    out = []
    for i, d in enumerate(diffs):
        x0, y0, x1, y1 = d['pbox']
        rgba = np.dstack([Bu[y0:y1, x0:x1], np.clip(d['mask'][y0:y1, x0:x1] * 255 + 0.5, 0, 255).astype(np.uint8)])
        fp = f'{n:03d}-{i + 1}.webp'
        Image.fromarray(rgba).save(os.path.join(OUT, fp), 'WEBP', quality=88, alpha_quality=100, method=6)
        out.append({'kind': d['kind'], 'label': d['label'], 'hit': list(hit_of((x0, y0, x1, y1))),
                    'patch': {'file': fp, 'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0}})
    nd = len(out)
    return {'n': n, 'name': name, 'tier': cfg['tier'], 'time': 5 * round((55 + nd * 17) / 5), 'a': fa, 'diffs': out}

def load_manifest():
    p = os.path.join(OUT, 'manifest.json')
    if os.path.exists(p):
        return json.load(open(p, encoding='utf-8'))
    return {'version': 1, 'w': W, 'h': H, 'levels': []}

def save_manifest(man):
    man['levels'].sort(key=lambda l: l['n'])
    with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(man, f, ensure_ascii=False, separators=(',', ':'))

# ---------------------------------------------------------------- kiểm tra
def verify(man, levels=None):
    """Ghép lại ảnh B từ đúng các tệp sẽ phát hành rồi so với ảnh A."""
    bad = 0
    for L in man['levels']:
        if levels and L['n'] not in levels:
            continue
        A = np.asarray(Image.open(os.path.join(OUT, L['a'])).convert('RGB'), np.float32)
        B = A.copy()
        for d in L['diffs']:
            p = d['patch']
            im = np.asarray(Image.open(os.path.join(OUT, p['file'])).convert('RGBA'), np.float32)
            al = im[..., 3:4] / 255
            B[p['y']:p['y'] + p['h'], p['x']:p['x'] + p['w']] = B[p['y']:p['y'] + p['h'], p['x']:p['x'] + p['w']] * (1 - al) + im[..., :3] * al
        diff = np.abs(np.round(B) - A).sum(2) > 40
        hitm = np.zeros((H, W), bool)
        cnt = []
        for d in L['diffs']:
            x0, y0, x1, y1 = d['hit']
            hitm[y0:y1, x0:x1] = True
            cnt.append(int(diff[y0:y1, x0:x1].sum()))
        outside = int((diff & ~hitm).sum())
        ov = sum(1 for i, a in enumerate(L['diffs']) for b in L['diffs'][i + 1:] if overlap(a['hit'], b['hit']))
        minpx = cfg_for(L['n'])['minpx'] * 0.6
        weak = [c for c in cnt if c < minpx]
        ok = outside == 0 and not weak and ov == 0
        bad += not ok
        print(f'màn {L["n"]:3d} {"OK " if ok else "LỖI"} {len(cnt)} điểm khác, px={cnt}, ngoài vùng={outside}, chồng={ov}')
    return bad

def parse_levels(s):
    out = set()
    for part in s.split(','):
        if '-' in part:
            a, b = part.split('-'); out.update(range(int(a), int(b) + 1))
        elif part:
            out.add(int(part))
    return sorted(out)

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--levels', default='', help='ví dụ 1-10,15')
    ap.add_argument('--force', action='store_true', help='làm lại cả màn đã có')
    ap.add_argument('--verify', action='store_true', help='chỉ kiểm tra các màn đã tạo')
    args = ap.parse_args()
    scenes = {s['n']: s for s in json.load(open(os.path.join(HERE, 'scenes.json'), encoding='utf-8'))}
    man = load_manifest()
    if args.verify:
        sys.exit(1 if verify(man, parse_levels(args.levels) if args.levels else None) else 0)
    levels = parse_levels(args.levels or '1-100')
    models = pick_models()
    print('Mô hình tạo ảnh:', models[0], '| mô hình nhìn ảnh:', models[1])
    have = {l['n'] for l in man['levels']}
    for n in levels:
        if n in have and not args.force:
            continue
        print(f'Màn {n}: {scenes[n]["name"]}', flush=True)
        try:
            cfg, A_img, B, diffs, _ = build_level(n, scenes[n]['scene'], models, args.force)
        except RuntimeError as e:
            print('  ✗ bỏ qua màn này:', e)
            continue
        entry = save_level(n, scenes[n]['name'], cfg, A_img, B, diffs)
        man['levels'] = [l for l in man['levels'] if l['n'] != n] + [entry]
        save_manifest(man)
        verify(man, [n])

if __name__ == '__main__':
    main()
