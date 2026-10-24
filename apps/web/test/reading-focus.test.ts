import remaining from '../../../packages/content/src/cards/palace-remaining.json';
import focused from '../../../packages/content/src/cards/palace-focused.json';
import freeSources from '../../../packages/content/src/cards/free-ming-reading.json';
import { expect,it } from 'vitest';
import { cast,type BirthInput } from '@guanwei/ziwei';
import { freeMingReading,citation,palaceNarrative } from '@guanwei/content';
import { bookChapters,citesFor,localizeMarked } from '@/lib/mingshu';
import { markBook } from '@/lib/zhu';
import { readingSegments,readingOf } from '@/lib/chapter-reading';
import { referencePresentation } from '@/lib/reference-presentation';
import samples from './fixtures/palace-before.json';

const fixture=(id:string)=>samples.find(s=>s.id===id)!;
const chart=(id:string)=>{const r=cast(fixture(id).input as BirthInput);if(!r.ok)throw Error(r.message);return r.value;};
const chapters=(id:string)=>{const f=fixture(id);return bookChapters(chart(id),{seed:f.seed,year:2026,solar:f.input.solar,place:f.input.place.label})!;};
const markedChapter=(id:string,p:string)=>{const ch=chapters(id).find(c=>c.slug===p)!;const marked=markBook([{palace:p,segments:readingSegments(ch.text,ch.slots,ch.reading)}]);return {ch,marked,refs:citesFor(marked)};};

it('機梁命宮與骨架交代可確定位置與閱讀主軸，不選明斷尖刻或將化祿當化科化權',()=>{
 const book=chapters('C');
 for(const p of ['命宮','性格的骨架']){
  const ch=book.find(c=>c.slug===p)!;
  expect(ch.text).not.toMatch(/這裡先保留兩者|暫不據此認定|為甚麼這裡先保留未定/);
  expect(ch.text).toMatch(/觀察與判斷怎樣接合|敏感能與天梁的原則配合/);
  expect(ch.reading!.segments.flatMap(s=>s.referenceConditions??[]).join('')).toContain('天梁化祿不等同原文的化科、化權條件');
 }
 const bone=book.find(c=>c.slug==='性格的骨架')!;
 expect(bone.text).toContain('官祿宮沒有主星，借對宮太陽、巨門作參照');
 expect(bone.text).toContain('對宮的文昌、鈴星');
 expect(bone.text).toContain('你現在仍在成長');
 expect(bone.text).not.toMatch(/你(?:必然|就是|屬於)(?:明斷|尖刻)/);
 expect(bone.text).toContain('流化、流煞');
});

it('重寫保留全部原來源、條件與盤面事實；輸入變動會要求重核',()=>{
 const c=chart('C');const raw=freeMingReading(c,2026)!;const before=JSON.stringify([c,raw]);
 for(const [p,rows] of [['命宮',raw.ming],['性格的骨架',raw.bone]] as const){
  const revised=palaceNarrative(c,p,2026,rows);
  const refs=(xs:typeof rows)=>[...new Set(xs.flatMap(s=>s.statements.flatMap(l=>l.citations)))].sort();
  expect(refs(revised)).toEqual(refs(rows));
  const conditions=revised.flatMap(s=>s.referenceConditions??[]);
  for(const row of rows)for(const condition of row.referenceConditions??[])expect(conditions).toContain(condition);
  const facts=revised.flatMap(s=>s.statements.filter(l=>l.kind==='evidence').map(l=>l.text));
  for(const fact of rows.flatMap(s=>s.statements.filter(l=>l.kind==='evidence')))expect(facts).toContain(fact.text);
 }
 expect(JSON.stringify([c,raw])).toBe(before);
 const changed=structuredClone(raw.bone);changed.find(r=>r.statements.some(s=>s.source_ids.includes('JL-B2')))!.statements[0]!.text='不再相同的輸入';
 expect(()=>palaceNarrative(c,'性格的骨架',2026,changed)).toThrow('Reading-focus input changed');
});

it('子女正文談表達才華與相處的差別，建議留具體做法，完整化忌例外仍在',()=>{
 const {ch,refs}=markedChapter('A','子女');const row=ch.reading!.segments.find(r=>r.statements?.some(s=>s.source_ids.includes('children-太陽+巨門-寅申-follow')))!;
 expect(row.text).toContain('要求、分工或做法上已取得共識');
 expect(row.text).not.toMatch(/理由說完|理由說完整/);
 expect(ch.reading!.segments.at(-1)!.text).toContain('先讓對方把理由說完');
 const quote=refs['palace.remaining.v1:children-太陽+巨門']!.text;
 expect(quote).toContain('若巨门化忌');expect(quote).toContain('并不使其本质变坏');
});

it('直接原段置前，全部其他完整原文仍在；火鈴太陰化忌前提不裁短',()=>{
 const {ch,marked,refs}=markedChapter('A','疾厄');
 const row=marked[0]!.segments[1]!;const panel=referencePresentation(row.referenceConditions!,Object.values(refs),row.referenceFocus);
 const direct=panel.directReferences.flatMap(r=>r.quoteParts??[]);
 expect(direct.map(p=>p.id)).toEqual(['wtz.deep.p470.b003','wtz.deep.p470.b004']);
 expect(direct.map(p=>p.text).join('')).toContain('若太阴化忌');
 expect(direct.map(p=>p.text).join('')).toContain('火铃星同度');
 const remaining=panel.references.flatMap(r=>r.quoteParts??[]);
 expect(remaining.some(p=>p.id==='wtz.deep.p472.b010')).toBe(true);
 const original=Object.values(refs).flatMap(r=>r.quoteParts??[]);
 const all=[...direct,...remaining];
 expect(all.map(p=>p.id).sort()).toEqual(original.map(p=>p.id).sort());
 for(const part of all)expect(part.text).toBe(original.find(p=>p.id===part.id)!.text);
 for(const r of Object.values(refs))expect(r.text).toBe(citation(r.id)!.text);
 expect(readingOf(ch.reading,ch.text)).not.toBeNull();
 const invalid=structuredClone(ch.reading)!;invalid.segments[0]!.referenceFocus=[99 as unknown as string];expect(readingOf(invalid,ch.text)).toBeNull();
});

it('跨頁續文整段置前，不把原段裁成半句；繁簡保留同一段ID',()=>{
 const {marked,refs}=markedChapter('C','性格的骨架');
 const row=marked[0]!.segments.find(r=>r.referenceFocus?.includes('wtz.deep.p215.b013'))!;
 const ids=[...new Set(row.runs.flatMap(r=>r.cite??[]))];const panel=referencePresentation(row.referenceConditions!,ids.map(id=>refs[id]!),row.referenceFocus);
 const cross=panel.directReferences.flatMap(r=>r.quoteParts??[]).find(p=>p.blockIds?.includes('wtz.deep.p216.b001'))!;
 expect(cross.text).toContain('便亦须注意这两组星曜的平衡。');
 expect(cross.page).toBe(215);expect(cross.pageEnd).toBe(216);
 expect(localizeMarked(marked,'zh-Hans')[0]!.segments.map(r=>r.referenceFocus)).toEqual(marked[0]!.segments.map(r=>r.referenceFocus));
});

it('福德直接依據採武曲忌已成立的段落，十個獨特原段與疑字註仍完整',()=>{
 const {marked,refs}=markedChapter('A','福德');const row=marked[0]!.segments[1]!;
 const ids=[...new Set(row.runs.flatMap(r=>r.cite??[]))];
 const panel=referencePresentation(row.referenceConditions!,ids.map(id=>refs[id]!),row.referenceFocus);
 const direct=panel.directReferences.flatMap(r=>r.quoteParts??[]);
 expect(direct.map(p=>p.id)).toEqual(['wtz.deep.p571.b003','wtz.deep.p571.b004']);
 expect(direct[0]!.text).toContain('倘更见天月');
 expect(direct[0]!.note).toContain('原頁疑字');
 const all=[...direct,...panel.references.flatMap(r=>r.quoteParts??[])];
 expect(all).toHaveLength(10);expect(new Set(all.map(p=>p.id)).size).toBe(10);
});

it('未知或相似字詞不自動選成直接原段；缺焦點資料時完整引用不變',()=>{
 const refs=[{book:'書',text:'完整原文。',quoteParts:[{id:'p1',page:1,text:'若見甲，且無乙，另論。'}]}];
 const before=structuredClone(refs);const panel=referencePresentation([],refs,['甲','p2']);
 expect(panel.directReferences).toEqual([]);expect(panel.references[0]!.quoteParts).toEqual(refs[0]!.quoteParts);expect(refs).toEqual(before);
 const simple=referencePresentation([],[{book:'書',text:'無段落定位的原文。'}],['p1']);
 expect(simple.directReferences).toEqual([]);expect(simple.references[0]!.text).toBe('無段落定位的原文。');
});

it('所有有完整定位的引用顯示分段後仍逐字完整，不漏字或改原文',()=>{
 const namespaces=[['palace.remaining.v1:',remaining.sources],['palace.focused.v1:',focused.sources],['free.reading.v1:',freeSources.sources]] as const;
 let checked=0;
 for(const [prefix,sources] of namespaces)for(const id of Object.keys(sources)){
  const c=citation(prefix+id);if(!c?.quoteParts)continue;
  const normalize=(text:string)=>text.replace(/[\s…]/g,'');
  expect(normalize(c.quoteParts.map(p=>p.text).join('')),prefix+id).toBe(normalize(c.text));
  checked++;
 }
 expect(checked).toBeGreaterThan(200);
});
