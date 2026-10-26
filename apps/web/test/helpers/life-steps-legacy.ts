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

/** 2026-10-25 reviewed citation removal: 夫妻「這章的閱讀範圍」no longer cites spouse-scope (巨門專段 p396).
 * 《深造講義》夫妻宮篇首只得標題（PDF377），編輯範圍段改為無據；正文一字不改。 */
export const REVIEWED_SPOUSE_SCOPE={
 citation:'palace.focused.v1:spouse-scope',
 scope:'本章保留原書對關係的觀察範圍；支持、相處磨合與環境阻力分開看，不把一項配置換成伴侶品德、婚姻次數或已發生的結局。',
 note:'這段說明原書可以參照哪些生活範圍，不表示每一項情況都已發生在你身上。',
} as const;

type Seg={referenceConditions?:string[];statements?:{citations:string[]}[]};
type Claim={segment:number;statement:number;citationIds:string[];references:{citationId:string;role:string;blockIds:string[]}[]};
/** Put back exactly the three removed pieces, so the historical hash still checks every other field. */
function withHistoricalSpouseScope(chapter:Book[number]):Book[number] {
 const segments=(chapter.reading?.segments??[]) as Seg[];
 const index=segments.findIndex(s=>s.referenceConditions?.some(c=>c.endsWith(REVIEWED_SPOUSE_SCOPE.scope)));
 if(index<0)return chapter;
 const {citation,note}=REVIEWED_SPOUSE_SCOPE;
 const next=structuredClone(chapter),seg=(next.reading!.segments as Seg[])[index]!;
 if(JSON.stringify(seg).includes(citation)||seg.referenceConditions!.includes(note))throw Error('Spouse scope citation still present');
 const at=seg.referenceConditions!.findIndex(c=>c.endsWith(REVIEWED_SPOUSE_SCOPE.scope));
 seg.referenceConditions!.splice(at,0,note);
 const last=seg.statements!.length-1;seg.statements![last]!.citations.push(citation);
 const analysis=next.reading!.analysis as {claims:Claim[]}|undefined;
 if(analysis){
  const claims=analysis.claims.filter(c=>c.segment===index&&c.statement===last);
  if(claims.length!==1)throw Error('Expected one analysis claim for spouse scope');
  claims[0]!.citationIds.push(citation);claims[0]!.references.push({citationId:citation,role:'legacy-unclassified',blockIds:[]});
 }
 return next;
}

/** 2026-10-26 reviewed source swap: 兄弟／子女「這章的閱讀範圍」now cite only the 篇首 passages.
 * The old bundles also quoted 紫微（兄弟）and 紫微／七殺（子女）專段 on every chart. Text is unchanged;
 * only the citation id differs, so the historical form is the same JSON with the old ids put back. */
export const REVIEWED_SCOPE_SWAPS=[
 {from:'palace.remaining.v1:siblings-scope-v2',to:'palace.remaining.v1:siblings-scope'},
 {from:'palace.remaining.v1:children-scope-v2',to:'palace.remaining.v1:children-scope'},
] as const;
function withHistoricalScopeIds<T>(value:T):T {
 let json=JSON.stringify(value);
 if(json===undefined)return value;
 for(const {from,to} of REVIEWED_SCOPE_SWAPS){
  if(json.includes(`"${to}"`))throw Error('Old scope citation still present: '+to);
  json=json.replaceAll(`"${from}"`,`"${to}"`);
 }
 return JSON.parse(json) as T;
}

type ReadingSeg={slot:string;heading?:string;text:string;referenceConditions?:string[];statements:{citations:string[]}[]};
/** Same reviewed removal for a raw 夫妻 palaceReading(): the scope segment had the preceding follow
 * segment's shared conditions plus one editorial note, and cited spouse-scope.
 * Also applies the 兄弟／子女 scope id swap, so it can wrap every palace's reading. */
export function withHistoricalSpouseScopeReading<T>(input:T):T {
 const segments=withHistoricalScopeIds(input);
 const list=segments as unknown as ReadingSeg[]|null;
 const i=list?.findIndex(s=>s.heading==='這章的閱讀範圍'&&s.text.endsWith(REVIEWED_SPOUSE_SCOPE.scope))??-1;
 if(!list||i<0)return segments;
 const seg=list[i]!,prev=list[i-1];
 if(seg.referenceConditions||seg.statements.length!==1||seg.statements[0]!.citations.length||!prev?.referenceConditions)throw Error('Unexpected spouse scope segment');
 const {referenceConditions:_,statements,...head}=seg;
 const restored={...head,referenceConditions:[...prev.referenceConditions,'這段是原書範圍與編輯閱讀說明，不是另一項已成立的個人結果。'],
  statements:[{...statements[0]!,citations:[REVIEWED_SPOUSE_SCOPE.citation]}]};
 return list.map((s,k)=>k===i?restored:s) as unknown as T;
}

/** Restore only historical 十二步 and five individually checked key-sentence deltas.
 * The existing full-book hashes still detect every other field, chapter and ordering change.
 * No expected hash is taken from the current writer.
 */
export function withHistoricalLifeSteps(book:Book,id:string):Book {
 const row=historical.samples.find(s=>s.id===id);if(!row)throw Error('Missing historical book '+id);
 if(book.filter(c=>c.slug==='一生十二步').length!==1)throw Error('Expected exactly one twelve-step chapter');
 return withHistoricalScopeIds(book).map(current=>{
  if(current.slug==='夫妻')return withHistoricalSpouseScope(current);
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
