import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {cast} from '@guanwei/ziwei';
import {createBookChapters} from '@/lib/mingshu';
import {LEGAL_VERSION} from '@/lib/legal';
import type {BookDraft} from '@/lib/chengshu';
import samples from './fixtures/palace-before.json';
import randomFive from '../src/lib/random-five-preview.json';
const kept=vi.hoisted(()=>({drafts:[] as BookDraft[]}));
vi.mock('@/lib/chengshu.server',()=>({castQuotaLeft:async()=>null,serverChengshu:()=>({create:async(draft:BookDraft)=>{kept.drafts.push(draft);return 'local-test-book';}})}));
vi.mock('next-intl/server',()=>({getLocale:async()=> 'zh-Hant'}));
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-25T00:00:00Z'));kept.drafts=[];});
afterEach(()=>vi.useRealTimers());

it.each(samples.filter(c=>['TL','A','C'].includes(c.id)))('actual cast action saves the approved $id cross readings and aligned epilogue, not just the preview',async sample=>{
 const {castChart}=await import('@/app/[locale]/cast/actions');
 const result=await castChart({...sample.input,timeBasis:'birthplace',name:'本機整合測試',token:'11111111-1111-4111-8111-111111111111',terms:LEGAL_VERSION});
 expect(result.ok).toBe(true);expect(kept.drafts).toHaveLength(1);
 const draft=kept.drafts[0]!;
 for(const slug of ['命宮','官祿','財帛','福德']){
  const chapter=draft.chapters.find(c=>c.slug===slug)!;
  expect(chapter.reading?.segments.filter(s=>s.statements?.some(l=>l.source_ids.some(id=>id.startsWith('cross.reading.'))))).toHaveLength(2);
 }
 expect(draft.chapters.find(c=>c.slug==='給你的話')?.reading?.writer).toBe('epilogue-reader-v1');
 expect(draft.chapters.every(c=>c.content_version.includes('+cross-palace-production-v1+epilogue-reader-v1'))).toBe(true);
});

it('the public sample uses the same creation pipeline',async()=>{
 const {sampleBook}=await import('@/lib/sample-book');
 const sample=sampleBook()!;
 for(const slug of ['命宮','官祿','財帛','福德'])expect(sample.drafts.find(c=>c.slug===slug)!.reading!.segments.some(s=>s.statements?.some(l=>l.source_ids.some(id=>id.startsWith('cross.reading.'))))).toBe(true);
 expect(sample.drafts.find(c=>c.slug==='給你的話')!.reading?.writer).toBe('epilogue-reader-v1');
});

it('the actual cast/save path preserves the five random book conclusions and references through serialization',async()=>{
 const {castChart}=await import('@/app/[locale]/cast/actions');
 for(const sample of randomFive){
  kept.drafts=[];
  const token='11111111-1111-4111-8111-111111111111';
  expect((await castChart({...sample.input,timeBasis:'birthplace',name:'抽查'+sample.id,token,terms:LEGAL_VERSION})).ok).toBe(true);
  const input={...sample.input,sex:sample.input.sex as 'male'|'female',options:{timeBasis:'birthplace' as const}},chart=cast(input);if(!chart.ok)throw Error(chart.message);
  const expected=createBookChapters(chart.value,{seed:token,year:2026,solar:input.solar,place:input.place.label,birthSex:input.sex,birthInput:input})!;
  const saved=JSON.parse(JSON.stringify(kept.drafts[0]!.chapters));
  for(const chapter of expected){const draft=saved.find((c:{slug:string})=>c.slug===chapter.slug);expect(draft.body).toBe(chapter.text);expect(draft.reading).toEqual(chapter.reading);}
 }
});
