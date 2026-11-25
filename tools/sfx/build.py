"""Dựng tệp âm riêng cho từng game: audio/sfx/<game>.mp3 + <game>.json (bảng cắt).
Chạy:  python3 tools/sfx/build.py <thư mục chứa x/ và x2/ (các bộ âm CC0 đã giải nén)> [tên game ...]
Cần ffmpeg và numpy. Danh sách tiếng chọn cho từng game nằm ở banks.py, nguồn tải ở audio/sfx/NGUON.txt."""
import sys, os, json, subprocess, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from banks import BANKS
SR = 32000
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'audio', 'sfx')
MAXLEN = dict(tap=.25, select=.3, tick=.2, undo=.35, place=.45, move=.45, capture=.55, bump=.45, hit=.5, flip=.55, deal=.45,
              pick=.45, pop=.5, clack=.3, ok=.7, bad=.6, coin=.7, whoosh=.7, boom=1.1, win=1.7, lose=1.7, level=1.2, warn=.7,
              dice=.95, splash=.7, jump=.5, shoot=.5, gate=.8)
GAP = 0.12

def load(p):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True)
    if r.returncode: raise SystemExit('Không đọc được ' + p + '\n' + r.stderr.decode())
    return np.frombuffer(r.stdout, dtype=np.float32).astype(np.float64)

def clip(src, name, opt):
    x = load(src)
    if 'off' in opt: x = x[int(opt['off'] * SR):]
    a = np.abs(x); m = a.max()
    if m <= 0: raise SystemExit('Tiếng câm: ' + src)
    idx = np.where(a > m * 0.03)[0]
    x = x[max(0, idx[0] - int(.002 * SR)): idx[-1] + 1]
    lim = opt.get('len', MAXLEN.get(name, .8))
    cut = len(x) > int(lim * SR)
    x = x[:int(lim * SR)].copy()
    fi = min(len(x), int(.002 * SR)); x[:fi] *= np.linspace(0, 1, fi)
    fo = min(len(x), int((.06 if cut else .01) * SR)); x[-fo:] *= np.linspace(1, 0, fo)
    # chuẩn hoá theo đoạn 60 ms to nhất: tiếng nào cũng nghe to ngang nhau, đỉnh không quá 0,9
    w = int(.06 * SR); e = max(np.sqrt((x[i:i + w] ** 2).mean()) for i in range(0, max(1, len(x) - w + 1), w // 2))
    g = (0.2 / e) * 10 ** (opt.get('db', 0) / 20)
    g = min(g, 0.9 / np.abs(x).max())
    return x * g

def build(game, base):
    parts, idx, t = [], {}, 0.0
    for name, items in BANKS[game].items():
        idx[name] = []
        for it in items:
            p, opt = (it, {}) if isinstance(it, str) else it
            y = clip(os.path.join(base, p), name, opt)
            parts.append(y); parts.append(np.zeros(int(GAP * SR)))
            idx[name].append([round(t + 0.0, 3), round(len(y) / SR, 3)])
            t += (len(y) + int(GAP * SR)) / SR
    pcm = np.concatenate(parts).astype(np.float32)
    mp3 = os.path.join(OUT, game + '.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-q:a', '6', mp3],
                   input=pcm.tobytes(), check=True)
    # mp3 có độ trễ đầu tệp (encoder delay); đo lại bằng cách giải mã để bảng cắt khớp
    dec = load(mp3); lag = 0
    n = min(len(dec), len(pcm), SR * 2)
    c = np.correlate(dec[:n + 2000], pcm[:n].astype(np.float64)[:SR // 2], 'valid') if n > SR // 2 else [0]
    lag = int(np.argmax(c)) / SR if len(c) else 0
    for k in idx: idx[k] = [[round(a + lag, 3), d] for a, d in idx[k]]
    json.dump(idx, open(os.path.join(OUT, game + '.json'), 'w'), separators=(',', ':'))
    print('%-20s %5.1f s  %4d KB  lệch %.3f s  %s' % (game, t, os.path.getsize(mp3) // 1024, lag, ' '.join('%s:%d' % (k, len(v)) for k, v in idx.items())))

if __name__ == '__main__':
    base = sys.argv[1]
    for g in (sys.argv[2:] or BANKS): build(g, base)
