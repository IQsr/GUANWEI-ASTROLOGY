import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { EVENTS, FORBIDDEN_KEYS, assertClean, track } from '@/lib/analytics';

/**
 * 隱私與 analytics（工單 H1 · 架構 §10）
 *
 * ⚠ 呢啲測試大部分係防盜鈴，唔係功能測試。
 * 佢哋守住嘅唔係「個 function 做唔做到嘢」，
 * 係「有人日後順手將生辰塞入一個 event 度」。
 */

const SRC = fileURLToPath(new URL('../src', import.meta.url));

function walk(d: string): string[] {
  return readdirSync(d).flatMap((n) => {
    const full = join(d, n);
    return statSync(full).isDirectory() ? walk(full) : /\.tsx?$/.test(n) ? [full] : [];
  });
}

/** 剷註釋先掃 —— 掃描器要量宣告，唔係量散文（D1／E2／G1 嗰三次）。 */
function bare(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('⚠ 生辰唔准入 event（架構 §10 第二條）', () => {
  it('一個生辰欄位都塞唔入', () => {
    expect(() => assertClean('cast.done', { solar: '1996-06-16' })).toThrow(/唔准入 event/);
    expect(() => assertClean('cast.done', { place: '香港' })).toThrow(/唔准入 event/);
    expect(() => assertClean('luokuan.step', { name: '黃' })).toThrow(/唔准入 event/);
  });

  /**
   * ⚠ 呢條先係重點：由生辰推出嚟嘅盤面值，一樣係生辰。
   *
   * 五行局＋命宮＋性別唔係一個人名，但佢哋一齊收窄緊同一件事 ——
   * 而收窄一個出生時刻，就係我哋講緊唔會做嗰樣。
   */
  it('盤面值一樣塞唔入 —— 佢哋由生辰推出嚟', () => {
    for (const key of ['chart', 'wuxingJu', 'mingGong', 'shenGong', 'ganzhi', 'lunar']) {
      expect(() => assertClean('cast.done', { [key]: 'x' }), key).toThrow(/唔准入 event/);
    }
  });

  /** 假名唔係匿名：配返 DB 就認得返個人。 */
  it('讀者 id、書 id、email 都塞唔入', () => {
    for (const key of ['readerId', 'bookId', 'email', 'token']) {
      expect(() => assertClean('juan.open', { [key]: 'x' }), key).toThrow(/唔准入 event/);
    }
  });

  /**
   * ⚠ 真正擋住生辰嗰條唔係欄名，係值。
   *
   * 欄名可以改成 `s`、`v`、`q`，但一個 enum 塞唔入「1996-06-16」。
   * 一個自由文字欄位就係一條後門。
   */
  it('欄名改到幾古怪都好，自由文字一樣入唔到', () => {
    expect(() => assertClean('cast.done', { q: '1996-06-16' })).toThrow(/只准帶張表宣告咗嘅欄/);
    expect(() => assertClean('cast.done', { result: '1996-06-16' })).toThrow(/只准係/);
  });

  it('張表入面一個自由文字欄位都冇', () => {
    for (const [name, spec] of Object.entries(EVENTS)) {
      for (const [key, values] of Object.entries(spec.props as Record<string, readonly string[]>)) {
        expect(Array.isArray(values), `${name}.${key}`).toBe(true);
        expect(values.length, `${name}.${key}`).toBeGreaterThan(0);
        for (const v of values) expect(typeof v, `${name}.${key}`).toBe('string');
      }
    }
  });
});

describe('事件要先宣告', () => {
  it('冇宣告過嘅事件送唔出', () => {
    expect(() => assertClean('secret.dump', {})).toThrow(/唔認得嘅事件/);
  });

  it('宣告咗嘅照送得', () => {
    expect(() => assertClean('luokuan.step', { step: 'time' })).not.toThrow();
    expect(() => assertClean('enter.view', {})).not.toThrow();
    expect(() => track('cast.done', { result: 'partial' })).not.toThrow();
  });

  it('每個事件都有一句人話 label', () => {
    for (const [name, spec] of Object.entries(EVENTS)) {
      expect(spec.label.length, name).toBeGreaterThan(1);
    }
  });
});

/**
 * ⚠ 禁字名單係影子，型別定義先係真嘢。
 *
 * B16 學過：一張要人記得去加嘅名單，就係一張會漏嘅名單。
 * 所以呢條測試對住引擎嗰份 `BirthInput` 逐個欄名比對 ——
 * 引擎加咗欄而 `FORBIDDEN_KEYS` 冇跟，呢度就紅。
 */
describe('⚠ 禁字名單要跟得上引擎', () => {
  const TYPES = fileURLToPath(new URL('../../../packages/ziwei/src/types.ts', import.meta.url));

  it('BirthInput 每一個欄名都喺禁字名單入面', () => {
    const src = readFileSync(TYPES, 'utf8');
    const block = src.slice(src.indexOf('export type BirthInput'));
    const body = block.slice(0, block.indexOf('\n};'));
    const keys = [...body.matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1]!);

    /* 先證明佢真係讀到嘢 —— 一個數到零個欄嘅檢查會靜靜雞全綠。 */
    expect(keys.length).toBeGreaterThanOrEqual(5);
    expect(keys).toContain('solar');

    const lower = FORBIDDEN_KEYS.map((k) => k.toLowerCase());
    for (const k of keys) {
      if (k === 'options') continue; /* 流派選項唔係個人資料 */
      expect(lower, `BirthInput.${k} 未入禁字名單`).toContain(k.toLowerCase());
    }
  });
});

describe('⚠ 量度出事唔可以連累用戶', () => {
  /**
   * 一個因為 analytics 而白屏嘅落款頁，比冇 analytics 差好多。
   * 開發嗰陣掟（所以上面啲測試捉得到），上到線就靜靜雞唔送。
   */
  it('production 之下唔會掟', () => {
    /* ⚠ vi.stubEnv：`process.env.NODE_ENV` 喺 vitest 之下唔係一個改得嘅欄。 */
    vi.stubEnv('NODE_ENV', 'production');
    try {
      expect(() =>
        (track as unknown as (e: string, p: unknown) => void)('cast.done', { solar: 'x' }),
      ).not.toThrow();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('開發之下照掟 —— 否則測試捉唔到', () => {
    expect(() =>
      (track as unknown as (e: string, p: unknown) => void)('cast.done', { solar: 'x' }),
    ).toThrow();
  });
});

describe('⚠ analytics 得一個出入口', () => {
  /**
   * 同 `lib/local.ts` 一樣：規矩守唔守得住，在於有冇第二道門。
   * 而家一個 provider 都未接，所以呢條量嘅係「冇人偷偷接咗一個」。
   */
  it('全 src 冇第二個地方送 analytics', () => {
    const offenders = walk(SRC)
      .filter((f) => !f.endsWith(join('lib', 'analytics.ts')))
      .filter((f) => /gtag|dataLayer|posthog|plausible|mixpanel|amplitude|segment\.|analytics\.track\(/i.test(bare(f)));
    expect(offenders).toEqual([]);
  });
});

describe('⚠ 生辰唔准入網址', () => {
  /**
   * 架構 §3：`?step=` 只為 back 掣行為。
   *
   * 網址會入 server log、入 referrer、入書籤、入分享。
   * 一個 `?date=1996-06-16` 就係將生辰貼咗落所有嗰啲地方。
   */
  it('落款頁只寫得入 step 一個 query 欄', () => {
    const luokuan = bare(join(SRC, 'components', 'Luokuan.tsx'));
    const sets = [...luokuan.matchAll(/searchParams\.set\(\s*["']([^"']+)["']/g)].map((m) => m[1]);
    expect(sets.length).toBeGreaterThan(0);
    expect([...new Set(sets)]).toEqual(['step']);
  });

  it('全 src 冇人將生辰塞入 searchParams', () => {
    const offenders = walk(SRC).filter((f) =>
      /searchParams\.set\(\s*["'](name|date|time|place|sex|birth|tz)["']/.test(bare(f)),
    );
    expect(offenders).toEqual([]);
  });
});

/**
 * ⚠ 三份文件講住個掃描層數，而嗰個數一直要人手改。
 *
 * H1 加第十二層嗰陣，README / SETUP / DEPLOY 三份仲寫住「九層」——
 * F2、F4、B16 各加過一層，冇一次有人記得去改。
 * 同 B16 嗰張路由名單一模一樣嘅形狀：**要人記得去加嘅數，就係一個會錯嘅數。**
 *
 * 而且 SETUP.md 仲寫住「`pnpm build` 連驗收掃描」—— 嗰個講法喺
 * 「build 同 verify 分家」之後就唔啱，而佢正正係會令 Vercel 部署仆街嗰個講法。
 */
describe('⚠ 文件講嘅掃描層數要同真嘅對得返', () => {
  const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
  const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

  function chinese(n: number): string {
    if (n <= 10) return CN[n]!;
    if (n < 20) return `十${CN[n - 10]}`;
    return `${CN[Math.floor(n / 10)]}十${n % 10 ? CN[n % 10] : ''}`;
  }

  const verify = JSON.parse(
    readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
  ).scripts.verify as string;
  const layers = [...verify.matchAll(/scripts\/check-[\w-]+\.mjs/g)].length;

  it('數得到層數', () => {
    expect(layers).toBeGreaterThanOrEqual(10);
  });

  it('README / SETUP / DEPLOY 冇一份講錯', () => {
    const want = `${chinese(layers)}層`;
    for (const f of ['README.md', 'SETUP.md', 'DEPLOY.md']) {
      const text = readFileSync(join(ROOT, f), 'utf8');
      const said = [...text.matchAll(/([零一二三四五六七八九十]+)層(?:驗收)?掃描/g)].map((m) => `${m[1]}層`);
      for (const s of said) expect(s, `${f} 講住 ${s}，實際 ${want}`).toBe(want);
    }
  });

  /** ⚠ 呢個講法會令 Vercel 部署仆街 —— build 同 verify 由「上線準備」嗰陣起就分咗家。 */
  it('冇一份仲講住 pnpm build 會行掃描', () => {
    for (const f of ['README.md', 'SETUP.md', 'DEPLOY.md']) {
      const text = readFileSync(join(ROOT, f), 'utf8');
      expect(text, f).not.toMatch(/pnpm build[^\n]{0,40}(會行|連)[^\n]*掃描/);
    }
  });
});
