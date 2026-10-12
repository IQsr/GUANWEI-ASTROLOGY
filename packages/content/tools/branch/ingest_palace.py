"""
宮位細讀（夫妻、財帛⋯）：由 rules/<key>.py（規則＋原文摘錄）生成
  packages/content/src/branch/<dir>/NN.json（每個題目一個檔，次序 = 合併輸出次序）
  packages/content/src/sources/zhongzhou.json 嘅 deep.<宮>.* passages
  packages/content/src/branch/index.ts
摘錄一定要喺《深造講義》下篇嗰宮原文入面（b5_flat.txt 由 start 到 end），唔係就停；頁數由 b5_pages.json 對返。
用法：python tools/branch/ingest_palace.py caibo
"""
import json, os, re, sys, bisect
from pathlib import Path
HERE = Path(__file__).resolve().parent
REPO = str(HERE.parents[1] / 'src')  # packages/content/src
# 原書 OCR 文字（有版權，唔入 repo）：預設 %LOCALAPPDATA%/guanwei/b5，可以用 B5_DIR 改
BOOK = Path(os.environ.get('B5_DIR') or Path(os.environ.get('LOCALAPPDATA', Path.home())) / 'guanwei' / 'b5')
if not (BOOK / 'b5_flat.txt').exists():
    raise SystemExit(f'搵唔到原書文字：{BOOK}/b5_flat.txt（見 tools/branch/README.md「原書文字」）')
CONF = {
    'fuqi': dict(palace='夫妻', prefix='f', start='夫妻宫1紫微', end='子女宫除用来推断', pages='p.377–410',
                 drop='生離死別、再婚、外遇、配偶災病一類斷語不用；只按男女分嘅條文不用（引擎冇性別）。'),
    'guanlu': dict(palace='官祿', prefix='g', start='事业宫(官禄宫)事业宫古名', end='田宅宫田宅宫在推算斗数时', pages='p.530–560',
                   drop='殉職、牢獄、官非、血光、貪墨、意外一類斷語不用；天刑、天月、天巫、龍池鳳閣、三台八座等引擎冇嘅星不用；天機見 tianji-guanlu.json（試點）。'),
    'qianyi': dict(palace='遷移', prefix='q', start='迁移宫迁移宫所推断的运程', end='交友宫(奴仆宫)', pages='p.496–515',
                   drop='客死異鄉、異鄉染病、官非、冤獄、被盜、意外一類斷語不用；天月、天刑、龍池鳳閣等引擎冇嘅星不用；要睇廟陷嘅條文暫不用。'),
    'fude': dict(palace='福德', prefix='d', start='福德宫[福德宫]有来推算人的精神享受', end='父母宫推断父母存亡', pages='p.560–575',
                 drop='弱智、自閉、心理不正常、變態、好色、淫濫、偽善、小器、鄙吝一類標籤不用；疾病、婚姻刑克、嫖賭飲吹不用；天姚、天刑、天月、華蓋、龍池鳳閣等引擎冇嘅星不用；要分日夜生、廟陷嘅條文暫不用。'),
    'tianzhai': dict(palace='田宅', prefix='t', start='田宅宫田宅宫在推算斗数时', end='福德宫[福德宫]有来推算', pages='p.556–560',
                   drop='火災、水災、孝服、血光、兵災、官非、倒閉一類斷語不用；風水不用（近「化解」）；添丁、天喜紅鸞、天巫、天刑等不用；要分日夜生、廟陷嘅條文暫不用。'),
    'fumu': dict(palace='父母', prefix='m', start='父母宫推断父母存亡', end='则以见火铃羊陀为然', pages='p.575–595',
                 drop='父母存亡、刑剋、孝服、灾病、偏房繼室所生、父有外遇、重拜父母一類斷語不用；天巫、天刑、天壽、白虎丧门等引擎冇嘅星不用；要分日夜生、廟陷嘅條文暫不用。原書父母宮兼論上司，呢部份照用。'),
    'xiongdi': dict(palace='兄弟', prefix='b', start='兄弟宫1紫微', end='夫妻宫1紫微', pages='p.366–377',
                    drop='刑剋、死亡、流產、殘疾、弱智、亂倫、血光、異母各胞、兄弟排行一類斷語不用；「某星守兄弟宮之年應驗」嘅流年條文不用；天姚、天刑、桃花等引擎冇嘅星不用。原書兄弟宮兼論朋友、同事、合作夥伴，呢部份照用。'),
    'jiaoyou': dict(palace='僕役', label='交友', prefix='j', start='交友宫(奴仆宫)交友宫古称', end='事业宫(官禄宫)事业宫古名', pages='p.516–530',
                    drop='官非、盜竊、色禍、受出賣、乘人之危一類斷語不用；天姚、陰煞、天巫、天刑等引擎冇嘅星不用；要分廟陷嘅條文暫不用。原書交友宮主下屬、晚輩，兼論朋友。'),
    'zinv': dict(palace='子女', prefix='z', start='子女宫除用来推断', end='财帛宫财帛宫必与福德宫相对', pages='p.400–435',
                 drop='子女數目、生男生女、遲得子、流產、刑剋、夭折、傷殘、偏房外室所生、入贅、吸毒、弱智、生產手術一類斷語不用；天月、天刑、龍池鳳閣、華蓋、蜚廉等引擎冇嘅星不用；要分日夜生、廟陷嘅條文暫不用。原書子女宮兼論後輩、門生、親信下屬，呢部份照用。'),
    'caibo': dict(palace='財帛', prefix='c', start='财帛宫财帛宫必与福德宫相对', end='疾厄宫推算斗数', pages='p.436–462',
                  drop='倒閉、破產、官非、盜賊、火災、疾病一類斷語不用；金額、「巨富」一類保證不用；天刑、天月、龍池鳳閣等引擎冇嘅星不用。'),
}
key = sys.argv[1]
C = CONF[key]
squash = lambda t: re.sub(r'\s+', '', t).replace('·', '')
flat = open(BOOK / 'b5_flat.txt', encoding='utf-8').read()
pages = json.load(open(BOOK / 'b5_pages.json', encoding='utf-8'))
offs = [p[0] for p in pages]
keep = [i for i, ch in enumerate(flat) if not ch.isspace() and ch != '·']
sq = ''.join(flat[i] for i in keep)
start = sq.index(C['start'])
end = sq.index(C['end'], start)
section = sq[start:end]

def page_of(t):
    k = section.find(t)
    if k < 0: raise SystemExit(f'摘錄唔喺{C["palace"]}宮原文：{t[:40]}')
    return pages[bisect.bisect_right(offs, keep[start + k]) - 1][1]

T = []
exec(open(HERE / 'rules' / f'{key}.py', encoding='utf-8').read())

corpus_path = os.path.join(REPO, 'sources', 'zhongzhou.json')
corpus = json.load(open(corpus_path, encoding='utf-8'))
P = corpus['passages']
pal = C['palace']
for k in [k for k in P if k.startswith(f'deep.{pal}.')]: del P[k]
outdir = os.path.join(REPO, 'branch', key)
os.makedirs(outdir, exist_ok=True)
for f in os.listdir(outdir): os.remove(os.path.join(outdir, f))
seen = {}
ids = set()
for n, t in enumerate(T, 1):
    star = t['stars'][0] if t['stars'] else '通則'
    def cite(src, quote):
        s = squash(src)
        if squash(quote) not in s: raise SystemExit(f'{t["id"]} 引文唔喺摘錄：{quote}')
        if s not in seen:
            pg = page_of(s)
            pid = f'deep.{pal}.{star}.{sum(1 for v in seen.values() if v.startswith(f"deep.{pal}.{star}.")) + 1}'
            seen[s] = pid
            P[pid] = {'chapter': '下篇 · 宮垣論', 'ref': f'{C.get("label", pal)}宮 · {star}', 'lines': [pg, pg], 'text': s}
        return {'passage': seen[s], 'quote': quote}
    topic = {'id': t['id'], 'palace': pal, 'stars': t['stars']}
    if t.get('branch'): topic['branch'] = t['branch']
    if t.get('link'): topic['link'] = True
    rules = []
    for r in t['rules']:
        if r['id'] in ids: raise SystemExit(f'規則 id 重複：{r["id"]}')
        ids.add(r['id'])
        rr = {'id': r['id'], 'role': r.get('role', 'refine')}
        if r.get('when') is not None: rr['when'] = r['when']
        rr['text'] = r['text']; rr['en'] = r['en']
        rr['source'] = cite(r['src'], r['quote'])
        if r.get('edit'): rr['edit'] = r['edit']
        rules.append(rr)
    out = {'$note': t.get('note', f'{pal}宮（2026-10-12）：{t["id"]}。《深造講義》下篇 宮垣論 {pal}宮 {C["pages"]}。{C["drop"]}'),
           'topic': topic, 'rules': rules}
    json.dump(out, open(os.path.join(outdir, f'{n:02d}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'{pal}宮：{len(T)} 個題目，{len(ids)} 條規則，{len(seen)} 段原文')
json.dump(corpus, open(corpus_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# index.ts：先清走呢個宮嘅 import，再按次序加返
idx = os.path.join(REPO, 'branch', 'index.ts')
s = open(idx, encoding='utf-8').read()
p = C['prefix']
s = re.sub(rf"\nimport {p}\d\d from './{key}/\d\d\.json';", '', s)
s = re.sub(rf", {p}\d\d(?=[,\]])", '', s)
files = sorted(os.listdir(outdir))
anchor = "import tongliang from './tongliang-ming.json';"
last = max([m.end() for m in re.finditer(r"\nimport [a-z]\d\d from '\./(fuqi|caibo|guanlu|qianyi|fude|tianzhai|fumu|xiongdi|jiaoyou|zinv)/\d\d\.json';", s)] + [s.index(anchor) + len(anchor)])
s = s[:last] + ''.join(f"\nimport {p}{f[:2]} from './{key}/{f}';" for f in files) + s[last:]
s = s.replace('];\n', ''.join(f', {p}{f[:2]}' for f in files) + '];\n')
line = f' *   {key}/NN.json'.ljust(20) + f'—— {pal}宮題目（由 tools/branch/ingest_palace.py 生成），細讀擺喺{pal}宮章'
if f'{key}/NN.json' not in s:
    s = s.replace(' *   其他           —— 宮位題目', line + '\n *   其他           —— 宮位題目')
open(idx, 'w', encoding='utf-8').write(s)
