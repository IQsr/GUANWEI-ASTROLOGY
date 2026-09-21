import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { LOCAL_KEYS } from '@/lib/local';

/**
 * 工單 G1 第四條 AC：**localStorage 只存主題同上次讀到邊段。**
 *
 * 呢條唔係一個習慣，係一條隱私邊界 —— 擺咗落用戶部機嘅嘢，
 * `/account` 嘅「真刪除」（架構 §10）刪唔到。
 */

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const GATE = 'lib/local.ts';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

/**
 * ⚠ 剷走註釋先掃。
 *
 * 呢個係第三次撞到同一樣嘢：D1 個掃描器 flag 咗 footer 嘅「沒有生辰」，
 * E2 個掃描器 flag 咗註釋入面嘅「零 rotate」，而家呢個會 flag 咗
 * `// 唔好用 localStorage 扮有書` —— 一句**叫人唔好用**嘅說話。
 *
 * 三次都係同一條：**掃描器要量宣告，唔係量散文。**
 */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('⚠ 得兩個 key', () => {
  it('剛好兩個，而且就係主題同上次讀到邊段', () => {
    expect(Object.keys(LOCAL_KEYS).sort()).toEqual(['lastRead', 'theme']);
  });

  it('key 名有 gw- 前綴 —— 同人哋嘅嘢分得開', () => {
    for (const v of Object.values(LOCAL_KEYS)) expect(v).toMatch(/^gw-/);
  });
});

describe('⚠ 全站得一個出入口', () => {
  /**
   * 一條「唔好亂擺嘢落 localStorage」嘅規矩守唔到 ——
   * 冇人會喺 code review 度記得。一個得兩個 key 嘅 module 守得到，
   * 前提係冇人繞過佢。呢條就係量嗰件事。
   */
  const files = walk(SRC);

  it('掃到嘢（唔係掃咗個空目錄就當過）', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const store of ['localStorage', 'sessionStorage', 'indexedDB']) {
    it(`${store} 出唔到 ${GATE} 以外`, () => {
      const offenders = files
        .map((f) => relative(SRC, f).replaceAll('\\', '/'))
        .filter((f) => f !== GATE && code(join(SRC, f)).includes(store));
      expect(offenders).toEqual([]);
    });
  }

  /** 反面：個出入口本身唔可以變成一個空殼。 */
  it('出入口自己真係喺度用緊 localStorage', () => {
    expect(code(join(SRC, GATE))).toContain('localStorage.getItem');
    expect(code(join(SRC, GATE))).toContain('localStorage.setItem');
  });
});
