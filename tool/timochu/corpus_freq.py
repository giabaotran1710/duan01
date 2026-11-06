#!/usr/bin/env python3
"""Đếm độ phổ biến của từ trong kho văn bản để chọn từ thông dụng cho game Tìm ô chữ.

Kho văn bản: phụ đề phim tiếng Việt OpenSubtitles 2016 (OPUS), tiếng nói đời thường:
  https://object.pouta.csc.fi/OPUS-OpenSubtitles/v2016/mono/vi.txt.gz
(tuỳ chọn) thêm một phần Wikipedia tiếng Việt (parquet, wikimedia/wikipedia 20231101.vi).

- Từ hai tiếng: đếm số lần hai tiếng đứng liền nhau.
- Từ một tiếng: đếm số lần tiếng đó đứng một mình, KHÔNG nằm trong một từ ghép đã biết
  (để loại các tiếng chỉ xuất hiện trong từ ghép như "lẽo" trong "lạnh lẽo").

Chạy: python3 tool/timochu/corpus_freq.py <kaikki-vi.jsonl> <out.tsv> <vi.txt.gz> [wiki.parquet ...]
"""
import sys, re, json, gzip, unicodedata, collections, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
KAIKKI, OUT = sys.argv[1], sys.argv[2]
CORPORA = sys.argv[3:]
TOK = re.compile(r'[^\W\d_]+')


def nfc(s): return unicodedata.normalize('NFC', s)


# tập từ ghép hai tiếng đã biết (để phân biệt tiếng đứng một mình với tiếng nằm trong từ ghép)
compounds = set()
for line in open(KAIKKI, encoding='utf-8'):
    d = json.loads(line)
    w = nfc(d.get('word', '')).lower()
    if w.count(' ') == 1: compounds.add(tuple(w.split()))
for fn in ('noitu-words.md', 'noitu-extra.txt'):
    for line in open(os.path.join(ROOT, 'game/noitu-data', fn), encoding='utf-8'):
        if line.startswith('#'): continue
        for w in line.split(','):
            w = nfc(w.strip()).lower()
            if w.count(' ') == 1: compounds.add(tuple(w.split()))
print('từ ghép đã biết:', len(compounds))

bi = collections.Counter()
alone = collections.Counter()
total = collections.Counter()


def feed(text):
    for line in text.split('\n'):
        t = TOK.findall(nfc(line).lower())
        n = len(t)
        cov = [False] * n
        for i in range(n - 1):
            p = (t[i], t[i + 1])
            if p in compounds:
                bi[p] += 1
                cov[i] = cov[i + 1] = True
        for i in range(n):
            total[t[i]] += 1
            if not cov[i]: alone[t[i]] += 1


for path in CORPORA:
    if path.endswith('.gz'):
        with gzip.open(path, 'rt', encoding='utf-8', errors='ignore') as f:
            buf = []
            for i, line in enumerate(f):
                buf.append(line)
                if len(buf) >= 20000: feed(''.join(buf)); buf = []
            feed(''.join(buf))
    elif path.endswith('.parquet'):
        import pyarrow.parquet as pq
        t = pq.read_table(path, columns=['text'])
        for v in t.column(0):
            feed(v.as_py())
    print('xong', path, sum(total.values()))

with open(OUT, 'w', encoding='utf-8') as f:
    for (a, b), c in bi.items():
        if c >= 3: f.write(f'{a} {b}\t{c}\n')
    for w, c in alone.items():
        if c >= 3: f.write(f'{w}\t{c}\t{total[w]}\n')
print('đã ghi', OUT)
