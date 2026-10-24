import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import audit from '../src/cards/engine-p0-review.json';
import { expect, it } from 'vitest';
import { cast, BRANCHES, HELPER_STARS, lookupNatalStar, oppositeBranch, sanFangPalaces, SCHOOL_PROFILE, type BirthInput, type Chart, type Palace } from '@guanwei/ziwei';
import { evaluate, type Condition } from '../src/condition';
import { evaluatePalacePredicate, type PalacePredicate } from '../src/palace-predicate';
import { Rule, runRule } from '../src/rule';
import { CARDS, cardsFor, type Card } from '../src/card';
import focused from '../src/cards/palace-focused.json';
import remaining from '../src/cards/palace-remaining.json';
import fixtures from '../../../apps/web/test/fixtures/palace-before.json';
import previews from '../../../apps/web/src/lib/free-ming-preview.json';

const charts=fixtures.filter((f)=>['TL','A','C'].includes(f.id)).map((f)=>{const r=cast(f.input as BirthInput);if(!r.ok)throw Error(r.message);return r.value;});
const status=(cond:Condition, chart=charts[0]!)=>evaluate(cond,{chart}).status;

it('all five helpers work through star/in, at, contains, meets, together, opposite and jia',()=>{
  for(const chart of charts) for(const star of HELPER_STARS){
    const located=lookupNatalStar(chart,star);if(located.status!=='available')throw Error(located.reason);
    expect(status({star,in:{name:located.palace}},chart)).toBe('matched');
    expect(status({star,at:[located.branch]},chart)).toBe('matched');
    expect(status({sanfangOf:{name:located.palace},contains:star},chart)).toBe('matched');
    expect(status({meets:star,stars:[star],reach:'same'},chart)).toBe('matched');
    expect(status({together:[star,star]},chart)).toBe('matched');
    const away=chart.palaces.find((p)=>p.branch!==located.branch)!;
    expect(status({star,in:{name:away.name}},chart)).toBe('unmatched');
    expect(status({not:{star,in:{name:away.name}}},chart)).toBe('matched');
    const opposite=chart.palaces.find((p)=>p.branch===oppositeBranch(located.branch))!;
    const other=opposite.stars[0]?.name;
    if(other)expect(status({opposite:[star,other]},chart)).toBe('matched');
    const i=BRANCHES.indexOf(located.branch);
    const left=chart.palaces.find((p)=>p.branch===BRANCHES[(i+11)%12])!.stars[0]?.name;
    const right=chart.palaces.find((p)=>p.branch===BRANCHES[(i+1)%12])!.stars[0]?.name;
    if(left&&right){
      expect(status({star,between:[left,right]},chart)).toBe('matched');
      expect(status({jia:star,sides:[[left],[right]]},chart)).toBe('matched');
    }
    expect(evaluatePalacePredicate({op:'has',scope:'own',names:[star]},chart,chart.palaces.find((p)=>p.name===located.palace)!).status).toBe('matched');
  }
});

it('unknown stars survive every stellar atom and negation, including zero-count tests',()=>{
  const atoms:Condition[]=[
    {star:'天才',in:{name:'命宮'}},{star:'天才',at:['子']},{star:'天才',brightness:['廟']},{star:'天才',hua:'祿'},
    {sanfangOf:{name:'命宮'},contains:'天才'},{together:['天才','紫微']},{opposite:['紫微','天才']},
    {star:'紫微',between:['天才','天姚']},{meets:'天才',stars:['紫微']},{deLu:'天才'},
    {meets:'紫微',stars:['天才'],op:'eq',n:0},{jia:'紫微',sides:[['天才'],['華蓋']]},
  ];
  for(const atom of atoms){expect(status(atom),JSON.stringify(atom)).toBe('not_applicable');expect(status({not:atom})).toBe('not_applicable');}
});

it('AND/OR and threshold bounds keep decisive known results, independent of order',()=>{
  const chart=charts[0]!;const zi=lookupNatalStar(chart,'紫微');if(zi.status!=='available')throw Error(zi.reason);
  const unknown:Condition={star:'天空',in:{name:'命宮'}};
  const yes:Condition={star:'紫微',at:[zi.branch]};const no:Condition={not:yes};
  for(const children of [[unknown,no],[no,unknown]])expect(status({all:children})).toBe('unmatched');
  for(const children of [[unknown,yes],[yes,unknown]])expect(status({any:children})).toBe('matched');
  expect(status({all:[unknown,yes]})).toBe('not_applicable');
  expect(status({any:[unknown,no]})).toBe('not_applicable');
  expect(status({meets:'紫微',stars:['紫微','天空'],reach:'same',op:'gte',n:1})).toBe('matched');
  expect(status({meets:'紫微',stars:['紫微','天空'],reach:'same',op:'eq',n:0})).toBe('unmatched');
  expect(status({meets:'紫微',stars:['紫微','天空'],reach:'same',op:'eq',n:1})).toBe('not_applicable');
  expect(status({meets:'紫微',stars:['紫微','天空'],reach:'same',op:'lte',n:2})).toBe('matched');
});

it('missing supported stars cannot prove absence; palace conjunction/negation has the same contract',()=>{
  const chart=structuredClone(charts[0]!);chart.palaces.forEach((p)=>{p.stars=p.stars.filter((s)=>s.name!=='擎羊');});
  expect(status({not:{star:'擎羊',in:{name:'命宮'}}},chart)).toBe('not_applicable');
  expect(status({sanfangOf:{name:'命宮'},count:'malefic',op:'eq',n:0},chart)).not.toBe('matched');
  for(const op of ['has','lacks-hua'])expect(evaluatePalacePredicate({op,scope:'own',names:['天才'],hua:'祿'},chart,chart.palaces[0]!).status).toBe('not_applicable');
});

it('unknown exclusions do not let rules or cards emit claims',()=>{
  const chart=charts[0]!;const zi=lookupNatalStar(chart,'紫微');if(zi.status!=='available')throw Error(zi.reason);
  const rule=Rule.parse({rule_id:'test.p0.exclusion',version:'1',schools:['zhongzhou-v1'],requires:['natal'],role:'structural',independence_group:'test.p0',trigger:{star:'紫微',at:[zi.branch]},exclude:{star:'天才',in:{name:'命宮'}},allowed_xiang:['test'],prohibited_inferences:[],topics:['self'],depends_on:[],review_status:'approved',review_reasons:[],sources:[{book:'test',ref:'test'}]});
  expect(runRule(rule,{chart},SCHOOL_PROFILE.ref).status).toBe('not_applicable');
  const base=CARDS.find((c)=>cardsFor(chart,undefined,'natal',[c]).length>0)!;
  expect(base).toBeDefined();
  const card:Card={...base,none:{star:'天才',in:{name:'命宮'}}};
  expect(cardsFor(chart,undefined,'natal',[card])).toEqual([]);
});

/** Frozen pre-P0 semantics for the existing 83 predicates, intentionally using only stored stars. */
function previous(w:PalacePredicate,chart:Chart,p:Palace):{matched:boolean;facts:string[];checks:string[]}{
  if(w.op==='all'||w.op==='any'){
    const children=w.args!.map((a)=>previous(a,chart,p));return {matched:w.op==='all'?children.every((c)=>c.matched):children.some((c)=>c.matched),facts:[...new Set(children.flatMap((c)=>c.facts))],checks:children.flatMap((c)=>c.checks)};
  }
  if(w.op==='branch'){const matched=w.branches!.includes(p.branch);return{matched,facts:[],checks:[`宮支要求${w.branches!.join('／')}，本宮${p.branch}：${matched?'符合':'不符合'}。`]};}
  const selected=w.scope==='own'?[p]:w.scope==='opposite'?chart.palaces.filter((q)=>q.branch===oppositeBranch(p.branch)):w.scope==='four'?sanFangPalaces(chart.palaces,p.branch):chart.palaces.filter((q)=>q.name===w.scope!.slice(6));
  const names=w.names??[];const huas=w.hua?.split(' ')??[];
  const hits=selected.flatMap((q)=>q.stars.filter((s)=>(!names.length||names.includes(s.name))&&(!huas.length||(!!s.sihua&&huas.includes(s.sihua)))).map((s)=>`${s.name}${huas.length?`化${s.sihua}`:''}在${q.name.endsWith('宮')?q.name:`${q.name}宮`}${q.branch}${q.branch===p.branch?'同宮':q.branch===oppositeBranch(p.branch)?'對照':sanFangPalaces(chart.palaces,p.branch).some((x)=>x.branch===q.branch)?'三方會照':'實坐'}`));
  const where=w.scope==='own'?'本宮':w.scope==='opposite'?'對宮':w.scope==='four'?'三方四正':w.scope!.slice(6);
  const target=`${where}${names.length?names.join('／'):'星曜'}${huas.length?`化${huas.join('／')}`:''}`;
  return {matched:w.op==='lacks-hua'?hits.length===0:hits.length>0,facts:hits,checks:[`核對${target}：${hits.length?hits.join('；'):'未見所列配合'}。`]};
}

it('all existing 83 rules preserve their results, facts and check text across the 72 preview charts',()=>{
  const rules=[...focused.rules,...remaining.rules];expect(rules).toHaveLength(83);
  let checked=0;
  for(const fixture of previews){
    const r=cast(fixture.input as BirthInput);if(!r.ok)throw Error(r.message);
    for(const rule of rules){
      const p=r.value.palaces.find((p)=>p.name===rule.palace)!;
      const old=previous(rule.when,r.value,p);const next=evaluatePalacePredicate(rule.when,r.value,p);
      expect({matched:next.matched,facts:next.facts,checks:next.checks},`${fixture.n}/${rule.id}`).toEqual(old);
      expect(next.status).toBe(old.matched?'matched':'unmatched');checked++;
    }
  }
  expect(checked).toBe(5976);
},20000);

it('opposite geometry follows branch coordinates even when a snapshot reorders palaces',()=>{
  const chart=structuredClone(charts[0]!);const yes=HELPER_STARS.map((s)=>lookupNatalStar(chart,s)).find((r)=>r.status==='available')!;
  if(yes.status!=='available')throw Error('Expected available helper');
  const p=chart.palaces.find((p)=>p.branch===oppositeBranch(yes.branch))!;const other=p.stars[0]!.name;
  chart.palaces.sort((a,b)=>a.name.localeCompare(b.name));
  expect(status({opposite:[yes.star,other]},chart)).toBe('matched');
});

it('missing major, brightness or hua data cannot become a positive absence claim',()=>{
  const chart=structuredClone(charts[0]!);
  const zi=chart.palaces.find((p)=>p.stars.some((s)=>s.name==='紫微'))!;
  zi.stars=zi.stars.filter((s)=>s.name!=='紫微');
  const empty=chart.palaces.find((p)=>!p.stars.some((s)=>s.kind==='major'))!;
  expect(status({empty:{name:empty.name}},chart)).toBe('not_applicable');
  const bright=structuredClone(charts[0]!);
  const b=bright.palaces.find((p)=>p.stars.some((s)=>s.kind==='major'))!;
  b.stars.forEach((s)=>{s.brightness=undefined;});
  expect(status({brightnessIn:{name:b.name},levels:['廟']},bright)).toBe('not_applicable');
  const hua=structuredClone(charts[0]!);
  hua.palaces.flatMap((p)=>p.stars).find((s)=>s.sihua)!.sihua=undefined;
  expect(status({not:{star:'紫微',hua:'祿'}},hua)).toBe('not_applicable');
  expect(status({meets:'紫微',stars:['化忌'],op:'eq',n:0},hua)).toBe('not_applicable');
});

it('P0 evidence pins the reviewed code and rechecks all three old/new sample comparisons',()=>{
  for(const [path,expected] of Object.entries(audit.parents)){
    const source=readFileSync(new URL(`../../../${path}`,import.meta.url),'utf8').replace(/\r\n/g,'\n');
    expect(createHash('sha256').update(source).digest('hex'),path).toBe(expected);
  }
  for(const sample of audit.samples){
    const fixture=fixtures.find((f)=>f.id===sample.id)!;const r=cast(fixture.input as BirthInput);if(!r.ok)throw Error(r.message);
    for(const star of sample.checks)for(const comparison of star.results)expect(evaluate(comparison.condition as Condition,{chart:r.value}).status).toBe(comparison.after);
    expect(evaluate(sample.notImplemented.condition as Condition,{chart:r.value}).status).toBe('not_applicable');
    expect(evaluate(sample.actualAbsence.condition as Condition,{chart:r.value}).status).toBe('matched');
  }
});

it('unknown duplicate placements cannot contribute to counts, 得祿 or brightness/empty-palace facts',()=>{
  const chart=structuredClone(charts[0]!);
  const target=chart.palaces.find((p)=>p.name==='命宮')!;
  for(const p of chart.palaces)p.stars=p.stars.filter((s)=>!['擎羊','陀羅','火星','鈴星','地空','地劫'].includes(s.name));
  target.stars.push({name:'擎羊',kind:'aux'},{name:'擎羊',kind:'aux'});
  expect(status({sanfangOf:{name:'命宮'},count:'malefic',op:'gte',n:2},chart)).toBe('not_applicable');
  const empty=structuredClone(charts[0]!);
  const palace=empty.palaces.find((p)=>!p.stars.some((s)=>s.kind==='major'))!;
  const zi=empty.palaces.flatMap((p)=>p.stars).find((s)=>s.name==='紫微')!;
  palace.stars.push({...zi,brightness:'廟'});
  expect(status({empty:{name:palace.name}},empty)).toBe('not_applicable');
  expect(status({brightnessIn:{name:palace.name},levels:['廟']},empty)).toBe('not_applicable');
  const lu=structuredClone(charts[0]!);
  const anchor=lookupNatalStar(lu,'天刑');if(anchor.status!=='available')throw Error(anchor.reason);
  const four=sanFangPalaces(lu.palaces,anchor.branch);
  const hua=lu.palaces.flatMap((p)=>p.stars).find((s)=>s.sihua==='祿')!;
  delete hua.sihua;
  lu.palaces.find((p)=>!four.includes(p))!.stars.find((s)=>!s.sihua)!.sihua='祿';
  lu.palaces.find((p)=>p.branch===anchor.branch)!.stars.push({name:'祿存',kind:'aux'});
  expect(status({deLu:'天刑'},lu)).toBe('not_applicable');
});

it('evaluation-local memoization never survives a call or changes the caller context',()=>{
  const chart=structuredClone(charts[0]!);const ctx={chart};
  const p=chart.palaces.find((p)=>p.stars.some((s)=>s.name==='紫微'))!;
  const cond:Condition={star:'紫微',in:{name:p.name}};
  const before=JSON.stringify(ctx);
  expect(evaluate(cond,ctx).status).toBe('matched');
  expect(JSON.stringify(ctx)).toBe(before);expect(Reflect.ownKeys(ctx)).toEqual(['chart']);
  const star=p.stars.find((s)=>s.name==='紫微')!;p.stars=p.stars.filter((s)=>s!==star);
  chart.palaces.find((q)=>q!==p)!.stars.push(star);
  expect(evaluate(cond,ctx).status).toBe('unmatched');
  const hua:Condition={star:'天同',hua:'忌'};
  expect(evaluate(hua,ctx).status).toBe('matched');
  chart.palaces.flatMap((p)=>p.stars).find((s)=>s.name==='天同')!.sihua=undefined;
  expect(evaluate(hua,ctx).status).toBe('not_applicable');
});
