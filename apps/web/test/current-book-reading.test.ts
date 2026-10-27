import {it,expect} from 'vitest';
import {cast,type BirthInput} from '@guanwei/ziwei';
import {citation,verdictFor} from '@guanwei/content';
import {createBookChapters,bookChapters,citesFor} from '@/lib/mingshu';
import {readingOf,readingSegments} from '@/lib/chapter-reading';
import {markBook} from '@/lib/zhu';
import {paragraphCitations} from '@/lib/paragraph-citations';
import {referencePresentation} from '@/lib/reference-presentation';
import {englishChapters} from '@/lib/english';
import {japaneseChapters} from '@/lib/japanese';
import {withReadingEpilogue} from '@/lib/epilogue-reading';
import cases from '../src/lib/random-five-preview.json';
import original from './fixtures/palace-before.json';
import allSystems from '../src/lib/free-ming-preview.json';
const opts=(c:{seed:string;input:BirthInput})=>({seed:c.seed,year:2026,solar:c.input.solar,place:c.input.place.label,birthSex:c.input.sex});
const get=(c:{seed:string;input:unknown})=>{const input=c.input as BirthInput,r=cast(input);if(!r.ok)throw Error(r.message);return {chart:r.value,options:opts({...c,input})};};
/** 2026-10-26 periodChecks：新書嘅這十年、這一年（連英日）只准變成開咗 periodChecks 嘅樣，其餘章照舊。
 * 2026-10-27 ageBands：虛歲十九至二十四嘅「讀書和工作上」都喺呢兩章，一齊開。 */
const PERIOD=['這十年','這一年'];
const withPeriodChecks=<T extends {slug:string}>(base:T[],chart:Parameters<typeof bookChapters>[0],options:Parameters<typeof bookChapters>[1])=>{
 const checked=bookChapters(chart,{...options,periodChecks:true,ageBands:true})!;
 return base.map(c=>PERIOD.includes(c.slug)?checked.find(x=>x.slug===c.slug) as unknown as T:c);
};
const ids=(c:NonNullable<ReturnType<typeof createBookChapters>>[number])=>[...new Set(c.reading?.segments.flatMap(s=>s.statements?.flatMap(l=>l.citations)??[])??[])];

it('the production builder selects all twelve approved cross chapters without a preview flag',()=>{
 for(const sample of original.filter(c=>['TL','A','C'].includes(c.id))){
  const {chart,options}=get(sample),before=JSON.stringify(chart);
  const current=createBookChapters(chart,options)!;
  const reviewed=bookChapters(chart,{...options,crossPalaceReading:true,separateRuleReferences:true,conditionalBranches:true,focusedAdvice:true,periodChecks:true,relocateHedges:true,verdictLead:true,ageBands:true})!;
  for(const slug of ['命宮','官祿','財帛','福德']){
   const next=current.find(c=>c.slug===slug)!;
   const {analysis,...saved}=next.reading!;
   expect(analysis?.chapter.chapter).toBe(slug);
   expect({...next,reading:saved}).toEqual(reviewed.find(c=>c.slug===slug));
   expect(current.find(c=>c.slug===slug)!.text).not.toBe(bookChapters(chart,options)!.find(c=>c.slug===slug)!.text);
  }
  expect(JSON.stringify(chart)).toBe(before);
 }
});

it.each(cases)('$id: frozen random input produces one aligned closing snapshot and retains every original source bundle',sample=>{
 const {chart,options}=get(sample),before=JSON.stringify(chart),legacy=bookChapters(chart,{...options,separateRuleReferences:true})!;
 const current=createBookChapters(chart,options)!;
 expect(current).toHaveLength(19);expect(JSON.stringify(chart)).toBe(before);
 const end=current.find(c=>c.slug==='給你的話')!;
 expect(end.reading?.writer).toBe('epilogue-reader-v1');expect(readingOf(JSON.parse(JSON.stringify(end.reading)),end.text)).not.toBeNull();
 expect(end.text).not.toMatch(/最適合|財源大多充足|進可攻、退可守|最可以倚仗|獨當一面|管一個部門/);
 for(const slug of ['命宮','官祿','財帛','福德']){
  const old=legacy.find(c=>c.slug===slug)!,next=current.find(c=>c.slug===slug)!;
  for(const id of ids(old))expect(ids(next)).toContain(id);
  // 2026-10-27 verdictLead：結論判斷句帶自己嘅出處（verdictFor），其餘唔准加
  const verdict=new Set(verdictFor(chart,slug)?.passages??[]);
  const added=ids(next).filter(id=>!ids(old).includes(id)&&!verdict.has(id));
  const eligible=sample.id==='B'&&slug==='福德'||sample.id==='C'&&['命宮','官祿'].includes(slug);
  if(eligible)expect(added.every(id=>id.startsWith('book.p1.v1:'))).toBe(true);else expect(added).toEqual([]);
  const conditions=next.reading!.segments.flatMap(s=>s.referenceConditions??[]);
  for(const condition of old.reading!.segments.flatMap(s=>s.referenceConditions??[]))expect(conditions).toContain(condition);
  for(const id of ids(next))expect(citation(id),id).not.toBeNull();
 }
 const closingIds=new Set(ids(end));
 for(const slug of ['命宮','官祿','財帛','福德'])for(const id of ids(current.find(c=>c.slug===slug)!))expect(closingIds).toContain(id);
 for(const seg of end.reading!.segments.filter(s=>s.statements?.some(l=>l.citations.length))){
  expect(seg.referenceConditions?.length).toBeGreaterThan(0);expect(seg.referenceApplicability?.length).toBeGreaterThan(0);
 }
 const marked=markBook([{palace:end.slug,segments:readingSegments(end.text,end.slots,end.reading)}]),notes=citesFor(marked);
 for(const seg of marked[0]!.segments){
  const bundle=paragraphCitations(seg.runs);expect(bundle.runs.every(r=>!r.cite)).toBe(true);
  const refs=bundle.citations.map(id=>notes[id]!);for(const ref of refs){expect(ref).toBeDefined();expect(ref.text).toBe(citation(ref.id)!.text);}
  const panel=referencePresentation(seg.referenceConditions??[],refs,seg.referenceFocus,seg.referenceApplicability,seg.referenceBackground);
  if(bundle.citations.length)expect(panel.directReferences.length).toBeGreaterThan(0);
  const shown=[...panel.directReferences,...panel.references,...panel.backgrounds.flatMap(g=>g.references)].flatMap(ref=>ref.quoteParts??[]);
  for(const ref of refs)for(const part of ref.quoteParts??[])expect(shown.some(p=>p.id===part.id&&p.text===part.text)).toBe(true);
 }
 const legacyChecked=withPeriodChecks(legacy,chart,{...options,separateRuleReferences:true});
 expect(englishChapters(current)).toEqual(englishChapters(legacyChecked));expect(japaneseChapters(current)).toEqual(japaneseChapters(legacyChecked));
 const steps=current.find(c=>c.slug==='一生十二步')!;
 const {analysis:stepsAnalysis,...stepsReading}=steps.reading!;
 expect(stepsAnalysis?.claims.length).toBeGreaterThan(0);
 expect({...steps,reading:stepsReading}).toEqual(legacy.find(c=>c.slug==='一生十二步'));
});

it('retains unsupported poles as open comparisons and fixes the reviewed advice/repeated helpers paragraph',()=>{
 const books=cases.map(c=>{const {chart,options}=get(c);return createBookChapters(chart,options)!;});
 expect(books[0]!.find(c=>c.slug==='命宮')!.text).toContain('為誰負責');
 expect(books[2]!.find(c=>c.slug==='命宮')!.text).toContain('天機權成為策動力');
 expect(books[1]!.find(c=>c.slug==='官祿')!.text.match(/本盤見左右兩曜/g)).toHaveLength(1);
 expect(books[1]!.find(c=>c.slug==='官祿')!.text).not.toContain('輔弼能減輕辛勞，魁鉞主要提供機會，兩者不互代。');
 expect(books[3]!.find(c=>c.slug==='給你的話')!.text).toContain('未能單憑兩星同宮就說已經攻守兼備');
});

it('missing cross prerequisites do not turn into supported readings; a different structure does not reuse a five-case synopsis',()=>{
 const input=original.find(c=>c.id==='C')!,{chart,options}=get(input);delete chart.palaces.find(p=>p.name==='官祿')!.borrowsFrom;
 const current=createBookChapters(chart,options)!;
 expect(current.find(c=>c.slug==='官祿')!.text).toBe(bookChapters(chart,{...options,separateRuleReferences:true,conditionalBranches:true,focusedAdvice:true,periodChecks:true,relocateHedges:true,verdictLead:true,ageBands:true})!.find(c=>c.slug==='官祿')!.text);
 const d=get(cases[3]!);d.chart.palaces.find(p=>p.name==='財帛')!.stars=d.chart.palaces.find(p=>p.name==='財帛')!.stars.filter(s=>s.kind!=='major');
 const base=bookChapters(d.chart,d.options)!;
 const result=withReadingEpilogue(d.chart,base).find(c=>c.slug==='給你的話')!;
 expect(result.reading!.segments[0]!.heading).toBe('做選擇時，先看自己的重心');
});

it('all 72 existing real/borrowed structures retain their source conditions and international snapshots through new-book creation',()=>{
 for(const sample of allSystems){
  const {chart,options}=get(sample),base=bookChapters(chart,options)!,current=createBookChapters(chart,options)!;
  expect(current).toHaveLength(base.length);expect(current.map(c=>c.slug)).toEqual(base.map(c=>c.slug));
  const baseChecked=withPeriodChecks(base,chart,options);
  expect(englishChapters(current)).toEqual(englishChapters(baseChecked));expect(japaneseChapters(current)).toEqual(japaneseChapters(baseChecked));
  const end=current.find(c=>c.slug==='給你的話')!;expect(readingOf(end.reading,end.text)).not.toBeNull();
  for(const row of end.reading!.segments)for(const id of row.statements?.flatMap(l=>l.citations)??[])expect(citation(id),id).not.toBeNull();
 }
},90000);

it('rejects closing text/source mismatches and recursive international snapshots',()=>{
 const {chart,options}=get(cases[3]!),end=createBookChapters(chart,options)!.find(c=>c.slug==='給你的話')!;
 expect(readingOf(end.reading,end.text+'額外斷語。')).toBeNull();
 const missing=structuredClone(end.reading!);delete missing.internationalSnapshot;expect(readingOf(missing,end.text)).toBeNull();
 const nested=structuredClone(end.reading!);nested.internationalSnapshot!.reading=end.reading;expect(readingOf(nested,end.text)).toBeNull();
 expect(englishChapters([{...end,reading:missing}])).toEqual([[]]);
});
