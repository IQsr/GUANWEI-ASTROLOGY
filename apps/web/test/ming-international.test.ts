import { expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { writeMing, Ja } from '@guanwei/content';
import { bookChapters, citesFor } from '@/lib/mingshu';
import { readingOf } from '@/lib/chapter-reading';
import { internationalMing, translateMing } from '@/lib/ming-international';
import { englishChapters } from '@/lib/english';
import { japaneseChapters } from '@/lib/japanese';
import { markBook } from '@/lib/zhu';
import { buildAsks, leadsFromBodies } from '@/lib/wenmu';
import { mingEvidenceJa } from '@guanwei/content/ming-translations';

it('逐句稿所用的盤面事實能翻譯，沒有以漏譯代替留白', () => {
  const missing = new Set<string>();
  let seed = 20261021;
  const rnd = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return Math.floor(seed / 4294967296 * n); };
  for (let i = 0; i < 1000; i++) {
    const r = cast({ solar: { y: 1940 + rnd(70), m: 1 + rnd(12), d: 1 + rnd(28) }, time: { h: rnd(24), min: rnd(60) }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: i % 2 ? 'male' : 'female' });
    if (!r.ok) continue;
    for (const l of writeMing(r.value).sections.flatMap((s) => s.parts.flatMap((p) => p.statements ?? [])).filter((l) => l.kind === 'evidence')) {
      if (!mingEvidenceJa(l.text)) missing.add(l.text);
    }
  }
  expect([...missing]).toEqual([]);
});

it('六十星系與借星的成書、序列化、英日書頁保留每句同一原段及條件，不猜未核判斷', () => {
  const seen = new Set<number>();
  let borrowed = false;
  let seed = 20261021;
  const rnd = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return Math.floor(seed / 4294967296 * n); };
  for (let i = 0; i < 2000 && seen.size < 60; i++) {
    const solar = { y: 1940 + rnd(70), m: 1 + rnd(12), d: 1 + rnd(28) };
    const result = cast({ solar, time: { h: rnd(24), min: rnd(60) }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: i % 2 ? 'male' : 'female' });
    if (!result.ok) continue;
    const ming = writeMing(result.value);
    if (!ming.system || !ming.sections.length || seen.has(ming.system.n)) continue;
    const fresh = bookChapters(result.value, { seed: 'international', year: 2026, solar, place: '香港' })!.find((c) => c.slug === '命宮')!;
    // 繁簡先修訂的三組，英日仍須逐字保持其成書快照，不能拿新中文猜譯。
    const chapter = fresh.reading?.writer === 'reader-backed-v1' ? fresh.reading.internationalSnapshot! : fresh;
    expect(readingOf(fresh.reading, fresh.text)).not.toBeNull();
    if (fresh.reading?.writer === 'reader-backed-v1') {
      expect(englishChapters([fresh])).toEqual(englishChapters([chapter]));
      expect(japaneseChapters([fresh])).toEqual(japaneseChapters([chapter]));
    }
    const reading = JSON.parse(JSON.stringify(chapter.reading));
    expect(readingOf(reading, chapter.text), `system ${ming.system.n}`).not.toBeNull();
    expect(reading.localized, `system ${ming.system.n}`).toBeDefined();
    const input = { ...chapter, reading };
    for (const locale of ['en', 'ja'] as const) {
      const translated = locale === 'en' ? englishChapters([input])[0]! : japaneseChapters([input])[0]!;
      expect(translated.map((s) => s.slot)).toEqual(reading.segments.map((s: { slot: string }) => s.slot));
      const body = translated.filter((s) => s.slot !== '因為');
      expect(body.length).toBeGreaterThanOrEqual(4);
      const marked = markBook([{ palace: '命宮', segments: translated }], locale);
      const citeRuns = marked[0]!.segments.flatMap((s) => s.runs.filter((r) => r.cite));
      expect(citeRuns).toHaveLength(body.length);
      expect(citeRuns.map((r) => r.cite)).toEqual(reading.segments.filter((s: { slot: string }) => s.slot !== '因為').map((s: { statements: { citations: string[] }[] }) => s.statements[0]!.citations));
      expect(Object.values(citesFor(marked, locale)).every((n) => n.text.length > 0 && n.excerpt)).toBe(true);
      expect(translated.map((s) => s.text).join('')).not.toContain('〔');
      if (locale === 'ja') for (const s of translated) expect(Ja.scanJapanese(s.text), `system ${ming.system.n}: ${s.text}`).toEqual([]);
      if (ming.system.borrowed) {
        const fact = translated.filter((s) => s.slot === '因為').map((s) => s.text).join('');
        expect(fact).toContain(locale === 'en' ? 'borrows' : '借りて読みます');
        borrowed = true;
      }
    }
    const saved = JSON.stringify(reading);
    const withoutSnapshots = { ...reading, localized: undefined };
    for (const locale of ['en', 'ja'] as const) {
      expect(internationalMing({ text: chapter.text, reading: withoutSnapshots }, locale)).toEqual(reading.localized[locale]);
      const altered = structuredClone(withoutSnapshots);
      altered.segments[0].statements[0].text += '未核句';
      expect(translateMing(altered, locale)).toEqual([]);
      const wrongCite = structuredClone(reading);
      wrongCite.localized[locale][0].statements[0].citations = ['wrong-source'];
      expect(readingOf(wrongCite, chapter.text)).toBeNull();
      expect(internationalMing({ text: chapter.text, reading: wrongCite }, locale)).toEqual([]);
    }
    expect(JSON.stringify(reading)).toBe(saved);
    const drafts = [{ slug: '命宮', body: chapter.text, reading }];
    for (const locale of ['en', 'ja'] as const) {
      const asks = buildAsks(leadsFromBodies(drafts), locale);
      expect(asks[0]!.answer).toBe(reading.localized[locale][0].text);
      expect(asks[0]!.detail).toBe(reading.localized[locale][1].text);
      expect(asks[0]!.sources).toHaveLength(2);
    }
    seen.add(ming.system.n);
  }
  expect(seen.size).toBe(60);
  expect(borrowed).toBe(true);
});

it('日文只採用明確逐句引用，舊句、編輯例子與盤面不冒充原書', () => {
  const text = 'あなたの命宮には天機があります。';
  const marked = markBook([{ palace: '命宮', segments: [
    { slot: '正文', text },
    { slot: '情境', text, statements: [{ text, en: '', kind: 'editorial-example', source_ids: [], citations: ['fake'] }] },
  ] }], 'ja');
  expect(marked[0]!.segments.flatMap((s) => s.runs).some((r) => r.cite)).toBe(false);
});
