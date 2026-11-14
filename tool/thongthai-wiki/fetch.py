"""Tải toàn bộ nguồn trong sources.py (có lưu đệm). In số dòng mỗi nguồn."""
import sys
import wd
from sources import SOURCES

only = set(sys.argv[1:])
for name, sparql in SOURCES.items():
    if only and name not in only:
        continue
    try:
        rows = wd.run(sparql, name)
        print(f'{name:24s} {len(rows):6d} dòng, {len({r["s"] for r in rows}):5d} chủ đề', flush=True)
    except Exception as e:
        print(f'{name:24s} LỖI {e}', flush=True)
