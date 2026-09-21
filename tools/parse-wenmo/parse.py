#!/usr/bin/env python3
"""
文墨天機 pro 命盤 PDF → JSON（工單 B12b）

點解用座標唔用 pdftotext：
    個 PDF 係四乘四格嘅命盤，pdftotext 嘅 ASCII 排版會將唔同宮嘅字撈埋一行。
    座標式解析先分得清邊粒星屬邊個宮、邊個廟旺對應邊粒星。

PDF 攞唔到嘅嘢（畫出嚟，唔喺文字層）：
    生年四化、身宮、宮名
    → 四化要睇截圖。宮名同身宮可以由命宮推返。

用法：
    python3 parse.py <pdf>... > charts.json
"""
import json, os, re, sys

import pdfplumber

# 四乘四格；中間兩格係資料面板，唔係宮位
BRANCH_GRID = [
    ['巳', '午', '未', '申'],
    ['辰', None, None, '酉'],
    ['卯', None, None, '戌'],
    ['寅', '丑', '子', '亥'],
]
XS = [(19, 180), (180, 341), (341, 502), (502, 663)]
YS = [(14, 145), (145, 276), (276, 407), (407, 538)]
PANEL = (195, 462, 145, 407)  # 中間資料面板，避開兩邊嘅流年/小限

STEMS = set('甲乙丙丁戊己庚辛壬癸')
BRIGHT = set('廟旺得利平不陷')


def _lines(chars, x0, x1, y0, y1, tol=3.5):
    """將指定範圍嘅字砌返做一行行。

    要容差：標籤同數值嘅 baseline 差一兩點（「真太陽時」喺 y=203，
    「: 1990-01-03 11:55」喺 y=205），淨係 round() 會斷開兩行。
    """
    cs = sorted((c for c in chars if x0 <= c['x0'] < x1 and y0 <= c['top'] < y1),
                key=lambda c: c['top'])
    lines, cur, base = [], [], None
    for c in cs:
        if base is None or abs(c['top'] - base) <= tol:
            if base is None:
                base = c['top']
            cur.append(c)
        else:
            lines.append(cur)
            cur, base = [c], c['top']
    if cur:
        lines.append(cur)
    return [''.join(ch['text'] for ch in sorted(v, key=lambda c: c['x0'])) for v in lines]


def parse(path):
    page = pdfplumber.open(path).pages[0]
    chars = page.chars
    panel = '\n'.join(_lines(chars, *PANEL))

    out = {'file': os.path.basename(path)}

    m = re.search(r'真太陽時[:：]\s*([\d-]+)\s+([\d:]+)', panel)
    out['trueSolar'] = f'{m.group(1)} {m.group(2)}' if m else None
    m = re.search(r'鐘錶時間[:：]\s*(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})', panel)
    out['clock'] = (f'{m.group(1)}-{m.group(2)}-{m.group(3)} {m.group(4)}:{m.group(5)}'
                    if m else None)
    # 出生資料：畀測試直接用
    out['birth'] = ({'y': int(m.group(1)), 'm': int(m.group(2)), 'd': int(m.group(3)),
                     'h': int(m.group(4)), 'min': int(m.group(5))} if m else None)

    m = re.search(r'農曆[:：]\s*(.+?)年\s*(.+?)日(.)時', panel)
    out['lunar'] = f'{m.group(1)}年{m.group(2)}日{m.group(3)}時' if m else None
    m = re.search(r'(陽男|陰男|陽女|陰女)', panel)
    out['yinyang'] = m.group(1) if m else None
    m = re.search(r'(水二局|木三局|金四局|土五局|火六局)', panel)
    out['ju'] = m.group(1) if m else None

    palaces = {}
    for ri, (y0, y1) in enumerate(YS):
        for ci, (x0, x1) in enumerate(XS):
            branch = BRANCH_GRID[ri][ci]
            if branch is None:
                continue
            cs = [c for c in chars if x0 <= c['x0'] < x1 and y0 <= c['top'] < y1]

            # 星名：13pt，直排兩個字（上下兩行）
            big = [c for c in cs if 12.5 <= c['size'] <= 13.5 and c['top'] < y0 + 45]
            rows = sorted({round(c['top']) for c in big})
            top = {round(c['x0']): c['text'] for c in big
                   if rows and abs(c['top'] - rows[0]) < 2}
            bot = {round(c['x0']): c['text'] for c in big
                   if len(rows) > 1 and abs(c['top'] - rows[1]) < 2}

            # 廟旺：11pt，喺星名下面，用 x 對返邊粒星
            bri = {round(c['x0']): c['text'] for c in cs
                   if 10.5 <= c['size'] <= 11.5 and c['top'] < y0 + 60
                   and c['text'] in BRIGHT}

            stars = []
            for x in sorted(top):
                name = top[x] + bot.get(x, '')
                b = next((v for bx, v in bri.items() if abs(bx - x) <= 2), None)
                stars.append([name, b])

            # 宮干：右下角嘅單字天干
            stem = next((c['text'] for c in sorted(cs, key=lambda c: -c['top'])
                         if c['text'] in STEMS and c['size'] >= 12.5
                         and c['top'] > y0 + 95 and c['x0'] > x0 + 130), None)

            # 大限：搵 '~'，再取同一行嘅數字
            decadal = None
            tilde = next((c for c in cs if c['text'] == '~'), None)
            if tilde:
                line = sorted((c for c in cs if abs(c['top'] - tilde['top']) < 3
                               and (c['text'].isdigit() or c['text'] == '~')),
                              key=lambda c: c['x0'])
                mm = re.match(r'(\d+)~(\d+)', ''.join(c['text'] for c in line))
                if mm:
                    decadal = [int(mm.group(1)), int(mm.group(2))]

            palaces[branch] = {'stem': stem, 'decadal': decadal, 'stars': stars}

    out['palaces'] = palaces
    # 宮名唔喺 PDF 入面；命宮 = 起運歲最細嗰格（起運歲 = 局數）
    mins = [(v['decadal'][0], b) for b, v in palaces.items() if v['decadal']]
    out['mingGong'] = min(mins)[1] if mins else None
    return out


if __name__ == '__main__':
    json.dump([parse(p) for p in sorted(sys.argv[1:])],
              sys.stdout, ensure_ascii=False, indent=1)
    sys.stdout.write('\n')
