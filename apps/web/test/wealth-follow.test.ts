import { expect,it } from 'vitest';
import {cast,type BirthInput,type Chart} from '@guanwei/ziwei';
import {palaceReading,palaceNarrative,citation} from '@guanwei/content';
import {bookChapters,citesFor,localizeMarked} from '@/lib/mingshu';
import {markBook} from '@/lib/zhu';
import {readingSegments,readingOf} from '@/lib/chapter-reading';
import {referencePresentation} from '@/lib/reference-presentation';
import samples from './fixtures/palace-before.json';
const chart=(id:string)=>{const f=samples.find(f=>f.id===id)!;const c=cast(f.input as BirthInput);if(!c.ok)throw Error(c.message);return c.value;};
const read=(c:Chart,p:string)=>palaceNarrative(c,p,2026,palaceReading(c,p,2026)!);
const book=(id:string)=>{const f=samples.find(f=>f.id===id)!;return bookChapters(chart(id),{seed:f.seed,year:2026,solar:f.input.solar,place:f.input.place.label})!;};
it('機梁財帛第二段連起本盤無同陰四化、求財主題與生活餘額；年少建議相接',()=>{
 const ch=book('C').find(c=>c.slug==='財帛')!;
 const follow=ch.reading!.segments[1]!;
 expect(follow.text).toContain('本盤財帛宮在午，天同、太陰實坐');
 expect(follow.text).toContain('兩星本身都沒有本命四化');
 expect(follow.text).toContain('原書把子午同陰列為天同守財帛時較利財源的一組');
 expect(follow.text).toContain('已經有用途的錢');expect(follow.text).toContain('手上餘額仍未必同步增加');
 expect(ch.reading!.segments.at(-1)!.text).toContain('零用錢');
 expect(follow.referenceConditions!.join('')).toContain('無這兩星本命四化，不代表財源固定');
 const marked=markBook([{palace:'財帛',segments:readingSegments(ch.text,ch.slots,ch.reading)}]);
 const refs=citesFor(marked);const row=marked[0]!.segments[1]!;
 const panel=referencePresentation(row.referenceConditions!,Object.values(refs),row.referenceFocus);
 expect(panel.directReferences.flatMap(r=>r.quoteParts??[]).map(p=>p.id)).toEqual(['wtz.deep.p445.b012']);
 const all=[...panel.directReferences,...panel.references].flatMap(r=>r.quoteParts??[]).map(p=>p.text).join('');
 for(const text of ['太阴化权','天同化忌','唯太阴化禄者不是','与擎羊同度'])expect(all).toContain(text);
});
it('本宮同陰帶祿權忌或只借同陰，不沿用兩星無四化的個人解說',()=>{
 for(const hua of ['祿','權','忌'] as const){
  const c=chart('C');c.palaces.find(p=>p.name==='財帛')!.stars.find(s=>s.name==='太陰')!.sihua=hua;
  expect(read(c,'財帛').map(r=>r.text).join('')).not.toContain('兩星本身都沒有本命四化');
 }
 const c=chart('C');const p=c.palaces.find(p=>p.name==='財帛')!;
 const opposite=c.palaces.find(q=>q.branch==='子')!;
 opposite.stars.push(...p.stars.filter(s=>s.kind==='major'));p.stars=p.stars.filter(s=>s.kind!=='major');p.borrowsFrom='子';
 expect(read(c,'財帛').map(r=>r.text).join('')).not.toContain('兩星本身都沒有本命四化');
});
it('紫破僕役正文說明助力持續與相處分別，交接做法只留給建議',()=>{
 const ch=book('TL').find(c=>c.slug==='僕役')!;const rows=ch.reading!.segments;
 expect(rows[0]!.text).toContain('當下得到的助力');
 expect(rows[1]!.text).toContain('原先有人分擔的事');expect(rows[1]!.text).toContain('相處仍然融洽');
 expect(rows.slice(0,2).map(r=>r.text).join('')).not.toMatch(/知識、分工|交接/);
 expect(rows.at(-1)!.text).toContain('約好交接方式');
});
it('福德疾厄每個長據都有本盤適用摘要，快照、標記及簡體保存；完整原文不變',()=>{
 for(const palace of ['福德','疾厄']){
  const ch=book('A').find(c=>c.slug===palace)!;
  expect(readingOf(ch.reading,ch.text)).not.toBeNull();
  const marked=markBook([{palace,segments:readingSegments(ch.text,ch.slots,ch.reading)}]);
  for(const row of marked[0]!.segments.slice(0,2)){
   expect(row.referenceApplicability).toHaveLength(1);
   expect(row.referenceApplicability![0]).toContain(palace==='福德'?'武曲在本宮化忌':'對宮的配曜與四化不搬入本宮');
  }
  const hans=localizeMarked(marked,'zh-Hans');
  expect(hans[0]!.segments[0]!.referenceApplicability![0]).toContain(palace==='福德'?'武曲在本宫化忌':'对宫的配曜与四化不搬入本宫');
  for(const ref of Object.values(citesFor(marked)))expect(ref.text).toBe(citation(ref.id)!.text);
  const invalid=structuredClone(ch.reading)!;invalid.segments[0]!.referenceApplicability=[99 as unknown as string];expect(readingOf(invalid,ch.text)).toBeNull();
 }
});
it('福德無本宮武忌不聲稱已符合；疾厄實坐火鈴及太陰化忌與借星分開',()=>{
 const c=chart('A');c.palaces.find(p=>p.name==='福德')!.stars.find(s=>s.name==='武曲')!.sihua=undefined;
 expect(read(c,'福德').flatMap(r=>r.referenceApplicability??[])).toEqual([]);
 const native=chart('A');const p=native.palaces.find(p=>p.name==='疾厄')!;
 const opposite=native.palaces.find(q=>q.branch===p.borrowsFrom)!;
 p.stars.push(...structuredClone(opposite.stars.filter(s=>s.kind==='major')));p.borrowsFrom=undefined;
 p.stars.find(s=>s.name==='太陰')!.sihua='忌';
 const fire=native.palaces.flatMap(p=>p.stars).find(s=>s.name==='火星')!;p.stars.push(structuredClone(fire));
 const leads=read(native,'疾厄').flatMap(r=>r.referenceApplicability??[]);
 expect(leads).toHaveLength(2);
 for(const text of leads){expect(text).toContain('火星同宮');expect(text).toContain('太陰在本宮化忌');expect(text).not.toContain('空宮借同陰');}
});
