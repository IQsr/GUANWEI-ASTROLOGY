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
