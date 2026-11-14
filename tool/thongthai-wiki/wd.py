"""Truy vấn Wikidata (dữ liệu có cấu trúc của Wikipedia) và lưu đệm kết quả.

Dùng chung cho build.py. Mỗi truy vấn trả về danh sách dict {biến: giá trị}.
Kết quả được lưu vào thư mục đệm để chạy lại không phải gọi mạng.
"""
import hashlib, json, os, sys, time
import requests

CACHE = os.environ.get('TT_WD_CACHE', os.path.join(os.path.dirname(__file__), '.cache'))
os.makedirs(CACHE, exist_ok=True)
URL = 'https://query.wikidata.org/sparql'
HEAD = {'Accept': 'application/sparql-results+json', 'User-Agent': 'quiz-question-builder/1.0 (educational game)'}

PREFIX = """PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX ps: <http://www.wikidata.org/prop/statement/>
PREFIX pq: <http://www.wikidata.org/prop/qualifier/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX schema: <http://schema.org/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
"""


def _val(b):
    v = b['value']
    if b.get('type') == 'uri' and v.startswith('http://www.wikidata.org/entity/'):
        return v.rsplit('/', 1)[1]
    return v


def q(sparql, name=None, tries=5):
    key = hashlib.sha1(sparql.encode()).hexdigest()[:16]
    path = os.path.join(CACHE, (name or 'q') + '-' + key + '.json')
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    for attempt in range(tries):
        try:
            r = requests.get(URL, params={'query': PREFIX + sparql}, headers=HEAD, timeout=120)
            if r.status_code == 429:
                time.sleep(20 * (attempt + 1)); continue
            r.raise_for_status()
            rows = [{k: _val(v) for k, v in b.items()} for b in r.json()['results']['bindings']]
            with open(path, 'w') as f:
                json.dump(rows, f, ensure_ascii=False)
            time.sleep(1)
            return rows
        except Exception as e:  # mạng chập chờn hoặc truy vấn quá giờ
            print('  thử lại', name, attempt + 1, str(e)[:120], file=sys.stderr)
            time.sleep(5 * (attempt + 1))
    raise RuntimeError('Không truy vấn được: ' + (name or key))


FAILED = os.path.join(CACHE, 'failed.txt')


def run(sparql, name):
    """Chạy truy vấn; nếu quá giờ thì tách VALUES ?t thành từng loại và chạy riêng."""
    import re
    key = hashlib.sha1(sparql.encode()).hexdigest()[:16]
    if os.path.exists(os.path.join(CACHE, name + '-' + key + '.json')):
        return q(sparql, name)
    m = re.search(r'VALUES \?t \{([^}]*)\}', sparql)
    types = m.group(1).split() if m else []
    try:
        return q(sparql, name, tries=2 if len(types) > 1 else 5)
    except RuntimeError:
        if len(types) <= 1:
            raise
    rows = []
    for t in types:
        part = sparql[:m.start(1)] + ' ' + t + ' ' + sparql[m.end(1):]
        try:
            rows += q(part, name + '-' + t.split(':')[1], tries=3)
        except RuntimeError:
            print('  bỏ phần', name, t, file=sys.stderr)
    with open(os.path.join(CACHE, name + '-' + key + '.json'), 'w') as f:
        json.dump(rows, f, ensure_ascii=False)
    return rows
