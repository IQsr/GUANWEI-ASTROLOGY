"""合併十批標註（out-NN.json）→ src/plain/clash.json。

用法：python -I tools/clash/merge.py
- 檢查軸、對象、範圍係唔係指引入面嘅字；i 係唔係喺 texts.json
- 交叉檢查：句入面有明顯反向字（不和／融洽⋯）但標咗相反方向，列出嚟人手睇
- 輸出：{ 句子: { "a": [[軸, 方向, 對象], ...], "s": "g|c|p", "combo": bool } }
"""
import json, os, re, sys
sys.stdout.reconfigure(encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
AXES = {'關係', '助力', '順逆', '變動', '合作', '主動', '嚴寬', '快慢', '聚散', '早晚'}
OBJS = {'你', '伴侶', '父母', '母親', '父親', '長輩', '上司', '兄弟姊妹', '朋友', '同事', '下屬', '後輩', '子女', '錢', '工作', '住處', '在外', '身心'}
COND = re.compile(r'見|同宮有|相夾|被\S{2,6}夾|加上|遇|化[祿權科忌]')
CHECK = {
    '關係': (re.compile(r'融洽|和睦|和美|寵愛|感情深|合得來'), re.compile(r'不和|疏遠|隔膜|緣[份分]較淺|合不來|摩擦|爭執')),
    '變動': (re.compile(r'安定|不輕易搬|住得安穩'), re.compile(r'常搬|多變|搬來搬去|常換')),
}

# 人手覆核：兩面都講，唔標
SKIP = {'感情上比較甜；你在地位和人際上容易有摩擦。'}

texts = {x['i']: x for x in json.load(open(os.path.join(HERE, 'texts.json'), encoding='utf8'))['texts']}
out, bad, warn = {}, [], []
for n in range(1, 11):
    p = os.path.join(HERE, f'out-{n:02d}.json')
    if not os.path.exists(p):
        bad.append(f'缺 {p}')
        continue
    for r in json.load(open(p, encoding='utf8'))['rows']:
        t = texts.get(r['i'])
        if not t:
            bad.append(f'{n:02d}: i={r["i"]} 唔喺 texts')
            continue
        a = [x for x in r.get('a', []) if x[0] in AXES and x[1] in '+-' and x[2] in OBJS]
        if len([x for x in r.get('a', []) if not (x[0] in AXES and x[1] in '+-' and x[2] in OBJS)]):
            bad.append(f'{n:02d}: i={r["i"]} 有唔合規嘅標註 {r.get("a")}')
        if not a or t['t'] in SKIP:
            continue
        s = r.get('s', 'g') if r.get('s') in ('g', 'c', 'p') else 'g'
        # 範圍各批判法唔一致（「天機在子」有批當 c、有批當 g）：統一用字面判斷，時期照 agent
        s = 'c' if COND.search(t['t']) else ('p' if s == 'p' else 'g')
        # 統一對象（各批標法唔同）：主動、快慢、嚴寬講嘅係讀者自己嘅做法，一章已經定咗講邊方面；
        # 兄弟章「兄弟朋友」「兄弟姊妹」讀者當同一群人
        a = [[ax, sg, '你' if ax in ('主動', '快慢', '嚴寬') else ('平輩' if ob in ('兄弟姊妹', '朋友') else ob)] for ax, sg, ob in a]
        a = [list(x) for x in dict.fromkeys(tuple(x) for x in a)]
        for ax, sign, _ in a:
            if ax in CHECK:
                pos, neg = CHECK[ax]
                if sign == '+' and neg.search(t['t']) and not pos.search(t['t']):
                    warn.append(f'標+但有反向字｜{ax}｜{t["t"]}')
                if sign == '-' and pos.search(t['t']) and not neg.search(t['t']) and not re.search(r'不易|不夠|難', t['t']):
                    warn.append(f'標-但有正向字｜{ax}｜{t["t"]}')
        out[t['t']] = {'a': a, 's': s, 'combo': bool(t.get('combo'))}

json.dump(out, open(os.path.join(ROOT, 'src', 'plain', 'clash.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=0, sort_keys=True)
print(f'texts {len(texts)}  annotated {len(out)}  problems {len(bad)}  warnings {len(warn)}')
for x in bad[:30]:
    print('BAD', x)
for x in warn[:60]:
    print('WARN', x)
