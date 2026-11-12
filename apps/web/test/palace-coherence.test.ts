import { expect, it } from 'vitest';
import { cast, type BirthInput } from '@guanwei/ziwei';
import { citation, freeMingReading, palaceReading, readerReferenceLanguage } from '@guanwei/content';
import { bookChapters, citesFor } from '@/lib/mingshu';
import { markBook } from '@/lib/zhu';
import { readingSegments } from '@/lib/chapter-reading';
import fixtures from '../src/lib/free-ming-preview.json';

it('72盤新書十三章保留每項原條件、來源與完整原文，語氣整理只改說明', () => {
  let checked = 0;
  for (const f of fixtures) {
    const input = f.input as BirthInput; const c = cast(input); if (!c.ok) throw Error(c.message);
    const chapters = bookChapters(c.value,{seed:f.seed,year:2026,solar:input.solar,place:input.place.label})!;
    for (const chapter of chapters.filter((p) => p.reading?.writer === 'palace-reader-v1' || p.reading?.writer === 'reader-backed-v1')) {
      const p = chapter.slug;
      const original = p === '命宮' ? freeMingReading(c.value,2026)!.ming : p === '性格的骨架' ? freeMingReading(c.value,2026)!.bone : palaceReading(c.value,p,2026)!;
      const conditions = new Set(chapter.reading!.segments.flatMap((s) => s.referenceConditions ?? []));
      for (const condition of conditions) expect(condition,p).not.toMatch(/[：:]$/);
      for (const s of original) for (const condition of s.referenceConditions ?? []) expect(conditions.has(readerReferenceLanguage(condition)),`${p}/${condition}`).toBe(true);
      const marked = markBook([{palace:p,segments:readingSegments(chapter.text,chapter.slots,chapter.reading)}]);
      const sources = citesFor(marked);
      const extra = p === '福德' && c.value.palaces.find((q) => q.name === p)!.stars.some((s) => s.name === '貪狼' && s.kind === 'major') && c.value.palaces.find((q) => q.name === p)!.stars.some((s) => s.name === '武曲' && s.kind === 'major' && s.sihua === '忌') ? ['palace.remaining.v1:wellbeing-武曲'] : [];
      const wanted = [...new Set([...original.flatMap((s) => s.statements.flatMap((line) => line.citations)), ...extra])].sort();
      expect(Object.keys(sources).sort(),p).toEqual(wanted);
      for (const [id, source] of Object.entries(sources)) {
        const original = citation(id)!;
        expect(source.text,id).toBe(original.text);
        expect(source.page,id).toBe(original.page);
        expect(source.pageEnd,id).toBe(original.pageEnd);
        expect(source.sourceNote,id).toBe(original.sourceNote ? readerReferenceLanguage(original.sourceNote) : undefined);
        expect(source.sourceNote ?? '',id).not.toMatch(/引擎|冒充|本輪|指紋|產品|已批|點票|輸出|選段/);
      }
      checked++;
    }
  }
  expect(checked).toBe(72*13);
}, 15000); // 936 chapters also run alongside other book-generation checks.
