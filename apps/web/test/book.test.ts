import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BOOK_STATES, GEOMETRY, SHAPE_OF, slotsOf, type BookShape } from '@/lib/book';
import { sitemapEntries } from '@/lib/seo';

/**
 * 工單 E2 嘅四條驗收標準，機器捉得到嗰部分。
 *
 * 捉唔到嗰部分（400px 唔橫向滾、reduced-motion 直接到位）喺
 * `scripts/check-book.mjs` —— 嗰啲要開個瀏覽器先量得到（D1 嘅教訓）。
 */

const CSS = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');

/** 淨係抽「書」元件嗰一段出嚟 —— 全個檔掃就會撞到命盤同入齋幕序。 */
const SHU = (() => {
  const mark = CSS.indexOf('「書」元件（工單 E2');
  /* 由開段嗰個 `/*` 起計 —— 由標題起計嘅話第一個註釋冇咗開頭，
     下面剷註釋嗰步就對唔返對。 */
  const from = CSS.lastIndexOf('/*', mark);
  /*
   * ⚠ 收喺**下一個大標題**度，唔係收喺某一個指定嘅段落度。
   *
   * 第一版寫住「由『書』元件切到『動效基礎層』」。E3 喺兩者之間插咗
   * 書櫃嗰段，於是呢段掃描範圍靜靜咁大咗一倍，跟住即刻報
   * 「書嗰段有 transform」—— 而嗰個 transform 係書架 hover 升 10px 嘅。
   *
   * 今次佢嘈出嚟，所以捉到。但如果新插嗰段啱啱好乾淨，佢會照樣綠 ——
   * 一個量緊兩段嘢嘅測試，扮緊量一段。
   * 所以切法要跟**結構**（下一個 `/* ===` 大標題），唔跟內容。
   */
  const to = CSS.indexOf('/* ===', mark);
  expect(mark, '搵唔到「書」元件嗰段 CSS').toBeGreaterThan(-1);
  expect(to, '搵唔到段尾').toBeGreaterThan(mark);
  return CSS.slice(from, to);
})();

/**
 * ⚠ 掃嘅係**宣告**，唔係註釋。
 *
 * 第一版直接掃成段，即刻三條紅 —— 因為我自己喺註釋度寫住
 * 「零 3D、零 scale、零 rotate」。
 *
 * 呢個同 D1 嗰個掃描器一模一樣嘅錯：嗰次 flag 咗每版 footer 嘅
 * 「沒有生辰」，今次 flag 咗「我哋唔用 rotate」。
 * **一個會 flag 咗『我哋唔用 X』呢句嘅掃描器，量緊嘅係錯嘅嘢。**
 * 所以剷走註釋先掃，唔係開一張例外表。
 */
const SHU_DECL = SHU.replace(/\/\*[\s\S]*?\*\//g, '');

describe('五個狀態，三個形', () => {
  it('五個狀態各自有一個形', () => {
    for (const s of BOOK_STATES) expect(SHAPE_OF[s], s).toBeTruthy();
    expect(BOOK_STATES).toHaveLength(5);
  });

  it('三個形全部用得到 —— 冇一個係寫咗冇人用', () => {
    const used = new Set(BOOK_STATES.map((s) => SHAPE_OF[s]));
    expect([...used].sort()).toEqual(['closed', 'opened', 'shelf']);
  });

  /**
   * ⚠ 呢兩條係特登寫出嚟，唔係漏咗。
   *
   * 「合上題名」同「封面」幾何一模一樣，「展開」同「跨頁」亦都一樣。
   * 如果將來有人想畀 titled 加個 scale、或者畀 open 加個 rotate 去
   * 「分得開啲」，呢兩條就會爆 —— 而嗰個正正係第一條 AC 禁止嘅嘢。
   */
  it('題名同封面同一個形 —— 分別喺內容，唔喺幾何', () => {
    expect(SHAPE_OF.titled).toBe(SHAPE_OF.cover);
  });

  it('展開同跨頁同一個形', () => {
    expect(SHAPE_OF.open).toBe(SHAPE_OF.spread);
  });

  it('書脊喺中間：合埋嗰陣左頁係零，所以佢自然企咗喺左邊', () => {
    expect(GEOMETRY.closed.verso).toBe('0px');
    expect(GEOMETRY.opened.verso).toBe(GEOMETRY.opened.recto);
  });

  it('架上淨係得書脊 ＋ 3px 書口', () => {
    expect(GEOMETRY.shelf.recto).toBe('0px');
    expect(GEOMETRY.shelf.verso).toBe('var(--shu-kou)');
    expect(GEOMETRY.shelf.ji).toBe('var(--shu-ji-jia)');
  });

  it('內容格跟形走，唔跟狀態走', () => {
    expect(slotsOf('shelf')).toEqual({ spine: true, cover: true, page: false });
    expect(slotsOf('closed')).toEqual({ spine: false, cover: true, page: false });
    expect(slotsOf('opened')).toEqual({ spine: false, cover: false, page: true });
  });
});

describe('⚠ 闊度表同 CSS 唔准走音', () => {
  /** 由 CSS 度抽返 `.shu[data-shape="X"]` 入面三條 --w-*。 */
  function cssGeometry(shape: BookShape) {
    const block = SHU.match(new RegExp(`\\.shu\\[data-shape="${shape}"\\]\\s*\\{([^}]*)\\}`));
    expect(block, `CSS 冇 ${shape}`).toBeTruthy();
    const body = block![1]!;
    const pick = (name: string) => body.match(new RegExp(`--w-${name}:\\s*([^;]+);`))?.[1]?.trim();
    return { verso: pick('verso'), ji: pick('ji'), recto: pick('recto') };
  }

  for (const shape of ['shelf', 'closed', 'opened'] as const) {
    it(`${shape}：TS 三個值同 CSS 一模一樣`, () => {
      expect(cssGeometry(shape)).toEqual(GEOMETRY[shape]);
    });
  }
});

describe('⚠ 第一條 AC：零 3D、零 scale、零 rotate', () => {
  /**
   * 「書轉過嚟面向你」只准用闊度做。呢條掃嘅係 CSS 本身，
   * 唔係跑出嚟嘅樣 —— 因為 `rotateY(0deg)` 喺畫面上睇落一樣冇嘢，
   * 但佢一存在，下一個人就會順手加度數。
   */
  const BANNED = [
    'rotate',
    'scale',
    'perspective',
    'translate3d',
    'translateZ',
    'matrix3d',
    'preserve-3d',
    'backface-visibility',
  ];

  for (const word of BANNED) {
    it(`「書」嗰段 CSS 冇 ${word}`, () => {
      expect(SHU_DECL).not.toContain(word);
    });
  }

  it('連 transform 呢個 property 都冇出現過', () => {
    expect(SHU_DECL).not.toMatch(/\btransform\s*:/);
  });

  it('transition 淨係 width 同 opacity', () => {
    const props = [...SHU_DECL.matchAll(/transition:\s*([a-z-]+)/g)].map((m) => m[1]);
    expect(props.length).toBeGreaterThan(0);
    for (const p of props) expect(['width', 'opacity', 'none']).toContain(p);
  });
});

describe('⚠ 第二、三條 AC 喺 CSS 度嘅憑據', () => {
  /**
   * 手機收起嗰一版一定要 `display:none`。
   *
   * 用闊度零收係錯嘅：一個闊度零嘅 `<div>` 仲留喺無障礙樹入面，
   * 讀屏會由頭到尾讀一版睇唔見嘅嘢 —— 而手機用戶先係最多人用讀屏嗰批。
   */
  it('收成單頁係 display:none，唔係闊度零', () => {
    const q = SHU_DECL.match(/@container shu \(max-width: \d+px\)\s*\{([\s\S]*?)\n\}/);
    expect(q, '搵唔到收單頁嗰個 container query').toBeTruthy();
    expect(q![1]).toContain('display: none');
    expect(q![1]).not.toMatch(/--w-verso:\s*0px/);
  });

  it('reduced-motion 之下係 transition:none —— 直接到位，唔係快啲', () => {
    const q = SHU_DECL.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/);
    expect(q, '搵唔到 reduced-motion 嗰段').toBeTruthy();
    expect(q![1]).toContain('transition: none !important');
  });
});

describe('活樣板唔屬於公開層', () => {
  /**
   * D2 定咗 sitemap 係**白名單**：加新 route 唔會自動入表。
   * 呢條就係嗰個決定嘅回歸測試 —— E2 加咗 `/tokens/shu`，
   * 而佢一個字都唔應該出現喺 sitemap 度。
   */
  it('/tokens 同佢下面嘅嘢一律唔喺 sitemap', () => {
    for (const e of sitemapEntries()) expect(e.loc).not.toContain('/tokens');
  });
});
