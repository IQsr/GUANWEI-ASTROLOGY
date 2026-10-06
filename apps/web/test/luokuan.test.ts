import { describe, expect, it } from 'vitest';
import zh from '../messages/zh-Hant.json';
import { EMPTY_DRAFT, PLACES, STEPS, isAnswered, isComplete, toCastRequest, type Draft } from '@/lib/luokuan';

const TIME_HINT = zh.cast.timeHint;

const full: Draft = {
  name: '李文卿',
  date: '1998-03-12',
  time: '07:40',
  slot: null,
  noHour: false,
  placeIndex: 0,
  sex: 'male',
};

describe('落款五樣（2026-10-06 起一版過寫晒）', () => {
  /** 出生地同時辰掉咗位（2026-09）：時辰選項要知出生地先計得出。 */
  it('次序：出生地喺時辰前面', () => {
    expect([...STEPS]).toEqual(['name', 'date', 'place', 'time', 'sex']);
  });

  it('寫齊就落得印，唔使確認頁', () => {
    expect(isComplete(full)).toBe(true);
    expect(isComplete(EMPTY_DRAFT)).toBe(false);
  });
});

describe('⚠ 「唔知時辰」係一個答案，唔係跳過', () => {
  /**
   * 架構 §8：冇時辰定唔到命宮 = 冇書，**但唔好扮有**。
   * 所以佢要行得到落一步（之後由 `castPartial()` 出一本待時辰嘅書），
   * 而唔係一個「跳過」掣。
   */
  it('揀咗唔知時辰 → 呢一步算答咗', () => {
    expect(isAnswered('time', { ...EMPTY_DRAFT, noHour: true })).toBe(true);
  });

  it('冇時間又冇揀唔知 → 未答', () => {
    expect(isAnswered('time', EMPTY_DRAFT)).toBe(false);
  });

  it('唔知時辰嘅請求，time 係 null，唔係一個填咗嘅值', () => {
    const req = toCastRequest({ ...full, noHour: true, time: '' });
    expect(req?.time).toBeNull();
  });
});

describe('⚠ 答唔齊就唔好排盤', () => {
  /**
   * 一個「大概」嘅生辰排出嚟嘅盤，同一個亂作嘅盤冇分別 ——
   * 而讀者分唔出。所以唔補預設值，直接回 null。
   */
  it.each(STEPS)('少咗 %s 就回 null', (step) => {
    const broken: Draft = { ...full };
    if (step === 'name') broken.name = '';
    if (step === 'date') broken.date = '';
    if (step === 'time') {
      broken.time = '';
      broken.noHour = false;
    }
    if (step === 'place') broken.placeIndex = null;
    if (step === 'sex') broken.sex = null;
    expect(toCastRequest(broken)).toBeNull();
  });

  it('答齊就砌得出，而且經緯度時區由地點嗰張表出', () => {
    const req = toCastRequest(full)!;
    expect(req.tz).toBe(PLACES[0]!.tz);
    expect(req.place.lng).toBe(PLACES[0]!.lng);
    expect(req.solar).toEqual({ y: 1998, m: 3, d: 12 });
    expect(req.time).toEqual({ h: 7, min: 40 });
  });
});

describe('⚠ 夏令時嗰句（rules.md R-007）', () => {
  /**
   * 夏令時係我哋自己由時區同日期算返出嚟。用戶自己「調咗」一個鐘先填，
   * 我哋就會再調多次 —— 一個差一個鐘嘅生辰，時辰隨時差一格，而時辰定命宮。
   */
  it('寫住唔使自己調', () => {
    expect(TIME_HINT).toContain('不用自己調夏令時');
  });

  it('同時要講清楚填邊個時間', () => {
    expect(TIME_HINT).toContain('出世紙');
  });

  /**
   * ⚠ 面向讀者嘅文案係**書面語**。
   * 粵語係我哋之間講嘢嘅話，唔係本書講嘢嘅話 ——
   * 同一頁入面「沒有時辰就定不到命宮」同「唔使」撈埋一齊，
   * 讀者唔會覺得親切，佢會覺得寫得唔小心。
   */
  it.each(['唔', '嘅', '嗰', '咗', '喺', '係'])('冇粵語口語「%s」', (word) => {
    expect(TIME_HINT).not.toContain(word);
  });
});

describe('⚠ 所有讀者睇到嘅中文都係書面語', () => {
  /**
   * 文案搬去 messages 之後，呢條規矩唔再淨係守一句：成個檔都守。
   * `tokens` 唔計 —— 嗰個係開發用嘅樣板頁，唔係讀者睇嘅。
   */
  const strings = (o: unknown, path = ''): [string, string][] =>
    typeof o === 'string'
      ? [[path, o]]
      : Array.isArray(o)
        ? o.flatMap((v, i) => strings(v, `${path}[${i}]`))
        : o && typeof o === 'object'
          ? Object.entries(o).flatMap(([k, v]) => (path === '' && k === 'tokens' ? [] : strings(v, path ? `${path}.${k}` : k)))
          : [];

  /*
   * ⚠ 「係」要睇前面：「關係」「聯係」係書面語（人際關係），淨係單獨嘅「係」先係口語。
   * 「撳」係第一批搬文案嗰陣捉到嘅（「撳書脊打開」）。
   */
  it.each([
    ['唔', /唔/],
    ['嘅', /嘅/],
    ['嗰', /嗰/],
    ['咗', /咗/],
    ['喺', /喺/],
    ['係', /(?<![關聯])係/],
    ['揀', /揀/],
    ['冇', /冇/],
    ['佢', /佢/],
    ['撳', /撳/],
  ] as const)('冇粵語口語「%s」', (_word, re) => {
    expect(strings(zh).filter(([, v]) => re.test(v)).map(([k]) => k)).toEqual([]);
  });
});

/* ── server action 收到嘅嘢 ──────────────────────────────── */

import { parseCastRequest } from '@/lib/luokuan';

describe('⚠ server action 係一個公開 endpoint', () => {
  /**
   * 任何人都 post 得到任何嘢入去，唔會經過五步，亦都唔會經過個 UI。
   * 所以型別喺呢度冇效力 —— 要逐格核。
   */
  const good = toCastRequest(full)!;

  it('正常嘅收', () => {
    expect(parseCastRequest(JSON.parse(JSON.stringify(good)))).toEqual(good);
  });

  it.each([null, undefined, 42, 'x', [], {}])('唔係一個請求：%s → null', (bad) => {
    expect(parseCastRequest(bad)).toBeNull();
  });

  it.each([
    ['年份超出萬年曆', { solar: { y: 1799, m: 3, d: 12 } }],
    ['年份太後', { solar: { y: 2200, m: 3, d: 12 } }],
    ['月份唔存在', { solar: { y: 1998, m: 13, d: 12 } }],
    ['日數唔存在', { solar: { y: 1998, m: 3, d: 32 } }],
    ['鐘數唔存在', { time: { h: 24, min: 0 } }],
    ['分鐘唔存在', { time: { h: 7, min: 60 } }],
    ['小數鐘數', { time: { h: 7.5, min: 0 } }],
    ['性別亂填', { sex: 'x' }],
    ['經度出咗地球', { place: { lng: 999, lat: 0, label: 'x' } }],
    ['緯度出咗地球', { place: { lng: 0, lat: 91, label: 'x' } }],
  ])('%s → null', (_name, patch) => {
    expect(parseCastRequest({ ...good, ...(patch as object) })).toBeNull();
  });

  /**
   * ⚠ 時區特別緊要。
   *
   * 佢決定夏令時同真太陽時校正，而一個亂填嘅時區排出嚟嘅盤
   * **照樣排得出**，只係錯 —— 而且錯得睇唔出。
   */
  it.each(['Mars/Olympus', 'UTC', '', 'Asia/Hong_Kong '])('唔喺表入面嘅時區「%s」→ null', (tz) => {
    expect(parseCastRequest({ ...good, tz })).toBeNull();
  });

  it('唔知時辰嘅請求照收', () => {
    expect(parseCastRequest({ ...good, time: null })?.time).toBeNull();
  });
});

describe('姓名可以留空（2026-09）', () => {
  it('落印之前，空名唔算答咗（落印嗰下先當「無名」）', () => {
    expect(isAnswered('name', EMPTY_DRAFT)).toBe(false);
    expect(isAnswered('name', { ...EMPTY_DRAFT, name: '字'.repeat(41) })).toBe(false);
  });

  it('留空落印：算答咗，砌得出請求', () => {
    const blank = { ...full, name: '  ', nameless: true };
    expect(isAnswered('name', blank)).toBe(true);
    expect(isComplete(blank)).toBe(true);
    expect(toCastRequest(blank)).not.toBeNull();
  });
});
