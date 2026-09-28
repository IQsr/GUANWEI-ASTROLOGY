import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { routing } from '@/i18n/routing';
import { LOCALE_LABEL } from '@/lib/locales';

/**
 * 語言（語言切換）：加一種語言嘅時候，漏咗邊樣會即刻紅。
 *
 * 目標係日後加韓文、日文。`LOCALE_LABEL` 係 `Record<Locale, …>`，
 * 漏咗 type check 已經會爆；呢度守住 type check 睇唔到嘅：
 * messages 檔存唔存在、key 齊唔齊。
 */

const MESSAGES = fileURLToPath(new URL('../messages/', import.meta.url));
const load = (l: string) => JSON.parse(readFileSync(`${MESSAGES}${l}.json`, 'utf8')) as Record<string, unknown>;

function keys(o: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe('每種語言', () => {
  const base = new Set(keys(load(routing.defaultLocale)));

  for (const locale of routing.locales) {
    it(`${locale}：有 messages 檔`, () => {
      expect(existsSync(`${MESSAGES}${locale}.json`)).toBe(true);
    });

    /** 少咗一條 key，嗰種語言嘅版面會出 key 名（例如 `ruzhai.enter`），唔係字。 */
    it(`${locale}：key 同 ${routing.defaultLocale} 一樣齊`, () => {
      const mine = new Set(keys(load(locale)));
      expect([...base].filter((k) => !mine.has(k))).toEqual([]);
      expect([...mine].filter((k) => !base.has(k))).toEqual([]);
    });

    it(`${locale}：切換掣有名，而且係自己嗰種語言嘅寫法`, () => {
      expect(LOCALE_LABEL[locale].name.length).toBeGreaterThan(0);
      expect(LOCALE_LABEL[locale].short.length).toBeGreaterThan(0);
    });
  }

  it('切換掣唔會有一種唔存在嘅語言', () => {
    expect(Object.keys(LOCALE_LABEL).sort()).toEqual([...routing.locales].sort());
  });
});
