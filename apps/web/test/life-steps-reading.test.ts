import {it,expect} from 'vitest';
import {cast} from '@guanwei/ziwei';
import {bookChapters,citesFor} from '@/lib/mingshu';
import {readingOf,readingSegments} from '@/lib/chapter-reading';
import {markBook} from '@/lib/zhu';
import {paragraphCitations} from '@/lib/paragraph-citations';
import {englishChapters} from '@/lib/english';
import {internationalMing} from '@/lib/ming-international';
import samples from './fixtures/palace-before.json';

it.each(samples)('$id：十二步正文不顯示據，原文與限制仍保存在各語快照',(sample)=>{
 const c=cast(sample.input as Parameters<typeof cast>[0]);if(!c.ok)throw new Error(c.message);
 const ch=bookChapters(c.value,{seed:sample.seed,year:2026,solar:sample.input.solar,place:sample.input.place.label})!.find((c)=>c.slug==='一生十二步')!;
 const reading=readingOf(ch.reading,ch.text)!;
 expect(reading).not.toBeNull();expect(reading.writer).toBe('life-steps-reader-v2');
 expect(reading.localized).toBeDefined();
 expect(reading.segments.every((s)=>s.referenceDisplay==='hidden')).toBe(true);
 const marked=markBook([{palace:ch.slug,segments:readingSegments(ch.text,ch.slots,ch.reading)}]);
 expect(citesFor(marked)).toEqual({});
 for(const seg of marked[0]!.segments){
  const paragraph=paragraphCitations(seg.runs);
  if(seg.slot==='回看'){
   expect(paragraph.citations).toEqual([]);
   expect(seg.referenceConditions).toBeUndefined();
   expect(seg.referenceApplicability).toBeUndefined();
   const internal=reading.segments.find((s)=>s.text===seg.runs.map((r)=>r.text).join(''))!;
   expect(internal.referenceConditions?.length).toBeGreaterThan(0);
   expect(internal.referenceApplicability?.length).toBeGreaterThan(0);
   expect(internal.statements?.flatMap((s)=>s.citations).length).toBeGreaterThan(0);
  }
 }
 expect(englishChapters([ch])[0]).toHaveLength(reading.segments.length);
 for(const locale of ['en','ja'] as const){
  const localized=internationalMing(ch,locale)!;
  expect(localized).toHaveLength(reading.segments.length);
  const publicReading=markBook([{palace:ch.slug,segments:localized}],locale);
  expect(publicReading[0]!.segments.every((s)=>s.runs.every((r)=>!r.cite))).toBe(true);
  localized.forEach((seg,i)=>expect(seg.statements!.map((l)=>l.citations)).toEqual(reading.segments[i]!.statements!.map((l)=>l.citations)));
 }
});
