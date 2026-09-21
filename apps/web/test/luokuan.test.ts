import { describe, expect, it } from 'vitest';
import {
  EMPTY_DRAFT,
  PLACES,
  STEPS,
  TIME_HINT,
  answeredBefore,
  chineseDate,
  firstUnanswered,
  isAnswered,
  isComplete,
  shichenOf,
  stepFromQuery,
  summaryOf,
  toCastRequest,
  type Draft,
} from '@/lib/luokuan';

const full: Draft = {
  name: '李文卿',
  date: '1998-03-12',
  time: '07:40',
  noHour: false,
  placeIndex: 0,
  sex: 'male',
};

describe('五步', () => {
  it('次序同架構 §3 一樣', () => {
    expect([...STEPS]).toEqual(['name', 'date', 'time', 'place', 'sex']);
  });

  it('答齊就完，唔使確認頁', () => {
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

describe('⚠ 一步都唔可以跳（架構 §3）', () => {
  /**
   * 「唔可以 deep link 去『題名』—— 冇前面三幕鋪排，
   * 見到自己個名嗰下冇感覺。」
   *
   * 所以規矩唔係擋一個特定嘅 step，係**前面未答就去唔到**。
   */
  it('空草稿之下，所有 step 都落返第一步', () => {
    for (const s of STEPS) expect(stepFromQuery(s, EMPTY_DRAFT), s).toBe('name');
  });

  it('答咗名，就去得到日期，但去唔到時辰之後', () => {
    const draft = { ...EMPTY_DRAFT, name: '李文卿' };
    expect(stepFromQuery('date', draft)).toBe('date');
    expect(stepFromQuery('place', draft)).toBe('date');
    expect(stepFromQuery('sex', draft)).toBe('date');
  });

  it('答晒就去得返任何一步（改答案）', () => {
    for (const s of STEPS) expect(stepFromQuery(s, full), s).toBe(s);
  });

  it.each([null, undefined, '', 'naming', 'casting', 'NAME', '../'])(
    '唔識嘅 step「%s」→ 落第一個未答嘅',
    (raw) => {
      expect(stepFromQuery(raw, { ...EMPTY_DRAFT, name: '李' })).toBe('date');
    },
  );

  it('全部答晒之後，firstUnanswered 回最後一步 —— 唔會爆', () => {
    expect(firstUnanswered(full)).toBe('sex');
  });
});

describe('已答嘅留喺上面', () => {
  it('第三步嗰陣，上面有頭兩步', () => {
    expect(answeredBefore('time', full)).toEqual(['name', 'date']);
  });

  it('第一步嗰陣，上面乜都冇', () => {
    expect(answeredBefore('name', full)).toEqual([]);
  });

  it('跳過未答嘅（唔應該出現，但唔可以爆）', () => {
    const draft = { ...EMPTY_DRAFT, name: '李文卿', placeIndex: 0 };
    expect(answeredBefore('sex', draft)).toEqual(['name', 'place']);
  });
});

describe('答完之後留喺上面嗰一行', () => {
  it('日期用中文數字（視覺系統 §8）', () => {
    expect(chineseDate('1998-03-12')).toBe('一九九八年三月十二日');
    expect(chineseDate('2026-11-30')).toBe('二〇二六年十一月三十日');
    expect(chineseDate('2000-01-01')).toBe('二〇〇〇年一月一日');
    expect(chineseDate('2026-10-20')).toBe('二〇二六年十月二十日');
  });

  it('壞日期回 null，唔會出半截嘢', () => {
    expect(chineseDate('98-3-12')).toBeNull();
    expect(chineseDate('')).toBeNull();
  });

  it('時間顯示時辰，唔顯示鐘數', () => {
    expect(shichenOf('07:40')).toBe('辰時');
    expect(shichenOf('00:10')).toBe('子時');
    expect(shichenOf('23:30')).toBe('子時');
    expect(shichenOf('12:00')).toBe('午時');
  });

  it('唔知時辰就明寫出嚟', () => {
    expect(summaryOf('time', { ...full, noHour: true })).toBe('不知時辰');
  });

  it('五步每一步都有一行可以留低', () => {
    for (const s of STEPS) expect(summaryOf(s, full), s).not.toBe('');
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
