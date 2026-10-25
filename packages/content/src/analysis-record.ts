import {MAJOR_STARS,natalStarCoverage,natalTableCoverage,oppositeBranch,type Chart,type NatalStarLookup,type BirthInput} from '@guanwei/ziwei';
import type {Condition} from './condition';
import type {P1aRuleResult} from './pilot-analysis';

import {BOOK_ANALYSIS_VERSION,nativeFactId,decisionStatus,type AnalysisContext,type AnalysisFact,type BorrowReference,type RuleDecision,type AnalysisRecorder,type PalaceReview,type DecisionStatus} from './analysis-contract';
export * from './analysis-contract';
export {BOOK_P1_VERSION,BOOK_P1_CARDS,LIAN_KEWEN,TONG_JI,collectBookP1Decisions} from './book-p1';
const unique=<T,>(a:readonly T[])=>[...new Set(a)];

export class BookAnalysis implements AnalysisRecorder{
  readonly context:AnalysisContext;
  readonly facts:AnalysisFact[];
  readonly relations:BorrowReference[];
  readonly tables:ReturnType<typeof natalTableCoverage>;
  readonly decisions:RuleDecision[]=[];
  constructor(readonly chart:Chart,opts:{year:number;solar:{y:number;m:number;d:number};place:string;birthSex?:'male'|'female';birthInput?:BirthInput},positions?:NatalStarLookup[]){
    if(opts.birthInput&&opts.birthSex&&opts.birthInput.sex!==opts.birthSex)throw Error('Conflicting explicit birth sex');
    const age=opts.year-chart.lunar.y+1;
    this.context={version:BOOK_ANALYSIS_VERSION,year:opts.year,birthSex:opts.birthSex??null,
      birth:{solar:{...opts.solar},time:opts.birthInput?.time??null,timezone:opts.birthInput?.tz??null,place:opts.place,provenance:opts.birthInput?'explicit-input':'partial-input'},
      engine:structuredClone(chart.meta),queryCatalogue:'p1b',age,ageContext:age<=13?'young':age<=24?'youth':'adult',tables:natalTableCoverage(chart),language:'shared-zh',international:'original-snapshot',
      layers:{natal:'available',decade:'legacy-adapter',annual:'legacy-adapter'}};
    this.facts=(positions??natalStarCoverage(chart,undefined,{catalogue:'p1b',birthSex:opts.birthSex})).map(position=>({id:nativeFactId(position),layer:'natal',native:true,position}));
    this.tables=natalTableCoverage(chart);
    const missing=this.facts.some(f=>MAJOR_STARS.includes(f.position.star as never)&&f.position.status==='unknown');
    this.relations=chart.palaces.filter(p=>p.borrowsFrom||!p.stars.some(s=>s.kind==='major')).map(p=>{
      const origin=chart.palaces.find(q=>q.branch===p.borrowsFrom);
      const valid=!missing&&!p.stars.some(s=>s.kind==='major')&&origin&&!origin.borrowsFrom&&origin.branch===oppositeBranch(p.branch)&&origin.stars.some(s=>s.kind==='major')
        &&chart.palaces.filter(q=>q.branch===origin.branch).length===1;
      return {id:`borrow:natal:${p.name}:${p.branch}`,target:{palace:p.name,branch:p.branch},origin:origin?{palace:origin.name,branch:origin.branch}:null,
        majorFactIds:this.facts.filter(f=>f.position.status==='available'&&f.position.palace===origin?.name&&MAJOR_STARS.includes(f.position.star as never)).map(f=>f.id),
        status:valid?'supported':'unknown_input',scope:'opposite-reference-only',movedNativeStars:false,...(!valid?{reason:'Native major coverage or opposite borrowing structure is incomplete/conflicting'}:{})} as BorrowReference;
    });
  }
  add(decision:RuleDecision){
    if(this.decisions.some(d=>d.id===decision.id))throw Error(`Duplicate decision ${decision.id}`);
    if(decision.factIds.some(id=>!this.facts.some(f=>f.id===id)))throw Error(`Unresolved fact in ${decision.id}`);
    this.decisions.push(decision);
  }
  factsFor(palace:string){return this.facts.filter(f=>f.position.status==='available'&&f.position.palace===palace).map(f=>f.id);}
  /** Called by the renderer with the *same* evaluated objects used to select its paragraphs. */
  palace(review:PalaceReview){
    const {palace,profile,borrowed,namespace,retainedReader}=review;
    const relationIds=this.relations.filter(r=>r.target.palace===palace).map(r=>r.id);
    const factIds=unique([...this.factsFor(palace),...relationIds.flatMap(id=>this.relations.find(r=>r.id===id)!.majorFactIds)]);
    this.add({id:`${namespace}:${profile.id}`,ruleId:profile.id,adapter:namespace,chapters:[palace],layer:'natal',timeLayers:['natal'],queryCatalogue:'p0',kind:'profile-selection',
      status:relationIds.some(id=>this.relations.find(r=>r.id===id)!.status!=='supported')?'unknown_input':'supported',presentation:retainedReader?'valid_not_written':'selected',presentationReason:retainedReader??(borrowed?'thematic borrowed reference, not a native conditional branch':'native composition/branch selected'),
      factIds,relationIds,sourceIds:profile.sources.map(id=>`${namespace}:${id}`),conditions:[...profile.conditions],exceptions:[],requirements:{palace,borrowed},checks:{profile:profile.id},qualifiers:borrowed?['origin conditions are not transferred to target']:[],coverage:'selection-only'});
    for(const {rule,evaluated,selected} of review.rules){
      const status=borrowed?'out_of_scope':evaluated?decisionStatus(evaluated.status):'unknown_input';
      this.add({id:`${namespace}:${rule.id}`,ruleId:rule.id,adapter:namespace,chapters:[palace],layer:'natal',timeLayers:['natal'],queryCatalogue:'p0',kind:'condition',status,
        presentation:selected?'selected':status==='supported'?'valid_not_written':'not_selected',presentationReason:borrowed?'native-only card; not evaluated against borrowed stars':retainedReader??(selected?'selected by existing priority':'existing predicate/priority result'),
        // The predicate trace retains exact scopes; these are dependencies, not a list of positive hits.
        factIds:this.facts.map(f=>f.id),relationIds,sourceIds:rule.sources.map(id=>`${namespace}:${id}`),conditions:[...rule.conditions],exceptions:[],requirements:rule.when,
        checks:evaluated??{status:'not_evaluated',reason:'native-only card'},qualifiers:[],coverage:'executable'});
    }
  }
  /** Adapt the existing pilot trace without reinterpreting a false result as its opposite. */
  pilot(result:P1aRuleResult,chapters:string[],requirements:unknown,extra:unknown=null){
    const aliases=new Map(this.facts.map(f=>[f.position.star,f.id]));
    const factIds=unique(result.factIds.map(id=>{
      const star=id.split(':natal:')[1]?.split(':')[0];
      const fact=star?aliases.get(star):undefined;if(!fact)throw Error(`Unknown pilot fact alias ${id}`);return fact;
    }));
    const manual=result.gates.some(g=>g.gate.kind==='manual'&&g.result.status==='not_applicable');
    const unknown=result.checks.result.status==='not_applicable'||result.gates.some(g=>g.gate.kind!=='manual'&&g.result.status==='not_applicable');
    const status:DecisionStatus=result.status==='supported'?'supported':result.status==='not_supported'?'not_supported':unknown?'unknown_input':manual?'source_pending':'unknown_input';
    this.add({id:result.id,ruleId:result.id,adapter:'pilot-trace',chapters,layer:'natal',timeLayers:conditionLayers(result.checks.condition),queryCatalogue:'p1b',kind:'condition',status,
      presentation:status==='supported'?'valid_not_written':'not_selected',presentationReason:'analysis retained; paragraph linkage determined by chapter selection',
      factIds,relationIds:this.relations.filter(r=>chapters.includes(r.target.palace)).map(r=>r.id),sourceIds:[...result.sourceIds],conditions:[...result.conditions],exceptions:[...result.exceptions],
      requirements,checks:{trace:result.checks,gates:result.gates,bindings:result.bindings,extra},qualifiers:[result.explanation],coverage:'executable'});
  }
}


function conditionLayers(when:Condition):('natal'|'decade'|'annual')[]{
 const found=new Set<'natal'|'decade'|'annual'>(['natal']);
 const visit=(node:unknown)=>{if(!node||typeof node!=='object')return;for(const [key,value] of Object.entries(node)){if(key==='layer'&&(value==='natal'||value==='decade'||value==='annual'))found.add(value);else if(Array.isArray(value))value.forEach(visit);else visit(value);}};
 visit(when);return [...found];
}
