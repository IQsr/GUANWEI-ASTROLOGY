"""綜合層判斷卡起草流程（2026-10-28，由流年官祿做範例）。

一個宮一套：
  python tools/synthesis-draft/draft.py prep  官祿   # 由深造索引砌原文批次同 spec（tmp/synth-draft/<宮>-*）
  （用 Codex 逐批起草：照 prep 印出嘅指令，輸出 JSON 陣列到 tmp/synth-draft/<宮>-<批>.json）
  python tools/synthesis-draft/draft.py merge 官祿   # 機械核對（引文逐字、宮位條件、禁字、運限句），併入 cards.json；
                                                     # yearClaim 去 annual-<key>.json（一生次數、時序類唔收）
之後人手抽樣 25 張對原文，再喺 synthesis/index.ts 嘅 ANNUAL_PALACES 加一行、SynthesisCard.chapter 加章名。
"""
import json, re, subprocess, sys, os
from collections import OrderedDict, Counter

os.environ['PYTHONIOENCODING'] = 'utf-8'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SYN = os.path.join(ROOT, 'packages/content/src/synthesis')
TMP = os.path.join(ROOT, 'tmp/synth-draft')

# 宮名（條件語言）→ 深造 part、卡 id 前綴、讀者稱呼、chapter、annual 檔
PALACES = {
    '官祿': dict(part='career', prefix='career', label='事業宮', chapter='事業', annual='guan'),
    '財帛': dict(part='wealth', prefix='wealth', label='財帛宮', chapter='錢', annual='cai'),
    '夫妻': dict(part='spouse', prefix='spouse', label='夫妻宮', chapter='感情', annual='fuqi'),
    '疾厄': dict(part='health', prefix='health', label='疾厄宮', chapter='健康', annual='jie'),
    '遷移': dict(part='travel', prefix='travel', label='遷移宮', chapter='遷移', annual='qian'),
    '僕役': dict(part='friends', prefix='friends', label='交友宮', chapter='交友', annual='puyi'),
    '田宅': dict(part='property', prefix='property', label='田宅宮', chapter='田宅', annual='tian'),
    '福德': dict(part='wellbeing', prefix='wellbeing', label='福德宮', chapter='心境', annual='fude'),
    '父母': dict(part='parents', prefix='parents', label='父母宮', chapter='父母', annual='fumu'),
    '兄弟': dict(part='siblings', prefix='siblings', label='兄弟宮', chapter='兄弟', annual='xiongdi'),
    '子女': dict(part='children', prefix='children', label='子女宮', chapter='子女', annual='zinv'),
}
BATCHES = [['紫微', '天機', '太陽', '武曲'], ['天同', '廉貞', '天府', '太陰', '貪狼'], ['巨門', '天相', '天梁', '七殺', '破軍']]
# 非官祿宮嘅 yearClaim 規則（官祿嗰份嘅例子係事業事件，唔啱用）
YEAR_COMMON = """- 一生次數（「一生至少一次」）、時序（「晚年」「遲婚」）、性格、才能、適合度 → yearClaim 寫 null。
- yearClaim 唔可以用「必」「決」「一定」「最」。
"""
YEAR = {
    '夫妻': """## 額外欄位 yearClaim（一定要有）
- 如果呢個判斷係**感情上嘅狀況**（例如爭執、冷淡、聚少離多、第三者干擾、感情受外人影響），寫一句「今年…」嘅一年內講法，例如 claim「夫妻之間易生口角」→ yearClaim「今年感情上較易有口角」。
- 講**配偶本人**（性格、年紀、外貌、出身）→ null。
- 講**離婚、再婚、生離死別、刑剋**嘅 → 一律 null（唔可以寫成「今年要防離婚」）。
""" + YEAR_COMMON,
    '疾厄': """## 額外欄位 yearClaim（一定要有）
- 如果呢個判斷係**身體某方面較弱、易有某類毛病**，寫一句「今年要多留意…」嘅一年內講法，例如 claim「易有腸胃毛病」→ yearClaim「今年要多留意腸胃」。
- 講**重病、絕症、開刀、意外、血光、死亡、壽元**嘅 → 一律 null。
- yearClaim 只可以講「留意」，唔可以講「會病」「會發作」。
""" + YEAR_COMMON,
    '父母': """## 額外欄位 yearClaim（一定要有）
- 如果呢個判斷係**同長輩、上司、父母相處嘅狀況**（例如易有意見不合、得到提攜、關係疏離），寫一句「今年…」嘅一年內講法，例如 claim「與上司易生意見」→ yearClaim「今年與上司、長輩較易意見不合」。
- 講**父母本人**（性格、出身、壽元、健康、早逝、刑剋、離異）→ 一律 null。
""" + YEAR_COMMON,
    '兄弟': """## 額外欄位 yearClaim（一定要有）
- 如果呢個判斷係**同兄弟姊妹、平輩朋友、合作夥伴相處嘅狀況**（例如合作易生糾紛、得到助力、因財不和），寫一句「今年…」嘅一年內講法，例如 claim「與兄弟易因財不和」→ yearClaim「今年與兄弟姊妹或合作夥伴較易因錢不和」。
- 講**兄弟姊妹人數、排行、本人性格、刑剋**→ 一律 null。
""" + YEAR_COMMON,
    '子女': """## 額外欄位 yearClaim（一定要有）
- 如果呢個判斷係**同子女、後輩、下屬嘅相處狀況**（例如易有隔膜、子女難管教、後輩得力），寫一句「今年…」嘅一年內講法，而且要寫成條件句：「今年如有子女或帶後輩，…」。
- 講**子女人數、生男生女、得子遲早、流產、刑剋、子女本人性格**→ 一律 null。
""" + YEAR_COMMON,
    '田宅': """## 額外欄位 yearClaim（一定要有）
- 如果呢個判斷係**家居、物業、家庭環境嘅狀況**（例如易有搬遷、家宅不寧、置業有阻、破耗祖業），寫一句「今年…」嘅一年內講法，例如 claim「家宅多變動」→ yearClaim「今年家居、物業上較多變動」。
- 講**一生置業多少、祖業有無**→ null。
""" + YEAR_COMMON,
}
# yearClaim 一律唔收嘅字（離婚、重病、意外之類唔可以寫成一年講法）
YEAR_BAN = re.compile(r'早逝|刑傷|生男|生女|離婚|离婚|再婚|分手|離異|生離|死別|刑剋|刑克|開刀|开刀|手術|手术|血光|意外|死亡|壽|寿|絕症|癌|流產|流产|小產')
LIFETIME = re.compile(r'一生|至少有?一次|終生|终生|晚年|中年|早年')


def show(page):
    out = subprocess.run([sys.executable, os.path.join(ROOT, 'tools/wang-reference/deep.py'), 'show', '--page', str(page), '--context', '0'],
                         capture_output=True, text=True, encoding='utf-8').stdout
    return json.loads(out)['blocks']


def spec_for(palace):
    """由官祿 spec 換宮名。"""
    c = PALACES[palace]
    s = open(os.path.join(ROOT, 'tools/synthesis-draft/SPEC-官祿.md'), encoding='utf-8').read()
    for a, b in [('事業宮（官祿宮）', c['label']), ('"syn.career.', f'"syn.{c["prefix"]}.'), ('syn.career.ziwei', f'syn.{c["prefix"]}.ziwei'),
                 ('- chapter："事業"', f'- chapter："{c["chapter"]}"'), ('"<星>事業.', f'"<星>{palace}.'), ('事業宮篇', f'{c["label"]}篇'),
                 ('"name": "官祿"', f'"name": "{palace}"'), ('「該星坐官祿」', f'「該星坐{palace}」'), ('「官祿」', f'「{palace}」'),
                 ('你的事業宮', f'你的{c["label"]}'), ('某星守事業宮', f'某星守{c["label"]}'), ('事業宮唯一主星', f'{c["label"]}唯一主星'),
                 ('星坐本命事業宮', f'星坐本命{c["label"]}'), ('你要寫嘅係事業宮', f'你要寫嘅係{c["label"]}'),
                 ('tmp/synth-draft/examples.json', 'tools/synthesis-draft/examples.json')]:
        s = s.replace(a, b)
    if palace in YEAR:
        s = s[:s.index('## 額外欄位 yearClaim')] + YEAR[palace]
    return s


def prep(palace):
    c = PALACES[palace]
    idx = json.load(open(os.path.join(ROOT, 'tools/wang-reference/deep-index.json'), encoding='utf-8'))['blocks']
    pages = sorted({b['pdf_page'] for b in idx if b['part'] == c['part']})
    secs = OrderedDict()
    for p in pages:
        for b in show(p):
            if b['part'] == c['part']:
                secs.setdefault(b['section_title'], OrderedDict())[b['id']] = (b['pdf_page'], b['text'].replace('\n', ' '))
    os.makedirs(TMP, exist_ok=True)
    open(os.path.join(TMP, f'{palace}-SPEC.md'), 'w', encoding='utf-8').write(spec_for(palace))
    for k, stars in zip('ABC', BATCHES):
        rows = []
        for sec, blocks in secs.items():
            if any(sec.startswith(s) for s in stars):
                rows.append(f'### {sec}（{c["label"]}）')
                rows += [f'{i}\tp{p}\t{t}' for i, (p, t) in blocks.items()]
        open(os.path.join(TMP, f'{palace}-{k}.txt'), 'w', encoding='utf-8').write('\n'.join(rows) + '\n')
        print(f'{palace}-{k}: {len(rows)} 行')


def merge(palace):
    c = PALACES[palace]
    texts = {}
    for k in 'ABC':
        for line in open(os.path.join(TMP, f'{palace}-{k}.txt'), encoding='utf-8'):
            p = line.rstrip('\n').split('\t')
            if len(p) == 3:
                texts[p[0]] = p[2]
    good, bad = [], []
    for k in 'ABC':
        t = re.sub(r'^```(json)?|```$', '', open(os.path.join(TMP, f'{palace}-{k}.json'), encoding='utf-8').read().strip(), flags=re.M).strip()
        for x in json.loads(t):
            why = []
            if x.get('source') not in texts: why.append('source not in batch')
            elif x.get('quote', '') not in texts[x['source']]: why.append('quote not substring')
            if f'"{palace}"' not in json.dumps([x.get('when'), x.get('requires'), x.get('alone')], ensure_ascii=False): why.append(f'no {palace} condition')
            if re.search(r'原書|王亭之|一生最|最順|你曾|那次|你剛', x.get('claim', '') + x.get('because', '')): why.append('banned word')
            if re.search(r'大運|大运|流年|運限|运限|大限', x.get('claim', '') + x.get('quote', '')): why.append('運限 sentence')
            if x.get('yearClaim') and re.search(r'必|決|一定|最', x['yearClaim']): why.append('yearClaim strong word')
            if not x.get('id', '').startswith(f'syn.{c["prefix"]}.'): why.append('id prefix')
            (bad if why else good).append((x, why))
    for x, w in bad:
        print('BAD', x.get('id'), w)
    cp, sp = os.path.join(SYN, 'cards.json'), os.path.join(SYN, 'sources.json')
    C, S = json.load(open(cp, encoding='utf-8')), json.load(open(sp, encoding='utf-8'))
    have = {x['id'] for x in C['cards']}
    year = {}
    for x, _ in good:
        yc = x.pop('yearClaim', None)
        if yc and not LIFETIME.search(x['quote'] + x['claim']) and not YEAR_BAN.search(yc + x['claim']):
            year[x['id']] = yc
    C['cards'] += [x for x, _ in good if x['id'] not in have]
    cache = {}
    for bid in sorted({x['source'] for x, _ in good} - set(S['sources'])):
        pg = int(bid[10:13])
        cache.setdefault(pg, show(pg))
        b = next(y for y in cache[pg] if y['id'] == bid)
        S['sources'][bid] = {'id': bid, 'sha256': b['text_sha256'], 'page': pg, 'section': b['section_title'], 'excerpt': b['text']}
    S['sources'] = dict(sorted(S['sources'].items()))
    json.dump(C, open(cp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(S, open(sp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ap = os.path.join(SYN, f'annual-{c["annual"]}.json')
    A = json.load(open(ap, encoding='utf-8')) if os.path.exists(ap) else {
        '$note': f'流年{palace}：{c["label"]}卡喺流年{palace}宮重新配對嘅一年講法（Codex yearClaim）；一生次數、時序類唔收。', 'cards': {}}
    A['cards'].update(year)
    json.dump(A, open(ap, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'ok {len(good)} bad {len(bad)} yearClaim {len(year)}', Counter(x['id'].split('.')[2] for x, _ in good))


if __name__ == '__main__':
    {'prep': prep, 'merge': merge}[sys.argv[1]](sys.argv[2])
