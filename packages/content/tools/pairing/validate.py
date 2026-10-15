"""兩人對照連接句檢查（試做 2026-10-15）

python -I validate.py packs/01.json output.json

每句都要引得到事實；「轉述」句要同引用嘅事實有夠長嘅共同片段；
「對照」句要引兩個人各至少一條；禁字一個都唔准有。唔過就 exit 1。
"""
import json
import re
import sys

FORBIDDEN = ['合不合', '不合', '相配', '配不配', '般配', '適合對方', '長久', '白頭', '分手', '離婚', '結婚',
             '緣份', '緣分', '命中注定', '分數', '天生一對', '女王', '孩子', '烈火', '莽撞']
HAN = re.compile(r'[一-鿿]')


def han(s):
    return ''.join(HAN.findall(s))


STARS = ['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍']


def overlap(a, b, n=4):
    x, y = han(a), han(b)
    return any(x[i:i + n] in y for i in range(len(x) - n + 1))


def grounded(text, fact):
    """盤面事實（「夫妻宮在卯，太陰」）好短：認星名，或者係 prompt 第 9 條「夫妻宮書中沒有條文」嗰句"""
    if overlap(text, fact['text']):
        return True
    if fact['kind'] == '盤面':
        return any(s in fact['text'] and s in text for s in STARS) or ('夫妻宮' in text and '沒有' in text)
    return False


def main(pack_path, out_path):
    sys.stdout.reconfigure(encoding="utf-8")
    pack = json.load(open(pack_path, encoding='utf-8'))
    out = json.load(open(out_path, encoding='utf-8'))
    facts = {f['id']: (p['key'], f) for p in pack['people'] for f in p['facts']}
    sents = [('標題', out['headline'])] + [(s['title'], x) for s in out['sections'] for x in s['sentences']]
    errs = []
    for where, s in sents:
        t = s['text']
        tag = f'［{where}］{t}'
        if not s['facts']:
            errs.append(f'{tag}：冇引事實')
        missing = [i for i in s['facts'] if i not in facts]
        if missing:
            errs.append(f'{tag}：搵唔到 {missing}')
        cited = [facts[i] for i in s['facts'] if i in facts]
        if s['kind'] == '轉述' and cited and not any(grounded(t, f) for _, f in cited):
            errs.append(f'{tag}：轉述句同引用事實冇共同片段')
        if s['kind'] == '對照' and len({k for k, _ in cited}) < 2:
            errs.append(f'{tag}：對照句要引兩個人嘅事實')
        for w in '你他她':
            if w in t:
                errs.append(f'{tag}：用咗「{w}」')
        for w in FORBIDDEN:
            if w in t:
                errs.append(f'{tag}：禁字「{w}」')
    if out['headline']['kind'] != '對照':
        errs.append('標題要係對照句')
    n = len(sents) - 1
    if not 8 <= n <= 14:
        errs.append(f'句數 {n}，要 8–14')
    used = {i for _, s in sents for i in s['facts']}
    print(f'句數 {n}；引用事實 {len(used)}/{len(facts)}；對照句 {sum(s["kind"] == "對照" for _, s in sents)}')
    for e in errs:
        print('✗', e)
    if not errs:
        print('✓ 全部通過')
    return 1 if errs else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1], sys.argv[2]))
