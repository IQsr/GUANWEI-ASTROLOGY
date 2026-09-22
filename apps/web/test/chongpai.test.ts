import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { DRIFT_LABEL, DRIFT_MEANS, drift, pinnedOf, type Pinned } from '@/lib/chongpai';

/**
 * 舊盤重算政策（工單 B16 · docs/rules.md R-008）
 */

const NOW: Pinned = { engine: '0.3.0', school: 'zhongzhou-v1@aaa', content: 'r1@bbb' };
const RULES = readFileSync(new URL('../../../docs/rules.md', import.meta.url), 'utf8');

describe('R-008 寫咗落 docs/rules.md', () => {
  it('有呢一條', () => {
    expect(RULES).toContain('## R-008');
  });

  /** 工單 AC 一：四欄，而且其他做法要具名。 */
  it('四欄齊：我採用／其他做法／理由／來源', () => {
    const at = RULES.indexOf('## R-008');
    const section = RULES.slice(at);
    for (const col of ['**我採用**', '**其他做法**', '**理由**', '**來源**']) {
      expect(section, col).toContain(col);
    }
  });

  it('其他做法具名，唔係「有啲網站」', () => {
    const section = RULES.slice(RULES.indexOf('## R-008'));
    expect(section).toMatch(/fatemaster/i);
  });

  it('認咗代價 —— 舊書會帶住舊值', () => {
    const section = RULES.slice(RULES.indexOf('## R-008'));
    expect(section).toContain('代價');
  });
});

describe('⚠ 呢一層唔識改嘢', () => {
  /**
   * 一個識改嘅 module，遲早會有人喺一個 loading 入面叫佢，
   * 而嗰下就係一本書自己變咗。
   */
  const SRC = fileURLToPath(new URL('../src/lib/chongpai.ts', import.meta.url));
  const code = readFileSync(SRC, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  it('冇 recast / upgrade / sync 呢類 function', () => {
    expect(code).not.toMatch(/function\s+(recast|upgrade|sync|apply|migrate)/i);
  });

  it('全站冇任何地方自動重排舊書', () => {
    const dir = fileURLToPath(new URL('../src', import.meta.url));
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((n) => {
        const full = join(d, n);
        return statSync(full).isDirectory() ? walk(full) : /\.tsx?$/.test(n) ? [full] : [];
      });
    const offenders = walk(dir).filter((f) =>
      /update\s*\(\s*\{\s*engine_version|set\s+engine_version/i.test(
        readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''),
      ),
    );
    expect(offenders).toEqual([]);
  });
});

describe('差異要逐樣講', () => {
  it('三樣都一樣就冇差異', () => {
    expect(drift(NOW, NOW)).toEqual([]);
  });

  it('引擎變咗，講引擎', () => {
    const d = drift({ ...NOW, engine: '0.2.0' }, NOW);
    expect(d).toHaveLength(1);
    expect(d[0]!.field).toBe('engine');
    expect(d[0]!.was).toBe('0.2.0');
    expect(d[0]!.now).toBe('0.3.0');
  });

  it('三樣一齊變，就出三條', () => {
    expect(drift({ engine: 'a', school: 'b', content: 'c' }, NOW)).toHaveLength(3);
  });

  /**
   * ⚠ 合成一句「有更新」嘅話，用戶唯一做得到嘅反應就係撳「更新」——
   * 而佢唔知自己換緊乜。
   */
  it('每一樣都有人話講得出佢係乜、換咗會點', () => {
    for (const f of ['engine', 'school', 'content'] as const) {
      expect(DRIFT_LABEL[f].length).toBeGreaterThan(1);
      expect(DRIFT_MEANS[f].length).toBeGreaterThan(5);
    }
  });

  it('內容版本變咗，明寫盤面唔變', () => {
    expect(DRIFT_MEANS.content).toContain('盤面不變');
  });
});

describe('並列新舊嗰一版（工單 AC 三）', () => {
  const UI = readFileSync(
    fileURLToPath(new URL('../src/components/Chongpai.tsx', import.meta.url)),
    'utf8',
  );
  const bare = UI.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

  /**
   * ⚠ AC 寫住「由用戶揀 —— 唔自動改」。
   *
   * 一個「更新」掣就係自動改嘅入口：撳完就冇得返轉頭，
   * 而用戶撳之前見到嘅係一個掣，唔係一張對照表。
   * 揀嗰一步屬於 `/account`（G4），而且要造一本新書。
   */
  it('冇「更新」掣 —— 呢一版淨係並列', () => {
    expect(bare).not.toMatch(/<button|onClick|更新|升級|重排/);
  });

  it('三個版本號逐行分開講，唔合成一句', () => {
    expect(bare).toContain('DRIFT_LABEL');
    expect(bare).toContain('DRIFT_MEANS');
  });

  /**
   * ⚠ 冇差異就唔出嘢。
   *
   * 「已是最新版本」係一句工具嘅說話 —— 佢預設咗最新就係最好。
   * R-008 嘅立場相反：你收到嗰本應該一直係嗰本。
   */
  it('冇差異就乜都唔出，唔係出一句「已是最新版本」', () => {
    expect(bare).toMatch(/rows\.length === 0\) return null/);
    /* ⚠ 掃 `bare` 唔掃 `UI` —— 註釋入面就係解釋緊點解唔寫呢句。 */
    expect(bare).not.toContain('已是最新');
  });

  /** 舊版本號唔准劃走 —— 劃走就係話佢作廢咗，而佢冇。 */
  it('舊嗰個版本號唔劃走', () => {
    expect(bare).not.toMatch(/line-through/);
  });

  /**
   * ⚠ 唔准入命書。
   *
   * F4 嗰陣學過一次：喺人讀緊嘅時候插一個要佢做決定嘅 UI，
   * 無論包裝成 modal、倒數定係虛化預覽，本質都係同一件事。
   */
  it('冇任何一版命書 import 佢', () => {
    const dir = fileURLToPath(new URL('../src/app', import.meta.url));
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((n) => {
        const full = join(d, n);
        return statSync(full).isDirectory() ? walk(full) : /\.tsx?$/.test(n) ? [full] : [];
      });
    const inBook = walk(dir).filter(
      (f) => /[\\/]book[\\/]/.test(f) && readFileSync(f, 'utf8').includes('Chongpai'),
    );
    expect(inBook).toEqual([]);
  });
});

describe('⚠ 「冇差異」同「答唔到」唔同', () => {
  /**
   * R-008 靠「每本書講得出自己係邊一版排嘅」撐住。
   * 講唔出就係一個要修嘅資料問題，唔係一個好消息。
   */
  it('三欄齊先算數', () => {
    expect(pinnedOf({ engine: 'a', school: 'b', content: 'c' })).not.toBeNull();
    expect(pinnedOf({ engine: 'a', school: 'b' })).toBeNull();
    expect(pinnedOf({})).toBeNull();
    expect(pinnedOf(null)).toBeNull();
  });

  /** 規範 §17：版本欄唔准 latest。一本寫住 latest 嘅書等於冇寫。 */
  it('latest 當冇寫', () => {
    expect(pinnedOf({ engine: 'latest', school: 'b', content: 'c' })).toBeNull();
  });
});
