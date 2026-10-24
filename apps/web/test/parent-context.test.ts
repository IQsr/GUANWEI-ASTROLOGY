import { expect,it } from 'vitest';
import { cast,type BirthInput,type Chart } from '@guanwei/ziwei';
import { citation,palaceReading,palaceNarrative } from '@guanwei/content';
import { bookChapters,citesFor } from '@/lib/mingshu';
import { markBook } from '@/lib/zhu';
import { readingSegments } from '@/lib/chapter-reading';
import samples from './fixtures/palace-before.json';

const fixture=samples.find(s=>s.id==='A')!;
const chart=()=>{const c=cast(fixture.input as BirthInput);if(!c.ok)throw Error(c.message);return c.value;};
const parent=(c:Chart)=>c.palaces.find(p=>p.name==='父母')!;
const read=(c:Chart)=>palaceNarrative(c,'父母',2026,palaceReading(c,'父母',2026)!);
const target=(c:Chart)=>read(c).find(r=>r.statements.some(s=>s.source_ids.includes('parents-天同+太陰-子午-follow')))!;

it('天府父母第二段列實際同宮、主星四化與分歧重點，不把天梁祿套成同陰吉化或見兩煞當煞重',()=>{
 const c=chart();const before=JSON.stringify(c);const row=target(c);
 expect(parent(c).stars.filter(s=>s.kind==='major').every(s=>!s.sihua)).toBe(true);
 expect(row.heading).toBe('有感情，仍要談清彼此的要求');
 expect(row.text).toContain('天同、太陰與擎羊、火星同宮');
 expect(row.text).toContain('天同、太陰本身都沒有本命四化');
 expect(row.text).toContain('是否認同你的決定');
 expect(row.text).toContain('責任、生活安排或重要選擇');
 expect(row.referenceConditions!.join('')).toContain('三方天梁化祿不改寫成天同、太陰本身吉化');
 expect(row.referenceConditions!.join('')).toContain('不把見兩煞直接等同煞重');
 expect(row.text).not.toMatch(/煞重|父母不全|必然|正文|本輪|要一起核/);
 expect(row.statements.filter(s=>s.kind==='evidence')).toHaveLength(1);
 expect(row.statements.filter(s=>s.kind!=='evidence')).toHaveLength(1);
 expect(JSON.stringify(c)).toBe(before);
});

it('羊火須同宮且同陰實坐、無四化；移位、借星與化忌不能誤套本盤句',()=>{
 for(const change of ['fire','goat','hua','borrowed']) {
  const c=chart();const p=parent(c);
  if(change==='fire'||change==='goat'){
   const name=change==='fire'?'火星':'擎羊';const moved=p.stars.find(s=>s.name===name)!;
   p.stars=p.stars.filter(s=>s.name!==name);c.palaces.find(q=>q.branch==='辰')!.stars.push(moved);
  } else if(change==='hua')p.stars.find(s=>s.name==='太陰')!.sihua='忌';
  else {const majors=p.stars.filter(s=>s.kind==='major');p.stars=p.stars.filter(s=>s.kind!=='major');c.palaces.find(q=>q.branch==='午')!.stars.push(...majors);p.borrowsFrom='午';}
  expect(read(c).map(r=>r.text).join(''),change).not.toContain('天同、太陰與擎羊、火星同宮；天同、太陰本身都沒有本命四化');
 }
});

it('新正文接既有成人與少年建議，來源原文與原條件均保留',()=>{
 const c=chart();const raw=palaceReading(c,'父母',2026)!;const beforeCites=[...new Set(raw.flatMap(r=>r.statements.flatMap(s=>s.citations)))].sort();
 for(const year of [2026,2007]){
  const book=bookChapters(c,{seed:fixture.seed,year,solar:fixture.input.solar,place:fixture.input.place.label})!;
  const chapter=book.find(c=>c.slug==='父母')!;
  const marked=markBook([{palace:chapter.slug,segments:readingSegments(chapter.text,chapter.slots,chapter.reading)}]);
  const refs=citesFor(marked);expect(Object.keys(refs).sort()).toEqual(beforeCites);
  for(const [id,ref] of Object.entries(refs)){expect(ref.text).toBe(citation(id)!.text);expect(ref.page).toBe(citation(id)!.page);}
  const advice=chapter.reading!.segments.at(-1)!;
  expect(advice.text).toContain('一次');expect(advice.text).toMatch(/要求|需要/);
 }
 const conditions=read(c).flatMap(r=>r.referenceConditions??[]);
 for(const row of raw)for(const condition of row.referenceConditions??[])expect(conditions).toContain(condition);
 const quote=citation('palace.remaining.v1:parents-天同+太陰')!.text;
 expect(quote).toContain('吉化而煞重者，仍主不和');expect(quote).toContain('最不喜太阴化忌');
});
