import {lookupNatalStar,type Chart,type NatalStarLookup,type NatalQueryOptions,type Sihua} from '@guanwei/ziwei';
import {evaluate,type Binding,type Condition,type EvalContext,type EvalResult} from './condition';

export type PilotFamily = 'tongliang' | 'tianfu' | 'jiliang';
export type Gate = { kind: 'manual'; id: string; description: string }
  | { kind: 'year-stem'; value: string }
  | { kind: 'borrowed-major'; palace: string; star: string; hua: Sihua };
export type P1aRule = {
  id: string; groups: PilotFamily[]; title: string; when: Condition; sources: string[];
  conditions: string[]; exceptions: string[]; explanation: string;
  gates?: Gate[]; focus?: string; notMatchedExplanation?: string;
};

function gateResult(gate: Gate, ctx: EvalContext): EvalResult {
  const query = ctx.natalQuery;
  if (gate.kind === 'manual') return { status: 'not_applicable', reason: gate.description };
  if (gate.kind === 'year-stem') {
    const stem = ctx.chart.ganzhi?.year?.[0];
    if (!stem) return { status: 'not_applicable', reason: '缺少生年天干，不能合併庚科與壬科' };
    return stem === gate.value ? { status: 'matched', bindings: [{ layer:'natal',palace:null,branch:null,star:null,hua:null,note:`本命生年干為${stem}` }] } : { status:'unmatched' };
  }
  // An explicitly sourced structural relation, never a relocation of the origin star/hua.
  const target = ctx.chart.palaces.find((p) => p.name === gate.palace);
  if (!target) return { status:'not_applicable', reason:'缺少借安目標宮位' };
  if (!target.borrowsFrom) return { status:'unmatched' };
  const origin = lookupNatalStar(ctx.chart, gate.star, query);
  if (origin.status === 'unknown') return { status:'not_applicable', reason:origin.reason };
  if (origin.branch !== target.borrowsFrom) return { status:'unmatched' };
  const hua = evaluate({star:gate.star,hua:gate.hua},{...ctx,natalQuery:query});
  if (hua.status !== 'matched') return hua;
  return { status:'matched', bindings:[{layer:'natal',palace:origin.palace,branch:origin.branch,star:gate.star,hua:gate.hua,
    note:`${target.name}${target.branch}借${origin.palace}${origin.branch}的${gate.star}作星系結構參照；化${gate.hua}仍在${origin.branch}，不是${target.branch}實坐四化`}] };
}

export type P1aTrace = { condition:Condition; result:EvalResult; children?:P1aTrace[] };
function trace(condition: Condition, ctx: EvalContext): P1aTrace {
  const children = 'all' in condition ? condition.all : 'any' in condition ? condition.any : 'not' in condition ? [condition.not] : [];
  return { condition, result:evaluate(condition,ctx), ...(children.length ? {children:children.map((c)=>trace(c,ctx))} : {}) };
}
function starNames(condition: Condition): string[] {
  if ('all' in condition) return condition.all.flatMap(starNames);
  if ('any' in condition) return condition.any.flatMap(starNames);
  if ('not' in condition) return starNames(condition.not);
  if ('star' in condition) return [condition.star,...('between' in condition?condition.between:[])];
  if ('contains' in condition) return [condition.contains];
  if ('jia' in condition) return [condition.jia,...condition.sides.flat().filter((s)=>!s.startsWith('化'))];
  if ('deLu' in condition) return [condition.deLu,'祿存'];
  if ('meets' in condition) return [condition.meets,...condition.stars.filter((s)=>!s.startsWith('化'))];
  if ('together' in condition) return condition.together;
  if ('opposite' in condition) return condition.opposite;
  return [];
}
export const pilotFactId = (p: NatalStarLookup, queryVersion: string) => p.status === 'available' ? `${queryVersion}:natal:${p.star}:${p.branch}` : `${queryVersion}:natal:${p.star}:unknown`;

export type P1aRuleResult = {
  id:string; title:string; status:'supported'|'not_supported'|'pending'; explanation:string;
  checks:P1aTrace; gates:{gate:Gate;result:EvalResult}[]; factIds:string[]; bindings:Binding[];
  sourceIds:string[]; conditions:string[]; exceptions:string[];
};


export function evaluatePilotRules(chart:Chart,rules:readonly P1aRule[],query:NatalQueryOptions,queryVersion:string):P1aRuleResult[]{
  const ctx:EvalContext={chart,natalQuery:query};
  return rules.map((rule)=>{
    const checks=trace(rule.when,ctx);
    const gates=(rule.gates??[]).map((gate)=>({gate,result:gateResult(gate,ctx)}));
    const falseGate=gates.some((g)=>g.result.status==='unmatched');
    const unknown=gates.filter((g)=>g.result.status==='not_applicable');
    const status: P1aRuleResult['status'] = checks.result.status==='unmatched'||falseGate?'not_supported'
      : checks.result.status==='not_applicable'||unknown.length?'pending':'supported';
    const missing = [checks.result,...gates.filter((g)=>g.gate.kind!=='manual').map((g)=>g.result)].find((r)=>r.status==='not_applicable');
    const explanation = status==='not_supported' ? (rule.notMatchedExplanation??'本盤未具這項完整位置組合；逐項星位與前提保留於檢查。')
      : missing?.status==='not_applicable' ? `所需資料未齊：${missing.reason}` : rule.explanation;
    const names=[...new Set([...starNames(rule.when),...(rule.gates??[]).flatMap((g)=>g.kind==='borrowed-major'?[g.star]:[])])];
    return {id:rule.id,title:rule.title,status,explanation,checks,gates,
      factIds:names.map((star)=>lookupNatalStar(chart,star,query)).map((p)=>pilotFactId(p,queryVersion)),
      bindings:[...(checks.result.status==='matched'?checks.result.bindings:[]),...gates.flatMap((g)=>g.result.status==='matched'?g.result.bindings:[])],
      sourceIds:[...rule.sources],conditions:[...rule.conditions],exceptions:[...rule.exceptions]};
  });
}
