import {referenceEditorialWording} from '@/lib/cross-reference-language';
import {it,expect} from 'vitest';
import {cast,type BirthInput} from '@guanwei/ziwei';
import {citation} from '@guanwei/content';
import {bookChapters,citesFor,localizeMarked} from '@/lib/mingshu';
import {readingOf,readingSegments} from '@/lib/chapter-reading';
import {markBook} from '@/lib/zhu';
import {paragraphCitations} from '@/lib/paragraph-citations';
import {referencePresentation} from '@/lib/reference-presentation';
import {withCrossPalaceReading,analyzeCrossPalaces} from '@/lib/cross-palace-chapters';
import samples from './fixtures/palace-before.json';
import previews from '../src/lib/free-ming-preview.json';
import raw from '../src/lib/cross-palace-reading.json';
import sourceData from '../../../packages/content/src/cards/cross-palace-sources.json';
import deep from '../../../tools/wang-reference/deep-index.json';
import {createHash} from 'node:crypto';
const names=['命宮','官祿','財帛','福德'];
const fixture=(id:string)=>samples.find((f)=>f.id===id)!;
const chart=(id:string)=>{const c=cast(fixture(id).input as BirthInput);if(!c.ok)throw Error(c.message);return c.value;};
const book=(id:string,cross=true)=>{const f=fixture(id);return bookChapters(chart(id),{seed:f.seed,year:2026,solar:f.input.solar,place:f.input.place.label,birthSex:f.input.sex as 'male'|'female',crossPalaceReading:cross})!;};
const citations=(c:ReturnType<typeof book>[number])=>[...new Set(c.reading!.segments.flatMap((s)=>s.statements?.flatMap((l)=>l.citations)??[]))];

it('twelve preview chapters use two integrated paragraphs while all other chapters and international snapshots stay unchanged',()=>{
 for(const id of ['TL','A','C']){
  const before=book(id,false),after=book(id,true);
  for(const old of before){const next=after.find((c)=>c.slug===old.slug)!;
   if(!names.includes(old.slug)){expect(next,`${id}/${old.slug}`).toEqual(old);continue;}
   expect(next.text,`${id}/${old.slug}`).not.toBe(old.text);expect(next.text).not.toMatch(/\{(?:ming|career|wealth|wellbeing|careerOrigin)\}/);
   expect(next.reading!.segments.filter((s)=>s.statements?.some((l)=>l.source_ids.some((id)=>id.startsWith('cross.reading.'))))).toHaveLength(2);
   expect(next.reading!.international).toEqual(old.reading!.international);expect(next.reading!.internationalSnapshot).toEqual(old.reading!.internationalSnapshot);
   expect(readingOf(next.reading,next.text)).not.toBeNull();
   for(const cite of citations(old)){const alias=(raw.citationAliases as Record<string,string>)[cite]??cite;expect(citations(next),cite).toContain(alias);expect(citation(alias)!.text).toBe(citation(cite)!.text);}
   expect(next.reading!.segments.filter((s)=>s.heading==='給你的建議｜編輯建議')).toHaveLength(1);
  }
 }
});

it('every sourced paragraph resolves one consolidated reference mark with complete quotes, conditions and direct source blocks',()=>{
 for(const id of ['TL','A','C'])for(const chapter of book(id).filter((c)=>names.includes(c.slug))){
  const marked=markBook([{palace:chapter.slug,segments:readingSegments(chapter.text,chapter.slots,chapter.reading)}]);const refs=citesFor(marked);
  for(const [i,row] of marked[0]!.segments.entries()){
   const bundle=paragraphCitations(row.runs),original=chapter.reading!.segments[i]!;
   expect(bundle.runs.every((r)=>!r.cite?.length)).toBe(true);
   const hasSources=original.statements?.some((l)=>l.citations.length);
   if(!hasSources)continue;
   expect(bundle.citations.length).toBeGreaterThan(0);
   for(const cite of bundle.citations)expect(refs[cite],cite).toBeDefined();
   expect(row.referenceConditions?.length).toBeGreaterThan(0);
   const list=bundle.citations.map((id)=>refs[id]!);
   const panel=referencePresentation(row.referenceConditions!,list,row.referenceFocus);
   if(original.statements?.some((l)=>l.source_ids.some((id)=>id.startsWith('cross.reading.')))){
    expect(row.referenceApplicability?.[0]).toMatch(/^本盤/);expect(panel.directReferences.length).toBeGreaterThan(0);
    expect(original.text).not.toMatch(/本批|可執行|fact ID|P1b|啟用|輸出/);
   }
   for(const ref of list){expect(ref.text).toBe(citation(ref.id)!.text);expect(ref.page).toBeGreaterThan(0);}
   const all=[...panel.directReferences,...panel.references].flatMap((r)=>r.quoteParts??[]);
   for(const ref of list)for(const part of ref.quoteParts??[])expect(all.some((p)=>p.id===part.id&&p.text===part.text)).toBe(true);
  }
  expect(localizeMarked(marked,'zh-Hans')[0]!.segments.map((s)=>s.referenceFocus)).toEqual(marked[0]!.segments.map((s)=>s.referenceFocus));
 }
});

it('all inherited references and original conditions survive the prose rewrite, including extra 地空 and 開創限制 paragraphs',()=>{
 for(const id of ['TL','A','C'])for(const old of book(id,false).filter((c)=>names.includes(c.slug))){
  const next=book(id).find((c)=>c.slug===old.slug)!;
  const conditions=next.reading!.segments.flatMap((s)=>s.referenceConditions??[]);
  for(const s of old.reading!.segments)for(const c of s.referenceConditions??[])expect(conditions,`${id}/${old.slug}: ${c}`).toContain(referenceEditorialWording(c));
 }
 expect(book('TL').find((c)=>c.slug==='財帛')!.text).toContain('地空');
 expect(book('TL').find((c)=>c.slug==='官祿')!.text).toContain('創業之力薄弱');
 expect(book('TL').find((c)=>c.slug==='命宮')!.text.match(/遇到取捨時，先分清/g)).toHaveLength(1);
});

it('actual chart branches and excluded clauses remain explicit: no borrowed hua relocation or fabricated certainty',()=>{
 const a=book('A'),c=book('C');
 expect(a.find((x)=>x.slug==='官祿')!.text).toContain('工程技術');expect(a.find((x)=>x.slug==='官祿')!.text).not.toContain('廉祿的開創');
 expect(a.find((x)=>x.slug==='命宮')!.text).not.toMatch(/支持較祥和|你(?:就是|屬於)權術/);
 const wealth=a.find((x)=>x.slug==='財帛')!;
 expect(wealth.reading!.segments[0]!.text).not.toMatch(/共用同一組星系來源|多出另一項|武曲忌仍在福德原位/);
 expect(wealth.reading!.segments[0]!.text).toContain('可用的餘額');
 expect(wealth.reading!.segments[0]!.referenceApplicability!.join('')).toContain('武曲忌實坐福德');
 expect(wealth.reading!.segments[0]!.referenceApplicability!.join('')).toContain('不另算一次財帛本宮武忌');
 expect(c.find((x)=>x.slug==='福德')!.text).toContain('擎羊仍實坐福德');expect(c.find((x)=>x.slug==='福德')!.text).not.toContain('智力、性傾向與疾病');
 const constraints=c.filter((x)=>names.includes(x.slug)).flatMap((x)=>x.reading!.segments.flatMap((s)=>[...(s.referenceConditions??[]),...(s.referenceApplicability??[])]));
 expect(constraints.join('')).toContain('財帛無祿存同度');
 for(const p of ['財帛','官祿'])expect(c.find((x)=>x.slug===p)!.text).not.toMatch(/你已(?:從事|取得|擁有)|你現在的工作/);
});

it('new citation spans are complete original blocks with pinned fingerprints and unchanged suspicious characters',()=>{
 expect(sourceData.pdf_sha256).toBe(deep.book.sha256);const indexed=new Map(deep.blocks.map((b)=>[b.id,b]));
 for(const [key,s] of Object.entries(sourceData.sources)){
  const cite=citation('cross.reading.v1:'+key)!;expect(cite.text).toBe(s.excerpt);
  for(const span of s.quoteSpans){const text=s.excerpt.slice(span.start,span.end),sha=createHash('sha256').update(text).digest('hex');expect(sha,span.id).toBe(indexed.get(span.id)!.text_sha256);expect((s.blockFingerprints as Record<string,string>)[span.id]).toBe(sha);}
 }
 expect(citation('cross.reading.v1:arts')!.text).toContain('化主');
 expect(citation('cross.reading.v1:guanfuboth')!.text).toContain('天官司喜');
 for(const [key,s] of Object.entries(sourceData.aliases)){
  const cite=citation('cross.reading.v1:'+key)!,original=citation(s.legacyCiteId)!;
  expect(cite.text).toBe(original.text);
  for(const span of s.quoteSpans){const sha=createHash('sha256').update(cite.text.slice(span.start,span.end)).digest('hex');expect(sha,span.id).toBe(indexed.get(span.id)!.text_sha256);}
 }
});

it('missing borrowing or mismatched prerequisites fall back to the reviewed existing chapter without modifying caller inputs',()=>{
 const ch=book('C',false).find((c)=>c.slug==='官祿')!,c=chart('C');delete c.palaces.find((p)=>p.name==='官祿')!.borrowsFrom;
 const input=structuredClone(ch.reading!.segments),before=JSON.stringify([c,input]);
 expect(withCrossPalaceReading(c,'官祿',2026,input,analyzeCrossPalaces(c))).toBe(input);expect(JSON.stringify([c,input])).toBe(before);
});

it('the same condition-based writer can evaluate all 72 fixture charts without changing unrelated chapters or mutating a chart',()=>{
 for(const f of previews){const c=cast(f.input as BirthInput);if(!c.ok)throw Error(c.message);const before=JSON.stringify(c.value),opts={seed:f.seed,year:2026,solar:f.input.solar,place:f.input.place.label};
  const legacy=bookChapters(c.value,opts)!,newer=bookChapters(c.value,{...opts,birthSex:f.input.sex as 'male'|'female',crossPalaceReading:true})!;
  for(const p of legacy)if(!names.includes(p.slug))expect(newer.find((n)=>n.slug===p.slug)).toEqual(p);
  expect(JSON.stringify(c.value)).toBe(before);
 }
},30000);

it('all preview drafts name existing analysis prerequisites and reviewed source records',()=>{
 expect(raw.entries).toHaveLength(12);
 for(const e of raw.entries)for(const p of e.parts)for(const id of p.citations)expect(citation(id),id).not.toBeNull();
});
