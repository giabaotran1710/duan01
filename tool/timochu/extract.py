#!/usr/bin/env python3
"""Xây kho từ cho game Tìm ô chữ từ Wiktionary tiếng Việt.

Nguồn (không đưa vào repo vì quá lớn, tải về trước khi chạy):
  1. Wiktionary tiếng Việt, bản trích xuất JSONL của kaikki.org (Wiktextract):
     https://kaikki.org/viwiktionary/Tiếng Việt/kaikki.org-dictionary-TiếngViệt.jsonl
     Nội dung Wiktionary theo giấy phép CC BY-SA 4.0. Phần lớn định nghĩa tiếng Việt trên Wiktionary
     được nhập từ Từ điển tiếng Việt miễn phí (Hồ Ngọc Đức).
  2. Độ phổ biến: tệp đếm tần suất do tool/timochu/corpus_freq.py tạo từ phụ đề phim OpenSubtitles 2016 (OPUS).
     Từ hai tiếng: số lần hai tiếng đứng liền nhau; từ một tiếng: số lần đứng một mình (không nằm trong từ ghép).
  3. Từ hai tiếng còn phải có trong game/noitu-data/noitu-words.md (phần 0 hoặc 1, đã chọn lọc từ trước).

  4. Wiktionary tiếng Anh (kaikki.org, mục tiếng Việt) chỉ để kiểm tra một tiếng có đứng độc lập được không
     và từ loại chính của nó là gì (không lấy nội dung định nghĩa tiếng Anh):
     https://kaikki.org/dictionary/Vietnamese/kaikki.org-dictionary-Vietnamese.jsonl
  5. tool/timochu/review.tsv: kết quả rà soát thủ công (loại từ, chọn từ loại khác, hoặc viết lại gợi ý).
  6. tool/timochu/extra.tsv: từ do người rà soát tự chọn và tự viết gợi ý ("từ<TAB>Từ loại<TAB>Mô tả"), dành cho từ thông dụng bị
     loại vì gợi ý của Wiktionary chứa chính tiếng của đáp án ("tháp canh": "Tháp xây để canh gác...") hoặc chỉ ghi "Như ...".
     Từ trong tệp này vẫn qua kiểm tra chữ cái, danh sách cấm và kiểm tra lộ đáp án.
  7. (tuỳ chọn) Tệp đếm tần suất trên văn bản viết (Wikipedia, báo) do corpus_freq.py tạo, đường dẫn trong biến môi trường
     TIMOCHU_FREQ_WRITTEN. Phụ đề phim ít có từ văn viết như "tháp canh", nên từ hai/ba tiếng đứng liền nhau đủ nhiều lần
     trong văn bản viết cũng được nhận, kể cả khi chưa có trong danh sách của game Nối từ. Ngưỡng: TIMOCHU_W2 (hai tiếng,
     mặc định 25) và TIMOCHU_W3 (ba tiếng, mặc định 40).

Chạy:  [TIMOCHU_FREQ_WRITTEN=<freq-written.tsv>] python3 tool/timochu/extract.py <kaikki-vi.jsonl> <freq.tsv> <kaikki-en-vietnamese.jsonl>
Kết quả: tool/timochu/bank.tsv (để rà soát) và game/timochu-data/words.js (game đọc).

Gợi ý theo đúng cấu trúc của chương trình: "[Từ loại/Khẩu ngữ]. [Mô tả]".
"""
import json, re, sys, os, unicodedata, collections

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
KAIKKI, FREQ, ENWIKT = sys.argv[1], sys.argv[2], sys.argv[3]

# ---------- bảng chữ cái tiếng Việt (mỗi ô một chữ, có dấu thanh) ----------
BASE = 'abcdđeghiklmnopqrstuvxy'
VOWELS = 'aăâeêioôơuưy'
TONED = ('àáảãạ' 'ằắẳẵặ' 'ầấẩẫậ' 'èéẻẽẹ' 'ềếểễệ' 'ìíỉĩị' 'òóỏõọ' 'ồốổỗộ' 'ờớởỡợ' 'ùúủũụ' 'ừứửữự' 'ỳýỷỹỵ')
ALPHA = set(BASE + VOWELS + TONED)

POS_OK = {'Danh từ': 'Danh từ', 'Động từ': 'Động từ', 'Tính từ': 'Tính từ', 'Ngoại động từ': 'Động từ', 'Nội động từ': 'Động từ'}

# nhãn đầu định nghĩa trong ngoặc: bỏ những nghĩa cũ, hiếm, địa phương, lóng, thô tục, chuyên ngành
BAD_LABEL = re.compile(r'thông tục|lỗi thời|phương ngữ|hiếm|cũ|cổ|văn chương|lóng|ít dùng|xúc phạm|không còn dùng|từ nguyên|địa phương|'
                       r'nam bộ|bắc bộ|trung bộ|huế|nam việt nam|phật giáo|thiên chúa|toán|vật lý|hóa học|hoá học|y học|sinh học|giải phẫu|'
                       r'ngôn ngữ học|máy tính|tin học|quân sự|xã hội học|địa lý|văn học|thực vật học|động vật học|kinh tế|triết|chính trị|'
                       r'luật|tôn giáo|hàng hải|nông nghiệp|kỹ thuật|kĩ thuật|âm nhạc|thể thao|hán việt|bóng|trang trọng|tục|internet|'
                       r'mỉa mai|đùa|khinh|thân mật')
BAD_TAGS = {'form-of', 'alt-of', 'no-gloss', 'dated', 'rare', 'dialectal', 'slang', 'vulgar', 'obsolete', 'historical', 'archaic',
            'derogatory', 'Internet', 'neologism', 'humorous', 'figuratively', 'uncommon', 'formal', 'idiomatic', 'offensive',
            'pejorative', 'informal', 'regional', 'literary', 'poetic'}
BAD_START = re.compile(r'^(như |xem |x\.|cách viết|dạng |biến thể|viết tắt|từ dùng|từ biểu thị|từ chỉ |tiếng |tên |tên gọi|họ |'
                       r'loài .* thuộc họ|chữ cái|kí hiệu|ký hiệu|đơn vị đo|đồng nghĩa|trái nghĩa|nghĩa |người dân tộc|dân tộc |'
                       r'thuộc về|có tính chất của|tổ hợp|yếu tố|thành phần)', re.I)
# chủ đề không hợp với game cho mọi lứa tuổi
SENSITIVE = re.compile(r'giao cấu|giao hợp|dương vật|âm hộ|âm đạo|tinh dịch|tình dục|dâm|đĩ|điếm|khiêu dâm|ma tuý|ma túy|thuốc phiện|'
                       r'nha phiến|giết|chém|xác chết|tự tử|treo cổ|chửi|tục tĩu|thô tục|đít|cứt|phân người|nước đái|nước tiểu|'
                       r'bộ phận sinh dục|sinh dục|hậu môn|vú|kinh nguyệt|cương cứng|bọn|thằng|con đĩ|mắng|ỉa|đái|'
                       r'kitô|thiên chúa|chúa trời|đạo phật|phật giáo|mê tín|tà ma|ma quỷ|phù thuỷ|phù thủy|bùa', re.I)
BAN_WORDS = set()
for line in open(os.path.join(ROOT, 'game/noitu-data/noitu-banned.txt'), encoding='utf-8'):
    line = line.strip()
    if line and not line.startswith('#'): BAN_WORDS.add(line.lower())
BAN_WORDS |= {'đéo', 'đếch', 'địt', 'đụ', 'lồn', 'buồi', 'cặc', 'chim', 'bướm', 'đái', 'ỉa', 'đĩ', 'điếm', 'dâm', 'đít', 'vú', 'cứt',
              'chết', 'giết', 'ma tuý', 'ma túy', 'thuốc phiện', 'sex', 'đéo', 'mẹ kiếp', 'chó má', 'khốn nạn', 'súc vật', 'ngu',
              'đần', 'ngốc', 'điên', 'khùng', 'mọi', 'rợ', 'man rợ', 'gái', 'trai', 'tù', 'tù tội', 'quỷ', 'ma', 'xác'}


def nfc(s): return unicodedata.normalize('NFC', s)


def letters(word):
    return word.replace(' ', '')


def word_ok(w):
    if w != w.lower(): return False                      # tên riêng, viết tắt
    if not re.fullmatch(r"[^\W\d_]+( [^\W\d_]+){0,2}", w): return False   # tối đa ba tiếng, chỉ chữ cái
    L = letters(w)
    if not (2 <= len(L) <= 9): return False                # bảng lớn nhất là 9×9
    if any(c not in ALPHA for c in L): return False
    if w in BAN_WORDS or any(s in BAN_WORDS for s in w.split()): return False
    return True


TRAIL_OK = re.compile(r'\s*\((nói khái quát|nói tổng quát|nói chung|nói tắt|nói gộp)\)\s*\.?$')
TRAIL_BAD = re.compile(r'\((cũ|id\.|văn chương|thông tục|ph\.|ít dùng|hiếm|kng\.|trtr\.|vch\.|thgt\.|cd\.)[^)]*\)', re.I)


def clean_gloss(g):
    g = nfc(g).strip()
    g = re.split(r'\s*(Đồng nghĩa|Trái nghĩa|Ví dụ)\s*:', g)[0]
    g = g.lstrip('.;,: ')
    g = re.sub(r'\bv\. ?[Vv]\.?', 'v.v.', g)
    g = re.sub(r'\s+', ' ', g).strip(' ;,:')
    g = TRAIL_OK.sub('', g).strip(' ;,:')
    if not g: return ''
    if g[0] == '(' and len(g) > 1: g = '(' + g[1].upper() + g[2:]
    else: g = g[0].upper() + g[1:]
    if not g.endswith(('.', '!', '?')): g += '.'
    g = g.replace('..', '.')
    return g


def tokens(s):
    return set(re.findall(r'[^\W\d_]+', s.lower()))


def pick_sense(word, pos_title, senses):
    """Chọn nghĩa đầu tiên dùng được; trả về (nhãn, mô tả) hoặc None."""
    sylls = word.split()
    for s in senses:
        tags = set((s.get('tags') or []) + (s.get('raw_tags') or []))
        if tags & BAD_TAGS and 'colloquial' not in tags: continue
        if any(t for t in s.get('raw_tags') or [] if BAD_LABEL.search(t.lower())): continue
        for g in s.get('glosses') or []:
            label = pos_title
            m = re.match(r'^\(([^)]{1,40})\)\s*(.*)$', g)
            if m:
                lab = m.group(1).lower()
                if 'khẩu ngữ' in lab and not BAD_LABEL.search(lab.replace('khẩu ngữ', '')):
                    label, g = 'Khẩu ngữ', m.group(2)
                elif BAD_LABEL.search(lab):
                    continue
            if 'colloquial' in tags: label = 'Khẩu ngữ'
            if BAD_START.match(g.strip()): continue
            if SENSITIVE.search(g): continue
            if re.search(r'\d|https?:|\[|\]|\{|\}|=|…|\.\.\.|~|/', g): continue
            if TRAIL_BAD.search(g): continue
            g2 = clean_gloss(g)
            if not (20 <= len(g2) <= 118): continue
            if len(g2.split()) < 4: continue
            # không để lộ đáp án: định nghĩa không được chứa tiếng nào của chính từ đó
            tk = tokens(g2)
            if any(sy in tk for sy in sylls): continue
            if letters(word) in tk: continue
            return label, g2
    return None


def main():
    # --- độ phổ biến ---
    freq = {}
    for line in open(FREQ, encoding='utf-8'):
        parts = line.rstrip('\n').split('\t')
        freq[nfc(parts[0])] = int(parts[1])
    wfreq = {}
    wp = os.environ.get('TIMOCHU_FREQ_WRITTEN')
    W2, W3 = int(os.environ.get('TIMOCHU_W2', 25)), int(os.environ.get('TIMOCHU_W3', 40))
    if wp:
        for line in open(wp, encoding='utf-8'):
            parts = line.rstrip('\n').split('\t')
            if parts[0].count(' ') >= 1: wfreq[nfc(parts[0])] = int(parts[1])
    md = open(os.path.join(ROOT, 'game/noitu-data/noitu-words.md'), encoding='utf-8').read()
    secs = re.split(r'^# PHẦN (\d)', md, flags=re.M)
    tier2 = {}
    for i in range(1, len(secs), 2):
        part = int(secs[i])
        for line in secs[i + 1].split('\n')[1:]:
            if not line.strip() or line.startswith('#') or line.startswith('Tổng'): continue
            for w in line.split(','):
                w = nfc(w.strip())
                if w: tier2.setdefault(w, part)

    best = {}   # word -> entry
    opts = {}   # word -> {'tier', 'list': [(từ loại, nhãn, mô tả)]}
    with open(KAIKKI, encoding='utf-8') as f:
        for line in f:
            d = json.loads(line)
            pt = d.get('pos_title')
            if pt not in POS_OK: continue
            w = nfc(d.get('word', '').strip())
            if not word_ok(w): continue
            ns = len(w.split())
            c = freq.get(w, 0)
            if ns == 1:
                if c < 6: continue                        # đứng một mình ít nhất 6 lần trong phụ đề (từ ít gặp phải qua rà soát tay)
                tier = 1 if c >= 300 else 2
            else:
                wf = wfreq.get(w, 0)
                old = ns == 2 and tier2.get(w) in (0, 1, 2) and c >= 2   # hai tiếng có trong Nối từ, đứng liền nhau ít nhất 2 lần
                new = wf >= (W2 if ns == 2 else W3)                        # hoặc đủ phổ biến trong văn bản viết
                if not (old or new): continue
                tier = 1 if (c >= 40 or wf >= 400) else 2
            got = pick_sense(w, POS_OK[pt], d.get('senses') or [])
            if not got: continue
            label, desc = got
            opts.setdefault(w, {'tier': tier, 'list': []})['list'].append((POS_OK[pt], label, desc))

    # --- Wiktionary tiếng Anh: tiếng đứng độc lập được không, từ loại chính là gì ---
    EN_POS = {'noun': 'Danh từ', 'verb': 'Động từ', 'adj': 'Tính từ'}
    BAD_EN = {'romanization', 'in-compounds', 'alt-of', 'form-of', 'obsolete', 'archaic', 'dialectal', 'Southern', 'Northern',
              'Central', 'slang', 'vulgar', 'derogatory', 'rare', 'dated', 'Internet', 'abbreviation'}
    en_main = {}
    with open(ENWIKT, encoding='utf-8') as f:
        for line in f:
            d = json.loads(line)
            w = nfc(d.get('word', ''))
            if ' ' in w or w not in opts: continue
            p = EN_POS.get(d.get('pos'))
            if not p: continue
            ok = any(not (set(s.get('tags') or []) & BAD_EN) and s.get('glosses') for s in d.get('senses') or [])
            if ok: en_main.setdefault(w, []).append(p) if p not in en_main.get(w, []) else None

    # --- rà soát thủ công ---
    review = {}
    rp = os.path.join(os.path.dirname(__file__), 'review.tsv')
    if os.path.exists(rp):
        for line in open(rp, encoding='utf-8'):
            if not line.strip() or line.startswith('#'): continue
            parts = line.rstrip('\n').split('\t')
            review[nfc(parts[0].strip())] = parts[1].strip() if len(parts) > 1 else 'x'

    stats = collections.Counter()
    for w, o in opts.items():
        lst = o['list']
        act = review.get(w, '')
        if act == 'x': stats['loại khi rà soát'] += 1; continue
        if len(w.split()) == 1 and not act.startswith('clue='):
            mains = en_main.get(w)
            if not mains: stats['một tiếng không đứng độc lập'] += 1; continue
            # chọn đúng từ loại chính theo Wiktionary tiếng Anh (thứ tự mục)
            pref = [x for m in mains for x in lst if x[0] == m]
            lst = pref or lst
        if act.startswith('pos='):
            lst = [x for x in o['list'] if x[0] == act[4:]] or lst
        if act.startswith('alt='):
            k = int(act[4:]) - 1
            lst = o['list'][k:k + 1] or lst
        if act.startswith('clue='):
            lab, _, desc = act[5:].partition('|')
            lst = [(lab, lab, desc)]
        _, label, desc = lst[0]
        best[w] = {'w': w, 'L': letters(w).upper(), 'label': label, 'desc': desc, 'tier': o['tier']}
    print('Bỏ:', dict(stats))

    # --- từ tự viết gợi ý (extra.tsv) ---
    ep = os.path.join(os.path.dirname(__file__), 'extra.tsv')
    n_extra = 0
    if os.path.exists(ep):
        for line in open(ep, encoding='utf-8'):
            if not line.strip() or line.startswith('#'): continue
            parts = line.rstrip('\n').split('\t')
            if len(parts) < 3: print('extra.tsv: dòng thiếu cột:', line.strip()); continue
            w, lab, desc = nfc(parts[0].strip()), parts[1].strip(), nfc(parts[2].strip())
            if lab not in POS_OK.values() or not word_ok(w):
                print('extra.tsv: bỏ', w, lab); continue
            if w in best: continue                      # đã có từ Wiktionary
            c = freq.get(w, 0); wf = wfreq.get(w, 0)
            best[w] = {'w': w, 'L': letters(w).upper(), 'label': lab, 'desc': desc, 'tier': 1 if (c >= 40 or wf >= 400) else 2}
            n_extra += 1
    print('Từ tự viết gợi ý:', n_extra)

    bank = sorted(best.values(), key=lambda e: (e['tier'], len(e['L']), e['w']))
    # mô tả trùng nhau giữa hai từ: bỏ bớt để mỗi gợi ý chỉ có một đáp án
    by_desc = collections.defaultdict(list)
    for e in bank: by_desc[e['desc'].lower()].append(e)
    bank = [e for e in bank if len(by_desc[e['desc'].lower()]) == 1]

    # gợi ý không được chứa chính tiếng nằm trong đáp án (kể cả gợi ý viết tay)
    leak = []
    for e in bank:
        toks = set(re.findall(r'[^\W\d_]+', e['desc'].lower()))
        if any(t in toks for t in e['w'].split()): leak.append(e['w'])
    if leak: print('CẢNH BÁO gợi ý lộ đáp án:', leak)
    bank = [e for e in bank if e['w'] not in leak]

    with open(os.path.join(os.path.dirname(__file__), 'bank.tsv'), 'w', encoding='utf-8') as f:
        f.write('tu\tchu\tnhan\tmo_ta\tmuc\n')
        for e in bank: f.write(f"{e['w']}\t{e['L']}\t{e['label']}\t{e['desc']}\t{e['tier']}\n")
    # --- xuất cho game: mỗi dòng "từ|nhãn|mô tả|mức" ---
    CODE = {'Danh từ': 'D', 'Động từ': 'Đ', 'Tính từ': 'T', 'Khẩu ngữ': 'K'}
    lines = []
    for e in sorted(bank, key=lambda e: e['w']):
        assert '|' not in e['desc'] and '\n' not in e['desc'] and '`' not in e['desc'] and '\\' not in e['desc']
        lines.append(f"{e['w']}|{CODE[e['label']]}|{e['desc']}|{e['tier']}")
    out = os.path.join(ROOT, 'game/timochu-data/words.js')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('// Kho từ cho game Tìm ô chữ — tạo bởi tool/timochu/extract.py, không sửa tay.\n')
        f.write('// Định nghĩa dựa trên Wiktionary tiếng Việt (CC BY-SA 4.0, qua kaikki.org/Wiktextract),\n')
        f.write('// đã rà soát, rút gọn và viết lại thủ công. Độ phổ biến: phụ đề OpenSubtitles 2016 (OPUS).\n')
        f.write('// Mỗi dòng: từ|nhãn (D danh từ, Đ động từ, T tính từ, K khẩu ngữ)|mô tả|mức phổ biến (1 thông dụng, 2 ít hơn)\n')
        f.write('window.TIMOCHU_WORDS = `' + '\n'.join(lines) + '`;\n')
    print('đã ghi', out, os.path.getsize(out), 'byte')
    print('Tổng:', len(bank), dict(collections.Counter(e['label'] for e in bank)))
    print('Theo mức:', dict(collections.Counter(e['tier'] for e in bank)))
    print('Theo số chữ:', dict(sorted(collections.Counter(len(e['L']) for e in bank).items())))


if __name__ == '__main__':
    main()
