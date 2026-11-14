"""Đọc bài Wikipedia tiếng Việt của chủ đề để đối chiếu đáp án (có lưu đệm).

title_of(qids)  -> {qid: tiêu đề bài vi.wikipedia}
text_of(titles) -> {tiêu đề: mã nguồn bài (wikitext)}
supports(text, answer) -> True nếu bài có nhắc tới đáp án
"""
import json, os, re, time, unicodedata
import requests

CACHE = os.environ.get('TT_WD_CACHE', os.path.join(os.path.dirname(__file__), '.cache'))
HEAD = {'User-Agent': 'quiz-question-builder/1.0 (educational game)'}
S = requests.Session(); S.headers.update(HEAD)


def _load(name):
    p = os.path.join(CACHE, name)
    if os.path.exists(p):
        with open(p) as f:
            return json.load(f)
    return {}


def _save(name, d):
    p = os.path.join(CACHE, name)
    with open(p + '.tmp', 'w') as f:
        json.dump(d, f, ensure_ascii=False)
    os.replace(p + '.tmp', p)


def _get(url, params):
    for i in range(40):
        try:
            r = S.get(url, params=params, timeout=60)
            if r.status_code in (429, 503):
                wait = int(r.headers.get('Retry-After', '0') or 0) or min(30 * (i + 1), 300)
                import sys; print('  bị giới hạn', r.status_code, 'chờ', wait, file=sys.stderr, flush=True)
                time.sleep(wait); continue
            r.raise_for_status()
            return r.json()
        except Exception as e:
            import sys; print('  lỗi gọi', url, str(e)[:200], file=sys.stderr)
            time.sleep(5 * (i + 1))
    raise RuntimeError('Không gọi được ' + url)


def title_of(qids):
    """Tiêu đề bài vi.wikipedia của từng thực thể, lấy qua API Wikidata (wbgetentities) theo lô 50."""
    cache = _load('vititles.json')
    need = [q for q in dict.fromkeys(qids) if q not in cache]
    for i in range(0, len(need), 50):
        chunk = need[i:i + 50]
        d = _get('https://www.wikidata.org/w/api.php', {'action': 'wbgetentities', 'ids': '|'.join(chunk), 'props': 'sitelinks',
                                                        'sitefilter': 'viwiki', 'format': 'json'})
        for q in chunk:
            cache[q] = None
        for q, e in d.get('entities', {}).items():
            sl = (e.get('sitelinks') or {}).get('viwiki')
            if sl:
                cache[q] = sl['title']
        if i % 1000 == 0:
            _save('vititles.json', cache)
    _save('vititles.json', cache)
    return {q: cache.get(q) for q in qids}


def text_of(titles):
    cache = _load('vitext.json')
    need = [t for t in dict.fromkeys(titles) if t and t not in cache]
    for i in range(0, len(need), 40):
        chunk = need[i:i + 40]
        d = _get('https://vi.wikipedia.org/w/api.php', {'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main',
                                                       'titles': '|'.join(chunk), 'redirects': 1, 'format': 'json', 'formatversion': 2})
        time.sleep(2)
        q = d.get('query', {})
        back = {}
        for n in q.get('normalized', []) + q.get('redirects', []):
            back[n['to']] = back.get(n['from'], n['from'])
        for pg in q.get('pages', []):
            txt = ''
            if pg.get('revisions'):
                txt = pg['revisions'][0]['slots']['main'].get('content', '')
            src = back.get(pg['title'], pg['title'])
            cache[src] = txt
            cache.setdefault(pg['title'], txt)
        for t in chunk:
            cache.setdefault(t, '')
        if i % 800 == 0:
            _save('vitext.json', cache)
    _save('vitext.json', cache)
    return {t: cache.get(t, '') for t in titles if t}


def fold(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').replace('đ', 'd')
    return re.sub(r'\s+', ' ', s)


def plain(text):
    t = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', text)   # [[A|B]] -> B
    t = re.sub(r"'{2,}", '', t)
    return unicodedata.normalize('NFC', t).lower()


def supports(text, answer):
    if not text or not answer:
        return False
    a = unicodedata.normalize('NFC', answer).lower().strip()
    p = plain(text)
    if a in p:
        return True
    if re.fullmatch(r'\d{1,4}( tcn)?', a):
        return re.search(r'(?<!\d)' + re.escape(a.split()[0]) + r'(?!\d)', p) is not None
    return fold(a) in fold(p)


def mentions(text, name):
    """Bài có nhắc tên này như một cụm từ riêng (không tính khi nằm trong từ khác)."""
    if not text or not name or len(name) < 3:
        return False
    if _FOLDED.get('k') is not text:
        _FOLDED['k'], _FOLDED['v'] = text, fold(plain(text))
    return re.search(r'(?<!\w)' + re.escape(fold(name)) + r'(?!\w)', _FOLDED['v']) is not None


_FOLDED = {}
