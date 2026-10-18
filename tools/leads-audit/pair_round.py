"""A2 第三步（雙星整合版）：改 pairs.json 嘅結論／留意／生活句、加出處，同步 en（條目內）同 ja 翻譯表。

用法：python tools/leads-audit/pair_round.py packages/content tools/leads-audit/rounds/pairs.json

rounds JSON：{ "pairs": { "pair.太陽太陰.官祿": { "summary": [zh, en, ja], "watch": [...], "life": [...],
               "source": [passage_id, quote] }, ... } }
summary／watch／life 唔畀就唔改字。ja 翻譯表：舊句 key 冇其他條目再用嗰陣先換走。
"""
import json, sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT, ROUND = sys.argv[1], sys.argv[2]
R = json.load(open(ROUND, encoding='utf-8'))['pairs']


def load(p):
    raw = open(p, encoding='utf-8', newline='').read()
    return raw, json.loads(raw)


def save(p, raw, t, indent):
    nl = '\r\n' if '\r\n' in raw else '\n'
    out = json.dumps(t, ensure_ascii=False, indent=indent).replace('\n', nl)
    if raw.endswith('\n'):
        out += nl
    open(p, 'w', encoding='utf-8', newline='').write(out)


pp = f'{ROOT}/src/plain/pairs.json'
raw, pairs = load(pp)
indent = 1 if raw.lstrip('[').lstrip('\r\n').startswith(' {') else 2
swaps = []
seen = set()
for x in pairs:
    c = R.get(x['id'])
    if not c:
        continue
    seen.add(x['id'])
    for field in ('summary', 'watch', 'life'):
        if c.get(field):
            zh, en, ja = c[field]
            swaps.append((x[field], zh, ja))
            x[field] = zh
            x['en'][field] = en
    pid, quote = c['source']
    x['source'] = {'corpus': 'zhongzhou', 'passage_id': pid, 'quote': quote}
missing = set(R) - seen
assert not missing, missing
save(pp, raw, pairs, indent)

still = {x[f] for x in pairs for f in ('summary', 'watch', 'life')}
p = f'{ROOT}/src/ja/tm.json'
raw, t = load(p)
new = {}
for k, v in t['sentences'].items():
    hit = next((s for s in swaps if s[0] == k), None)
    if hit and k not in still:
        new[hit[1]] = hit[2]
    else:
        new[k] = v
for s in swaps:
    new.setdefault(s[1], s[2])
t['sentences'] = new
save(p, raw, t, 2)
print('pairs', len(R), 'text changes', len(swaps))
