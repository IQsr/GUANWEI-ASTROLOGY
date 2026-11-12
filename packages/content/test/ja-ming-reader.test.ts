import { describe, expect, it } from 'vitest';
import { scanJapanese } from '../src/ja/lint';
import { mingFact } from '../src/ja/ming-facts';
import { headingJa } from '../src/ja/ming-headings';
import reader from '../src/ja/ming-reader.json';
import headings from '../src/ja/ming-headings.json';

/** 2026-11-12 日文第一批：新版命宮、性格的骨架（reader-backed-v1）嘅日文（對照 en-ming-reader.test.ts）。 */
describe('新版命宮、骨架日文', () => {
  const sentences = Object.entries((reader as { sentences: Record<string, string> }).sentences);
  const heads = Object.entries(headings as Record<string, string>);
  it('譯文過日文檢查，冇殘留繁體字、中文虛詞、未譯記號', () => {
    expect(sentences.length).toBeGreaterThan(400);
    expect(sentences.flatMap(([zh, ja]) => scanJapanese(ja).map((h) => `${h}：${zh}`))).toEqual([]);
  });
  it('小標題：短、冇句號、冇繁體字', () => {
    expect(heads.length).toBeGreaterThan(70);
    expect(
      heads.flatMap(([zh, ja]) => [
        ...scanJapanese(ja).filter((h) => !h.startsWith('JA-3')).map((h) => `${h}：${zh}`),
        ...(/。/.test(ja) || ja.length > 30 ? [`太長或者有句號：${zh} → ${ja}`] : []),
      ]),
    ).toEqual([]);
  });
  it('小標題：新版優先，冇譯就回 null', () => {
    expect(headingJa('盤面依據')).toBeTruthy();
    expect(headingJa('冇呢個標題')).toBeNull();
  });
  it('按盤面填字嘅句：星名、宮名、地支都要對得上，對唔上回 null', () => {
    expect(mingFact('你的命宮是天同坐酉宮。')).toBe('あなたの命宮は酉宮にあり、天同が入っています。');
    expect(mingFact('你的命宮是武曲、貪狼同坐丑宮。')).toBe('あなたの命宮は丑宮にあり、武曲・貪狼が同じ宮に入っています。');
    expect(mingFact('你的命宮在酉，沒有主星，借對宮卯的太陽、天梁來讀。')).toBe('あなたの命宮は酉宮にあり、主星がないため、向かいの卯宮にある太陽・天梁を借りて読みます。');
    expect(mingFact('命宮四方實際坐曜的本命四化有：命宮天機化權、財帛宮天同化祿。')).toBe('命宮の三方四正に実際に入っている星のうち、生まれ年の四化がつくのは、命宮の天機化権、財帛宮の天同化禄です。');
    expect(mingFact('命宮同度的配曜另見右弼、天馬。')).toBe('命宮には、ほかに右弼・天馬も入っています。');
    expect(mingFact('本盤命宮有破軍化權。')).toBe('あなたの命盤では、命宮に破軍化権があります。');
    expect(mingFact('本宮見天機化忌。')).toBe('この宮には天機化忌があります。');
    expect(mingFact('本宮有貪狼化祿、祿存。')).toBe('この宮には貪狼化禄・禄存があります。');
    expect(mingFact('本宮同度擎羊、火星。')).toBe('この宮には擎羊・火星も入っています。');
    expect(mingFact('你的命宮是某星坐丑宮。')).toBeNull();
  });
});
