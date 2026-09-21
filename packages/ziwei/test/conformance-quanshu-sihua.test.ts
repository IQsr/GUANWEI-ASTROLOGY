/**
 * 同《紫微斗數全書》原文對照四化表（工單 B17 / B5）
 *
 * ⚠ 呢個對照同 iztro、文墨天機**性質完全唔同**。
 *
 * 嗰兩個係軟件 —— 佢哋會同我哋一齊錯，因為大家都可能抄同一個現代版本。
 * 呢個係**文本**，而且係公有領域嘅明代刊本（維基文庫）。
 * 佢係我哋第一個真正嘅 ground truth 來源。
 *
 * 結果：十個天干入面八個一字不差，兩個唔同 —— 庚同壬，
 * 正正就係 B17 查緊嗰兩個。呢個唔係巧合：
 * 我哋嗰兩個值嚟自通行本／中州派，唔係嚟自《全書》。
 */
import { describe, expect, it } from 'vitest';
import quanshu from './fixtures/quanshu-sihua.json';
import { STEMS, SIHUA_ORDER, sihuaOfStem } from '../src/index';

type Row = Record<string, string>;
const BOOK = (quanshu as unknown as { map: Record<string, Row> }).map;

/**
 * 已知同《全書》唔同嘅天干。
 *
 * 每一項都要喺 docs/rules.md R-003 有記錄。
 * **加新一項之前先問：我哋憑咩唔跟原文？**
 */
const KNOWN = {
  庚: {
    ours: '天府', book: '太陰',
    why: '本盤跟中州派（王亭之）「陽武府同」。《全書》呢一行係「庚日武陰同」＝陸斌兆「陽武陰同」，同 iztro 一致。見 R-003。',
  },
  壬: {
    ours: '左輔', book: '天府',
    why: '本盤跟《全集》／通行本「梁紫左武」。《全書》係「壬梁紫府武」＝天府化科，同王亭之講嘅中州派立場一致。⚠ 呢個係待決事項，見 R-003 同工單 B17。',
  },
} as const;

describe('《紫微斗數全書》卷二〈安祿權科忌四星變化訣〉', () => {
  it('十個天干都解碼得到，每個四粒唔同嘅星', () => {
    for (const s of STEMS) {
      const row = BOOK[s];
      expect(row, s).toBeTruthy();
      const stars = SIHUA_ORDER.map((h) => row![h]!);
      expect(new Set(stars).size, s).toBe(4);
    }
  });

  it('八個干同原文一字不差', () => {
    const same: string[] = [];
    for (const s of STEMS) {
      if (s in KNOWN) continue;
      const ours = sihuaOfStem(s)!;
      const book = BOOK[s]!;
      for (const h of SIHUA_ORDER) {
        expect(ours[h], `${s}化${h}`).toBe(book[h]);
      }
      same.push(s);
    }
    expect(same).toHaveLength(8);
  });

  it('庚同壬：差異存在，而且淨係差化科', () => {
    for (const [stem, k] of Object.entries(KNOWN)) {
      const ours = sihuaOfStem(stem as never)!;
      const book = BOOK[stem]!;
      expect(ours['科'], `${stem} 我哋`).toBe(k.ours);
      expect(book['科'], `${stem} 全書`).toBe(k.book);
      // 祿權忌三個一定要一樣 —— 如果連呢三個都唔同，就唔係「化科之爭」咁簡單
      for (const h of ['祿', '權', '忌'] as const) {
        expect(ours[h], `${stem}化${h}`).toBe(book[h]);
      }
    }
  });

  it('戊干：我哋同《全書》一致（右弼化科）—— 分歧喺中州派嗰邊，唔喺原文', () => {
    expect(sihuaOfStem('戊')!['科']).toBe('右弼');
    expect(BOOK['戊']!['科']).toBe('右弼');
  });

  /**
   * 防盜鈴：如果有人改咗 sihua.json 令差異變多或者變少，呢條就爆。
   * 爆咗要問：呢個改動有冇喺 R-003 記錄？school_profile 要唔要 bump？
   */
  it('同原文嘅差異剛好兩項，一項都唔多', () => {
    const diffs: string[] = [];
    for (const s of STEMS) {
      const ours = sihuaOfStem(s)!;
      const book = BOOK[s]!;
      for (const h of SIHUA_ORDER) {
        if (ours[h] !== book[h]) diffs.push(`${s}化${h}：我哋 ${ours[h]}，全書 ${book[h]}`);
      }
    }
    expect(diffs).toEqual([
      '庚化科：我哋 天府，全書 太陰',
      '壬化科：我哋 左輔，全書 天府',
    ]);
  });
});
