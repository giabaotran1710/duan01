"""Suy ra câu hỏi trắc nghiệm từ dữ liệu Wikidata đã tải (fetch.py) và ghi ra
game/thongthai-wiki.js theo định dạng ngân hàng: mức|chủ đề|câu|ĐÚNG|sai|sai|sai

Nguyên tắc:
- Chỉ dùng thực thể có bài trên Wikipedia tiếng Việt và nhãn tiếng Việt.
- Câu "một đáp án" chỉ lấy chủ đề có đúng một giá trị (bỏ chủ đề có nhiều đáp án).
- Phương án sai lấy từ cùng loại dữ kiện, không trùng bất kỳ giá trị đúng nào của chủ đề;
  với câu "nằm ở nước nào" còn loại các nước có chung biên giới với đáp án.
- Mức dễ/khó theo độ nổi tiếng (số trang Wikipedia các ngôn ngữ có bài về chủ đề).
- Bỏ câu trùng nội dung với ngân hàng viết tay sẵn có.
Ghi kèm tool/thongthai-wiki/audit.tsv: khóa câu, mã Wikidata, loại, để tra lại nguồn.
"""
import glob, json, os, random, re, sys, unicodedata
from collections import defaultdict
import wd
from sources import SOURCES
from types_cfg import TYPES, TYPES2

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
# TT_SET=2: đợt 2 (dạng câu mới, chỉ mức Khó trở lên) ghi ra file riêng, không đụng đợt 1
SET2 = os.environ.get('TT_SET') == '2'
OUT = os.path.join(ROOT, 'game', 'thongthai-wiki2.js' if SET2 else 'thongthai-wiki.js')
AUDIT = os.path.join(os.path.dirname(__file__), 'audit2.tsv' if SET2 else 'audit.tsv')
if SET2:
    TYPES = TYPES2 + [t for t in TYPES if t.name == 'moon_planet']
TARGET_EASY = int(os.environ.get('TT_EASY', '0' if os.environ.get('TT_SET') == '2' else '1555'))     # mức 1-2 cần thêm
TARGET_HARD = int(os.environ.get('TT_HARD', '6500'))     # mức 3-5 cần thêm

rnd = random.Random(20261114)


def norm(s):
    s = unicodedata.normalize('NFC', s).lower()
    return re.sub(r'[^\w]+', ' ', s).strip()


PAREN = re.compile(r'\s*\((?:phim|tiểu thuyết|truyện|sách|bài hát|album|tranh|nhạc kịch|vở|kịch|opera|giao hưởng|ban nhạc|nhóm nhạc|ca sĩ|thành phố|núi|sông|hồ|đảo|trò chơi|phần mềm|ngôn ngữ lập trình|công ty|hãng|tàu|trận|chiến dịch|hiệp ước|tạp chí|câu lạc bộ|nhà văn|họa sĩ|nhạc sĩ|tác phẩm|bản nhạc|ca khúc|vũ khí|món|đồ uống|giống chó|thức ăn|hoàng đế|vua|nữ hoàng|định luật|đơn vị)[^)]*\)\s*$', re.I)


# câu hỏi về địa điểm cấp thành phố: phương án sai có thể là nơi chứa/giáp đáp án
NEAR_PLACE = {'club_city', 'person_birthplace', 'airport_city', 'empire_capital', 'country_capital', 'river_mouth'}


def cap(s):
    """Viết hoa chữ đầu cho đồng đều (giữ nguyên kiểu iPhone, eBay)."""
    if s and s[0].islower() and not (len(s) > 1 and s[1].isupper()):
        return s[0].upper() + s[1:]
    return s


def adjust(it):
    """Chỉnh tay sau khi rà mẫu: trả về None để bỏ câu."""
    if it['type'] == 'carbrand_country':
        if it['subj'] in ('Stellantis',):
            return None   # tập đoàn đa quốc gia, trụ sở pháp lý khác nơi khởi nguồn
        it['q'] = it['q'].replace('Hãng xe ', 'Hãng ', 1)
    if it['type'] == 'club_country' and it['a'][0] == 'Litva':
        it['tier'] = max(it['tier'], 4)   # CLB Litva có nhiều trang wiki nhưng ít người biết
    if it['tier'] == 1 and (it['pop'] < EASY1.get(it['type'], 10 ** 9) or it['subj'] in DENY1):
        it['tier'] = 2
    it['q'] = cap(it['q'])
    it['a'] = [cap(x) for x in it['a']]
    return it


SPORT_OCC = {'Q2066131', 'Q937857', 'Q10833314', 'Q3665646', 'Q10843402', 'Q11338576', 'Q10871364', 'Q13141064', 'Q11774891',
             'Q10873124', 'Q2309784', 'Q11513337', 'Q628099', 'Q15117302', 'Q10841764', 'Q12840545', 'Q14089670', 'Q11303721',
             'Q18515558', 'Q13381753', 'Q16029547', 'Q19204627', 'Q13382355', 'Q41583', 'Q3014296', 'Q10843263', 'Q13474373',
             'Q4009406', 'Q13381863', 'Q17361156', 'Q15306067', 'Q19841381', 'Q13382533', 'Q2730732', 'Q15972912', 'Q4144610',
             'Q10349745', 'Q9149093', 'Q11124885', 'Q12299841', 'Q9017214', 'Q13219587', 'Q13381572'}

# mức Dễ chỉ dành cho kiến thức gần như ai cũng biết: loại câu + ngưỡng số trang Wikipedia các ngôn ngữ
EASY1 = {'city_country': 265, 'country_capital': 380, 'country_continent': 370, 'person_sport': 100,
         'club_country': 120, 'company_country': 115, 'carbrand_country': 110}
DENY1 = {'Edirne', 'Tirana', 'Santiago', 'Bogotá', 'Coritiba Foot Ball Club', 'Baskin Robbins', 'SpaceX', 'Albania', 'Algérie',
         'Iran', 'Israel', 'México', 'Ấn Độ', 'Sankt-Peterburg', 'Helsinki', 'Warszawa'}


ALIAS = {'Vương quốc Liên hiệp Anh và Bắc Ireland': 'Vương quốc Anh', 'Cộng hòa Nhân dân Trung Hoa': 'Trung Quốc'}


def clean(label):
    if label is None:
        return None
    s = unicodedata.normalize('NFC', label).strip()
    s = ALIAS.get(s, s)
    s = PAREN.sub('', s).strip()
    if not s or '|' in s or '`' in s or '\n' in s or '$' in s:
        return None
    if re.fullmatch(r'Q\d+', s) or len(s) > 90:
        return None
    if '(' in s and ')' in s and s.endswith(')') and not s.startswith('('):
        return None   # còn ngoặc phân biệt nghĩa lạ: bỏ cho an toàn
    if re.match(r'^(Danh sách|Thể loại|Bản mẫu)', s):
        return None
    return s


def load_existing():
    qs, pairs = set(), []
    files = glob.glob(os.path.join(ROOT, 'game', 'thongthai-bank*.js')) + glob.glob(os.path.join(ROOT, 'game', 'thongthai-wiki*.js'))
    for f in sorted(x for x in files if os.path.abspath(x) != OUT):
        for line in open(f, encoding='utf-8'):
            p = line.rstrip('\n').split('|')
            if len(p) == 7 and p[0] in '12345':
                qs.add(norm(p[2]))
                pairs.append((norm(p[2]), norm(p[3])))
    return qs, pairs


def main():
    want = {t.src for t in TYPES} | {'country_border'}
    data = {name: wd.run(sql, name) for name, sql in SOURCES.items() if name in want and (os.environ.get('TT_ONLY') is None or name in os.environ['TT_ONLY'].split(','))}
    ctx = {'data': data, 'rnd': rnd, 'clean': clean}
    # biên giới & châu lục để chọn phương án sai cho câu "ở nước nào"
    # nghề nghiệp của người trong câu "nổi tiếng ở môn thể thao nào": chỉ giữ người làm nghề thể thao
    if 'person_sport' in data:
        ids = sorted({r['s'] for r in data['person_sport']})
        occ = defaultdict(set)
        for i in range(0, len(ids), 250):
            rows = wd.q('SELECT ?s ?o WHERE { VALUES ?s { ' + ' '.join('wd:' + x for x in ids[i:i + 250]) + ' } ?s wdt:P106 ?o. }', 'occ')
            for r in rows:
                occ[r['s']].add(r['o'])
        nonsport = {'Q82955', 'Q116', 'Q36180', 'Q611644', 'Q250867', 'Q2285706', 'Q193391', 'Q49757', 'Q6625963', 'Q1234713'}
        data['person_sport'] = [r for r in data['person_sport'] if occ[r['s']] & SPORT_OCC and not occ[r['s']] & nonsport]
    border = defaultdict(set)
    for r in data.get('country_border', []):
        border[r['s']].add(r['o']); border[r['o']].add(r['s'])
    ctx['border'] = border
    existing_q, existing_pairs = load_existing()
    ex_by_ans = defaultdict(list)
    for q, a in existing_pairs:
        ex_by_ans[a].append(q)

    all_items = []
    stats = {}
    for t in TYPES:
        try:
            items = t.build(ctx)
        except KeyError as e:
            print('bỏ qua', t.name, 'thiếu nguồn', e); continue
        stats[t.name] = len(items)
        all_items.extend(items)

    # loại trùng câu (cùng câu khác đáp án thì bỏ cả hai), trùng với ngân hàng cũ
    byq = defaultdict(list)
    for it in all_items:
        byq[norm(it['q'])].append(it)
    kept = []
    seen_fact = set()   # cùng chủ đề + cùng đáp án ở hai loại câu (vd hãng xe / doanh nghiệp): giữ một
    dropped_dup = dropped_old = 0
    for k, lst in byq.items():
        if len({norm(x['a'][0]) for x in lst}) > 1:
            dropped_dup += len(lst); continue
        it = lst[0]
        if k in existing_q:
            dropped_old += 1; continue
        subj = norm(it.get('subj', ''))
        a0 = norm(it['a'][0])
        if subj and any(subj in q for q in ex_by_ans.get(a0, [])):
            dropped_old += 1; continue
        fact = (it['sid'], a0)
        if fact in seen_fact:
            dropped_dup += 1; continue
        seen_fact.add(fact)
        kept.append(it)

    # đối chiếu với bài Wikipedia tiếng Việt của chủ đề: chỉ giữ câu mà bài có nhắc tới đáp án
    if os.environ.get('TT_NOVERIFY') is None:
        import wiki
        titles = wiki.title_of([it['sid'] for it in kept])
        texts = wiki.text_of([t for t in titles.values() if t])
        ok = []
        miss = defaultdict(int)
        for it in kept:
            txt = texts.get(titles.get(it['sid']) or '', '')
            if it['type'] == 'nobel':
                y = re.search(r'năm (\d{4})', it['q']).group(1)
                good = wiki.supports(txt, 'nobel') and wiki.supports(txt, y)
            elif it['type'] == 'nobel_field':
                good = wiki.supports(txt, 'nobel') and wiki.supports(txt, it['a'][0].split()[0])
            elif it['type'] == 'country_calling':
                good = wiki.supports(txt, it['a'][0]) or wiki.supports(txt, it['a'][0].lstrip('+'))
            else:
                good = wiki.supports(txt, it['a'][0])
            if good and it['type'] in NEAR_PLACE and any(wiki.mentions(txt, d) for d in it['a'][1:]):
                good = False   # phương án sai cũng xuất hiện trong bài (vd quận/thành phố chứa nhau): bỏ cho chắc
                miss['(sai có trong bài) ' + it['type']] += 1
            if good:
                ok.append(it)
            else:
                miss[it['type']] += 1
        print('đối chiếu Wikipedia: giữ', len(ok), '/', len(kept))
        for k in sorted(miss):
            print(f'    không thấy đáp án trong bài: {k:22s} {miss[k]}')
        kept = ok

    # chọn theo chỉ tiêu: ưu tiên đa dạng loại câu (xoay vòng giữa các loại)
    def take(pool, n):
        by_t = defaultdict(list)
        for it in pool:
            by_t[it['type']].append(it)
        for lst in by_t.values():
            lst.sort(key=lambda x: -x['pop'])
        out = []
        caps = {t.name: t.cap for t in TYPES}
        used = defaultdict(int)
        while len(out) < n:
            progressed = False
            for name in sorted(by_t):
                lst = by_t[name]
                if lst and used[name] < caps.get(name, 10 ** 9):
                    out.append(lst.pop(0)); used[name] += 1; progressed = True
                    if len(out) >= n:
                        break
            if not progressed:
                break
        return out

    kept = [y for y in (adjust(x) for x in kept) if y]
    easy = take([x for x in kept if x['tier'] <= 2], TARGET_EASY)
    hard = take([x for x in kept if x['tier'] >= 3], TARGET_HARD)
    chosen = easy + hard
    print(f'tạo {len(all_items)}, trùng nội bộ bỏ {dropped_dup}, trùng ngân hàng cũ bỏ {dropped_old}, còn {len(kept)}')
    print(f'chọn: dễ/vừa {len(easy)} / {TARGET_EASY}, khó+ {len(hard)} / {TARGET_HARD}')
    per = defaultdict(lambda: [0] * 6)
    for it in chosen:
        per[it['type']][it['tier']] += 1
    for name in sorted(per):
        print(f'  {name:24s} sinh {stats.get(name, 0):5d}  chọn {sum(per[name]):5d}  theo mức {per[name][1:]}')

    chosen.sort(key=lambda x: (x['tier'], x['type'], x['q']))
    lines = []
    with open(AUDIT, 'w', encoding='utf-8') as fa:
        fa.write('muc\tloai\tchu_de\tdap_an\tso_trang_wiki\tcau\n')
        for it in chosen:
            fields = [str(it['tier']), it['cat'], it['q']] + it['a']
            assert len(fields) == 7 and all('|' not in f and f.strip() for f in fields), fields
            lines.append('|'.join(fields))
            fa.write(f"{it['tier']}\t{it['type']}\t{it['sid']}\t{it.get('aid', '')}\t{it['pop']}\t{it['q']}\n")
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('/* Thông thái trắc nghiệm - câu hỏi suy ra từ dữ liệu Wikipedia/Wikidata (tool/thongthai-wiki/build.py).\n'
                ' * Mỗi câu có nguồn ở tool/thongthai-wiki/audit.tsv (mã thực thể Wikidata). */\n')
        f.write('window.TT_ADD(`\n' + '\n'.join(lines) + '\n`);\n')
    print('ghi', OUT, len(lines), 'câu')


if __name__ == '__main__':
    main()
