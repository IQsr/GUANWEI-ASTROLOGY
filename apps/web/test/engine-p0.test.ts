import {analyzeCrossPalaces} from '../../../packages/content/src/engine-p1-cross';
import {analyzeNextBatch} from '../../../packages/content/src/engine-p1b';
import {analyzeFirstBatch} from '../../../packages/content/src/engine-p1a';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {cast, type BirthInput} from '@guanwei/ziwei';
import {bookChapters} from '../src/lib/mingshu';
import {palaceReading} from '../../../packages/content/src/palace-reader';

import {it,expect} from 'vitest';
import baseline from './fixtures/engine-p0-before.json';
type SnapshotFixture={id?:string;input:BirthInput;seed?:string};
const readFixtures=(url:URL)=>JSON.parse(readFileSync(url,'utf8')) as SnapshotFixture[];
it('P0 preserves all 75 chart, palace-reader and complete book snapshots',()=>{
const root=new URL('../../../',import.meta.url);
const samples=readFixtures(new URL('apps/web/src/lib/free-ming-preview.json',root));
const examples=readFixtures(new URL('apps/web/test/fixtures/palace-before.json',root)).filter((s)=>['TL','A','C'].includes(s.id??''));
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const result=[...samples,...examples].map((f,i)=>{const c=cast(f.input);if(!c.ok)throw Error(c.message);return {id:i<samples.length?'preview-'+i:f.id,chart:hash(JSON.stringify(c.value)),book:hash(JSON.stringify(bookChapters(c.value,{seed:f.seed??'sample',year:2026,solar:f.input.solar,place:f.input.place.label}))),palaces:hash(JSON.stringify(['兄弟','夫妻','子女','財帛','疾厄','遷移','僕役','官祿','田宅','福德','父母'].map(p=>palaceReading(c.value,p,2026))))};});
expect(result).toEqual(baseline);
},20000);

it('Experimental P1a analysis leaves each sample book and palace reading unchanged',()=>{
  const root=new URL('../../../',import.meta.url);
  const fixtures=readFixtures(new URL('apps/web/test/fixtures/palace-before.json',root)).filter((f)=>['TL','A','C'].includes(f.id??''));
  const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
  for(const f of fixtures){
    const r=cast(f.input);if(!r.ok)throw Error(r.message);const chart=r.value;
    expect(analyzeFirstBatch(chart).facts).toHaveLength(44);
    const expected=baseline.find((b)=>b.id===f.id)!;
    expect(hash(JSON.stringify(chart))).toBe(expected.chart);
    expect(hash(JSON.stringify(bookChapters(chart,{seed:f.seed??'sample',year:2026,solar:f.input.solar,place:f.input.place.label})))).toBe(expected.book);
    expect(hash(JSON.stringify(['兄弟','夫妻','子女','財帛','疾厄','遷移','僕役','官祿','田宅','福德','父母'].map(p=>palaceReading(chart,p,2026))))).toBe(expected.palaces);
  }
},20000);

it('Experimental P1b analysis leaves each sample book and palace reading unchanged',()=>{
  const root=new URL('../../../',import.meta.url);
  const fixtures=readFixtures(new URL('apps/web/test/fixtures/palace-before.json',root)).filter((f)=>['TL','A','C'].includes(f.id??''));
  const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
  for(const f of fixtures){
    const r=cast(f.input);if(!r.ok)throw Error(r.message);const chart=r.value;
    expect(analyzeNextBatch(chart,{birthSex:f.input.sex}).facts).toHaveLength(49);
    const expected=baseline.find((b)=>b.id===f.id)!;
    expect(hash(JSON.stringify(chart))).toBe(expected.chart);
    expect(hash(JSON.stringify(bookChapters(chart,{seed:f.seed??'sample',year:2026,solar:f.input.solar,place:f.input.place.label})))).toBe(expected.book);
    expect(hash(JSON.stringify(['兄弟','夫妻','子女','財帛','疾厄','遷移','僕役','官祿','田宅','福德','父母'].map(p=>palaceReading(chart,p,2026))))).toBe(expected.palaces);
  }
},20000);

it('Experimental four-palace analysis leaves sample chart, book and palace reading unchanged',()=>{
  const root=new URL('../../../',import.meta.url);
  const fixtures=readFixtures(new URL('apps/web/test/fixtures/palace-before.json',root)).filter((f)=>['TL','A','C'].includes(f.id??''));
  const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
  for(const f of fixtures){
    const r=cast(f.input);if(!r.ok)throw Error(r.message);const chart=r.value;
    expect(analyzeCrossPalaces(chart,{birthSex:f.input.sex}).frames).toHaveLength(4);
    const expected=baseline.find((b)=>b.id===f.id)!;
    expect(hash(JSON.stringify(chart))).toBe(expected.chart);
    expect(hash(JSON.stringify(bookChapters(chart,{seed:f.seed??'sample',year:2026,solar:f.input.solar,place:f.input.place.label})))).toBe(expected.book);
    expect(hash(JSON.stringify(['兄弟','夫妻','子女','財帛','疾厄','遷移','僕役','官祿','田宅','福德','父母'].map(p=>palaceReading(chart,p,2026))))).toBe(expected.palaces);
  }
},20000);
