import { describe, expect, it } from 'vitest';
import { scanEnglish } from '../src/en/lint';
import { mingFact } from '../src/en/ming-facts';
import { headingEn } from '../src/en/ming-headings';
import reader from '../src/en/ming-reader.json';
import headings from '../src/en/ming-headings.json';

/** 2026-11-12 英文第一批：新版命宮、性格的骨架（reader-backed-v1）嘅英文。 */
describe('新版命宮、骨架英文', () => {
  const rows = [...Object.entries((reader as { sentences: Record<string, string> }).sentences), ...Object.entries(headings as Record<string, string>)];
  it('譯文、小標題過英文檢查，冇殘留中文', () => {
    expect(rows.length).toBeGreaterThan(500);
    expect(rows.flatMap(([zh, en]) => [...scanEnglish(en).map((h) => `${JSON.stringify(h)}：${zh}`), ...(/[一-鿿]/.test(en) ? [`中文：${zh}`] : [])])).toEqual([]);
  });
  it('小標題：新版優先，舊版逐句稿嘅小標題照用', () => {
    expect(headingEn('盤面依據')).toBe('Evidence from your chart');
    expect(headingEn('冇呢個標題')).toBeNull();
  });
  it('按盤面填字嘅句：星名、宮名、地支都要對得上，對唔上回 null', () => {
    expect(mingFact('你的命宮是武曲、貪狼同坐丑宮。')).toBe('Your Life Palace holds Wu Qu and Tan Lang together in Chou.');
    expect(mingFact('你的命宮在酉，沒有主星，借對宮卯的太陽、天梁來讀。')).toBe('Your Life Palace, in You, holds no major star, so it is read through Tai Yang and Tian Liang from the opposite palace in Mao.');
    expect(mingFact('命宮四方實際坐曜的本命四化有：命宮天機化權、財帛宮天同化祿。')).toBe('In your Life Palace and its linked palaces, the birth-chart transformations are: Tian Ji turning to Authority in your Life Palace and Tian Tong turning to Abundance in your Wealth Palace.');
    expect(mingFact('本宮有貪狼化祿、祿存。')).toBe('This palace has Tan Lang turning to Abundance and Lu Cun.');
    expect(mingFact('本宮同度擎羊、火星。')).toBe('Qing Yang and Huo Xing also sit in this palace.');
    expect(mingFact('你的命宮是某星坐丑宮。')).toBeNull();
  });
});
