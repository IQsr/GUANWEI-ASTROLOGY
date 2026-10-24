import { expect, it } from 'vitest';
import { cast, type BirthInput, type Chart } from '@guanwei/ziwei';
import { citation, palaceNarrative, palaceReading } from '@guanwei/content';
import { referencePresentation } from '@/lib/reference-presentation';
import { bookChapters, citesFor } from '@/lib/mingshu';
import { markBook } from '@/lib/zhu';
import { readingSegments } from '@/lib/chapter-reading';
import samples from './fixtures/palace-before.json';
import fixtures from '../src/lib/free-ming-preview.json';

const castChart=(input:unknown) => {const c=cast(input as BirthInput);if(!c.ok)throw Error(c.message);return c.value;};
const charts=samples.map((s)=>({id:s.id,chart:castChart(s.input)}));
const chart=(id:string)=>structuredClone(charts.find((c)=>c.id===id)!.chart);
const pOf=(c:Chart,p:string)=>c.palaces.find((q)=>q.name===p)!;
const rows=(c:Chart,p:string)=>palaceNarrative(c,p,2026,palaceReading(c,p,2026)!);
const follow=(c:Chart)=>rows(c,'疾厄').find((r)=>r.statements.some((s)=>s.source_ids.includes('health-天同+太陰-子午-follow')))!;

it('空宮借同陰在正文交代適用範圍，不因對宮化忌或本宮火鈴而採實坐分支',()=>{
  const c=chart('A');
  expect(pOf(c,'疾厄').stars.filter((s)=>s.kind==='major')).toEqual([]);
  const opposite=c.palaces.find((p)=>p.stars.some((s)=>s.name==='太陰'))!;
  opposite.stars.find((s)=>s.name==='太陰')!.sihua='忌';
  pOf(c,'疾厄').stars.push({name:'火星',kind:'aux'});
  const before=JSON.stringify(c);const r=follow(c);
  expect(r.heading).toBe('本盤借同陰，先讀基本取象');
  expect(r.text).toContain('空宮借同陰');
  expect(r.text).toContain('沒有因為借入同陰就同時具備');
  expect(r.text).not.toContain('太陰在本宮化忌');
  expect(r.referenceConditions!.join('')).toContain('對宮配曜及四化不因借星搬入');
  expect(r.referenceConditions!.join('')).toContain('未採某一支，不等於已知身體健康');
  expect(JSON.stringify(c)).toBe(before);
});

it('同陰實坐只按本宮火鈴與太陰化忌逐支交代；三方或對宮不能代替同度',()=>{
  const c=fixtures.map((f)=>castChart(f.input)).find((c)=>{
    const major=pOf(c,'疾厄').stars.filter((s)=>s.kind==='major').map((s)=>s.name);
    return major.includes('天同')&&major.includes('太陰');
  })!;
  expect(c).toBeDefined();
  const p=pOf(c,'疾厄');p.stars=p.stars.filter((s)=>s.name!=='火星'&&s.name!=='鈴星');
  p.stars.find((s)=>s.name==='太陰')!.sihua=undefined;
  expect(follow(c).text).toContain('這張盤未採用這兩支');
  p.stars.push({name:'鈴星',kind:'aux'});
  expect(follow(c).text).toContain('鈴星亦在本宮');
  expect(follow(c).text).toContain('火鈴同度這一支');
  expect(follow(c).text).not.toContain('太陰化忌這一支，則另談');
  p.stars.find((s)=>s.name==='太陰')!.sihua='忌';
  expect(follow(c).text).toContain('太陰化忌這一支，則另談');
  p.stars=p.stars.filter((s)=>s.name!=='鈴星');
  expect(follow(c).text).not.toContain('火鈴同度這一支');
  expect(follow(c).statements.every((s)=>s.kind!=='interpretation')).toBe(true);
});

it('僕役與子女正文直接向讀者解說，原有化忌例外仍在據',()=>{
  const friends=rows(chart('TL'),'僕役').map((r)=>r.text).join('');
  expect(friends).toContain('下屬能幫上忙，卻也容易另謀發展');
  expect(friends).not.toContain('仍保留得力下屬另謀發展的修飾');
  const children=rows(chart('A'),'子女');
  expect(children.map((r)=>r.text).join('')).not.toContain('沒有由化忌就推');
  expect(children.map((r)=>r.text).join('')).toContain('表達才華和相處方式');
  expect(children.flatMap((r)=>r.referenceConditions??[]).join('')).toContain('煞忌刑曜齊集另論');
});

it('福德據只合併相同完整原段，全部十個獨特原段與原頁疑字註完整保留',()=>{
  const s=samples.find((s)=>s.id==='A')!;
  const chapters=bookChapters(chart('A'),{seed:s.seed,year:2026,solar:s.input.solar,place:s.input.place.label})!;
  const chapter=chapters.find((c)=>c.slug==='福德')!;
  const marked=markBook([{palace:chapter.slug,segments:readingSegments(chapter.text,chapter.slots,chapter.reading)}]);
  const sources=citesFor(marked);
  const group=['palace.remaining.v1:wellbeing-武曲+貪狼','palace.remaining.v1:wellbeing-武曲'];
  const refs=group.map((id)=>sources[id]!);const input=structuredClone(refs);
  const panel=referencePresentation([],refs);
  const parts=panel.references.flatMap((r)=>r.quoteParts??[]);
  expect(parts).toHaveLength(10);
  expect(new Set(parts.map((p)=>p.id)).size).toBe(10);
  expect(panel.references[1]!.sharedQuoteCount).toBe(3);
  expect(panel.references.map((r)=>r.id)).toEqual(group);
  const originals=new Map(group.flatMap((id)=>citation(id)!.quoteParts!.map((p)=>[p.id,p] as const)));
  for(const part of parts){expect(part.text).toBe(originals.get(part.id)!.text);expect(part.page).toBe(originals.get(part.id)!.page);}
  const doubt=parts.find((p)=>p.id==='wtz.deep.p571.b003')!;
  expect(doubt.text).toContain('化忌0：');
  expect(doubt.text).toContain('倘更见天月');
  expect(doubt.note).toContain('PDF第571頁亦如此');
  expect(doubt.note).toContain('不用來增加判斷');
  for(const ref of refs)expect(ref.text).toBe(citation(ref.id)!.text);
  expect(refs).toEqual(input);
});

it('不按字詞相似合併不同來源、不同頁碼或不同校讀註',()=>{
  const part={id:'one',page:571,text:'同一句原文，若無煞另論。'};
  const refs=[
    {book:'甲',quoteParts:[part]},
    {book:'乙',quoteParts:[part]},
    {book:'甲',quoteParts:[{...part,id:'two'}]},
    {book:'甲',quoteParts:[{...part,page:572}]},
    {book:'甲',quoteParts:[{...part,note:'原頁疑字。'}]},
  ];
  expect(referencePresentation([],refs).references.flatMap((r)=>r.quoteParts)).toHaveLength(5);
});
