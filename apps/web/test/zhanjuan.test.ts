import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import {
  CELLS,
  LINES,
  LINES_MS,
  RULE_MS,
  STAGGER_MS,
  ZHANJUAN_MS,
  lineDelay,
  starDelay,
} from '@/lib/zhanjuan';

/**
 * 展卷（工單 E6 · 視覺系統 §9）
 *
 * 三條 AC：
 *   界欄每條 240ms、stagger 90ms　→ 呢度 ＋ `check-zhan.mjs` 量 computed style
 *   全站唯一一次 pin scroll　　　　→ 呢度掃全個 src，＋ 瀏覽器量 body overflow
 *   唔用 spinner　　　　　　　　　 → 呢度掃全站 CSS
 */

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const CSS = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

/** 剷走註釋先掃 —— D1／E2／G1／G2 四次教訓。 */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('界欄每條 240ms、stagger 90ms', () => {
  it('同視覺 §9 一樣', () => {
    expect(RULE_MS).toBe(240);
    expect(STAGGER_MS).toBe(90);
  });

  it('第 n 條喺 n × 90ms 開始', () => {
    expect(lineDelay(0)).toBe(0);
    expect(lineDelay(1)).toBe(90);
    expect(lineDelay(11)).toBe(990);
  });

  it('界欄畫完 = 最後一條開始 ＋ 240ms', () => {
    expect(LINES_MS).toBe(lineDelay(LINES.length - 1) + RULE_MS);
  });

  it('星喺界欄畫完之後先落', () => {
    expect(starDelay(0)).toBe(LINES_MS);
    expect(ZHANJUAN_MS).toBeGreaterThan(LINES_MS);
  });

  /** 成幕唔可以長過三秒 —— 再長就唔再係一個開場，係一個等待。 */
  it('成幕行完喺三秒之內', () => {
    expect(ZHANJUAN_MS).toBeLessThanOrEqual(3000);
  });
});

describe('⚠ 中間兩條界欄要斷開', () => {
  /**
   * 中宮係一格 2×2，界欄唔會由佢中間穿過。
   * 唔斷開嘅話，畫完之後同真盤面對唔上 —— 交接嗰一格會跳。
   */
  it('五十巴仙嗰兩條各自斷成兩截', () => {
    const half = LINES.filter((l) => l.at === 50);
    expect(half).toHaveLength(4);
    for (const l of half) expect(l.to - l.from).toBe(25);
  });

  it('其餘全部係全長', () => {
    for (const l of LINES.filter((x) => x.at !== 50)) {
      expect(l.from).toBe(0);
      expect(l.to).toBe(100);
    }
  });

  it('十二條界欄，十二個宮', () => {
    expect(LINES).toHaveLength(12);
    expect(CELLS).toHaveLength(12);
  });

  it('十二格唔會有中宮嗰四格', () => {
    for (const [row, col] of CELLS) {
      expect(row >= 2 && row <= 3 && col >= 2 && col <= 3, `${row},${col}`).toBe(false);
    }
  });
});

describe('⚠ 全站唯一一次 pin scroll', () => {
  /**
   * 視覺 §7 第五條：「鎖 scroll 只准一次 —— pin 淨係『展卷』封面翻開嗰下。」
   *
   * 一條「唔好隨便鎖 scroll」嘅規矩守唔到。一個掃全站嘅測試守得到。
   */
  const files = walk(SRC);

  it('掃到嘢', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('得 Zhanjuan.tsx 郁 body 嘅 overflow', () => {
    const offenders = files
      .map((f) => relative(SRC, f).replaceAll('\\', '/'))
      .filter((f) => /body\.style\.overflow|document\.body\.style/.test(code(join(SRC, f))));
    expect(offenders).toEqual(['components/Zhanjuan.tsx']);
  });

  /** 反面：個鎖唔可以變成一個空殼。 */
  it('佢真係鎖，而且真係解', () => {
    const src = code(join(SRC, 'components/Zhanjuan.tsx'));
    expect(src).toContain("document.body.style.overflow = 'hidden'");
    expect(src).toContain('document.body.style.overflow = previous');
  });
});

describe('⚠ 唔用 spinner', () => {
  /**
   * 呢一幕嘅位置本來係「等」。盤而家喺題名嗰陣已經算好，
   * 所以冇嘢等緊 —— 一個 spinner 講「請等我」，
   * 一段畫出嚟嘅界欄講「呢張圖而家先為你畫」。意思相反。
   *
   * 而一個 spinner 嘅特徵係**無限迴圈**。所以掃嘅唔係「有冇 spinner」
   * 呢個字，係全站 CSS 入面有冇一個永遠唔停嘅動畫。
   */
  const declarations = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

  it('全站 CSS 冇一個無限迴圈嘅動畫', () => {
    expect(declarations).not.toMatch(/infinite/);
  });

  it('亦都冇 spin / loading / spinner 呢類 class', () => {
    expect(declarations).not.toMatch(/\.(spinner|spin|loading)\b/);
  });
});
