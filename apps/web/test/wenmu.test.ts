import { describe, expect, it } from 'vitest';
import { ASKS, buildAsks, leadsFromBodies } from '@/lib/wenmu';
import { sampleBook } from '@/lib/sample-book';
import zhHant from '../messages/zh-Hant.json';
import en from '../messages/en.json';

/**
 * 目次問目「你想知甚麼」（2026-10-14）
 *
 * 答案係該章第一段（唔另外寫），引文係同一章第一句《…》。
 */
describe('目次問目', () => {
  const book = sampleBook()!;
  const leads = leadsFromBodies(book.drafts);

  it('示範書六題都有答案，答案就係該章第一段', () => {
    const asks = buildAsks(leads, 'zh-Hant');
    expect(asks.map((a) => a.key)).toEqual(ASKS.map((a) => a.key));
    for (const a of asks) {
      const d = book.drafts.find((x) => x.slug === a.slug)!;
      expect(a.answer, a.slug).toBe(d.body.split('\n\n')[0]!.replace(/\*\*/g, '').trim());
      expect(a.answer).not.toBe('');
    }
  });

  it('引文係同一章入面嘅原句', () => {
    for (const a of buildAsks(leads, 'zh-Hant')) {
      if (!a.quote) continue;
      expect(book.drafts.find((x) => x.slug === a.slug)!.body).toContain(a.quote);
    }
  });

  it('冇嗰章就跳過嗰題；一章都冇就唔出', () => {
    expect(buildAsks([], 'zh-Hant')).toEqual([]);
    const only = buildAsks([{ slug: '財帛', lead: '你對錢是慢慢積。', quote: null }], 'zh-Hant');
    expect(only.map((a) => a.key)).toEqual(['cai']);
  });

  it('簡體轉字；英文譯好、唔出中文引文', () => {
    const hans = buildAsks(leads, 'zh-Hans');
    expect(hans[0]!.answer).not.toBe(buildAsks(leads, 'zh-Hant')[0]!.answer);
    const eng = buildAsks(leads, 'en');
    for (const a of eng) {
      expect(a.answer, a.slug).not.toMatch(/[㐀-鿿]/);
      expect(a.answer).not.toBe('');
      expect(a.quote).toBeNull();
    }
  });

  /* 2026-10-18 · A2：第一段有出處註就喺答案下面出書名、頁、節；冇就空，唔作 */
  it('第一段有出處就出書名同頁；冇就唔出', () => {
    const lead = '這一年，錢這一方面，你的財祿有增加的機會；工作上的計劃容易卡住或要返工。';
    for (const locale of ['zh-Hant', 'zh-Hans', 'en', 'ja']) {
      const [a] = buildAsks([{ slug: '這一年', lead, quote: null }], locale);
      expect(a!.sources.map((s) => s.id), locale).toEqual(['daxian.hua.天同.祿']);
      expect(a!.sources[0]!.page, locale).toBeGreaterThan(0);
    }
    expect(buildAsks([{ slug: '這一年', lead, quote: null }], 'zh-Hant')[0]!.sources[0]!.book).toBe('王亭之《中州派紫微斗數深造講義》');
    expect(buildAsks([{ slug: '這一年', lead, quote: null }], 'en')[0]!.sources[0]!.book).toMatch(/^Wang Tingzhi/);
    /* 通用句冇出處 */
    const plain = buildAsks([{ slug: '這一年', lead: '這一年，工作上容易遇到合適的機會；錢容易周轉緊或超出預算。', quote: null }], 'zh-Hant');
    expect(plain[0]!.sources).toEqual([]);
    expect(buildAsks([{ slug: '財帛', lead: '你對錢是慢慢積。', quote: null }], 'zh-Hant')[0]!.sources).toEqual([]);
  });

  it('每題喺兩個語言都有問題同副題', () => {
    for (const m of [zhHant, en]) {
      for (const a of ASKS) {
        const q = (m.book.asks.q as Record<string, { ask: string; sub: string }>)[a.key];
        expect(q?.ask, a.key).toBeTruthy();
        expect(q?.sub, a.key).toBeTruthy();
      }
    }
  });
});
