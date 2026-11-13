import { describe, expect, it } from 'vitest';
import { cast, type BirthInput } from '@guanwei/ziwei';
import { createBookChapters } from '@/lib/mingshu';
import { ASKS, buildAsks, leadsFromBodies, localizedLead } from '@/lib/wenmu';
import { englishChapters } from '@/lib/english';
import samples from './fixtures/sample-charts.json';
import previews from '../src/lib/free-ming-preview.json';

/*
 * 目次問目嘅英日答案（2026-11-13，Issac 隨機抽一本英文書，目次第一題出咗〔中文〕）
 *
 * 以前英文答案一律譯舊版第一段：舊句冇譯文就出〔中文〕（75 本樣本有 19 本），而且同撳入去章節讀到嘅新版英文唔同。
 * 而家用新版第一段，同閱讀頁同一份譯文。
 */
type Sample = { id: string; input: BirthInput; seed?: string };
const CHARTS: Sample[] = [...(samples as Sample[]), ...(previews as unknown as Omit<Sample, 'id'>[]).slice(0, 12).map((p, i) => ({ ...p, id: `preview-${i}` }))];

describe('目次問目：英日答案', () => {
  it.each(CHARTS.map((c) => [c.id, c] as const))('%s：冇〔中文〕，英文宮位題同章節第一段一樣', (_id, c) => {
    const r = cast(c.input);
    if (!r.ok) throw Error(r.message);
    const book = createBookChapters(r.value, { seed: c.seed ?? 'sample', year: 2026, solar: c.input.solar, place: c.input.place.label, birthSex: c.input.sex, birthInput: c.input, synthesis: true })!;
    const leads = leadsFromBodies(book.map((ch) => ({ slug: ch.slug, body: ch.text, reading: ch.reading })));
    const pages = englishChapters(book);
    for (const locale of ['en', 'ja']) {
      const asks = buildAsks(leads, locale);
      expect(asks.length).toBeGreaterThan(0);
      for (const a of asks) {
        expect(a.answer, `${locale} ${a.slug}`).not.toBe('');
        expect(a.answer + (a.detail ?? ''), `${locale} ${a.slug}`).not.toMatch(/[〔〕]/);
        if (locale === 'en') expect(a.answer, a.slug).not.toMatch(/[一-鿿]/);
      }
      for (const a of ASKS) expect(localizedLead(leads, a.slug, locale) ?? '', `${locale} lead ${a.slug}`).not.toMatch(/[〔〕]/);
    }
    /* 宮位章（唔計綜合判讀層嗰兩章：正式書由起書時存低嘅英日快照出） */
    for (const a of buildAsks(leads, 'en')) {
      if (a.slug === '財帛' || a.slug === '這一年') continue;
      expect(a.answer, a.slug).toBe(pages[book.findIndex((x) => x.slug === a.slug)]![0]!.text);
    }
  }, 120000);
});
