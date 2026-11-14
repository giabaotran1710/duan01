"""Định nghĩa từng loại câu hỏi suy ra từ một nguồn Wikidata."""
import math, re, unicodedata
from collections import defaultdict

# Ngưỡng chia mức theo thứ hạng độ nổi tiếng trong từng loại: (tỉ lệ phần trăm tích lũy, mức)
EASYISH = [(.06, 1), (.22, 2), (.5, 3), (.8, 4), (1, 5)]
NORMAL = [(.04, 2), (.3, 3), (.68, 4), (1, 5)]
HARDISH = [(.15, 3), (.55, 4), (1, 5)]
HARDEST = [(.35, 4), (1, 5)]


def fold(s):
    s = unicodedata.normalize('NFD', s.lower())
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn').replace('đ', 'd')


def yfmt(y):
    y = int(y)
    return f'{-y + 1} TCN' if y <= 0 else str(y)   # năm 0 thiên văn = 1 TCN


def starts(s, words):
    l = s.lower()
    return any(l.startswith(w + ' ') or l == w for w in words)


def pre(word, s, also=()):
    return s if starts(s, (word.lower(),) + tuple(also)) else f'{word} {s}'


class T:
    def __init__(self, name, src, cat, q, mode='single', tiers=NORMAL, cap=400, geo=False,
                 fixed=None, ans_ok=None, subj_ok=None, need_y=False, minpool=8, quote=None):
        self.name, self.src, self.cat, self.qf, self.mode = name, src, cat, q, mode
        self.tiers, self.cap, self.geo, self.fixed = tiers, cap, geo, fixed
        self.ans_ok, self.subj_ok, self.need_y, self.minpool = ans_ok, subj_ok, need_y, minpool

    # gom dòng theo chủ đề
    def group(self, rows, clean):
        g = {}
        for r in rows:
            s = r['s']
            e = g.setdefault(s, {'sid': s, 'L': None, 'en': None, 'sl': 0, 'ans': {}, 'y': set()})
            if e['L'] is None:
                e['L'] = clean(r.get('sL'))
            if r.get('sEn') and not e['en']:
                e['en'] = r['sEn']
            e['sl'] = max(e['sl'], int(float(r.get('sl') or 0)))
            if r.get('o2'):
                e['multi'] = True
            o = r.get('o')
            oL = clean(r.get('oL')) if self.mode not in ('year', 'num') else r.get('oL')
            if o is not None and oL:
                if self.ans_ok and not self.ans_ok(o, oL):
                    continue
                e['ans'].setdefault(o, {'id': o, 'L': oL, 'pop': int(float(r.get('osl') or 0))})
            if r.get('y'):
                try:
                    e['y'].add(int(float(r['y'])))
                except ValueError:
                    pass
        return [e for e in g.values() if e['L'] and e['ans'] and (not self.subj_ok or self.subj_ok(e))]

    def tier_of(self, rank, n):
        p = (rank + 1) / max(n, 1)
        for cut, t in self.tiers:
            if p <= cut:
                return t
        return self.tiers[-1][1]

    def build(self, ctx):
        rows = ctx['data'][self.src]
        rnd, clean, border = ctx['rnd'], ctx['clean'], ctx['border']
        subs = self.group(rows, clean)
        # bỏ chủ đề có nhiều đáp án khác nhau (với câu một đáp án)
        if self.mode in ('single', 'year', 'num'):
            subs = [e for e in subs if not e.get('multi') and len({a['L'].lower() for a in e['ans'].values()}) == 1]
        if self.need_y:
            subs = [e for e in subs if len(e['y']) == 1]
        # tên chủ đề trùng nhau trong cùng loại: bỏ (câu sẽ mơ hồ)
        cnt = defaultdict(int)
        for e in subs:
            cnt[e['L'].lower()] += 1
        subs = [e for e in subs if cnt[e['L'].lower()] == 1]
        pool = {}
        for e in subs:
            for a in e['ans'].values():
                pool.setdefault(a['L'].lower(), a)
        if self.fixed:
            pool = {k: v for k, v in pool.items() if v['id'] in self.fixed}
        pool = list(pool.values())
        if self.mode not in ('year', 'num') and len(pool) < self.minpool:
            return []
        subs.sort(key=lambda e: -e['sl'])
        out = []
        for rank, e in enumerate(subs):
            q = self.qf(e)
            if not q:
                continue
            truth = {a['L'].lower() for a in e['ans'].values()}
            truth_ids = set(e['ans'])
            ans = max(e['ans'].values(), key=lambda a: a['pop'])
            if ans['L'].lower() == e['L'].lower():
                continue
            if self.mode != 'year' and len(ans['L']) >= 3 and fold(ans['L']) in fold(e['L']):
                continue   # đáp án lộ ngay trong tên chủ đề
            tier = self.tier_of(rank, len(subs))
            if self.mode == 'year':
                wrong = year_wrong(rnd, int(float(ans['id'])), tier)
                a_txt = yfmt(int(float(ans['id'])))
                if re.search(r'(?<!\d)' + str(int(float(ans['id']))) + r'(?!\d)', e['L']):
                    continue
            elif self.mode == 'num':
                wrong = num_wrong(rnd, int(float(ans['id'])))
                a_txt = ans['L']
            else:
                a_txt = ans['L']
                bad = set(truth_ids)
                if self.geo:
                    for i in truth_ids:
                        bad |= border.get(i, set())
                cand = [p for p in pool if p['id'] not in bad and p['L'].lower() not in truth
                        and p['L'].lower() != e['L'].lower()]
                if len(cand) < 3:
                    continue
                lp = math.log(ans['pop'] + 2)
                cand.sort(key=lambda p: abs(math.log(p['pop'] + 2) - lp) + rnd.random() * .8)
                near = cand[:25]
                rnd.shuffle(near)
                wrong, seen = [], {a_txt.lower()}
                for p in near:
                    if p['L'].lower() not in seen:
                        wrong.append(p['L']); seen.add(p['L'].lower())
                    if len(wrong) == 3:
                        break
                if len(wrong) < 3:
                    continue
            out.append({'type': self.name, 'cat': self.cat, 'tier': tier, 'q': q, 'a': [a_txt] + wrong,
                        'sid': e['sid'], 'aid': ans['id'] if self.mode not in ('year', 'num') else '',
                        'pop': e['sl'], 'subj': e['L']})
        return out


def year_wrong(rnd, y, tier):
    span = {1: 40, 2: 25, 3: 15, 4: 10, 5: 6}[tier]
    if y < 1500:
        span *= 3
    opts = set()
    while len(opts) < 3:
        d = rnd.randint(1, span) * rnd.choice((-1, 1))
        v = y + d
        if v != y and (y > 0) == (v > 0) and v <= 2026:
            opts.add(v)
    return [yfmt(v) for v in opts]


def num_wrong(rnd, n):
    opts = set()
    while len(opts) < 3:
        v = n + rnd.choice((-3, -2, -1, 1, 2, 3, 4, -4, 8, -8, 10, -10))
        if v > 0 and v != n:
            opts.add(v)
    return [str(v) for v in opts]


class Nobel(T):
    FIELD = {'Q38104': 'Vật lý', 'Q44585': 'Hóa học', 'Q80061': 'Sinh lý học hoặc Y học', 'Q37922': 'Văn học',
             'Q35637': 'Hòa bình', 'Q47170': 'Kinh tế'}

    def build(self, ctx):
        rows, clean, rnd = ctx['data'][self.src], ctx['clean'], ctx['rnd']
        by = defaultdict(dict)       # (field, year) -> {person: (label, sl)}
        person_fields = defaultdict(set)
        for r in rows:
            L = clean(r.get('sL'))
            if not L or not r.get('y'):
                continue
            by[(r['o'], int(float(r['y'])))][r['s']] = (L, int(float(r['sl'])))
            person_fields[r['s']].add(r['o'])
        out = []
        field_people = defaultdict(list)
        for (f, y), ps in by.items():
            for pid, (L, sl) in ps.items():
                field_people[f].append((pid, L, y, sl))
        for (f, y), ps in by.items():
            if len(ps) != 1:
                continue
            pid, (L, sl) = next(iter(ps.items()))
            cand = [c for c in field_people[f] if c[0] != pid and c[1].lower() != L.lower() and abs(c[2] - y) <= 25]
            names = []
            rnd.shuffle(cand)
            for c in cand:
                if c[1] not in names and c[1] != L:
                    names.append(c[1])
                if len(names) == 3:
                    break
            if len(names) < 3:
                continue
            tier = 3 if sl >= 120 else 4 if sl >= 60 else 5
            out.append({'type': self.name, 'cat': 'su' if f == 'Q35637' else 'van' if f == 'Q37922' else 'kh' if f in ('Q38104', 'Q44585') else 'yt' if f == 'Q80061' else 'dl',
                        'tier': tier, 'q': f'Ai là người duy nhất đoạt giải Nobel {self.FIELD[f]} năm {y}?', 'a': [L] + names,
                        'sid': pid, 'aid': f, 'pop': sl, 'subj': L})
        # lĩnh vực đoạt giải (người chỉ đoạt một lĩnh vực)
        lab = {}
        for r in rows:
            lab.setdefault(r['s'], (clean(r.get('sL')), int(float(r['sl']))))
        for pid, fs in person_fields.items():
            L, sl = lab[pid]
            if len(fs) != 1 or not L or sl < 50:
                continue
            f = next(iter(fs))
            others = [v for k, v in self.FIELD.items() if k != f]
            rnd.shuffle(others)
            out.append({'type': 'nobel_field', 'cat': 'dl', 'tier': 3 if sl >= 150 else 4 if sl >= 80 else 5,
                        'q': f'{L} đoạt giải Nobel ở lĩnh vực nào?', 'a': [self.FIELD[f]] + others[:3],
                        'sid': pid, 'aid': f, 'pop': sl, 'subj': L})
        return out


PLANETS = {'Q2', 'Q111', 'Q319', 'Q193', 'Q324', 'Q332', 'Q339'}
CONTINENTS = {'Q15', 'Q48', 'Q46', 'Q49', 'Q18', 'Q538', 'Q51'}


def film_q(e):
    y = next(iter(e['y'])) if len(e['y']) == 1 else None
    tail = []
    if e['en'] and e['en'].lower() != e['L'].lower() and len(e['en']) < 60:
        tail.append(f'tựa gốc "{e["en"]}"')
    if y:
        tail.append(f'năm {y}')
    return f'Bộ phim "{e["L"]}"' + (f' ({", ".join(tail)})' if tail else '') + ' do ai đạo diễn?'


def plain(word):
    return lambda e: e


TYPES = [
    T('film_director', 'film_director', 'nt', film_q, tiers=[(.05, 2), (.3, 3), (.65, 4), (1, 5)], cap=650),
    T('book_author', 'book_author', 'van', lambda e: f'Tác phẩm "{e["L"]}" là của tác giả nào?', tiers=[(.08, 2), (.35, 3), (.7, 4), (1, 5)], cap=650),
    T('painting_artist', 'painting_artist', 'nt', lambda e: f'Bức tranh "{e["L"]}" là tác phẩm của họa sĩ nào?', tiers=[(.1, 2), (.4, 3), (.75, 4), (1, 5)], cap=300),
    T('music_composer', 'music_composer', 'nt', lambda e: f'Tác phẩm âm nhạc "{e["L"]}" do ai sáng tác?', tiers=[(.08, 2), (.35, 3), (.7, 4), (1, 5)], cap=350),
    T('building_architect', 'building_architect', 'nt', lambda e: f'Công trình "{e["L"]}" do kiến trúc sư nào thiết kế?', tiers=HARDISH, cap=250),
    T('band_country', 'band_country', 'nt', lambda e: f'Ban nhạc/nhóm nhạc "{e["L"]}" đến từ quốc gia nào?', tiers=[(.1, 2), (.45, 3), (.8, 4), (1, 5)], cap=250, geo=True),
    T('album_artist', 'album_artist', 'nt', lambda e: f'Album "{e["L"]}" là của nghệ sĩ nào?', tiers=HARDISH, cap=250),
    T('tvseries_country', 'tvseries_country', 'nt', lambda e: f'Phim truyền hình "{e["L"]}" được sản xuất ở quốc gia nào?', tiers=NORMAL, cap=200),
    T('city_country', 'city_country', 'dia', lambda e: f'{pre("Thành phố", e["L"])} thuộc quốc gia nào?', tiers=EASYISH, cap=600, geo=True),
    T('country_capital', 'country_capital', 'dia', lambda e: f'Thủ đô của {e["L"]} là thành phố nào?', tiers=EASYISH, cap=200),
    T('country_currency', 'country_currency', 'dl', lambda e: f'Đơn vị tiền tệ chính thức của {e["L"]} là gì?', tiers=[(.1, 2), (.4, 3), (.75, 4), (1, 5)], cap=200),
    T('country_continent', 'country_continent', 'dia', lambda e: f'{e["L"]} thuộc châu lục nào?', tiers=[(.25, 1), (.6, 2), (1, 3)], cap=200, fixed=CONTINENTS, minpool=4),
    T('country_highpoint', 'country_highpoint', 'dia', lambda e: f'Điểm cao nhất của {e["L"]} là đâu?', tiers=HARDISH, cap=180),
    T('country_language', 'country_language', 'tv', lambda e: f'Ngôn ngữ chính thức của {e["L"]} là gì?', tiers=[(.15, 2), (.5, 3), (.8, 4), (1, 5)], cap=150),
    T('country_tld', 'country_tld', 'cn', lambda e: f'Tên miền quốc gia cấp cao nhất của {e["L"]} là gì?', tiers=HARDISH, cap=200),
    T('country_calling', 'country_calling', 'cn', lambda e: f'Mã điện thoại quốc tế của {e["L"]} là gì?', tiers=HARDEST, cap=200),
    T('mountain_country', 'mountain_country', 'dia', lambda e: f'{pre("Núi", e["L"], ("đỉnh", "dãy", "cao nguyên", "mount", "mont", "monte"))} nằm ở quốc gia nào?', tiers=HARDISH, cap=250, geo=True),
    T('river_mouth', 'river_mouth', 'dia', lambda e: f'{pre("Sông", e["L"])} đổ ra đâu?', tiers=HARDISH, cap=250),
    T('lake_country', 'lake_country', 'dia', lambda e: f'{pre("Hồ", e["L"], ("biển",))} nằm ở quốc gia nào?', tiers=HARDISH, cap=200, geo=True),
    T('island_country', 'island_country', 'dia', lambda e: f'{pre("Đảo", e["L"], ("quần đảo",))} thuộc chủ quyền quốc gia nào?', tiers=HARDISH, cap=250, geo=True),
    T('heritage_country', 'heritage_country', 'dia', lambda e: f'Di sản thế giới "{e["L"]}" nằm ở quốc gia nào?', tiers=NORMAL, cap=400, geo=True),
    T('volcano_country', 'volcano_country', 'dia', lambda e: f'{pre("Núi lửa", e["L"], ("núi",))} nằm ở quốc gia nào?', tiers=HARDISH, cap=120, geo=True),
    T('desert_country', 'desert_country', 'dia', lambda e: f'{pre("Sa mạc", e["L"], ())} nằm ở quốc gia nào?', tiers=HARDISH, cap=60, geo=True),
    T('university_country', 'university_country', 'dl', lambda e: f'{e["L"]} nằm ở quốc gia nào?', tiers=NORMAL, cap=250, geo=True,
      subj_ok=lambda e: starts(e['L'], ('đại học', 'trường', 'viện', 'học viện'))),
    T('airport_city', 'airport_city', 'dia', lambda e: f'{pre("Sân bay", e["L"], ("cảng hàng không",))} phục vụ thành phố nào?', tiers=HARDISH, cap=200),
    T('moon_planet', 'moon_planet', 'kh', lambda e: f'Vệ tinh tự nhiên {e["L"]} quay quanh thiên thể nào?', tiers=[(.2, 3), (.6, 4), (1, 5)], cap=80, fixed=PLANETS, minpool=4),
    T('star_constellation', 'star_constellation', 'kh', lambda e: f'Ngôi sao {e["L"]} nằm trong chòm sao nào?', tiers=HARDISH, cap=150),
    T('element_symbol', 'element_symbol', 'kh', lambda e: f'Nguyên tố {e["L"]} có ký hiệu hóa học là gì?', tiers=[(.15, 2), (.45, 3), (.75, 4), (1, 5)], cap=118),
    T('element_number', 'element_number', 'kh', lambda e: f'Nguyên tố {e["L"]} có số hiệu nguyên tử là bao nhiêu?', mode='num', tiers=[(.3, 3), (.65, 4), (1, 5)], cap=118),
    T('element_discoverer', 'element_discoverer', 'kh', lambda e: f'Ai được ghi nhận là người phát hiện ra nguyên tố {e["L"]}?', tiers=HARDEST, cap=80),
    T('disease_cause', 'disease_cause', 'yt', lambda e: f'Bệnh {e["L"]} do tác nhân nào gây ra?', tiers=HARDISH, cap=80),
    T('species_family', 'species_family_animal', 'sv', lambda e: f'Loài {e["L"]} thuộc họ nào trong phân loại sinh học?', tiers=HARDISH, cap=250,
      ans_ok=lambda o, L: L.lower().startswith('họ ')),
    T('unit_namedafter', 'unit_namedafter', 'kh', lambda e: f'Đơn vị đo "{e["L"]}" được đặt theo tên nhà khoa học nào?', tiers=HARDISH, cap=40),
    T('law_namedafter', 'law_namedafter', 'kh', lambda e: f'"{e["L"]}" được đặt theo tên ai?', tiers=HARDISH, cap=120),
    T('invention_inventor', 'invention_inventor', 'kh', lambda e: f'Ai được ghi nhận là người phát minh/khám phá ra {e["L"]}?', tiers=HARDISH, cap=150),
    T('mineral_formula', 'mineral_formula', 'kh', lambda e: f'Công thức hóa học của {e["L"]} là gì?', tiers=HARDISH, cap=120),
    T('spacecraft_operator', 'spacecraft_operator', 'kh', lambda e: f'Tàu/sứ mệnh vũ trụ {e["L"]} do cơ quan nào vận hành?', tiers=HARDISH, cap=120),
    T('battle_year', 'battle_year', 'su', lambda e: f'{pre("Trận", e["L"], ("cuộc", "chiến dịch", "vây hãm", "cuộc vây hãm", "hải chiến", "trận đánh", "sự kiện"))} diễn ra vào năm nào?', mode='year', tiers=HARDISH, cap=450),
    T('battle_war', 'battle_war', 'su', lambda e: f'{pre("Trận", e["L"], ("cuộc", "chiến dịch", "vây hãm", "hải chiến", "trận đánh"))} thuộc cuộc chiến tranh/chiến dịch nào?', tiers=HARDISH, cap=350),
    T('war_year', 'war_year', 'su', lambda e: f'{e["L"]} bắt đầu vào năm nào?', mode='year', tiers=HARDISH, cap=250),
    T('treaty_year', 'treaty_year', 'su', lambda e: f'{e["L"]} được ký kết vào năm nào?', mode='year', tiers=HARDISH, cap=200),
    T('dynasty_founder', 'dynasty_founder', 'su', lambda e: f'Ai là người sáng lập {e["L"]}?', tiers=HARDISH, cap=150),
    T('dynasty_start', 'dynasty_start', 'su', lambda e: f'{e["L"]} được thành lập vào năm nào?', mode='year', tiers=HARDEST, cap=150),
    T('empire_capital', 'empire_capital', 'su', lambda e: f'Kinh đô của {e["L"]} đặt ở đâu?', tiers=HARDISH, cap=150),
    T('monarch_dynasty', 'monarch_dynasty', 'su', lambda e: f'{e["L"]} thuộc triều đại/hoàng tộc nào?', tiers=HARDISH, cap=350),
    T('event_year', 'event_year', 'su', lambda e: f'Sự kiện "{e["L"]}" diễn ra vào năm nào?', mode='year', tiers=HARDISH, cap=350),
    T('olympics_city', 'olympics_city', 'the', lambda e: f'{e["L"]} được tổ chức tại thành phố nào?', tiers=[(.3, 3), (.7, 4), (1, 5)], cap=80),
    T('worldcup_host', 'worldcup_host', 'the', lambda e: f'{e["L"]} được tổ chức tại quốc gia nào?', tiers=[(.3, 3), (.7, 4), (1, 5)], cap=60),
    T('worldcup_winner', 'worldcup_winner', 'the', lambda e: f'Đội tuyển nào vô địch {e["L"]}?', tiers=[(.3, 3), (.7, 4), (1, 5)], cap=60),
    T('person_birthplace', 'person_birthplace', 'dl', lambda e: f'{e["L"]} sinh ra ở đâu?', tiers=[(.05, 2), (.3, 3), (.65, 4), (1, 5)], cap=700),
    T('person_birthyear', 'person_birthyear', 'su', lambda e: f'{e["L"]} sinh năm nào?', mode='year', tiers=[(.15, 3), (.5, 4), (1, 5)], cap=500),
    T('person_deathyear', 'person_deathyear', 'su', lambda e: f'{e["L"]} mất năm nào?', mode='year', tiers=[(.15, 3), (.5, 4), (1, 5)], cap=400),
    T('person_citizenship', 'person_citizenship', 'dl', lambda e: f'{e["L"]} là công dân của quốc gia nào?', tiers=[(.08, 2), (.35, 3), (.7, 4), (1, 5)], cap=600, geo=True),
    T('person_notablework', 'person_notablework', 'van', lambda e: f'Tác phẩm/công trình nào sau đây gắn với tên tuổi của {e["L"]}?', mode='multi', tiers=[(.06, 2), (.3, 3), (.65, 4), (1, 5)], cap=700),
    T('person_father', 'person_father', 'su', lambda e: f'Cha của {e["L"]} là ai?', tiers=HARDISH, cap=250),
    T('person_sport', 'person_sport', 'the', lambda e: f'{e["L"]} nổi tiếng ở môn thể thao nào?', tiers=[(.12, 1), (.35, 2), (.7, 3), (1, 4)], cap=300),
    T('person_instrument', 'person_instrument', 'nt', lambda e: f'Nhạc cụ nào sau đây gắn với sự nghiệp của {e["L"]}?', mode='multi', tiers=[(.15, 2), (.5, 3), (.85, 4), (1, 5)], cap=150),
    Nobel('nobel', 'nobel', 'dl', None, cap=450),
    T('food_origin', 'food_origin', 'dl', lambda e: f'Món "{e["L"]}" có nguồn gốc từ quốc gia nào?', tiers=[(.12, 1), (.35, 2), (.65, 3), (.88, 4), (1, 5)], cap=300),
    T('drink_origin', 'drink_origin', 'dl', lambda e: f'Đồ uống "{e["L"]}" có nguồn gốc từ quốc gia nào?', tiers=[(.12, 2), (.45, 3), (.8, 4), (1, 5)], cap=150),
    T('dogbreed_origin', 'dogbreed_origin', 'sv', lambda e: f'{pre("Giống chó", e["L"], ("chó", "giống mèo", "mèo"))} có nguồn gốc từ quốc gia nào?', tiers=[(.12, 2), (.45, 3), (.8, 4), (1, 5)], cap=200),
    T('sport_origin', 'sport_origin', 'the', lambda e: f'Môn thể thao {e["L"]} có nguồn gốc từ quốc gia nào?', tiers=[(.15, 2), (.5, 3), (.8, 4), (1, 5)], cap=120),
    T('instrument_origin', 'instrument_origin', 'nt', lambda e: f'Nhạc cụ {e["L"]} có nguồn gốc từ quốc gia nào?', tiers=HARDISH, cap=100),
    T('company_founder', 'company_founder', 'cn', lambda e: f'Ai là người sáng lập {e["L"]}?', tiers=[(.08, 2), (.4, 3), (.75, 4), (1, 5)], cap=300),
    T('company_country', 'company_country', 'dl', lambda e: f'{e["L"]} là doanh nghiệp của quốc gia nào?', tiers=[(.1, 1), (.3, 2), (.6, 3), (.85, 4), (1, 5)], cap=400),
    T('carbrand_country', 'carbrand_country', 'dl', lambda e: f'Hãng xe {e["L"]} đến từ quốc gia nào?', tiers=[(.15, 1), (.4, 2), (.7, 3), (1, 4)], cap=150),
    T('company_year', 'company_year', 'cn', lambda e: f'{e["L"]} được thành lập vào năm nào?', mode='year', tiers=HARDISH, cap=300),
    T('proglang_designer', 'proglang_designer', 'cn', lambda e: f'Ngôn ngữ lập trình {e["L"]} do ai thiết kế?', tiers=HARDISH, cap=100),
    T('proglang_year', 'proglang_year', 'cn', lambda e: f'Ngôn ngữ lập trình {e["L"]} ra đời năm nào?', mode='year', tiers=HARDISH, cap=100),
    T('software_developer', 'software_developer', 'cn', lambda e: f'"{e["L"]}" do công ty/tổ chức nào phát triển?', tiers=[(.15, 2), (.5, 3), (.85, 4), (1, 5)], cap=200),
    T('club_country', 'club_country', 'the', lambda e: f'{pre("Câu lạc bộ", e["L"])} thuộc quốc gia nào?', tiers=[(.1, 1), (.35, 2), (.7, 3), (1, 4)], cap=350, geo=True),
    T('club_city', 'club_city', 'the', lambda e: f'{pre("Câu lạc bộ", e["L"])} có trụ sở ở thành phố nào?', tiers=[(.15, 2), (.5, 3), (.85, 4), (1, 5)], cap=300),
    T('festival_country', 'festival_country', 'dl', lambda e: f'{e["L"]} gắn với quốc gia nào?', tiers=[(.15, 2), (.5, 3), (1, 4)], cap=100,
      subj_ok=lambda e: starts(e['L'], ('lễ hội', 'tết', 'hội'))),
    T('religion_founder', 'religion_founder', 'dl', lambda e: f'Ai là người sáng lập {e["L"]}?', tiers=HARDISH, cap=60),
]


# --- Đợt 2 (14/11): chỉ mức Khó trở lên ----------------------------------
H3 = [(.3, 3), (.7, 4), (1, 5)]
Q = lambda s: f'"{s}"'
TYPES2 = [
    T('monarch_successor', 'monarch_successor', 'su', lambda e: f'Ai là người kế vị {e["L"]}?', tiers=H3, cap=300),
    T('pope_successor', 'pope_successor', 'su', lambda e: f'Ai là người kế nhiệm {e["L"]} trên ngôi Giáo hoàng?', tiers=HARDEST, cap=80),
    T('person_field', 'person_field', 'dl', lambda e: f'{e["L"]} nổi tiếng với hoạt động trong lĩnh vực nào?', tiers=H3, cap=250),
    T('person_movement', 'person_movement', 'nt', lambda e: f'{e["L"]} gắn với trào lưu, trường phái nào?', tiers=H3, cap=250),
    T('creator_country', 'creator_country', 'dl', lambda e: f'{(e["en"] or "Nhân vật")} {e["L"]} là người nước nào?', tiers=H3, cap=300, geo=True,
      subj_ok=lambda e: bool(e['en']) and len(e['en']) < 30),
    T('work_year', 'work_year', 'van', lambda e: f'Tác phẩm {Q(e["L"])} được xuất bản lần đầu vào năm nào?', mode='year', tiers=H3, cap=250),
    T('film_year', 'film_year', 'nt', lambda e: f'Bộ phim {Q(e["L"])} ra mắt năm nào?', mode='year', tiers=H3, cap=200),
    T('character_work', 'character_work', 'van', lambda e: f'Nhân vật {e["L"]} xuất hiện trong tác phẩm nào?', tiers=H3, cap=250),
    T('work_setting', 'work_setting', 'van', lambda e: f'Tác phẩm {Q(e["L"])} lấy bối cảnh chủ yếu ở đâu?', tiers=H3, cap=200),
    T('idea_founder', 'idea_founder', 'dl', lambda e: f'Ai được coi là người khởi xướng {e["L"]}?', tiers=H3, cap=120),
    T('discoverer', 'discoverer', 'kh', lambda e: f'Ai được ghi nhận là người phát hiện hoặc phát minh ra {e["L"]}?', tiers=H3, cap=300),
    T('discovery_year', 'discovery_year', 'kh', lambda e: f'{e["L"]} được phát hiện hoặc phát minh vào năm nào?', mode='year', tiers=H3, cap=250),
    T('building_opening', 'building_opening', 'nt', lambda e: f'Công trình {e["L"]} được khánh thành vào năm nào?', mode='year', tiers=H3, cap=200),
    T('building_style', 'building_style', 'nt', lambda e: f'Công trình {e["L"]} mang phong cách kiến trúc nào?', tiers=H3, cap=200),
    T('landmark_country', 'landmark_country', 'dia', lambda e: f'Công trình {e["L"]} nằm ở quốc gia nào?', tiers=H3, cap=250, geo=True),
    T('bridge_crosses', 'bridge_crosses', 'dia', lambda e: f'{pre("Cầu", e["L"])} bắc qua đâu?', tiers=H3, cap=120),
    T('org_hq', 'org_hq', 'dl', lambda e: f'Trụ sở của {e["L"]} đặt tại thành phố nào?', tiers=H3, cap=150),
    T('org_year', 'org_year', 'su', lambda e: f'{e["L"]} được thành lập vào năm nào?', mode='year', tiers=H3, cap=150),
    T('univ_year', 'univ_year', 'dl', lambda e: f'{e["L"]} được thành lập vào năm nào?', mode='year', tiers=H3, cap=150),
    T('event_country', 'event_country', 'su', lambda e: f'Sự kiện "{e["L"]}" diễn ra ở quốc gia nào?', tiers=H3, cap=250, geo=True),
    T('battle_country', 'battle_country', 'su', lambda e: f'{e["L"]} diễn ra trên lãnh thổ quốc gia nào ngày nay?', tiers=H3, cap=250, geo=True,
      subj_ok=lambda e: starts(e['L'], ('trận', 'cuộc', 'chiến dịch', 'vây hãm', 'cuộc vây hãm', 'hải chiến'))),
    T('spacecraft_launch', 'spacecraft_launch', 'kh', lambda e: f'Tàu/sứ mệnh vũ trụ {e["L"]} được phóng vào năm nào?', mode='year', tiers=H3, cap=150),
    T('deepsky_constellation', 'deepsky_constellation', 'kh', lambda e: f'Thiên thể {e["L"]} nằm trong chòm sao nào?', tiers=H3, cap=120),
]
