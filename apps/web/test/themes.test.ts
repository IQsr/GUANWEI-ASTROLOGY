import zhMessages from '../messages/zh-Hant.json';
import { describe, expect, it } from 'vitest';
import { groupChapters, tally, THEMES } from '@/lib/themes';
import { FREE_SLUGS, tierOf } from '@/lib/chengshu';

/**
 * 命書主題分組（重新設計第三期）：一層睇法，唔係一套新結構。
 */

/** 同 `lib/mingshu.ts` 嘅 PALACE_ORDER（佢係 server-only，test 入面 import 唔到）。 */
const PALACE_ORDER = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];

/** 一本完整命書嘅章：序、兩章免費、其餘十一宮（同 chengshu 一樣嘅排法）。 */
const BOOK = ['序', '命宮', '性格的骨架', '三方四正', '身宮與五行局', ...PALACE_ORDER.filter((p) => p !== '命宮')].map((slug, i) => ({
  slug,
  ord: i + 1,
  tier: tierOf(slug),
}));

describe('每一章啱啱好出現一次', () => {
  const g = groupChapters(BOOK);
  const seen = [g.preface, ...g.groups.flatMap((x) => x.chapters), ...g.rest].filter(Boolean).map((c) => c!.slug);

  it('冇一章唔見', () => {
    expect([...seen].sort()).toEqual(BOOK.map((c) => c.slug).sort());
  });

  it('冇一章出兩次', () => {
    expect(new Set(seen).size).toBe(seen.length);
  });

  /** 十二宮全部有主題 —— 「其餘各章」係安全網，唔係一個正常會出嘅格。 */
  it('一本正常命書冇「其餘各章」', () => {
    expect(g.rest).toEqual([]);
  });

  it('序自己一格，唔入主題', () => {
    expect(g.preface?.slug).toBe('序');
  });
});

describe('分法', () => {
  const g = groupChapters(BOOK);
  const of = (key: string) => g.groups.find((x) => x.theme.key === key)!.chapters.map((c) => c.slug);

  it('三個主題，照參考稿次序', () => {
    expect(g.groups.map((x) => zhMessages.book.themes[x.theme.key].title)).toEqual(['性格與天賦', '事業方向', '人際關係']);
  });

  /** 免費嗰兩章（命宮、身宮）都喺第一個主題 —— 第一次打開，第一格就讀得。 */
  it('免費章都喺「性格與天賦」', () => {
    for (const slug of FREE_SLUGS.filter((s) => s !== '序')) expect(of('xing')).toContain(slug);
  });

  it('主題入面按章序，唔按主題表次序', () => {
    const ords = of('ren').map((s) => BOOK.find((c) => c.slug === s)!.ord);
    expect(ords).toEqual([...ords].sort((a, b) => a - b));
  });

  /** 僕役個名未定：三個名都認。 */
  it.each(['僕役', '交友', '奴僕'])('%s 落「人際關係」', (name) => {
    const r = groupChapters([{ slug: name, ord: 1 }]);
    expect(r.groups[0]?.theme.key).toBe('ren');
  });

  it('一個宮位只喺一個主題表', () => {
    const all = THEMES.flatMap((t) => t.palaces);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('認唔到嘅章', () => {
  it('落「其餘各章」，唔會唔見', () => {
    const g = groupChapters([...BOOK, { slug: '未知一章', ord: 99, tier: 'free' }]);
    expect(g.rest.map((c) => c.slug)).toEqual(['未知一章']);
  });

  it('冇章嘅主題唔出', () => {
    const g = groupChapters([{ slug: '命宮', ord: 1 }]);
    expect(g.groups.map((x) => x.theme.key)).toEqual(['xing']);
  });
});

describe('目次頂嗰行', () => {
  it('未裁：十六章，五章免費，十一章未裁', () => {
    expect(tally(BOOK, false)).toEqual({ total: 16, free: 5, uncut: 11 });
  });

  /** 之前付完款目次照寫「未裁」—— 裁開咗就冇未裁。 */
  it('裁開咗：冇未裁', () => {
    expect(tally(BOOK, true).uncut).toBe(0);
  });
});
