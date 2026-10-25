import {expect,it} from 'vitest';
import {cast,type BirthInput} from '@guanwei/ziwei';
import {LIAN_KEWEN,TONG_JI,BOOK_P1_CARDS} from '@guanwei/content/analysis-record';
import {createBookChapters,bookChapters,citesFor,localizeMarked} from '@/lib/mingshu';
import {alignReviewedChapters,withReadingEpilogue} from '@/lib/epilogue-reading';
import {readingOf} from '@/lib/chapter-reading';
import {markBook} from '@/lib/zhu';
import {paragraphCitations} from '@/lib/paragraph-citations';
import {referencePresentation} from '@/lib/reference-presentation';
import {hans} from '@/lib/hans';
import samples from '../src/lib/random-five-preview.json';
const unique=<T,>(xs:readonly T[])=>[...new Set(xs)];
function books(id:string){const s=samples.find(s=>s.id===id)!,r=cast(s.input as BirthInput);if(!r.ok)throw Error(r.message);const opts={seed:s.seed,year:2026,solar:s.input.solar,place:s.input.place.label,birthSex:s.input.sex as 'male'|'female'};return {book:createBookChapters(r.value,opts)!,base:withReadingEpilogue(r.value,alignReviewedChapters(r.value,bookChapters(r.value,{...opts,crossPalaceReading:true,separateRuleReferences:true,conditionalMingBranches:true})!))};}
it('Lian closing: inherited wealth conditions and every source survive only as explicitly labelled chapter background',()=>{
 const {book,base}=books('B'),ch=book.find(c=>c.slug==='給你的話')!,row=ch.reading!.segments.find(s=>s.analysisLinks?.decisionIds.includes(LIAN_KEWEN))!;
 const old=base.find(c=>c.slug===ch.slug)!.reading!.segments.find(s=>s.statements?.some(l=>l.source_ids.includes('epilogue.selected.財帛.福德')))!;
 expect(row.referenceConditions).toEqual([...BOOK_P1_CARDS.find(c=>c.id===LIAN_KEWEN)!.conditions,...BOOK_P1_CARDS.find(c=>c.id===LIAN_KEWEN)!.exceptions]);
 expect(row.referenceApplicability!.join('')).not.toContain('財帛、福德');
 expect(row.referenceBackground).toHaveLength(1);const bg=row.referenceBackground![0]!;
 expect(bg.label).toBe('其他相關章節背景');expect(bg.description).toContain('不以這些財帛分支作現段前提');
 expect(bg.conditions).toEqual(unique([...(old.referenceConditions??[]),...(old.referenceApplicability??[])]));
 for(const id of old.statements!.flatMap(l=>l.citations))expect(bg.citationIds).toContain(id);
 const marked=markBook([{palace:ch.slug,segments:[row]}]),s=marked[0]!.segments[0]!,notes=citesFor(marked),refs=paragraphCitations(s.runs).citations.map(id=>notes[id]!);
 expect(s.referenceBackground).toEqual(row.referenceBackground);
 const cn=localizeMarked(marked,'zh-Hans')[0]!.segments[0]!.referenceBackground![0]!;
 expect(cn.label).toBe('其他相关章节背景');expect(cn.citationIds).toEqual(bg.citationIds);
 const claims=ch.reading!.analysis!.claims.filter(c=>c.segment===ch.reading!.segments.indexOf(row));
 for(const id of bg.citationIds)expect(claims.every(c=>c.references.some(r=>r.citationId===id&&r.role==='comparison'))).toBe(true);
 const p=referencePresentation(s.referenceConditions??[],refs,s.referenceFocus,s.referenceApplicability,s.referenceBackground);
 expect(p.backgrounds[0]!.conditions.join('')).toContain('原章段落連讀財帛、福德');expect(p.conditions.join('')).not.toContain('火貪');
 expect(p.backgrounds[0]!.references.map(r=>r.sourceNote??'').join('')).not.toContain('所引原段見PDF第');
 const directAndCurrent=[...p.directReferences,...p.references];expect(directAndCurrent.every(r=>!bg.citationIds.includes(r.id))).toBe(true);
 expect(p.backgrounds[0]!.references.map(r=>r.id).sort()).toEqual([...bg.citationIds].sort());
 const shown=[...directAndCurrent,...p.backgrounds.flatMap(g=>g.references)].flatMap(r=>r.quoteParts??[]);
 for(const ref of refs)for(const part of ref.quoteParts??[])expect(shown.some(p=>p.id===part.id&&p.text===part.text&&p.note===part.note)).toBe(true);
 expect(readingOf(JSON.parse(JSON.stringify(ch.reading)),ch.text)).not.toBeNull();
 const bad=structuredClone(ch.reading!);bad.segments.find(s=>s.referenceBackground)!.referenceBackground![0]!.citationIds.push('missing');expect(readingOf(bad,ch.text)).toBeNull();
});
it('Tong chapters reduce repeated explanation without losing existing source bundles or conditions; career and closing retain both supported decisions',()=>{
 const {book,base}=books('C');
 const sourced=(slug:string)=>book.find(c=>c.slug===slug)!.reading!.segments.filter(s=>s.statements?.some(l=>l.citations.length));
 expect(sourced('命宮')).toHaveLength(1);expect(sourced('官祿')).toHaveLength(2);
 for(const slug of ['命宮','官祿']){
  const next=book.find(c=>c.slug===slug)!,old=base.find(c=>c.slug===slug)!;
  const cites=next.reading!.segments.flatMap(s=>s.statements?.flatMap(l=>l.citations)??[]),conditions=next.reading!.segments.flatMap(s=>s.referenceConditions??[]);
  for(const id of old.reading!.segments.flatMap(s=>s.statements?.flatMap(l=>l.citations)??[]))expect(cites).toContain(id);
  for(const note of old.reading!.segments.flatMap(s=>s.referenceConditions??[]))expect(conditions).toContain(note);
 }
 for(const slug of ['官祿','給你的話']){
  const chapter=book.find(c=>c.slug===slug)!,row=chapter.reading!.segments.find(s=>s.analysisLinks?.decisionIds.includes(TONG_JI))!,a=chapter.reading!.analysis!;
  const marked=markBook([{palace:slug,segments:[row]}]),segment=marked[0]!.segments[0]!,notes=citesFor(marked);
  const refs=paragraphCitations(segment.runs).citations.map(id=>notes[id]!);
  const panel=referencePresentation(segment.referenceConditions??[],refs,segment.referenceFocus,segment.referenceApplicability,segment.referenceBackground);
  const visible=[...panel.directReferences,...panel.references,...panel.backgrounds.flatMap(g=>g.references)];
  expect(visible.map(r=>r.sourceNote??'').join('')).not.toContain('所引原段見PDF第');
  for(const ref of refs)for(const part of ref.quoteParts??[])expect(visible.flatMap(r=>r.quoteParts??[]).some(p=>p.id===part.id&&p.text===part.text&&p.note===part.note)).toBe(true);
  const ids=row.analysisLinks!.decisionIds;expect(ids).toContain(TONG_JI);
  expect(ids.some(id=>a.decisions.find(d=>d.id===id)?.ruleId==='career-ji-quan')).toBe(true);expect(ids.every(id=>a.decisions.find(d=>d.id===id)?.status==='supported')).toBe(true);
  expect(row.referenceFocus).toContain('wtz.deep.p522.b007');
 }
});
it('editorial wording changes never touch quote text, negatives, time boundaries or the saved original conditions',()=>{
 const {book}=books('C'),row=book.find(c=>c.slug==='命宮')!.reading!.segments[0]!;
 const conditions=row.referenceConditions!,before=structuredClone(conditions),raw='這裡不另外替這些尚未完整核定的分支選答案。';
 for(const convert of [(s:string)=>s,hans]){
  const quote=convert(raw+'原局天机化权，运限天机化禄。'),refs=[{id:'raw',book:'原書',quoteParts:[{id:'p1',page:117,text:quote}],text:quote}];
  const panel=referencePresentation(conditions.map(convert),refs);
  expect(panel.conditions.join('')).not.toContain(convert('選答案'));expect(panel.conditions.join('')).not.toContain(convert('沒有用單項修飾'));
  expect(panel.conditions.join('')).toContain(convert('經行'));expect(panel.conditions.join('')).toContain(convert('本命'));
  expect(panel.references[0]!.quoteParts![0]!.text).toBe(quote);
 }
 const work='丑未天機；輔佐與煞忌刑耗不互相抵銷，機祿原句重複不新增規則。';
 for(const convert of [(s:string)=>s,hans]){
  const refs=[{book:'原書',text:convert(work),sourceNote:convert(work)}];
  const panel=referencePresentation([convert(work)],refs);
  expect(panel.conditions[0]).toContain(convert('輔佐與煞忌刑耗不互相抵銷'));
  expect(panel.conditions[0]).toContain(convert('原頁化祿句有重複，按原文照錄'));
  expect(panel.conditions[0]).not.toContain(convert('新增規則'));
  expect(refs[0]!.text).toBe(convert(work));
 }
 expect(conditions).toEqual(before);
});
