"""A2 第三步：逐宮改結論句、加出處、同步 en/ja 翻譯表。用法：python plain_round.py <content dir> <round.json>

round.json: { "palace": "官祿", "cells": { "紫微": { "summary": [zh, en, ja] | null, "watch": [zh, en, ja] | null,
              "source": [passage_id, quote] }, ... } }
summary/watch 係 null 就唔改字，只加出處。翻譯表：舊句 key 只喺冇其他結論句再用嗰陣先刪。
"""
import json, sys
ROOT, ROUND = sys.argv[1], sys.argv[2]
R = json.load(open(ROUND, encoding='utf-8'))
PAL = R['palace']

def load(p):
    raw = open(p, encoding='utf-8', newline='').read()
    return raw, json.loads(raw)

def save(p, raw, t):
    nl = '\r\n' if '\r\n' in raw else '\n'
    out = json.dumps(t, ensure_ascii=False, indent=2).replace('\n', nl)
    if raw.endswith('\n'):
        out += nl
    open(p, 'w', encoding='utf-8', newline='').write(out)

pp = f'{ROOT}/src/plain/palace.json'
raw, plain = load(pp)
swaps = []  # (old zh, new zh, en, ja, kind)
for x in plain:
    if x['palace'] != PAL or x['star'] not in R['cells']:
        continue
    c = R['cells'][x['star']]
    for field in ('summary', 'watch'):
        if c.get(field):
            zh, en, ja = c[field]
            swaps.append((x[field], zh, en, ja, field))
            x[field] = zh
    pid, quote = c['source']
    x['source'] = {'corpus': 'zhongzhou', 'passage_id': pid, 'quote': quote}
missing = set(R['cells']) - {x['star'] for x in plain if x['palace'] == PAL}
assert not missing, missing
save(pp, raw, plain)

still_used = {x['summary'] for x in plain} | {x['watch'] for x in plain}
for lang, col in (('en', 2), ('ja', 3)):
    p = f'{ROOT}/src/{lang}/tm.json'
    raw, t = load(p)
    S = t['sentences']
    new = {}
    for k, v in S.items():
        hit = next((s for s in swaps if s[0] == k), None)
        if hit and k not in still_used:
            new[hit[1]] = hit[col]
        else:
            new[k] = v
    for s in swaps:
        new.setdefault(s[1], s[col])
    t['sentences'] = new
    save(p, raw, t)
sys.stdout.reconfigure(encoding='utf-8')
print(PAL, 'cells', len(R['cells']), 'text changes', len(swaps))
