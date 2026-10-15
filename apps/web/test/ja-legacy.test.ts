import { describe, expect, it } from 'vitest';
import { Ja } from '@guanwei/content';
import enTm from '../../../packages/content/src/en/tm.json';

/**
 * 日文版舊句（2026-10-16）：已出嘅書存住舊講法（R-008），英文翻譯表有嘅，日文都要有。
 * 英文表每一句（帶｛｝嘅原文分支除外）同每一截子句，日文都要譯得到、過日文檢查 —— 唔畀呢個缺口再開。
 */
const EN = enTm as unknown as { sentences: Record<string, string>; clauses: Record<string, string> };

describe('日文：英文翻譯表有嘅舊句，日文都有', () => {
  it('每一句都譯到', () => {
    const missing: string[] = [];
    const lint: string[] = [];
    for (const zh of Object.keys(EN.sentences).filter((k) => !k.includes('｛'))) {
      const out = Ja.renderChapter(zh);
      missing.push(...out.missing);
      Ja.scanJapanese(out.text).forEach((c) => lint.push(`${c}：${zh}`));
    }
    expect(missing).toEqual([]);
    expect(lint).toEqual([]);
  });

  it('每一截子句都譯到（放入煞星句試）', () => {
    const missing: string[] = [];
    const lint: string[] = [];
    for (const zh of Object.keys(EN.clauses)) {
      const out = Ja.renderChapter(`加上火星同宮，${zh}。`);
      missing.push(...out.missing);
      Ja.scanJapanese(out.text).forEach((c) => lint.push(`${c}：${zh}`));
    }
    expect(missing).toEqual([]);
    expect(lint).toEqual([]);
  });
});
