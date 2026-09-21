import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cast, solarFromLunar, type BirthInput, type Chart } from '../src/index';

/**
 * 工單 B5：書本例盤。
 *
 * 呢批係**唯一真正嘅 ground truth** —— 權威高過不變量，高過 iztro。
 * 由《紫微斗數全書》／中州派講義抄落嚟，抄嘅係「書上寫住嘅答案」。
 *
 * 對照器嘅設計原則：**填幾多對幾多**。
 * 書上冇印嘅嘢就唔好喺 fixture 度填，測試只會檢查你填咗嘅欄位。
 * 咁樣抄一個宮都已經有價值，唔使抄齊成張盤先跑得。
 *
 * 加新例盤：抄 _template.json，改個名（唔好用底線開頭），填數。
 */

const DIR = fileURLToPath(new URL('./fixtures/book-charts/', import.meta.url));

type Fixture = {
  source: { book: string; ref?: string; note?: string };
  input: {
    lunar?: { y: number; m: number; d: number; isLeapMonth?: boolean };
    solar?: { y: number; m: number; d: number } | null;
    shichen: number;
    sex: 'male' | 'female';
    tz?: string;
    lng?: number;
  };
  expect: {
    wuxingJu?: string;
    mingGong?: string;
    shenGong?: string;
    ganzhi?: Partial<Record<'year' | 'month' | 'day' | 'hour', string>>;
    palaces?: Record<
      string,
      {
        name?: string;
        stem?: string;
        majorStars?: string[];
        auxStars?: string[];
        brightness?: Record<string, string>;
        sihua?: Record<string, string>;
      }
    >;
    decadals?: Record<string, string>;
  };
};

function load(prefixUnderscore: boolean): Array<{ file: string; fx: Fixture }> {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.json') && f.startsWith('_') === prefixUnderscore)
    .sort()
    .map((f) => ({ file: f, fx: JSON.parse(readFileSync(DIR + f, 'utf-8')) as Fixture }));
}

function buildInput(fx: Fixture): BirthInput {
  let solar = fx.input.solar ?? null;
  if (!solar && fx.input.lunar) {
    const s = solarFromLunar(
      fx.input.lunar.y,
      fx.input.lunar.m,
      fx.input.lunar.d,
      fx.input.lunar.isLeapMonth ?? false,
    );
    if (!s.ok) throw new Error(`農曆轉國曆失敗：${s.message}`);
    solar = s.value;
  }
  if (!solar) throw new Error('fixture 冇 lunar 亦冇 solar');
  return {
    solar,
    time: { shichen: fx.input.shichen as BirthInput['time'] extends never ? never : 0 },
    tz: fx.input.tz ?? 'Asia/Shanghai',
    place: { lng: fx.input.lng ?? 120, lat: 30, label: '東經 120 度' },
    sex: fx.input.sex,
    // 書上寫嘅係時辰，唔係鐘面時間 —— 唔可以再做真太陽時校正
    options: { trueSolarTime: false },
  } as BirthInput;
}

/** 只檢查 fixture 填咗嘅欄位。回傳唔啱嘅地方。 */
function compare(fx: Fixture, c: Chart): string[] {
  const bad: string[] = [];
  const eq = (label: string, mine: unknown, theirs: unknown) => {
    if (theirs === undefined) return;
    if (JSON.stringify(mine) !== JSON.stringify(theirs)) {
      bad.push(`${label}：引擎 ${JSON.stringify(mine)} ≠ 書 ${JSON.stringify(theirs)}`);
    }
  };

  eq('五行局', c.wuxingJu.name, fx.expect.wuxingJu);
  eq('命宮', c.mingGong, fx.expect.mingGong);
  eq('身宮', c.shenGong, fx.expect.shenGong);

  if (fx.expect.ganzhi) {
    for (const k of ['year', 'month', 'day', 'hour'] as const) {
      const want = fx.expect.ganzhi[k];
      if (want !== undefined) eq(`${k}柱`, c.ganzhi[k].join(''), want);
    }
  }

  for (const [branch, want] of Object.entries(fx.expect.palaces ?? {})) {
    if (branch.startsWith('$')) continue;
    const p = c.palaces.find((x) => x.branch === branch);
    if (!p) {
      bad.push(`${branch} 宮：引擎搵唔到呢個宮`);
      continue;
    }
    eq(`${branch} 宮名`, p.name, want.name);
    eq(`${branch} 宮干`, p.stem, want.stem);
    if (want.majorStars) {
      eq(
        `${branch} 主星`,
        p.stars.filter((s) => s.kind === 'major').map((s) => s.name).sort(),
        [...want.majorStars].sort(),
      );
    }
    if (want.auxStars) {
      eq(
        `${branch} 輔星`,
        p.stars.filter((s) => s.kind === 'aux').map((s) => s.name).sort(),
        [...want.auxStars].sort(),
      );
    }
    for (const [star, level] of Object.entries(want.brightness ?? {})) {
      eq(`${branch} ${star} 廟旺`, p.stars.find((s) => s.name === star)?.brightness, level);
    }
    for (const [star, hua] of Object.entries(want.sihua ?? {})) {
      eq(`${branch} ${star} 四化`, p.stars.find((s) => s.name === star)?.sihua, hua);
    }
  }

  for (const [branch, range] of Object.entries(fx.expect.decadals ?? {})) {
    if (branch.startsWith('$')) continue;
    const d = c.decadals.find((x) => x.branch === branch);
    eq(`${branch} 大限`, d ? `${d.fromAge}-${d.toAge}` : undefined, range);
  }

  return bad;
}

const books = load(false);

describe('書本例盤（B5 · ground truth）', () => {
  it('對照器本身行得通（用引擎自己生成嘅示範 fixture 自我測試）', () => {
    const demos = load(true).filter((x) => x.file.includes('example'));
    expect(demos.length).toBeGreaterThan(0);
    for (const { file, fx } of demos) {
      const r = cast(buildInput(fx));
      expect(r.ok, `${file} 排唔到盤`).toBe(true);
      if (r.ok) expect(compare(fx, r.value), file).toEqual([]);
    }
  });

  it('每個例盤都有出處（書名 + 頁）', () => {
    for (const { file, fx } of books) {
      expect(fx.source?.book, `${file} 冇書名`).toBeTruthy();
      expect(fx.source?.ref, `${file} 冇頁碼`).toBeTruthy();
    }
  });

  it.runIf(books.length > 0)(`${books.length} 個書本例盤全對`, () => {
    const bad: string[] = [];
    for (const { file, fx } of books) {
      const r = cast(buildInput(fx));
      if (!r.ok) {
        bad.push(`${file}：排唔到盤（${r.code}）`);
        continue;
      }
      for (const msg of compare(fx, r.value)) bad.push(`${file} → ${msg}`);
    }
    expect(bad).toEqual([]);
  });

  it('進度：目標 20–30 個', () => {
    if (books.length === 0) {
      // eslint-disable-next-line no-console
      console.log(
        '\n  ⚠ 未有任何書本例盤。抄 test/fixtures/book-charts/_template.json 開始（工單 B5）。\n' +
          '    呢批係唯一真正嘅 ground truth —— 冇佢，引擎只係「同 iztro 一致」，唔係「啱」。\n',
      );
    }
    expect(books.length).toBeGreaterThanOrEqual(0);
  });
});
