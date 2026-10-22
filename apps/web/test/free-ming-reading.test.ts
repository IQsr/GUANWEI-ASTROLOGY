import { expect, it, vi } from 'vitest';
import { cast, type BirthInput } from '@guanwei/ziwei';
import { bookChapters, citesFor, localizeMarked } from '@/lib/mingshu';
import { readingOf, readingSegments, type ChapterReading } from '@/lib/chapter-reading';
import { englishChapters } from '@/lib/english';
import { japaneseChapters } from '@/lib/japanese';
import { markBook } from '@/lib/zhu';
import { buildAsks, leadsFromBodies } from '@/lib/wenmu';
import { chapterDrafts, readingContentVersion } from '@/lib/chengshu';
import fixtures from './fixtures/free-ming-before.json';
import { paragraphCitations } from '@/lib/paragraph-citations';

type Saved = { slug: string; text: string; slots: string[]; reading?: ChapterReading };
const books = fixtures.map((b) => {
  const input = b.input as BirthInput; const r = cast(input); if (!r.ok) throw Error(r.message);
  const now = bookChapters(r.value, { seed: b.seed, year: 2026, solar: input.solar, place: input.place.label })!;
  return { id: b.id, before: b.saved as unknown as Saved[], now };
});

it('三組新書及骨架保存閱讀快照；舊書正文、英日版本逐字保持', () => {
  for (const b of books) {
    const revised = b.now.filter((c) => c.slug === '命宮' || c.slug === '性格的骨架');
    expect(revised).toHaveLength(2);
    for (const c of revised) {
      expect(c.reading?.writer).toBe('reader-backed-v1');
      expect(readingOf(JSON.parse(JSON.stringify(c.reading)), c.text)).toEqual(c.reading);
      const original = b.before.find((p) => p.slug === c.slug)!;
      const snapshot = { text: original.text, slots: original.slots, ...(original.reading ? { reading: original.reading } : {}) };
      expect(c.reading!.internationalSnapshot).toEqual(snapshot);
      const before = JSON.stringify(original);
      expect(englishChapters([c])).toEqual(englishChapters([original]));
      expect(japaneseChapters([c])).toEqual(japaneseChapters([original]));
      expect(JSON.stringify(original)).toBe(before);
      if (original.reading) expect(readingOf(original.reading, original.text)).toEqual(original.reading);
    }
    const drafts = chapterDrafts(b.now, readingContentVersion('rules@test'));
    const asks = buildAsks(leadsFromBodies(drafts), 'zh-Hant');
    expect(asks[0]!.answer).toBe(revised[0]!.text.split('\n\n')[0]);
    expect(asks[0]!.sources.length).toBeGreaterThan(0);
  }
});

it('實際書頁的命宮與骨架有「據」及原文；編輯例子不掛源，繁簡保留同一引用', () => {
  for (const b of books) for (const c of b.now.filter((p) => p.reading?.writer === 'reader-backed-v1')) {
    const segments = readingSegments(c.text, c.slots, c.reading);
    const marked = markBook([{ palace: c.slug, segments }]);
    const notes = citesFor(marked);
    expect(Object.keys(notes).length).toBeGreaterThan(0);
    expect(Object.values(notes).every((n) => n.book.includes('王亭之') && n.text.length > 0 && n.excerpt)).toBe(true);
    for (const s of marked[0]!.segments) {
      const paragraph = paragraphCitations(s.runs);
      expect(new Set(paragraph.citations)).toEqual(new Set(s.runs.flatMap((r) => r.cite ?? [])));
      if (paragraph.citations.length) expect(s.referenceConditions?.length).toBeGreaterThan(0);
    }
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!;
      if (seg.statements?.every((s) => ['evidence', 'editorial-example', 'editorial-advice'].includes(s.kind!))) {
        expect(marked[0]!.segments[i]!.runs.some((r) => r.cite)).toBe(false);
      }
    }
    const hans = localizeMarked(marked, 'zh-Hans');
    expect(hans[0]!.segments.filter((s) => s.referenceConditions?.length).length)
      .toBe(marked[0]!.segments.filter((s) => s.referenceConditions?.length).length);
    expect(hans[0]!.segments.flatMap((s) => s.referenceConditions ?? []).join('')).not.toMatch(/條件|輔佐|機梁/);
    expect(hans.flatMap((p) => p.segments.flatMap((s) => s.runs.flatMap((r) => r.cite ?? []))))
      .toEqual(marked.flatMap((p) => p.segments.flatMap((s) => s.runs.flatMap((r) => r.cite ?? []))));
  }
});

it('錯配或遞迴的版本快照不接受；新稿不從命盤重算已保存的舊書', () => {
  const chapter = books[0]!.now.find((p) => p.slug === '命宮')!;
  const wrong = structuredClone(chapter.reading!);
  wrong.internationalSnapshot!.text += '錯配';
  expect(readingOf(wrong, chapter.text)).toBeNull();
  const nested = structuredClone(chapter.reading!);
  nested.internationalSnapshot!.reading = chapter.reading;
  expect(readingOf(nested, chapter.text)).toBeNull();
  expect(readingOf(chapter.reading, chapter.text + '新增')).toBeNull();
  const invalidConditions = structuredClone(chapter.reading!);
  (invalidConditions.segments[0] as unknown as { referenceConditions: unknown }).referenceConditions = [123];
  expect(readingOf(invalidConditions, chapter.text)).toBeNull();
});

const db = vi.hoisted(() => ({ body: '正文。' as string | null, version: '', reading: { test: 'saved-reading' }, calls: [] as string[] }));
vi.mock('@/lib/supabase.server', () => ({ supabaseServer: () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'reader' } } }) },
  from: () => { const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: { id: 'chapter', slots: ['骨架'], content_version: db.version }, error: null }) }; return q; },
  rpc: async (name: string) => { db.calls.push(name); return { data: name === 'chapter_body' ? db.body : db.reading, error: null }; },
}) }));

it('真書 adapter 讀回骨架快照；舊骨架與無正文情況不額外取註資料', async () => {
  const { serverJuan } = await import('@/lib/juan.server');
  db.version = readingContentVersion('rules@test'); db.body = '正文。'; db.calls = [];
  expect((await serverJuan().body('book', '性格的骨架'))?.reading).toEqual(db.reading);
  expect(db.calls).toEqual(['chapter_body', 'chapter_reading']);
  db.version = 'rules+ming-expanded-v1+sentence-backed-v1'; db.calls = [];
  expect((await serverJuan().body('book', '性格的骨架'))?.reading).toBeUndefined();
  expect(db.calls).toEqual(['chapter_body']);
  db.version = readingContentVersion('rules@test'); db.body = null; db.calls = [];
  expect((await serverJuan().body('book', '性格的骨架'))?.text).toBeNull();
  expect(db.calls).toEqual(['chapter_body']);
});
