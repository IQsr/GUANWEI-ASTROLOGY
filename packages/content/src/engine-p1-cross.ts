import {BRANCHES,PALACE_NAMES,MAJOR_STARS,P1B_QUERY_VERSION,type Chart,type PalaceName,type NatalQueryOptions} from '@guanwei/ziwei';
import {analyzeNextBatch} from './engine-p1b';
import {pilotFamily} from './engine-p1a';
import {combineEvaluations,type EvalResult} from './condition';
import {evaluatePilotRules,type P1aRule} from './pilot-analysis';
import data from './cards/engine-p1-cross-rules.json';

export const P1_CROSS_VERSION='engine-p1-cross-v1';
export const CROSS_PALACES=['命宮','官祿','財帛','福德'] as const;
type BorrowRequirement={target:PalaceName;origin:PalaceName;stars:string[]};
export type CrossRule=P1aRule & {palaces:PalaceName[];role:'basis'|'modifier'|'branch';borrow?:BorrowRequirement};
export const P1_CROSS_RULES=data.rules as unknown as readonly CrossRule[];
type Facts=ReturnType<typeof analyzeNextBatch>['facts'];
const unknown=(reason:string):EvalResult=>({status:'not_applicable',reason});
const matched=():EvalResult=>({status:'matched',bindings:[]});
const status=(r:EvalResult)=>r.status==='matched'?'supported' as const:r.status==='unmatched'?'not_supported' as const:'pending' as const;

function layoutCheck(chart:Chart):EvalResult{
  const p=chart.palaces;
  const ming=p.find((p)=>p.name==='命宮');
  return p.length===12&&new Set(p.map((p)=>p.name)).size===12&&new Set(p.map((p)=>p.branch)).size===12
    &&ming&&p.every((p)=>PALACE_NAMES.includes(p.name)&&BRANCHES.includes(p.branch)
      &&p.branch===BRANCHES[(BRANCHES.indexOf(ming.branch)-PALACE_NAMES.indexOf(p.name)+12)%12])
    ?matched():unknown('十二宮名稱、地支或相對宮序缺失、重複或不一致；須先核對盤面');
}

/** A reference keeps the origin fact IDs. It cannot create native stars, hua or helpers. */
function palaceFrame(chart:Chart,name:PalaceName,facts:Facts,integrity:EvalResult){
  const target=chart.palaces.find((p)=>p.name===name);
  const majors=facts.filter((f)=>f.position.status==='available'&&MAJOR_STARS.includes(f.position.star as never));
  const missingMajors=facts.filter((f)=>MAJOR_STARS.includes(f.position.star as never)&&f.position.status==='unknown');
  const factIds=facts.filter((f)=>f.position.status==='available'&&f.position.palace===name).map((f)=>f.id);
  const nativeMajors=majors.filter((f)=>f.position.status==='available'&&f.position.palace===name).map((f)=>({
    factId:f.id,star:f.position.star,...(f.position.status==='available'?{hua:f.position.placement.sihua??null}:{}),
  }));
  const nativeCheck=combineEvaluations('all',[integrity,missingMajors.length?unknown('十四正曜紀錄未完整，不能確認空宮或完整主星組合'):matched()]);
  let referenceCheck:EvalResult=nativeCheck;
  const origin=target?.borrowsFrom?chart.palaces.find((p)=>p.branch===target.borrowsFrom):undefined;
  const originMajors=majors.filter((f)=>f.position.status==='available'&&f.position.branch===origin?.branch);
  const requiresReference=nativeMajors.length===0;
  if(nativeCheck.status==='matched'){
    if(!requiresReference&&target?.borrowsFrom)referenceCheck=unknown('有實坐主星卻同時標記借宮，須先核對');
    else if(requiresReference){
      if(!target?.borrowsFrom||!origin)referenceCheck=unknown('空宮缺少有效借宮標記或來源宮');
      else if(BRANCHES[(BRANCHES.indexOf(target.branch)+6)%12]!==origin.branch||!originMajors.length||origin.borrowsFrom)
        referenceCheck=unknown('借宮須指向有實坐主星的對宮，不能遞迴或移位');
    }
  }
  return {palace:name,branch:target?.branch??null,nativeCheck,nativeMajors,factIds,
    reference:requiresReference||target?.borrowsFrom?{check:referenceCheck,target:{palace:name,branch:target?.branch??null},
      origin:origin?{palace:origin.name,branch:origin.branch}:null,
      majors:originMajors.map((f)=>({factId:f.id,star:f.position.star,...(f.position.status==='available'?{hua:f.position.placement.sihua??null}:{})})),
      originCompanionFactIds:facts.filter((f)=>f.position.status==='available'&&f.position.branch===origin?.branch&&!MAJOR_STARS.includes(f.position.star as never)).map((f)=>f.id),
      movedNativeStars:false as const,scope:'opposite structural reference; not native same-palace' as const}:null};
}
type Frame=ReturnType<typeof palaceFrame>;

function checkBorrow(requirement:BorrowRequirement,frames:Frame[]):EvalResult{
  const frame=frames.find((f)=>f.palace===requirement.target);
  if(!frame||frame.nativeCheck.status!=='matched')return unknown('借宮目標或主星資料未齊');
  if(frame.nativeMajors.length)return {status:'unmatched'};
  const ref=frame.reference;
  if(!ref||ref.check.status!=='matched')return ref?.check??unknown('缺少已核借宮結構');
  if(ref.origin?.palace!==requirement.origin||ref.majors.length!==requirement.stars.length||!requirement.stars.every((s)=>ref.majors.some((m)=>m.star===s)))return {status:'unmatched'};
  return {status:'matched',bindings:ref.majors.map((m)=>({layer:'natal',palace:ref.origin!.palace,branch:ref.origin!.branch,star:m.star,hua:m.hua??null,
    note:`${requirement.target}借${requirement.origin}的主星作參照；星曜、四化及配曜仍保留原位`}))};
}

/** Opt-in four-palace pilot. No production registries or writer imports. */
export function analyzeCrossPalaces(chart:Chart,options:{birthSex?:'male'|'female'}={}){
  const prior=analyzeNextBatch(chart,options),family=pilotFamily(chart),integrity=layoutCheck(chart);
  const query:NatalQueryOptions={catalogue:'p1b',...options};
  const frames=CROSS_PALACES.map((name)=>palaceFrame(chart,name,prior.facts,integrity));
  const selected=family?P1_CROSS_RULES.filter((r)=>r.groups.includes(family)):[];
  const evaluated=evaluatePilotRules(chart,selected,query,P1B_QUERY_VERSION);
  const results=evaluated.map((r,i)=>{
    const rule=selected[i]!;
    const borrow=rule.borrow?{requirement:rule.borrow,result:checkBorrow(rule.borrow,frames)}:null;
    const ordinary:EvalResult=r.status==='supported'?matched():r.status==='not_supported'?{status:'unmatched'}:unknown(r.explanation);
    // A malformed layout is an input problem, not a counterexample to an interpretation.
    const combined=integrity.status!=='matched'?integrity:combineEvaluations('all',[ordinary,...(borrow?[borrow.result]:[])]);
    const finalStatus=status(combined);
    const borrowFacts=borrow?.result.status==='matched'?frames.find((f)=>f.palace===borrow.requirement.target)!.reference!.majors.map((m)=>m.factId):[];
    return {...r,status:finalStatus,explanation:finalStatus==='supported'?rule.explanation:finalStatus==='pending'&&combined.status==='not_applicable'?combined.reason:(rule.notMatchedExplanation??'本盤未具這條完整連讀條件。'),
      palaces:rule.palaces,role:rule.role,borrow,integrity,
      factIds:[...new Set([...r.factIds,...borrowFacts])],bindings:[...r.bindings,...(borrow?.result.status==='matched'?borrow.result.bindings:[])]};
  });
  const threads=data.threads.filter((t)=>t.family===family).map((t)=>{
    const prerequisites=t.requires.map((id)=>({id,status:results.find((r)=>r.id===id)?.status??'pending'}));
    const threadStatus=prerequisites.some((r)=>r.status==='not_supported')?'not_supported' as const:prerequisites.some((r)=>r.status==='pending')?'pending' as const:'supported' as const;
    const supporting=results.filter((r)=>t.requires.includes(r.id));
    return {id:t.id,title:t.title,palaces:t.palaces,status:threadStatus,prerequisites,
      reading:threadStatus==='supported'?t.reading:null,authorship:'editorial-synthesis' as const,
      factIds:[...new Set(supporting.flatMap((r)=>r.factIds))],sourceIds:[...new Set([...t.sources,...supporting.flatMap((r)=>r.sourceIds)])],
      conditions:[...new Set(supporting.flatMap((r)=>r.conditions))],exceptions:[...t.exceptions,...new Set(supporting.flatMap((r)=>r.exceptions))]};
  });
  const sourceIds=[...new Set([...results.flatMap((r)=>r.sourceIds),...threads.flatMap((t)=>t.sourceIds)])];
  return {version:P1_CROSS_VERSION,activation:'experimental-only' as const,layer:'natal' as const,family,
    queryVersion:prior.queryVersion,engineVersion:prior.engineVersion,schoolProfile:prior.schoolProfile,inputs:prior.inputs,
    integrity,facts:prior.facts,frames,results,threads,priorAnalysis:prior,
    sources:Object.fromEntries(sourceIds.map((id)=>[id,data.sources[id as keyof typeof data.sources]])),
    scopeNotes:[...data.scope_notes],deduplication:'one native fact ID per star; a reference is not an extra vote' as const};
}
