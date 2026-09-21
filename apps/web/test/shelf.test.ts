import { describe, expect, it } from 'vitest';
import { isEmptyShelf, shelf, type ShelfBook } from '@/lib/shelf';

/**
 * 工單 E3 驗收標準二、三（次序、朱砂、空狀態）。
 * 一、四（零木紋零陰影零透視、取書之後書櫃淡到 16%）要開瀏覽器量，
 * 喺 `scripts/check-shelf.mjs`。
 */

let n = 0;
function book(p: Partial<ShelfBook> = {}): ShelfBook {
  n += 1;
  return {
    id: `b${n}`,
    state: 'titled',
    name: `李${n}`,
    lastReadAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    ...p,
  };
}

describe('⚠ 永遠有一條「＋ 新書」', () => {
  it('空書架 = 得嗰一條', () => {
    const spines = shelf([]);
    expect(spines).toHaveLength(1);
    expect(spines[0]!.kind).toBe('new');
    expect(spines[0]!.href).toBe('/cast');
    expect(isEmptyShelf(spines)).toBe(true);
  });

  it('有書都一樣有，而且永遠喺最右', () => {
    const spines = shelf([book(), book(), book()]);
    expect(spines).toHaveLength(4);
    expect(spines.at(-1)!.kind).toBe('new');
    expect(spines.filter((s) => s.kind === 'new')).toHaveLength(1);
    expect(isEmptyShelf(spines)).toBe(false);
  });
});

describe('⚠ 空白書唔畫', () => {
  /**
   * 一本乜都冇寫過嘅書，同一格空位係同一樣嘢。
   * 畫咗出嚟，讀者就見到兩條一模一樣嘅虛線書脊，而佢分唔出邊條係邊條。
   */
  it('得一本 blank = 睇落同空書架一樣', () => {
    const spines = shelf([book({ state: 'blank', name: null })]);
    expect(spines).toHaveLength(1);
    expect(isEmptyShelf(spines)).toBe(true);
  });

  it('幾多本 blank 都唔會多咗書脊', () => {
    const blanks = [
      book({ state: 'blank', name: null }),
      book({ state: 'blank', name: null }),
      book({ state: 'blank', name: null }),
    ];
    expect(shelf(blanks)).toHaveLength(1);
  });

  /** 但「待時辰」係本真書 —— 佢有名，佢要見得到（架構 §8）。 */
  it('awaiting 要畫，而且用返個名', () => {
    const spines = shelf([book({ state: 'awaiting', name: '李文卿' })]);
    expect(spines).toHaveLength(2);
    expect(spines[0]!.kind).toBe('awaiting');
    expect(spines[0]!.label).toBe('李文卿');
  });
});

describe('⚠ 最近讀嗰本喺最左', () => {
  it('讀過嘅排喺未讀過嘅前面', () => {
    const old = book({ name: '舊', createdAt: '2026-01-01T00:00:00Z' });
    const fresh = book({ name: '新', createdAt: '2026-05-01T00:00:00Z' });
    const read = book({
      name: '讀過',
      createdAt: '2025-01-01T00:00:00Z',
      lastReadAt: '2026-09-01T00:00:00Z',
    });
    expect(shelf([old, fresh, read]).map((s) => s.label)).toEqual([
      '讀過',
      '新',
      '舊',
      '＋ 新書',
    ]);
  });

  /**
   * ⚠ 呢條係防住「用 created_at 排」嗰條。
   *
   * 書架係回訪落點（架構 §4）。一個按開書日期排嘅書架，
   * 讀得越耐排得越後 —— 啱啱掉轉。
   */
  it('一本好舊但啱啱讀過嘅書，排第一', () => {
    const ancient = book({
      name: '一年前開嘅',
      createdAt: '2025-09-01T00:00:00Z',
      lastReadAt: '2026-09-14T00:00:00Z',
    });
    const yesterday = book({ name: '琴日開嘅', createdAt: '2026-09-13T00:00:00Z' });
    expect(shelf([yesterday, ancient])[0]!.label).toBe('一年前開嘅');
  });
});

describe('⚠ 在讀嗰本轉朱砂', () => {
  it('最多一本', () => {
    const spines = shelf([
      book({ lastReadAt: '2026-09-01T00:00:00Z' }),
      book({ lastReadAt: '2026-09-02T00:00:00Z' }),
      book(),
    ]);
    expect(spines.filter((s) => s.reading)).toHaveLength(1);
  });

  it('係最近讀嗰本', () => {
    const a = book({ name: 'A', lastReadAt: '2026-09-01T00:00:00Z' });
    const b = book({ name: 'B', lastReadAt: '2026-09-09T00:00:00Z' });
    const spines = shelf([a, b]);
    expect(spines.find((s) => s.reading)!.label).toBe('B');
  });

  /**
   * ⚠ 「在讀」唔係「最左」。
   *
   * 一個從來未開過任何一本書嘅人，書架上面唔應該有一本着咗朱砂 ——
   * 朱砂全站面積 ≤ 1%（視覺 §2），佢喺呢度嘅意思係「你停咗喺呢度」。
   * 冇停過就冇呢個位。
   */
  it('一本都未讀過 → 冇朱砂', () => {
    const spines = shelf([book(), book()]);
    expect(spines.some((s) => s.reading)).toBe(false);
  });

  it('「＋ 新書」永遠唔會係在讀', () => {
    const spines = shelf([book({ lastReadAt: '2026-09-01T00:00:00Z' })]);
    expect(spines.at(-1)!.reading).toBe(false);
  });
});

/* ── shelfView ────────────────────────────────────────────── */

import { shelfView, type ShelfPort, type ShelfReader } from '@/lib/shelf';

function port(
  reader: ShelfReader | null,
  books: ShelfBook[] = [],
  fail?: 'reader' | 'books',
): ShelfPort {
  return {
    reader: async () => {
      if (fail === 'reader') throw new Error('down');
      return reader;
    },
    books: async () => {
      if (fail === 'books') throw new Error('down');
      return books;
    },
  };
}

const fresh: ShelfReader = { isAnonymous: true, visitDays: 1, dismissed: false };

describe('⚠ 撈唔到 ≠ 你冇書', () => {
  /**
   * 一個喺 DB 撈唔到嗰陣顯示「空書架」嘅版，等於同一個回訪嘅人講
   * 「你啲書冇咗」—— 而佢啲書其實好地地。
   */
  it.each(['reader', 'books'] as const)('%s 撈唔到 → unavailable，唔係空書架', async (where) => {
    const view = await shelfView(port(fresh, [book()], where));
    expect(view.kind).toBe('unavailable');
  });

  it('真係空 → ok ＋ 得嗰條「＋ 新書」', async () => {
    const view = await shelfView(port(fresh, []));
    expect(view.kind).toBe('ok');
    if (view.kind === 'ok') expect(isEmptyShelf(view.spines)).toBe(true);
  });

  it('未有 session → 空書架，唔係 unavailable', async () => {
    const view = await shelfView(port(null));
    expect(view.kind).toBe('ok');
    if (view.kind === 'ok') {
      expect(isEmptyShelf(view.spines)).toBe(true);
      expect(view.prompt).toBeNull();
    }
  });
});

describe('書架頂嗰個認領提示（G2 第二個位）', () => {
  it('第二次回訪先出，而且係一條界欄', async () => {
    const view = await shelfView(port({ ...fresh, visitDays: 2 }, [book()]));
    expect(view.kind).toBe('ok');
    if (view.kind === 'ok') expect(view.prompt?.form).toBe('rule');
  });

  it.each([1, 3, 7])('第 %i 日唔出', async (visitDays) => {
    const view = await shelfView(port({ ...fresh, visitDays }, [book()]));
    if (view.kind === 'ok') expect(view.prompt).toBeNull();
  });

  it('認咗領就唔出', async () => {
    const view = await shelfView(port({ isAnonymous: false, visitDays: 2, dismissed: false }));
    if (view.kind === 'ok') expect(view.prompt).toBeNull();
  });
});
