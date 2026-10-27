import {it,expect} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {cast,type BirthInput,type Chart} from '@guanwei/ziwei';
import {BookAnalysis,collectBookP1Decisions,LIAN_KEWEN,TONG_JI,BOOK_P1_CARDS,isChapterAnalysis} from '@guanwei/content/analysis-record';
import {citation} from '@guanwei/content';
import {createBookChapters,bookChapters,citesFor} from '@/lib/mingshu';
import {alignReviewedChapters,withReadingEpilogue} from '@/lib/epilogue-reading';
import {readingOf,readingSegments} from '@/lib/chapter-reading';
import {englishChapters} from '@/lib/english';
import {japaneseChapters} from '@/lib/japanese';
import {markBook} from '@/lib/zhu';
import {paragraphCitations} from '@/lib/paragraph-citations';
import {referencePresentation} from '@/lib/reference-presentation';
import cases from '../../../docs/book-authoring-audit-2026-10-25/case-register.json';
import holdout from './fixtures/authoring-p0-holdout.json';
const get=(id:string)=>{const s=cases.find(s=>s.id===id)!;const r=cast(s.input as BirthInput);if(!r.ok)throw Error(r.message);return {s,chart:r.value,opts:{seed:s.seed,year:2026,solar:s.input.solar,place:s.input.place.label,birthSex:s.input.sex as 'male'|'female',birthInput:s.input as BirthInput}};};
const decide=(chart:Chart)=>collectBookP1Decisions(new BookAnalysis(chart,{year:2026,solar:{y:1986,m:8,d:26},place:'測試',birthSex:'male'}));
const verdict=(chart:Chart,id:string)=>decide(chart).find(d=>d.id===id)!;
function move(chart:Chart,star:string,to:string){const p=chart.palaces.find(p=>p.stars.some(s=>s.name===star))!,s=p.stars.find(s=>s.name===star)!;p.stars=p.stars.filter(placement=>placement!==s);chart.palaces.find(p=>p.name===to)!.stars.push(s);}
function swapHua(chart:Chart,a:string,b:string){const stars=chart.palaces.flatMap(p=>p.stars),x=stars.find(s=>s.name===a)!,y=stars.find(s=>s.name===b)!;[x.sihua,y.sihua]=[y.sihua,x.sihua];}

it('two reviewed cards produce native natal decisions and retain every modifier, exception and source',()=>{
 for(const [sample,id] of [['RB',LIAN_KEWEN],['RC',TONG_JI]]){
  const {chart}=get(sample!),before=JSON.stringify(chart),d=verdict(chart,id!);
  expect(d.status).toBe('supported');expect(d.presentation).toBe('valid_not_written');expect(d.timeLayers).toEqual(['natal']);expect(d.coverage).toBe('executable');
  expect(d.conditions).toEqual(BOOK_P1_CARDS.find(c=>c.id===id)!.conditions);expect(d.exceptions).toEqual(BOOK_P1_CARDS.find(c=>c.id===id)!.exceptions);
  for(const source of d.sourceIds)expect(citation(source)).not.toBeNull();expect(JSON.stringify(chart)).toBe(before);
 }
 expect(verdict(get('RB').chart,LIAN_KEWEN).qualifiers.join('')).toContain('不能隨遇而安');
 expect(verdict(get('RC').chart,TONG_JI).exceptions.join('')).toContain('經行');
});

it('廉忌科文: opposite/trine, absent hua, different 科 star and borrowed origin cannot select the subset; missing input is unknown',()=>{
 for(const to of ['財帛','官祿']){const {chart}=get('RB');move(chart,'文昌',to);expect(verdict(chart,LIAN_KEWEN).status).toBe('not_supported');}
 for(const pair of [['廉貞','天同'],['文昌','天機']]){const {chart}=get('RB');swapHua(chart,pair[0]!,pair[1]!);expect(verdict(chart,LIAN_KEWEN).status).toBe('not_supported');}
 const missing=get('RB').chart;for(const p of missing.palaces)p.stars=p.stars.filter(s=>s.name!=='文昌');expect(verdict(missing,LIAN_KEWEN).status).toBe('unknown_input');
 const borrowed=get('RB').chart;move(borrowed,'廉貞','財帛');borrowed.palaces.find(p=>p.name==='福德')!.borrowsFrom=borrowed.palaces.find(p=>p.name==='財帛')!.branch;expect(verdict(borrowed,LIAN_KEWEN).status).not.toBe('supported');
 const conflict=get('RB').chart;conflict.palaces.find(p=>p.name==='福德')!.borrowsFrom=conflict.palaces.find(p=>p.name==='財帛')!.branch;expect(verdict(conflict,LIAN_KEWEN).status).toBe('unknown_input');
 const other=get('RB').chart;swapHua(other,'文昌','天機');expect(verdict(other,LIAN_KEWEN).qualifiers.join('')).toContain('不等於確認沒有其他科文');
});

it('同祿機權: 同權 is another branch, career origin matters, incomplete hua is unknown, no annual data is invented',()=>{
 const wrong=get('RC').chart;swapHua(wrong,'天同','天機');expect(verdict(wrong,TONG_JI).status).toBe('not_supported');
 const origin=get('RC').chart;move(origin,'天機','夫妻');expect(verdict(origin,TONG_JI).status).toBe('not_supported');
 const absent=get('RC').chart;delete absent.palaces.flatMap(p=>p.stars).find(s=>s.name==='天同')!.sihua;expect(verdict(absent,TONG_JI).status).toBe('unknown_input');
 const missing=get('RC').chart;for(const p of missing.palaces)p.stars=p.stars.filter(s=>s.name!=='天機');expect(verdict(missing,TONG_JI).status).toBe('unknown_input');
 const borrow=get('RC').chart;move(borrow,'天同','遷移');borrow.palaces.find(p=>p.name==='命宮')!.borrowsFrom=borrow.palaces.find(p=>p.name==='遷移')!.branch;expect(verdict(borrow,TONG_JI).status).not.toBe('supported');
 expect(verdict(get('RC').chart,TONG_JI).timeLayers).toEqual(['natal']);
});

it('body, advice, bone and ending save explicit links to the very same supported decision, with one 据 per sourced paragraph',()=>{
 for(const [sample,id,names] of [['RB',LIAN_KEWEN,['福德','給你的話']],['RC',TONG_JI,['命宮','性格的骨架','官祿','給你的話']]] as const){
  const {chart,opts}=get(sample),book=createBookChapters(chart,opts)!;
  for(const name of names){
   const ch=book.find(c=>c.slug===name)!,r=readingOf(JSON.parse(JSON.stringify(ch.reading)),ch.text)!;expect(r,name).not.toBeNull();expect(isChapterAnalysis(r.analysis)).toBe(true);
   const linked=r.segments.map((s,i)=>({s,i})).filter(({s})=>s.analysisLinks?.decisionIds.includes(id));expect(linked.length).toBeGreaterThan(0);
   for(const {s,i} of linked){
    const claims=r.analysis!.claims.filter(c=>c.segment===i);expect(claims.every(c=>JSON.stringify(c.decisionIds)===JSON.stringify(s.analysisLinks!.decisionIds)&&c.decisionIds.includes(id))).toBe(true);
    for(const linkedId of s.analysisLinks!.decisionIds)expect(r.analysis!.decisions.find(d=>d.id===linkedId)?.status).toBe('supported');
    expect(r.analysis!.decisions.find(d=>d.id===id)?.status).toBe('supported');
    const advice=s.statements?.some(l=>l.kind==='editorial-advice');
    if(advice){expect(claims.every(c=>c.role==='editorial')).toBe(true);expect(s.statements!.every(l=>!l.citations.length)).toBe(true);continue;}
    const marked=markBook([{palace:name,segments:[s]}]),notes=citesFor(marked),bundle=paragraphCitations(marked[0]!.segments[0]!.runs);
    expect(bundle.citations.length).toBeGreaterThan(0);expect(bundle.runs.every(r=>!r.cite)).toBe(true);
    const panel=referencePresentation(s.referenceConditions??[],bundle.citations.map(k=>notes[k]!),s.referenceFocus,s.referenceApplicability,s.referenceBackground);
    expect(panel.directReferences.length).toBeGreaterThan(0);for(const exception of BOOK_P1_CARDS.find(c=>c.id===id)!.exceptions)expect(s.referenceConditions).toContain(exception);
   }
   const tampered=structuredClone(r);tampered.segments[linked[0]!.i]!.analysisLinks!.decisionIds=['unresolved'];expect(readingOf(tampered,ch.text)).toBeNull();
  }
 }
});

// 長同步迴圈：每輪讓出事件循環，等 vitest worker 同主程序嘅通訊（60 秒時限）唔會被塞住（2026-10-27 CI onTaskUpdate timeout）
const yieldToRunner=()=>new Promise<void>(r=>setImmediate(r));
it('176 audited books and the frozen 16-input holdout: changed scope is bounded; all other prose and all international snapshots remain exact',async()=>{
 const audit=[],matrix=[];
 for(const s of [...cases,...holdout.map(s=>({...s,bookYear:2026}))]){
  await yieldToRunner();
  const r=cast(s.input as BirthInput);if(!r.ok)throw Error(r.message);const chart=r.value,opts={seed:s.seed,year:2026,solar:s.input.solar,place:s.input.place.label,birthSex:s.input.sex as 'male'|'female',birthInput:s.input as BirthInput};
  const previous=withReadingEpilogue(chart,alignReviewedChapters(chart,bookChapters(chart,{...opts,crossPalaceReading:true,separateRuleReferences:true,conditionalBranches:true,focusedAdvice:true,periodChecks:true,relocateHedges:true,verdictLead:true,ageBands:true})!));
  const current=createBookChapters(chart,opts)!,evaluated=decide(chart),ds=evaluated.filter(d=>d.status==='supported').map(d=>d.id);
  const allowed=new Set(ds.flatMap(id=>id===LIAN_KEWEN?['福德','給你的話']:['命宮','性格的骨架','官祿','給你的話']));
  const changed=current.filter((c,i)=>c.text!==previous[i]!.text).map(c=>c.slug);expect(changed.every(slug=>allowed.has(slug)),s.id).toBe(true);
  if(ds.length)expect(changed.length).toBeGreaterThan(0);
  for(const ch of current){
   expect(readingOf(JSON.parse(JSON.stringify(ch.reading)),ch.text),s.id+'/'+ch.slug).not.toBeNull();
   if(!allowed.has(ch.slug)){const old=previous.find(c=>c.slug===ch.slug)!;expect(readingSegments(ch.text,ch.slots,ch.reading)).toEqual(readingSegments(old.text,old.slots,old.reading));}
  }
  expect(englishChapters(current),s.id).toEqual(englishChapters(previous));expect(japaneseChapters(current),s.id).toEqual(japaneseChapters(previous));
  matrix.push({id:s.id,decisions:evaluated.map(d=>({id:d.id,status:d.status})),changed});
  if(ds.length)audit.push({id:s.id,input:s.input,decisions:ds,changed,chapters:current.filter(c=>allowed.has(c.slug)).map(c=>({slug:c.slug,text:c.text,segments:c.reading!.segments}))});
 }
 if(process.env.GUANWEI_P1_AUDIT_DIR){mkdirSync(process.env.GUANWEI_P1_AUDIT_DIR,{recursive:true});writeFileSync(join(process.env.GUANWEI_P1_AUDIT_DIR,'audit-results.json'),JSON.stringify(audit,null,2));writeFileSync(join(process.env.GUANWEI_P1_AUDIT_DIR,'matrix.json'),JSON.stringify(matrix,null,2));}
 console.log('P1 matching cases',JSON.stringify(audit.map(({id,decisions,changed})=>({id,decisions,changed}))));
},180000);


it('independent birth dates meeting the same complete conditions receive the same judgment, without fixture or seed matching',()=>{
 const found=new Map<string,BirthInput>();
 outer:for(const y of [1966,1976,2006])for(const m of [1,4,7,10])for(const d of [3,15,26])for(const h of [0,2,4,6,8,10,12,14,16,18,20,22]){
  const input:BirthInput={solar:{y,m,d},time:{h,min:17},sex:'female',tz:'Asia/Hong_Kong',place:{lng:114.17,lat:22.32,label:'獨立核對'}};
  const r=cast(input);if(!r.ok)continue;
  const ds=decide(r.value).filter(d=>d.status==='supported');
  for(const d of ds)if(!found.has(d.id)){
   found.set(d.id,input);
   const book=createBookChapters(r.value,{seed:'independent-'+d.id,year:2026,solar:input.solar,place:input.place.label,birthSex:input.sex,birthInput:input})!;
   const target=book.find(c=>c.slug===(d.id===LIAN_KEWEN?'福德':'命宮'))!;
   expect(target.reading!.segments.some(s=>s.analysisLinks?.decisionIds.includes(d.id))).toBe(true);
   expect(target.reading!.analysis!.decisions.find(v=>v.id===d.id)?.status).toBe('supported');
  }
  if(found.size===2)break outer;
 }
 expect([...found.keys()].sort()).toEqual([LIAN_KEWEN,TONG_JI].sort());
 console.log('Additional native positives',JSON.stringify(Object.fromEntries(found)));
},30000);


it('counterfactual verdicts propagate through actual new-book creation: no P1 body, advice or closing survives a failed prerequisite',()=>{
 for(const [sample,id] of [['RB',LIAN_KEWEN],['RC',TONG_JI]]){
  const {chart,opts}=get(sample!);
  if(id===LIAN_KEWEN)move(chart,'文昌','官祿');else swapHua(chart,'天同','天機');
  const book=createBookChapters(chart,opts)!;expect(book).toHaveLength(19);
  expect(book.every(c=>c.reading!.segments.every(s=>!s.analysisLinks?.decisionIds.includes(id!)))).toBe(true);
  const chapter=book.find(c=>c.slug===(id===LIAN_KEWEN?'福德':'命宮'))!;
  expect(chapter.reading!.analysis!.decisions.find(d=>d.id===id)).toMatchObject({status:'not_supported',presentation:'not_selected'});
 }
});
