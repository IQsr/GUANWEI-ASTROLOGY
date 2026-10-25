import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {BOOK_P1_CARDS} from '../src/book-p1';
import {citation} from '../src/citation';
import {ConditionSchema} from '../src/rule';
import data from '../src/cards/book-p1-sources.json';
import deep from '../../../tools/wang-reference/deep-index.json';

it('both P1 cards preserve a complete versioned source/condition/exception contract and use the existing condition schema',()=>{
 expect(BOOK_P1_CARDS).toHaveLength(2);expect(data.pdf_sha256).toBe(deep.book.sha256);
 for(const c of BOOK_P1_CARDS){
  expect(ConditionSchema.safeParse(c.when).success,c.id).toBe(true);expect(c.conditions.length).toBeGreaterThan(0);expect(c.exceptions.length).toBeGreaterThan(0);
  for(const id of c.sources){const source=citation(id)!;expect(source,id).not.toBeNull();expect(source.book).toBe('中州派紫微斗數深造講義');expect(source.pageConvention).toBe('pdf');}
 }
});
it('every complete quoted block matches the independently indexed original PDF fingerprint; no cuts or silent OCR repairs',()=>{
 const blocks=new Map(deep.blocks.map(b=>[b.id,b]));let count=0;
 for(const source of Object.values(data.sources)){
  expect(source.quoteBlocks).toEqual(source.quoteSpans.map(s=>s.id));
  for(const span of source.quoteSpans){
   const text=source.excerpt.slice(span.start,span.end),b=blocks.get(span.id)!;
   expect(createHash('sha256').update(text).digest('hex'),span.id).toBe(b.text_sha256);expect((source.blockFingerprints as Record<string,string>)[span.id]).toBe(b.text_sha256);count++;
  }
 }
 expect(count).toBe(24);
 expect(citation('book.p1.v1:lian-wellbeing')!.text).toContain('但多讥评，不能随遇而安');
 expect(citation('book.p1.v1:tong-natal')!.text).toContain('天同喜化禄，则此时天机化权于事业宫，成为策动力');
 expect(citation('book.p1.v1:tong-time-comparison')!.text).toContain('原局天机化权，运限天机化禄');
 expect(citation('book.p1.v2:lian-wellbeing')).toBeNull();
});
