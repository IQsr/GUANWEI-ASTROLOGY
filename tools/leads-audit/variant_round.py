"""A2 放寬準則：加一批帶條件嘅結論句（plain/variants.json），日文入 ja/tm.json。

用法：python tools/leads-audit/variant_round.py packages/content <round.json>

round.json：[[target, rule, zh, en, ja], ...]。同一個 target 入面，先寫嘅先揀（規則成立嗰陣）。
已經有嘅 (target, rule) 會被新嘅蓋過。
"""
import json, sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT, ROUND = sys.argv[1], sys.argv[2]
NEW = json.load(open(ROUND, encoding='utf-8'))

vp = f'{ROOT}/src/plain/variants.json'
V = json.load(open(vp, encoding='utf-8'))
keys = {(t, r) for t, r, *_ in NEW}
V = [v for v in V if (v['target'], v['rule']) not in keys]
V += [{'target': t, 'rule': r, 'summary': zh, 'en': en} for t, r, zh, en, _ in NEW]
open(vp, 'w', encoding='utf-8', newline='\n').write('[\n' + ',\n'.join('  ' + json.dumps(v, ensure_ascii=False) for v in V) + '\n]\n')

p = f'{ROOT}/src/ja/tm.json'
raw = open(p, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in raw else '\n'
t = json.loads(raw)
n = 0
for _, _, zh, _, ja in NEW:
    if t['sentences'].get(zh) != ja:
        t['sentences'][zh] = ja
        n += 1
out = json.dumps(t, ensure_ascii=False, indent=2).replace('\n', nl) + (nl if raw.endswith('\n') else '')
open(p, 'w', encoding='utf-8', newline='').write(out)
print('variants now', len(V), '| added', len(NEW), '| ja set', n)
