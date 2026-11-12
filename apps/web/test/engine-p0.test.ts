import {analyzeCrossPalaces} from '../../../packages/content/src/engine-p1-cross';
import {analyzeNextBatch} from '../../../packages/content/src/engine-p1b';
import {analyzeFirstBatch} from '../../../packages/content/src/engine-p1a';
import {cast, type BirthInput} from '@guanwei/ziwei';
import {bookChapters} from '../src/lib/mingshu';
import {palaceReading} from '../../../packages/content/src/palace-reader';
import {it,expect} from 'vitest';
import samples from './fixtures/sample-charts.json';

/*
 * 實驗分析（P1a、P1b、四宮）只係讀盤，唔准改到盤、成書或者宮位讀法。
 * 2026-11-12 舊版書刪晒之後，唔再同舊存檔 hash 比；改為同一張盤「分析之前」同「分析之後」逐欄相同。
 * 成書內容本身嘅變化由 book-snapshot.test.ts 嘅快照睇。
 */
const PALACES=['兄弟','夫妻','子女','財帛','疾厄','遷移','僕役','官祿','田宅','福德','父母'];
const charts=(samples as {id:string;input:BirthInput;seed?:string}[]).map(f=>{const r=cast(f.input);if(!r.ok)throw Error(r.message);return {f,chart:r.value};});
const snapshot=({f,chart}:(typeof charts)[number])=>({
  chart:JSON.stringify(chart),
  book:bookChapters(chart,{seed:f.seed??'sample',year:2026,solar:f.input.solar,place:f.input.place.label}),
  palaces:PALACES.map(p=>palaceReading(chart,p,2026)),
});

it.each([
  ['P1a',(c:(typeof charts)[number])=>expect(analyzeFirstBatch(c.chart).facts).toHaveLength(44)],
  ['P1b',(c:(typeof charts)[number])=>expect(analyzeNextBatch(c.chart,{birthSex:c.f.input.sex}).facts).toHaveLength(49)],
  ['four-palace',(c:(typeof charts)[number])=>expect(analyzeCrossPalaces(c.chart,{birthSex:c.f.input.sex}).frames).toHaveLength(4)],
] as const)('Experimental %s analysis leaves each sample chart, book and palace reading unchanged',(_,analyze)=>{
  for(const c of charts){
    const before=snapshot(c);
    analyze(c);
    expect(snapshot(c)).toEqual(before);
  }
},20000);
