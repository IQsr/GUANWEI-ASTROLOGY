import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {cast,type BirthInput} from '@guanwei/ziwei';
import {BookAnalysis,isChapterAnalysis,BOOK_ANALYSIS_VERSION} from '@guanwei/content/analysis-record';
import {evaluatePilotRules,type P1aRule} from '../../../packages/content/src/pilot-analysis';
import {evaluatePalacePredicate} from '../../../packages/content/src/palace-predicate';
import {citation} from '@guanwei/content';
import {createBookChapters,bookChapters,citesFor} from '@/lib/mingshu';
import {alignReviewedChapters,withReadingEpilogue} from '@/lib/epilogue-reading';
import {readingOf,readingSegments} from '@/lib/chapter-reading';
import {chapterDrafts,readingContentVersion} from '@/lib/chengshu';
import {markBook} from '@/lib/zhu';
import {leadsFromBodies} from '@/lib/wenmu';
import {englishChapters} from '@/lib/english';
import {japaneseChapters} from '@/lib/japanese';
import cases from '../../../docs/book-authoring-audit-2026-10-25/case-register.json';
import holdout from './fixtures/authoring-p0-holdout.json';

const options=(sample:typeof cases[number])=>({seed:sample.seed,year:sample.bookYear,solar:sample.input.solar,place:sample.input.place.label,birthSex:sample.input.sex as 'male'|'female'});
const chartOf=(input:unknown)=>{const r=cast(input as BirthInput);if(!r.ok)throw Error(r.message);return r.value;};
const segments=(book:NonNullable<ReturnType<typeof createBookChapters>>)=>book.map(c=>({palace:c.slug,segments:readingSegments(c.text,c.slots,c.reading)}));
const ids=(s:string)=>s?s.split('；'):[];
// Fixed audit CSV is a baseline, not regenerated from the new record implementation.
function csv(text:string){
 text=text.replace(/^\uFEFF/,'');
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i]!;if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(c===','&&!quoted){row.push(field);field='';}else if(c==='\n'&&!quoted){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}else field+=c;}
 if(field||row.length){row.push(field);rows.push(row);}const headers=rows.shift()!;return rows.map(values=>Object.fromEntries(headers.map((h,i)=>[h,values[i]??''])));
}
const matrix=csv(readFileSync(new URL('../../../docs/book-authoring-audit-2026-10-25/palace-matrix.csv',import.meta.url),'utf8'));

it('176 audited books / 144 structures / 1728 palace rows retain exact non-P1 text/references and all international output while saving shared records',()=>{
 let structures=0,palaces=0,native=0,borrowed=0,decisions=0,unknown=0,sourcePending=0;
 for(const sample of cases){
  const chart=chartOf(sample.input),frozen=JSON.stringify(chart),opts=options(sample);
  const previous=withReadingEpilogue(chart,alignReviewedChapters(chart,bookChapters(chart,{...opts,crossPalaceReading:true,separateRuleReferences:true})!));
  const current=createBookChapters(chart,opts)!;
  // Reviewed P1 delta: only these two inputs in the frozen 176-case register meet the new complete cards.
  const changed:Record<string,string[]>={RB:['福德','給你的話'],RC:['命宮','性格的骨架','官祿','給你的話']};
  const unaffected=(book:typeof current)=>book.filter(c=>!changed[sample.id]?.includes(c.slug));
  expect(current.filter((c,i)=>c.text!==previous[i]!.text).map(c=>c.slug),sample.id).toEqual(changed[sample.id]??[]);
  expect(unaffected(current).map(c=>[c.slug,c.title,c.text,c.slots]),sample.id).toEqual(unaffected(previous).map(c=>[c.slug,c.title,c.text,c.slots]));
  const beforeMarked=markBook(segments(unaffected(previous))),afterMarked=markBook(segments(unaffected(current)));
  expect(afterMarked,sample.id).toEqual(beforeMarked);expect(citesFor(afterMarked),sample.id).toEqual(citesFor(beforeMarked));
  expect(englishChapters(current),sample.id).toEqual(englishChapters(previous));expect(japaneseChapters(current),sample.id).toEqual(japaneseChapters(previous));
  expect(leadsFromBodies(unaffected(current).map(c=>({...c,body:c.text}))),sample.id).toEqual(leadsFromBodies(unaffected(previous).map(c=>({...c,body:c.text}))));
  const stored=JSON.parse(JSON.stringify(chapterDrafts(current,readingContentVersion('test'))));
  for(const ch of current){
   const a=ch.reading!.analysis!;expect(isChapterAnalysis(a),`${sample.id}/${ch.slug}`).toBe(true);
   expect(readingOf(stored.find((d:{slug:string})=>d.slug===ch.slug).reading,ch.text)?.analysis).toEqual(a);
   expect(a.chapter.chapter).toBe(ch.slug);expect(new Set(a.facts.map(f=>f.position.star)).size).toBe(a.facts.length);
   expect(a.context.birthSex).toBe(sample.input.sex);expect(a.context.year).toBe(2026);
   for(const d of a.decisions){decisions++;if(d.status==='unknown_input')unknown++;if(d.status==='source_pending')sourcePending++;
    if(d.presentation==='valid_not_written')expect(d.status).toBe('supported');
    if(d.adapter.startsWith('palace.'))expect(d.queryCatalogue).toBe('p0');
   }
   if(ch.slug==='給你的話')expect(a.upstreamFocusIds.length).toBeGreaterThan(0);
   if(ch.slug==='性格的骨架')expect(a.upstreamFocusIds).toEqual(['focus:命宮:selected']);
   if(ch.slug==='一生十二步')expect(ch.reading!.segments.every(s=>s.referenceDisplay==='hidden')).toBe(true);
  }
  if(sample.cohort==='structure-144'){
   structures++;
   for(const row of matrix.filter(r=>r['樣本']===sample.id)){
    palaces++;const ch=current.find(c=>c.slug===row['宮位'])!,a=ch.reading!.analysis!;
    if(row['實坐或借宮']==='borrowed'){borrowed++;
     expect(a.relations.some(r=>r.target.palace===ch.slug&&r.status==='supported')).toBe(true);
     expect(a.decisions.filter(d=>d.adapter.startsWith('palace.')&&d.kind==='condition').every(d=>d.status==='out_of_scope')).toBe(true);
    }else native++;
    if(ch.slug==='命宮')continue;
    const recorded=a.decisions.filter(d=>d.adapter.startsWith('palace.')&&d.kind==='condition');
    expect(recorded.filter(d=>d.status==='supported').map(d=>d.ruleId).sort(),`${sample.id}/${ch.slug}`).toEqual(ids(row['實際命中規則']!).sort());
    expect(recorded.filter(d=>d.presentation==='selected').map(d=>d.ruleId).sort()).toEqual(ids(row['原閱讀器選中規則']!).sort());
    expect(recorded.filter(d=>d.status==='not_supported').map(d=>d.ruleId).sort()).toEqual(ids(row['候選未符合規則ID']!).sort());
   }
  }
  expect(JSON.stringify(chart)).toBe(frozen);
 }
 expect(structures).toBe(144);expect(palaces).toBe(1728);expect(native).toBe(1440);expect(borrowed).toBe(288);
 expect(decisions).toBeGreaterThan(1000);expect(sourcePending).toBeGreaterThan(0);
 console.log(JSON.stringify({P0:{books:cases.length,structures,palaces,native,borrowed,decisionSnapshots:decisions,unknown,sourcePending,visibleDifferences:6}}));
},180000);

it('a separately frozen 16-input holdout uses no sample IDs or special prose overrides',()=>{
 for(const sample of holdout){
  const chart=chartOf(sample.input),opts={...sample,year:2026,solar:sample.input.solar,place:sample.input.place.label,birthSex:sample.input.sex as 'male'|'female',birthInput:sample.input as BirthInput};
  const book=createBookChapters(chart,opts)!;expect(book).toHaveLength(19);
  for(const ch of book)expect(readingOf(JSON.parse(JSON.stringify(ch.reading)),ch.text)).not.toBeNull();
  expect(book[0]!.reading!.analysis!.context.birth.provenance).toBe('explicit-input');
 }
},30000);

it('same native facts keep one ID across chapters and borrowed references keep origin major IDs, hua and helpers in place',()=>{
 const sample=cases.find(c=>c.id==='TF')!,chart=chartOf(sample.input),book=createBookChapters(chart,options(sample))!;
 const seen=new Map<string,string>();
 for(const ch of book)for(const f of ch.reading!.analysis!.facts){const old=seen.get(f.position.star);if(old)expect(f.id).toBe(old);seen.set(f.position.star,f.id);}
 const wealth=book.find(c=>c.slug==='財帛')!.reading!.analysis!,ref=wealth.relations.find(r=>r.target.palace==='財帛')!;
 expect(ref.status).toBe('supported');expect(ref.origin!.palace).toBe('福德');
 for(const id of ref.majorFactIds){const f=wealth.facts.find(f=>f.id===id)!;expect(f.position.status).toBe('available');if(f.position.status==='available')expect(f.position.palace).toBe(ref.origin!.palace);}
 expect(wealth.facts.some(f=>f.position.status==='available'&&f.position.star==='武曲'&&f.position.palace==='財帛')).toBe(false);
});

it('a false prerequisite, missing placement and native-only borrowed card have distinct verdicts; no opposite conclusion is manufactured',()=>{
 const sample=cases.find(c=>c.id==='TF')!,chart=chartOf(sample.input),opts=options(sample),p=chart.palaces.find(p=>p.name==='命宮')!;
 const condition={op:'has',scope:'own',names:['左輔']};
 const positive=evaluatePalacePredicate(condition,chart,p);expect(positive.status).toBe('matched');
 const moved=structuredClone(chart);const current=moved.palaces.find(p=>p.name==='命宮')!;const star=current.stars.find(s=>s.name==='左輔')!;
 current.stars=current.stars.filter(s=>s.name!=='左輔');moved.palaces.find(p=>p.name==='官祿')!.stars.push(star);
 expect(evaluatePalacePredicate(condition,moved,current).status).toBe('unmatched');
 const missing=structuredClone(chart);for(const palace of missing.palaces)palace.stars=palace.stars.filter(s=>s.name!=='左輔');
 expect(evaluatePalacePredicate(condition,missing,missing.palaces.find(p=>p.name==='命宮')!).status).toBe('not_applicable');
 const ledger=new BookAnalysis(chart,opts);
 const rules=Array.from({length:3},(_,i)=>({rule:{id:`retained-${i}`,when:condition,sources:[],conditions:['Only native same-palace; trine does not substitute.']},evaluated:positive,selected:i<2}));
 ledger.palace({palace:'命宮',profile:{id:'native-profile',sources:[],conditions:[]},borrowed:false,namespace:'test',rules});
 expect(ledger.decisions.filter(d=>d.status==='supported'&&d.kind==='condition')).toHaveLength(3);
 expect(ledger.decisions.find(d=>d.ruleId==='retained-2')?.presentation).toBe('valid_not_written');
 const borrowed=new BookAnalysis(chart,opts);borrowed.palace({palace:'財帛',profile:{id:'borrow-profile',sources:[],conditions:[]},borrowed:true,namespace:'test',rules:rules.map(r=>({...r,evaluated:undefined,selected:false}))});
 expect(borrowed.decisions.filter(d=>d.kind==='condition').every(d=>d.status==='out_of_scope')).toBe(true);
});

it('manual/source gates, missing birth sex, not-enabled catalogue and annual input preserve different unknown causes',()=>{
 const sample=cases.find(c=>c.id==='JL')!,chart=chartOf(sample.input),opts=options(sample),base={groups:['jiliang'],title:'test',when:{star:'天機',in:{name:'命宮'}},sources:[],conditions:['natal only'],exceptions:['do not infer the opposite'],explanation:'test'};
 const rules:P1aRule[]=[{...base,id:'positive'},{...base,id:'manual',gates:[{kind:'manual',id:'needs-source-definition',description:'source definition pending'}]},
  {...base,id:'missing-sex',when:{star:'天傷',in:{name:'命宮'}}},{...base,id:'annual-missing',when:{star:'天機',hua:'祿',layer:'annual'}}] as P1aRule[];
 const ledger=new BookAnalysis(chart,{...opts,birthSex:undefined});
 const results=evaluatePilotRules(chart,rules,{catalogue:'p1b'},'test');
 for(const r of results)ledger.pilot(r,['命宮'],rules.find(q=>q.id===r.id)!.when);
 expect(ledger.decisions.find(d=>d.id==='positive')!.status).toBe('supported');
 expect(ledger.decisions.find(d=>d.id==='manual')!.status).toBe('source_pending');
 expect(ledger.decisions.find(d=>d.id==='missing-sex')!.status).toBe('unknown_input');
 expect(ledger.decisions.find(d=>d.id==='annual-missing')!.status).toBe('unknown_input');
 expect(ledger.facts.find(f=>f.position.star==='天傷')!.position).toMatchObject({status:'unknown',code:'missing-input'});
 expect(evaluatePalacePredicate({op:'has',scope:'own',names:['陰煞']},chart,chart.palaces.find(p=>p.name==='命宮')!).status).toBe('not_applicable');
 expect(ledger.context.tables.brightness.originalBookTable).toBe('not-collated');expect(ledger.context.tables.dayNight.status).toBe('not-implemented');
});

it('snapshot graph rejects tampered status, IDs and statement source links, and leaves old snapshots alone',()=>{
 const sample=cases.find(c=>c.id==='TF')!,book=createBookChapters(chartOf(sample.input),options(sample))!,ch=book.find(c=>c.slug==='命宮')!;
 const original=JSON.parse(JSON.stringify(ch.reading));expect(readingOf(original,ch.text)).not.toBeNull();
 for(const mutate of [
  (r:typeof original)=>r.analysis.version='future',
  (r:typeof original)=>r.analysis.claims[0].decisionIds.push('unresolved'),
  (r:typeof original)=>r.analysis.facts.push(r.analysis.facts[0]),
  (r:typeof original)=>r.analysis.claims[0].citationIds.push('wrong-source'),
  (r:typeof original)=>{r.analysis.decisions[0].status='not_supported';r.analysis.decisions[0].presentation='valid_not_written';},
 ]){const r=structuredClone(original);mutate(r);expect(readingOf(r,ch.text)).toBeNull();}
 const {analysis,...old}=original;expect(analysis.version).toBe(BOOK_ANALYSIS_VERSION);expect(readingOf(old,ch.text)).toEqual(old);
 expect(readingOf(old,ch.text)?.analysis).toBeUndefined();
 for(const chapter of book)for(const statement of chapter.reading!.segments.flatMap(s=>s.statements??[]))for(const id of statement.citations)expect(citation(id)).not.toBeNull();
});
