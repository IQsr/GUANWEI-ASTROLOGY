"""
星系細讀：由 tools/branch/xingxi/NN.json（規則＋原文摘錄）生成
  packages/content/src/branch/xingxi/NN.json
  packages/content/src/sources/zhongzhou.json 嘅 deep.星系NN.* passages
  packages/content/src/branch/index.ts 嘅 import
摘錄一定要喺原書文字 <B5_DIR>/xingxi/NN.txt 入面，唔係就停。
用法：python tools/branch/ingest_xingxi.py 1 2 3 ...（唔畀數字 = 全部）
"""
import json, os, re, sys

from pathlib import Path
HERE = Path(__file__).resolve().parent
REPO = str(HERE.parents[1] / 'src')  # packages/content/src
# 原書 OCR 文字（有版權，唔入 repo）：預設 %LOCALAPPDATA%/guanwei/b5，可以用 B5_DIR 改
BOOK = Path(os.environ.get('B5_DIR') or Path(os.environ.get('LOCALAPPDATA', Path.home())) / 'guanwei' / 'b5')
if not (BOOK / 'b5_flat.txt').exists():
    raise SystemExit(f'搵唔到原書文字：{BOOK}/b5_flat.txt（見 tools/branch/README.md「原書文字」）')
squash = lambda t: re.sub(r'\s+', '', t)

systems = {x['n']: x for x in json.load(open(os.path.join(REPO, 'xingxi', 'systems.json'), encoding='utf-8'))}
corpus_path = os.path.join(REPO, 'sources', 'zhongzhou.json')
corpus = json.load(open(corpus_path, encoding='utf-8'))
P = corpus['passages']


def add_passage(pid, page, name, text):
    t = squash(text)
    if pid in P and P[pid]['text'] != t:
        raise SystemExit(f'{pid} 已存在而內容唔同')
    P[pid] = {'chapter': '上篇 · 六十基本星系', 'ref': name, 'lines': [page, page], 'text': t}


def ingest(n):
    a = json.load(open(HERE / 'xingxi' / f'{n:02d}.json', encoding='utf-8'))
    raw = squash(open(BOOK / 'xingxi' / f'{n:02d}.txt', encoding='utf-8').read())
    x = systems[n]
    seen = {}
    for k in [k for k in P if k.startswith(f'deep.星系{n:02d}.')]:
        del P[k]  # 重寫：清走舊嘅

    def cite(src):
        t = squash(src['text'])
        if t not in raw:
            raise SystemExit(f'#{n} 摘錄唔喺原文：{src["text"][:40]}')
        if squash(src['quote']) not in t:
            raise SystemExit(f'#{n} 引文唔喺摘錄：{src["quote"]}')
        if t not in seen:
            seen[t] = f'deep.星系{n:02d}.{len(seen) + 1}'
            add_passage(seen[t], src['page'], x['name'], t)
        return {'passage': seen[t], 'quote': src['quote']}

    out = {
        '$note': a.get('note', f'第 3 層 · 六十星系（2026-10-12）：{x["name"]}，《深造講義》p.{x["page"]}。'),
        'topic': {'id': f'{x["name"]}.命宮', 'palace': '命宮', 'stars': x['stars'], 'branch': x['branches'], 'xingxi': n},
        'basis': cite(a['basis']),
        'rules': [],
    }
    target = os.path.join(REPO, 'branch', 'xingxi', f'{n:02d}.json')
    # 人手加嘅 pole 標記（邊條規則講緊邊一頭）重寫時保留
    keep = {r['id']: r['pole'] for r in json.load(open(target, encoding='utf-8'))['rules'] if 'pole' in r} if os.path.exists(target) else {}
    for r in a['rules']:
        rr = {k: v for k, v in r.items() if k not in ('src', 'also')}
        if r['id'] in keep and 'pole' not in rr:
            rr['pole'] = keep[r['id']]
        rr['source'] = cite(r['src'])
        if r.get('also'):
            rr['also'] = [cite(s) for s in r['also']]
        out['rules'].append(rr)
    os.makedirs(os.path.join(REPO, 'branch', 'xingxi'), exist_ok=True)
    json.dump(out, open(os.path.join(REPO, 'branch', 'xingxi', f'{n:02d}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f'#{n} {x["name"]}：{len(out["rules"])} 條，{len(seen)} 段原文')


nums = [int(a) for a in sys.argv[1:]] or sorted(int(f[:2]) for f in os.listdir(HERE / 'xingxi') if f.endswith('.json'))
for n in nums:
    ingest(n)
json.dump(corpus, open(corpus_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# index.ts
files = sorted(f for f in os.listdir(os.path.join(REPO, 'branch', 'xingxi')) if f.endswith('.json'))
lines = ["/*", " * 原文分支嘅資料檔（branch.ts 載入）。加檔就喺度加一行。",
         " *   xingxi/NN.json —— 六十星系（命宮），細讀擺喺「性格的骨架」章（由 tools/branch/ingest_xingxi.py 生成）",
         " *   其他           —— 宮位題目，細讀擺喺嗰宮嘅章", " */",
         "import tianji from './tianji-guanlu.json';"]
names = ['tianji']
# 第 17 星系（同梁寅申）係試點檔，人手寫，唔經 ingest
lines.append("import tongliang from './tongliang-ming.json';")
names.append('tongliang')
# 宮位題目（ingest_palace.py 生成）：夫妻、財帛⋯
for key, pre, pal in [('fuqi', 'f', '夫妻'), ('caibo', 'c', '財帛'), ('guanlu', 'g', '官祿'), ('qianyi', 'q', '遷移'), ('fude', 'd', '福德'), ('tianzhai', 't', '田宅'), ('fumu', 'm', '父母'), ('xiongdi', 'b', '兄弟'), ('jiaoyou', 'j', '僕役'), ('zinv', 'z', '子女')]:
    d = os.path.join(REPO, 'branch', key)
    if not os.path.isdir(d): continue
    lines.insert(lines.index(" *   其他           —— 宮位題目，細讀擺喺嗰宮嘅章"), f" *   {key}/NN.json".ljust(20) + f"—— {pal}宮題目（由 tools/branch/ingest_palace.py 生成），細讀擺喺{pal}宮章")
    for f in sorted(os.listdir(d)):
        lines.append(f"import {pre}{f[:2]} from './{key}/{f}';")
        names.append(f'{pre}{f[:2]}')
for f in files:
    v = 'x' + f[:2]
    lines.append(f"import {v} from './xingxi/{f}';")
    names.append(v)
lines += ['', f"export const BRANCH_RAW: unknown[] = [{', '.join(names)}];", '']
open(os.path.join(REPO, 'branch', 'index.ts'), 'w', encoding='utf-8').write('\n'.join(lines))
