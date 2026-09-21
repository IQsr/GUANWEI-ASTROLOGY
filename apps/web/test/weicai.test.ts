import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { CUT_MS, cutPhase, cutTarget, deckle, notches } from '@/lib/weicai';

/**
 * 未裁之頁（工單 F4 · 架構 §6）
 */

const SRC = fileURLToPath(new URL('../src', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx|css)$/.test(name) ? [full] : [];
  });
}

/** 剷走註釋先掃 —— D1／E2／G1／G2 四次教訓。 */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('裁開去邊', () => {
  /** 架構 §4 硬閘：付款前必須認領。 */
  it('匿名讀者先去認領', () => {
    expect(cutTarget('b1', true).href).toBe('/claim');
  });

  it('認領咗先去付款', () => {
    expect(cutTarget('b1', false).href).toBe('/pay/b1');
  });

  it('兩邊都叫「裁開」—— 唔係「升級」唔係「解鎖」', () => {
    expect(cutTarget('b1', true).label).toBe('裁開');
    expect(cutTarget('b1', false).label).toBe('裁開');
  });
});

describe('毛邊跟段落數', () => {
  /** 隨機嘅話，同一版今日五條邊、聽日八條 —— 一本書唔會噉。 */
  it('同一個段落數永遠同一個結果', () => {
    expect(notches(5)).toBe(notches(5));
  });

  it('段落多，邊就多', () => {
    expect(notches(3)).toBeLessThan(notches(6));
  });

  it('有上下限，唔會少到似直邊，亦唔會多到似鋸', () => {
    expect(notches(0)).toBeGreaterThanOrEqual(28);
    expect(notches(99)).toBeLessThanOrEqual(72);
  });

  /**
   * ⚠ 要夠密。第一版十條邊、每條兩三個百分比深 ——
   * 影咗相一睇就知錯：出嚟係一排大梯級，似一個圖案多過似撕開嘅紙。
   */
  it('一版紙至少廿幾下起伏', () => {
    expect(notches(5)).toBeGreaterThanOrEqual(28);
  });
});

describe('邊個狀態', () => {
  it('攞唔到正文 = 未裁', () => {
    expect(cutPhase(null, false)).toBe('uncut');
    expect(cutPhase(null, true)).toBe('uncut');
  });

  it('今次先裁開 = 播動畫', () => {
    expect(cutPhase('正文', true)).toBe('cutting');
  });

  it('之前已經裁咗 = 直接讀，唔再播', () => {
    expect(cutPhase('正文', false)).toBe('read');
  });
});

describe('⚠ 唔用 modal、唔用模糊偷睇、唔用倒數', () => {
  /**
   * 三樣都係喺讀嘅過程入面插一個銷售動作。
   * 一版毛邊冇呢啲：佢就係一版未裁開嘅紙，靜靜噉喺度。
   */
  const files = walk(SRC);

  it('掃到嘢', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('全站冇 modal / dialog / 彈窗', () => {
    const bad = files
      .map((f) => [f, code(f)] as const)
      .filter(([, c]) => /<dialog|role="dialog"|showModal\(|\.modal\b/.test(c))
      .map(([f]) => f.replace(SRC, ''));
    expect(bad).toEqual([]);
  });

  it('未裁嗰版冇 blur —— 模糊偷睇即係「睇得到但唔畀你睇」', () => {
    const raw = readFileSync(join(SRC, 'app/globals.css'), 'utf8');

    /* ⚠ 先確認搵得到 —— 一條喺「乜都冇」之下都會綠嘅 check，量緊嘅係零。 */
    const at = raw.indexOf('.weicai {');
    expect(at, '搵唔到 .weicai 嗰段 CSS').toBeGreaterThan(-1);

    /*
     * ⚠ 切到下一個橫額為止，而且**切完先剷註釋**。
     *
     * 第一版剷咗註釋先切 —— 噉啲橫額就冇埋，搵唔到邊界，
     * 一路切到檔尾，食咗 E5 嗰個「墨滲」keyframes 入面嘅 blur。
     * 個 check 紅得好似捉到嘢，其實係切錯咗範圍（E3 同一個教訓）。
     */
    const to = raw.indexOf('/* ===', at);
    const slice = raw.slice(at, to === -1 ? raw.length : to).replace(/\/\*[\s\S]*?\*\//g, '');
    expect(slice).not.toMatch(/blur\(/);
    expect(slice).toMatch(/clip-path/);
  });

  it('冇倒數', () => {
    const bad = files
      .map((f) => [f, code(f)] as const)
      .filter(([, c]) => /countdown|倒數|剩餘時間|setInterval\(/.test(c))
      .map(([f]) => f.replace(SRC, ''));
    expect(bad).toEqual([]);
  });
});

describe('時間', () => {
  it('裁開 1600ms —— 同墨滲、展卷同一個值（視覺 §7）', () => {
    expect(CUT_MS).toBe(1600);
  });
});

describe('毛邊係一條撕痕，唔係一排鋸齒', () => {
  /**
   * ⚠ 分別喺於規律：一排等距等深嘅三角形讀落係一個圖案；
   * 撕開嘅紙每一下深淺唔同。
   */
  it('深度唔係全部一樣', () => {
    const depths = [...deckle(12).matchAll(/([\d.]+)% [\d.]+%/g)]
      .map((m) => Number(m[1]))
      .filter((x) => x !== 0);
    expect(new Set(depths).size).toBeGreaterThan(3);
  });

  it('同一版永遠一樣', () => {
    expect(deckle(9)).toBe(deckle(9));
  });

  it('係一條 polygon，唔係圖、唔係圓角', () => {
    expect(deckle(8)).toMatch(/^polygon\(/);
    expect(deckle(8)).not.toMatch(/radius|url\(/);
  });

  it('左邊同上下角企定，唔會歪', () => {
    const p = deckle(8);
    expect(p).toContain('0% 0%');
    expect(p).toContain('0% 100%');
  });

  /** 撕痕係一條邊，唔係一個造型 —— 起伏要細過一個百分點。 */
  it('撕痕唔會食超過 1% 版面', () => {
    const xs = [...deckle(40).matchAll(/([\d.]+)% [\d.]+%/g)]
      .map((m) => Number(m[1]))
      .filter((x) => x !== 0);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(99);
  });
});

describe('⚠ 裁開咗之後唔會再裂', () => {
  /**
   * `Caikai` 預設 `play` 係 true（樣板同埋啱啱裁開嗰次要播），
   * 但真嗰條路一定要明寫 —— 每次揭返嚟都再裂一次嘅話，
   * 「一生一次」就變咗「每次一次」。
   */
  const page = readFileSync(
    new URL('../src/app/[locale]/book/[bookId]/[chapter]/page.tsx', import.meta.url),
    'utf8',
  );

  it('命書嗰版明寫 play，唔靠預設', () => {
    expect(page).toMatch(/<Caikai play=\{justCut\}>/);
  });

  it('play 由 cut_page() 答，唔係喺頁度算', () => {
    expect(page).toMatch(/await cutPage\(/);
    expect(page).not.toMatch(/localStorage/);
  });
});
