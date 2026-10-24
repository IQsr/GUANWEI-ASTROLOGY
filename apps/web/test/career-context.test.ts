import {expect,it} from 'vitest';
import {cast,type BirthInput,type Chart} from '@guanwei/ziwei';
import {palaceReading,palaceNarrative,citation} from '@guanwei/content';
import {bookChapters,citesFor,localizeMarked} from '@/lib/mingshu';
import {markBook} from '@/lib/zhu';
import {readingOf,readingSegments} from '@/lib/chapter-reading';
import {referencePresentation} from '@/lib/reference-presentation';
import samples from './fixtures/palace-before.json';
const chart=(id:string)=>{const f=samples.find(f=>f.id===id)!;const c=cast(f.input as BirthInput);if(!c.ok)throw Error(c.message);return c.value;};
const read=(c:Chart)=>palaceNarrative(c,'官祿',2026,palaceReading(c,'官祿',2026)!);
const book=(id:string)=>{const f=samples.find(f=>f.id===id)!;return bookChapters(chart(id),{seed:f.seed,year:2026,solar:f.input.solar,place:f.input.place.label})!;};
it('機梁官祿第二段由本盤空宮借陽巨，解說如何推進事情並接年少建議',()=>{
 const c=chart('C');const p=c.palaces.find(p=>p.name==='官祿')!;
 expect(p.branch).toBe('寅');expect(p.borrowsFrom).toBe('申');expect(p.stars.filter(s=>s.kind==='major')).toEqual([]);
 const opposite=c.palaces.find(p=>p.branch==='申')!;
 expect(opposite.stars.filter(s=>s.kind==='major').map(s=>[s.name,s.sihua??null]).sort()).toEqual([['太陽',null],['巨門',null]]);
 const ch=book('C').find(c=>c.slug==='官祿')!;const row=ch.reading!.segments[1]!;
 expect(row.text).toContain('本盤官祿宮在寅，本宮沒有主星，借對宮申的太陽、巨門作參照');
 expect(row.text).toContain('讓事情有下一步');expect(row.text).toContain('都是理解這個主題的日常角度');
 expect(row.text).not.toMatch(/化忌|必定|你擅長/);
 expect(ch.reading!.segments.at(-1)!.text).toContain('小組討論');
 expect(readingOf(ch.reading,ch.text)).not.toBeNull();
 const marked=markBook([{palace:'官祿',segments:readingSegments(ch.text,ch.slots,ch.reading)}]);
 const refs=citesFor(marked);const panel=referencePresentation(row.referenceConditions!,Object.values(refs),marked[0]!.segments[1]!.referenceFocus);
 expect(panel.directReferences.flatMap(r=>r.quoteParts??[]).map(p=>p.id)).toEqual(['wtz.deep.p528.b008']);
 const text=[...panel.directReferences,...panel.references].flatMap(r=>r.quoteParts??[]).map(p=>p.text).join('');
 for(const term of ['巨门化忌','若太阳化忌','无四煞刑耗诸曜','太阳巨门见化忌不宜从政'])expect(text).toContain(term);
 for(const ref of Object.values(refs))expect(ref.text).toBe(citation(ref.id)!.text);
});
it('對宮陽巨即使改帶化忌，借宮解說亦不將對宮四化當官祿本宮已成立',()=>{
 for(const name of ['太陽','巨門']){
  const c=chart('C');const opposite=c.palaces.find(p=>p.branch==='申')!;
  opposite.stars.find(s=>s.name===name)!.sihua='忌';
  const row=read(c).find(r=>r.statements.some(s=>s.source_ids.includes('career-太陽+巨門-寅申-follow')))!;
  expect(row.text).toContain('借對宮申');expect(row.text).not.toContain('化忌');
  expect(row.referenceConditions!.join('')).toContain('不把對宮的四化、輔煞、廟陷或宮支搬成本宮實坐條件');
 }
 const c=chart('C');const p=c.palaces.find(p=>p.name==='官祿')!;
 const opposite=c.palaces.find(p=>p.branch==='申')!;
 p.stars.push(...structuredClone(opposite.stars.filter(s=>s.kind==='major')));p.borrowsFrom=undefined;
 expect(read(c).map(r=>r.text).join('')).not.toContain('本盤官祿宮在寅，本宮沒有主星');
 expect(read(c).map(r=>r.text).join('')).not.toContain('借到官祿宮');
});
it('天府疾厄兩據的472頁星名及五行疑字逐項註明，原文及條件不改且可轉簡體',()=>{
 const ch=book('A').find(c=>c.slug==='疾厄')!;
 const marked=markBook([{palace:'疾厄',segments:readingSegments(ch.text,ch.slots,ch.reading)}]);
 for(const locale of ['zh-Hant','zh-Hans']){
  const localized=localizeMarked(marked,locale);const refs=citesFor(localized,locale);
  for(const row of localized[0]!.segments.slice(0,2)){
   const ids=[...new Set(row.runs.flatMap(r=>r.cite??[]))];const panel=referencePresentation(row.referenceConditions!,ids.map(id=>refs[id]!),row.referenceFocus);
   const all=[...panel.directReferences,...panel.references].flatMap(r=>r.quoteParts??[]);
   const part=all.find(p=>p.id==='wtz.deep.p472.b005')!;
   expect(part.page).toBe(472);expect(part.text).toContain('太阳属阴火');
   expect(part.note).toContain(locale==='zh-Hant'?'原頁疑字':'原页疑字');expect(part.note).toContain('472');
   expect(part.note).toContain(locale==='zh-Hant'?'星名及五行字樣存疑':'星名及五行字样存疑');
   expect(all.map(p=>p.text).join('')).toContain('若太阴、天机');
  }
  for(const ref of Object.values(refs))expect(ref.text).toBe(citation(ref.id)!.text);
 }
});
