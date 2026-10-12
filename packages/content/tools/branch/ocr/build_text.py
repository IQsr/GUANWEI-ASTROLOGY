"""
OCR 輸出（ocr.ps1 寫嘅「=== pNNN」分頁文字）→ ingest 用嘅三樣嘢：
  b5_flat.txt     全書文字接埋一條
  b5_pages.json   [[起始字元位置, 頁碼], ...]
  xingxi/NN.txt   六十星系逐個一份（頁數範圍跟 src/xingxi/systems.json 嘅 page）

用法：
  python build_text.py <OCR 文字檔> <輸出資料夾，即 B5_DIR>

⚠ 後備方法：現有規則嘅摘錄係對住 2026-10 嗰份原書文字核對過。重新 OCR 嘅字可能有少少唔同
（OCR 誤認字唔一樣），ingest 會喺對唔上嗰條停低，到時改返 rules/ 或 xingxi/ 入面嘅摘錄就得。
"""
import json
import os
import re
import sys
from pathlib import Path

src, out = Path(sys.argv[1]), Path(sys.argv[2])
raw = src.read_text(encoding='utf-8-sig')
pages = [(int(m.group(1)), m.end()) for m in re.finditer(r'^=== p(\d+)\s*$', raw, re.M)]
texts = {}
for k, (no, start) in enumerate(pages):
    end = raw.rfind('\n===', 0, pages[k + 1][1]) if k + 1 < len(pages) else len(raw)
    texts[no] = raw[start:end].strip('\n')

flat, index = [], []
pos = 0
for no in sorted(texts):
    index.append([pos, no])
    flat.append(texts[no])
    pos += len(texts[no])
out.mkdir(parents=True, exist_ok=True)
(out / 'b5_flat.txt').write_text(''.join(flat), encoding='utf-8')
(out / 'b5_pages.json').write_text(json.dumps(index), encoding='utf-8')

systems = json.loads((Path(__file__).resolve().parents[3] / 'src' / 'xingxi' / 'systems.json').read_text(encoding='utf-8'))
starts = sorted((x['page'], x['n'], x['name']) for x in systems)
(out / 'xingxi').mkdir(exist_ok=True)
for i, (page, n, name) in enumerate(starts):
    last = starts[i + 1][0] if i + 1 < len(starts) else page + 3
    body = '\n'.join(texts.get(p, '') for p in range(page, last + 1))
    (out / 'xingxi' / f'{n:02d}.txt').write_text(f'# {n} {name} p.{page}-{last}\n{body}\n', encoding='utf-8')
print(f'{len(texts)} 頁 → {out}')
