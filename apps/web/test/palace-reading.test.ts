import { expect, it, vi } from 'vitest';
import { cast, type BirthInput } from '@guanwei/ziwei';
import { bookChapters, citesFor, localizeMarked } from '@/lib/mingshu';
import { readingOf, readingSegments, type ChapterReading } from '@/lib/chapter-reading';
import { englishChapters } from '@/lib/english';
import { japaneseChapters } from '@/lib/japanese';
import { markBook } from '@/lib/zhu';
import { chapterDrafts, readingContentVersion } from '@/lib/chengshu';
import { PALACE_READER_SLUGS } from '@guanwei/content/ming-version';
import { paragraphCitations } from '@/lib/paragraph-citations';
import fixtures from './fixtures/palace-before.json';

const books = fixtures.map((f) => {
  const input = f.input as BirthInput; const result = cast(input); if (!result.ok) throw Error(result.message);
  return { before: f.saved as { slug: string; text: string; slots: string[]; reading?: ChapterReading }[],
    now: bookChapters(result.value, { seed: f.seed, year: 2026, solar: input.solar, place: input.place.label })! };
});

it('十一宮新正文存完整原版快照；英日與舊書逐字相同，免費章版本不混用', () => {
  for (const b of books) {
    const frozen = JSON.stringify(b.before);
    const palaces = b.now.filter((c) => PALACE_READER_SLUGS.some((p) => p === c.slug));
    expect(palaces).toHaveLength(11);
    for (const c of palaces) {
      const old = b.before.find((p) => p.slug === c.slug)!;
      expect(c.text).not.toBe(old.text);
      expect(c.reading?.writer).toBe('palace-reader-v1');
      expect(c.reading?.internationalSnapshot).toEqual({ text: old.text, slots: old.slots });
      expect(readingOf(JSON.parse(JSON.stringify(c.reading)), c.text)).toEqual(c.reading);
      expect(englishChapters([c])).toEqual(englishChapters([old]));
      expect(japaneseChapters([c])).toEqual(japaneseChapters([old]));
    }
    expect(JSON.stringify(b.before)).toBe(frozen);
    expect(b.now.find((c) => c.slug === '命宮')?.reading?.writer).toBe('reader-backed-v1');
    expect(b.now.find((c) => c.slug === '性格的骨架')?.reading?.writer).toBe('reader-backed-v1');
    for (const c of b.now.filter((p) => !PALACE_READER_SLUGS.some((s) => s === p.slug) && !['命宮', '性格的骨架', '一生十二步'].includes(p.slug))) {
      expect(c.text).toBe(b.before.find((p) => p.slug === c.slug)!.text);
    }
    expect(b.now.find((c) => c.slug === '一生十二步')?.reading?.writer).toBe('life-steps-reader-v2');
    for (const d of chapterDrafts(b.now, readingContentVersion('test'))) if (PALACE_READER_SLUGS.some((p) => p === d.slug)) {
      expect(d.reading?.writer).toBe('palace-reader-v1');
      expect(d.body).toBe(d.reading!.segments.map((s) => s.text).join('\n\n'));
    }
  }
});

it('十一宮逐段保留據的完整原文、條件、例外及繁簡相同來源；建議不偽造書證', () => {
  for (const b of books) for (const c of b.now.filter((p) => p.reading?.writer === 'palace-reader-v1')) {
    const segments = readingSegments(c.text, c.slots, c.reading);
    const marked = markBook([{ palace: c.slug, segments }]);
    const cites = citesFor(marked);
    expect(Object.values(cites).every((s) => s.text && s.book.includes('王亭之') && s.sourceNote && s.pageConvention === 'pdf')).toBe(true);
    for (const [i, s] of marked[0]!.segments.entries()) {
      const paragraph = paragraphCitations(s.runs);
      if (paragraph.citations.length) {
        expect(s.referenceConditions?.length).toBeGreaterThan(2);
        expect(paragraph.citations.every((id) => cites[id])).toBe(true);
      }
      if (segments[i]!.statements?.every((l) => l.kind === 'editorial-advice')) expect(paragraph.citations).toEqual([]);
    }
    const hans = localizeMarked(marked, 'zh-Hans');
    expect(hans[0]!.segments.flatMap((s) => s.runs.flatMap((r) => r.cite ?? [])))
      .toEqual(marked[0]!.segments.flatMap((s) => s.runs.flatMap((r) => r.cite ?? [])));
    expect(hans[0]!.segments.flatMap((s) => s.referenceConditions ?? []).join('')).not.toMatch(/條件|宮|原書/);
    const hansCites = citesFor(hans, 'zh-Hans');
    for (const [id, source] of Object.entries(cites)) {
      const actual = hansCites[id]!;
      // 引文原字保留，來源顯示文字可轉簡體。
      expect(actual.text).toBe(source.text);
      expect(actual.page).toBe(source.page);
      expect(actual.pageEnd).toBe(source.pageEnd);
    }
  }
});

it('錯配正文、缺原版及遞迴快照均拒收；不猜補新稿來源或英日正文', () => {
  const c = books[0]!.now.find((p) => p.slug === '官祿')!;
  const bad = structuredClone(c.reading!); delete bad.internationalSnapshot;
  expect(readingOf(bad, c.text)).toBeNull();
  expect(readingOf(c.reading, c.text + '錯配')).toBeNull();
  expect(readingSegments(c.text + '錯配', c.slots, c.reading).every((s) => s.statements?.length === 0)).toBe(true);
  const nested = structuredClone(c.reading!); nested.internationalSnapshot!.reading = c.reading;
  expect(readingOf(nested, c.text)).toBeNull();
  expect(englishChapters([{ ...c, reading: bad }])).toEqual([[]]);
});

const db = vi.hoisted(() => ({ body: '正文。' as string | null, version: '', signedIn: true, calls: [] as string[], reading: { saved: true } }));
vi.mock('@/lib/supabase.server', () => ({ supabaseServer: () => ({
  auth: { getUser: async () => ({ data: { user: db.signedIn ? { id: 'reader' } : null } }) },
  from: () => { const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: { id: 'chapter', slots: ['細讀'], content_version: db.version }, error: null }) }; return q; },
  rpc: async (name: string) => { db.calls.push(name); return { data: name === 'chapter_body' ? db.body : db.reading, error: null }; },
}) }));

it('只有新版本且正文可讀時才取十一宮快照，舊章、未購買、未登入均不取', async () => {
  const { serverJuan } = await import('@/lib/juan.server');
  db.version = readingContentVersion('test'); db.body = '正文。'; db.signedIn = true;
  for (const slug of PALACE_READER_SLUGS) {
    db.calls = [];
    expect((await serverJuan().body('book', slug))?.reading).toEqual(db.reading);
    expect(db.calls).toEqual(['chapter_body', 'chapter_reading']);
  }
  db.version = 'test+ming-expanded-v1+reader-backed-v1+content-2026-10-22-reference-context'; db.calls = [];
  expect((await serverJuan().body('book', '官祿'))?.reading).toBeUndefined();
  expect(db.calls).toEqual(['chapter_body']);
  db.version = readingContentVersion('test'); db.body = null; db.calls = [];
  expect((await serverJuan().body('book', '官祿'))?.text).toBeNull(); expect(db.calls).toEqual(['chapter_body']);
  db.body = '正文。'; db.signedIn = false; db.calls = [];
  expect(await serverJuan().body('book', '官祿')).toBeNull(); expect(db.calls).toEqual([]);
});
