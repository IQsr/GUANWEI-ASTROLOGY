import {isDeepStrictEqual} from 'node:util';
import historical from '../fixtures/life-steps-legacy-base.json';
import type {bookChapters} from '@/lib/mingshu';

type Book=NonNullable<ReturnType<typeof bookChapters>>;
const YEAR_KEY='這一年是你命盤裡的關鍵年份之一，今年的得失，影響會比一般年份深。';
const NEXT_KEY='這也是你命盤裡的關鍵年份。';
const DECADE_KEY='這十年是你命盤裡的關鍵大限之一，這段時期的得失，對你一生影響特別大。';
/** Explicit consequences of the reviewed shared rules; never a whole-book hash refresh. */
export const REVIEWED_KEY_DELTAS=[
 {id:'preview-8',slug:'這一年',source:'wtz.deep.p363.b009',reason:'七殺辰戌：大運流年明列對拱宮垣',edits:[{slot:'結論',append:YEAR_KEY},{slot:'明年',append:NEXT_KEY}]},
 {id:'preview-39',slug:'這一年',source:'wtz.deep.p340.b010+wtz.deep.p341.b001',reason:'太陽子午流年原句疑字及有時借宮分支待核，收起確定關鍵提示',edits:[{slot:'結論',remove:YEAR_KEY}]},
 {id:'preview-40',slug:'這一年',source:'wtz.deep.p351.b002',reason:'天府丑未：大運流年明列原局祿存化祿所在宮垣',edits:[{slot:'結論',append:YEAR_KEY}]},
 {id:'preview-45',slug:'這十年',source:'wtz.deep.p348.b013+wtz.deep.p349.b001',reason:'廉貞寅申跨頁原文待核，收起確定關鍵提示',edits:[{slot:'結論',remove:DECADE_KEY}]},
 {id:'preview-45',slug:'這一年',source:'wtz.deep.p348.b013+wtz.deep.p349.b001',reason:'廉貞寅申流年跨頁重複待核，收起確定關鍵提示',edits:[{slot:'結論',remove:YEAR_KEY}]},
] as const;

/** Restore only historical 十二步 and five individually checked key-sentence deltas.
 * The existing full-book hashes still detect every other field, chapter and ordering change.
 * No expected hash is taken from the current writer.
 */
export function withHistoricalLifeSteps(book:Book,id:string):Book {
 const row=historical.samples.find(s=>s.id===id);if(!row)throw Error('Missing historical book '+id);
 if(book.filter(c=>c.slug==='一生十二步').length!==1)throw Error('Expected exactly one twelve-step chapter');
 return book.map(current=>{
  const old=row.chapters.find(c=>c.slug===current.slug);
  if(current.slug==='一生十二步'){
   if(!old||current.reading?.writer!=='life-steps-reader-v2')throw Error('Missing versioned twelve-step chapter '+id);
   return old;
  }
  const delta=REVIEWED_KEY_DELTAS.find(d=>d.id===id&&d.slug===current.slug);
  if(!delta)return current;
  if(!old)throw Error('Missing historical companion '+id+'/'+current.slug);
  const paragraphs=old.text.split('\n\n');
  for(const edit of delta.edits){
   const index=old.slots.indexOf(edit.slot);if(index<0)throw Error('Missing key-sentence slot');
   const text=paragraphs[index]!;
   if('append' in edit){if(text.includes(edit.append))throw Error('Key sentence already present');paragraphs[index]=text+edit.append;}
   else {if(!text.endsWith(edit.remove))throw Error('Historical key sentence mismatch');paragraphs[index]=text.slice(0,-edit.remove.length);}
  }
  if(!isDeepStrictEqual(current,{...old,text:paragraphs.join('\n\n')}))throw Error('Change exceeds reviewed key sentence '+id+'/'+current.slug);
  return old;
 });
}
