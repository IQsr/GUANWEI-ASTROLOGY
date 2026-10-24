import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {cast,type BirthInput} from '@guanwei/ziwei';
import {bookChapters} from '@/lib/mingshu';
import {withHistoricalLifeSteps,REVIEWED_KEY_DELTAS} from './helpers/life-steps-legacy';
import historical from './fixtures/life-steps-legacy-base.json';
import baseline from './fixtures/engine-p0-before.json';
import previews from '../src/lib/free-ming-preview.json';
const book=(index:number)=>{const f=previews[index]!,c=cast(f.input as BirthInput);if(!c.ok)throw Error(c.message);return bookChapters(c.value,{seed:f.seed??'sample',year:2026,solar:f.input.solar,place:f.input.place.label})!;};
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

it('keeps all three original snapshot files and every original complete-book hash unchanged',()=>{
 expect(historical.baseCommit).toBe('dac9a0082249aa1ca1dc2604d7b2677d2a0c27d1');
 expect(historical.samples).toHaveLength(75);expect(REVIEWED_KEY_DELTAS).toHaveLength(5);
 for(const [file,sha]of Object.entries(historical.originalFixtureHashes)){
  // Normalize checkout line endings; this verifies immutable JSON content across Windows/Linux.
  const text=readFileSync(new URL('./fixtures/'+file,import.meta.url),'utf8').replace(/\r\n/g,'\n');
  expect(createHash('sha256').update(text).digest('hex'),file).toBe(sha);
 }
});

it('rejects companion changes beyond the six explicitly reviewed key sentences',()=>{
 const original=book(8),frozen=JSON.stringify(original),restored=withHistoricalLifeSteps(original,'preview-8');
 expect(JSON.stringify(original)).toBe(frozen);
 expect(hash(restored)).toBe(baseline.find(b=>b.id==='preview-8')!.book);
 const changed=structuredClone(original);changed.find(c=>c.slug==='這一年')!.text+='未審核內容。';
 expect(()=>withHistoricalLifeSteps(changed,'preview-8')).toThrow('Change exceeds reviewed key sentence');
});

it('does not mask changes in any unrelated chapter or silently accept an unversioned twelve-step chapter',()=>{
 const changed=book(0);changed.find(c=>c.slug==='序')!.text+='未審核內容。';
 expect(hash(withHistoricalLifeSteps(changed,'preview-0'))).not.toBe(baseline.find(b=>b.id==='preview-0')!.book);
 const unversioned=book(0);delete unversioned.find(c=>c.slug==='一生十二步')!.reading;
 expect(()=>withHistoricalLifeSteps(unversioned,'preview-0')).toThrow('Missing versioned twelve-step chapter');
});
