import { describe, expect, it } from 'vitest';
import { BASE_BLOCKS } from '../src/baseblock-data';
import { LIFE_LINES, lifeLine } from '../src/life';
import { CORPUS } from '../src/lexicon';

/**
 * 生活裡的樣子（2026-09-30）
 *
 * 每格（主星 × 宮）一段現代場景。有王亭之《深造講義》下篇宮垣論嘅出處就引，
 * 冇就只講嗰格基塊講過嘅嘢。引文逐字對原文、字數、禁用詞、直白喺 life.ts 載入時驗。
 */
describe('生活裡的樣子', () => {
  it('168 格齊，一格一段', () => {
    const miss = BASE_BLOCKS.filter((b) => !lifeLine(b.star, b.palace)).map((b) => b.id);
    expect(miss).toEqual([]);
    expect(LIFE_LINES).toHaveLength(168);
    expect(new Set(LIFE_LINES.map((x) => x.id)).size).toBe(168);
  });

  it('出處頁數喺下篇宮垣論（p.320–595）', () => {
    for (const x of LIFE_LINES.filter((l) => l.source)) {
      const p = CORPUS.zhongzhou!.passages[x.source!.passage_id]!;
      expect(p.lines[0], x.id).toBeGreaterThanOrEqual(320);
      expect(p.lines[1], x.id).toBeLessThanOrEqual(595);
    }
  });

  it('疾厄冇引原文 —— 嗰段原文講病', () => {
    expect(LIFE_LINES.filter((x) => x.palace === '疾厄' && x.source).map((x) => x.id)).toEqual([]);
  });

  it('唔講病、唔講幾多歲、唔講祖業、唔講子女數目', () => {
    const bad = LIFE_LINES.filter((x) => /病|癌|手術|死|\d+歲|祖業|遺產|幾個孩子|生子|生女/.test(x.text)).map((x) => x.id);
    expect(bad).toEqual([]);
  });

  it('冇兩格用同一句', () => {
    expect(new Set(LIFE_LINES.map((x) => x.text)).size).toBe(LIFE_LINES.length);
  });
});
