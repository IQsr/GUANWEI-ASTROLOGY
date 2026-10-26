import {TONG_JI} from '@guanwei/content/analysis-record';
import {expect,it} from 'vitest';
import {cast,type BirthInput} from '@guanwei/ziwei';
import {bookChapters,createBookChapters,citesFor} from '@/lib/mingshu';
import {markBook} from '@/lib/zhu';
import {readingSegments} from '@/lib/chapter-reading';
import {paragraphCitations} from '@/lib/paragraph-citations';
import {referencePresentation} from '@/lib/reference-presentation';
import {readerReferenceLanguage} from '@guanwei/content';
import five from '../src/lib/random-five-preview.json';
import three from './fixtures/palace-before.json';
import remaining from '../../../packages/content/src/cards/palace-remaining.json';

function books(sample:{seed:string;input:unknown}){
 const input=sample.input as BirthInput,result=cast(input);if(!result.ok)throw Error(result.message);
 const opts={seed:sample.seed,year:2026,solar:input.solar,place:input.place.label,birthSex:input.sex};
 return {current:createBookChapters(result.value,opts)!,base:bookChapters(result.value,{...opts,crossPalaceReading:true,conditionalBranches:true})!};
}

it.each([five[0]!,five[2]!])('$id: preserves the separate bone transition and references; P1 C uses its shared decision for body and advice',sample=>{
 const {current,base}=books(sample),chapter=current.find(c=>c.slug==='命宮')!,old=base.find(c=>c.slug===chapter.slug)!;
 const advice=chapter.reading!.segments.filter(s=>s.statements?.some(l=>l.kind==='editorial-advice'&&l.source_ids.some(id=>id.startsWith('editorial.advice.'))));
 expect(advice).toHaveLength(1);expect(chapter.text.split(advice[0]!.text)).toHaveLength(2);
 const transition=old.reading!.segments.find(s=>s.text.startsWith('接下來的「性格的骨架」'))!;
 expect(transition).toBeDefined();expect(chapter.reading!.segments).toContainEqual(transition);
 if(sample.id==='C'){
  expect(advice[0]!.analysisLinks?.decisionIds).toEqual([TONG_JI]);
  expect(chapter.text).toContain('天機權成為策動力');
  const lines=chapter.reading!.segments.flatMap(s=>s.statements??[]);
  for(const id of old.reading!.segments.flatMap(s=>s.statements?.flatMap(l=>l.citations)??[]))expect(lines.flatMap(l=>l.citations)).toContain(id);
  for(const condition of old.reading!.segments.flatMap(s=>s.referenceConditions??[]))expect(chapter.reading!.segments.flatMap(s=>s.referenceConditions??[])).toContain(condition);
 }else expect(chapter.reading!.segments.filter(s=>s.statements?.some(l=>l.citations.length))).toEqual(old.reading!.segments.filter(s=>s.statements?.some(l=>l.citations.length)));
});

it('同梁骨架自行交代祿存與火星分支，不再指向已改走的命宮句子；引用與限制原樣保留',()=>{
 const {current,base}=books(three.find(c=>c.id==='TL')!);
 const row=(book:typeof current)=>book.find(c=>c.slug==='性格的骨架')!.reading!.segments.find(s=>s.statements?.some(l=>l.source_ids.includes('TL-B2')))!;
 const old=row(base),next=row(current);
 expect(next.text).not.toContain('前章提到');expect(next.text).toContain('發展過程中的變動');
 expect(next.text).toContain('不等於你必然換工作');expect(next.text).toContain('不能使用「無火鈴空劫」');
 expect(next.referenceConditions).toEqual(old.referenceConditions);expect(next.referenceFocus).toEqual(old.referenceFocus);
 expect(next.statements!.map(l=>({...l,text:''}))).toEqual(old.statements!.map(l=>({...l,text:''})));
});

it('紫府官祿與收結不再掛出未成立分支（2026-10-26 條件唔成立就唔寫）；已掛出的原文及例外完整可見',()=>{
 const {current}=books(five[3]!);
 const rule=remaining.rules.find(r=>r.conditions.some(c=>c.includes('本宮有天相且四方廉貞本命祿')))!;
 for(const slug of ['官祿','給你的話']){
  const chapter=current.find(c=>c.slug===slug)!;
  // The 廉貞祿 branch is unmatched on this chart: neither its requirement note nor its source is shown.
  expect(chapter.reading!.segments.some(s=>s.referenceConditions?.some(c=>c.includes('本宮有天相且四方廉貞本命祿')))).toBe(false);
  const shownIds=new Set(chapter.reading!.segments.flatMap(s=>s.statements?.flatMap(l=>l.citations)??[]));
  for(const source of rule.sources)expect(shownIds.has(`palace.remaining.v1:${source}`)).toBe(false);
  const marked=markBook([{palace:slug,segments:readingSegments(chapter.text,chapter.slots,chapter.reading)}]);
  const notes=citesFor(marked);
  for(const seg of marked[0]!.segments){
   const bundle=paragraphCitations(seg.runs),refs=bundle.citations.map(id=>notes[id]!);
   const panel=referencePresentation(seg.referenceConditions??[],refs,seg.referenceFocus,seg.referenceApplicability);
   const shown=[...panel.directReferences,...panel.references].flatMap(r=>r.quoteParts??[]);
   for(const ref of refs)for(const part of ref.quoteParts??[])expect(shown.some(p=>p.id===part.id&&p.text===part.text&&p.note===part.note)).toBe(true);
  }
 }
});
