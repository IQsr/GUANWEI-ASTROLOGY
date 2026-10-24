import { readFileSync } from 'node:fs';
import audit from '../src/cards/engine-p1a-review.json';
import { createHash } from 'node:crypto';
import { expect,it } from 'vitest';
import { cast,lookupNatalStar,queryNatalStar,type BirthInput,type Chart } from '@guanwei/ziwei';
import { analyzeFirstBatch,P1A_RULES } from '../src/engine-p1a';
import { evaluate,type Condition } from '../src/condition';
import { ConditionSchema } from '../src/rule';
import ruleData from '../src/cards/engine-p1a-rules.json';
import deep from '../../../tools/wang-reference/deep-index.json';
import initial from '../../../tools/wang-reference/initial-index.json';
import fixtures from '../../../apps/web/test/fixtures/palace-before.json';
const query={catalogue:'p1a'} as const;
const charts=Object.fromEntries(fixtures.filter((f)=>['TL','A','C'].includes(f.id)).map((f)=>{const r=cast(f.input as BirthInput);if(!r.ok)throw Error(r.message);return [f.id,r.value];}));
const result=(chart:Chart,id:string)=>analyzeFirstBatch(chart).results.find((r)=>r.id===id)!;

it('all 18 cards preserve source fingerprints, prerequisites and exceptions as separate fields',()=>{
  const index=new Map(deep.blocks.map((b)=>[b.id,b]));
  expect(P1A_RULES).toHaveLength(18);expect(new Set(P1A_RULES.map((r)=>r.id)).size).toBe(18);
  expect(ruleData.pdf_sha256).toBe(deep.book.sha256);
  for(const rule of P1A_RULES){
    expect(ConditionSchema.safeParse(rule.when).success,rule.id).toBe(true);
    expect(rule.conditions.length,rule.id).toBeGreaterThan(0);expect(rule.exceptions.length,rule.id).toBeGreaterThan(0);
    for(const id of rule.sources){
      const source=ruleData.sources[id as keyof typeof ruleData.sources];expect(source,id).toBeDefined();
      expect(index.get(id),id).toMatchObject({text_sha256:source.sha256,pdf_page:source.page,section_title:source.section});
    }
  }
  for(const name of ['天才','天空','台輔','封誥','三台','八座','恩光','天貴','龍池','鳳閣','華蓋']){
    const p=lookupNatalStar(charts.TL!,name,query);if(p.status!=='available')throw Error(p.reason);
    for(const id of p.source.references)expect(initial.paragraph_index.some((b)=>b.id===id),id).toBe(true);
    expect(p.source.verification).toBe('transcription-not-original-collated');
    expect(p.source.sourceFingerprint).toBe(initial.chapters.find((c)=>c.number===7)!.source.html_sha256);
  }
});

it('同梁 retains the clamped hua-ji exception and adds a separate wellbeing arts pair',()=>{
  const chart=charts.TL!;
  expect(result(chart,'tongliang-clamped-ji').status).toBe('supported');
  expect(result(chart,'paired-longfeng-wellbeing').status).toBe('supported');
  expect(result(chart,'huagai-wellbeing').status).toBe('supported');
  expect(result(chart,'paired-longfeng-ming').status).toBe('not_supported');
  expect(result(chart,'tongliang-new-principle').status).toBe('not_supported');
  expect(analyzeFirstBatch(chart).results.filter((r)=>r.status==='supported').length).toBeGreaterThanOrEqual(3);
  const wellbeing=result(chart,'paired-longfeng-wellbeing');
  expect(wellbeing.exceptions.join('')).toContain('不能由精神方面的才藝修飾保證進財');
});

it('天府 now excludes all three specified 空庫 branches, while 壬科 remains conditional',()=>{
  const report=analyzeFirstBatch(charts.A!);const kongku=report.results.find((r)=>r.id==='tianfu-kongku')!;
  expect(kongku.status).toBe('not_supported');
  expect(kongku.checks.children!.map((r)=>r.result.status)).toEqual(['unmatched','unmatched','unmatched']);
  expect(kongku.explanation).toContain('三條空庫前提都未成立');
  expect(result(charts.A!,'tianfu-xiang-yangtuo').status).toBe('not_supported');
  expect(result(charts.A!,'tianfu-xiang-firebell').status).toBe('not_supported');
  const ke=result(charts.A!,'tianfu-ren-ke');expect(ke.status).toBe('pending');
  expect(ke.gates.map((g)=>g.result.status)).toEqual(['matched','matched','not_applicable']);
  expect(ke.bindings.some((b)=>b.star==='武曲'&&b.palace==='福德'&&b.branch==='丑'&&b.hua==='忌')).toBe(true);
  expect(ke.bindings.some((b)=>b.star==='武曲'&&b.palace==='財帛')).toBe(false);
});

it('機梁 records arts-star positions without using them to manufacture the 明斷 prerequisite',()=>{
  const chart=charts.C!;
  expect(result(chart,'jiliang-mingduan-talent').checks.result.status).toBe('matched');
  expect(result(chart,'jiliang-mingduan-talent').status).toBe('pending');
  expect(result(chart,'jiliang-talent-same').status).toBe('not_supported');
  expect(result(chart,'paired-longfeng-ming').status).toBe('not_supported');
  expect(result(chart,'paired-longfeng-wellbeing').status).toBe('supported');
  expect(queryNatalStar(chart,'天才',{palace:'官祿'},query).status).toBe('present');
  expect(queryNatalStar(chart,'天才',{palace:'命宮'},query).status).toBe('absent');
  expect(queryNatalStar(chart,'天機',{palace:'官祿'},query).status).toBe('absent');
  expect(result(chart,'ming-tianji-tiankong').status).toBe('not_supported');
  expect(result(chart,'ming-tianliang-tiankong').status).toBe('not_supported');
});

it('a 天空同度 branch can apply despite 祿存; mere meeting does not substitute for same-palace',()=>{
  // Hypothetical isolated geometry, not a fabricated real-birth sample.
  const same=structuredClone(charts.A!);same.ganzhi.year[1]='戌';
  expect(queryNatalStar(same,'天空',{palace:'命宮'},query).status).toBe('present');
  expect(queryNatalStar(same,'祿存',{palace:'命宮'},query).status).toBe('present');
  expect(result(same,'tianfu-kongku').status).toBe('supported');
  const meeting=structuredClone(charts.A!);meeting.ganzhi.year[1]='寅';
  expect(queryNatalStar(meeting,'天空',{palace:'命宮',reach:'sanfang'},query).status).toBe('present');
  expect(queryNatalStar(meeting,'天空',{palace:'命宮'},query).status).toBe('absent');
  expect(result(meeting,'tianfu-kongku').status).toBe('not_supported');
});

it('a real 子年機梁 chart can satisfy 天才同度 while its interpretation gate still stays explicit',()=>{
  let found:Chart|undefined;
  for(let m=2;m<=12&&!found;m++)for(const d of [5,15,25])for(let h=0;h<24&&!found;h+=2){
    const r=cast({solar:{y:1996,m,d},time:{h,min:20},tz:'Asia/Hong_Kong',place:{lng:114.17,lat:22.32,label:'香港'},sex:'male'});
    if(r.ok&&analyzeFirstBatch(r.value).family==='jiliang'&&r.value.ganzhi.year[1]==='子')found=r.value;
  }
  expect(found).toBeDefined();const same=result(found!,'jiliang-talent-same');
  expect(same.checks.result.status).toBe('matched');expect(same.status).toBe('pending');
  expect(same.exceptions.join('')).toContain('凶煞同躔');
});

it('next-batch missing stars stay unknown under negation and a missing calculation never proves absence',()=>{
  const chart=structuredClone(charts.A!);
  const unknown:Condition={not:{star:'陰煞',in:{name:'命宮'}}};
  expect(evaluate(unknown,{chart,natalQuery:query}).status).toBe('not_applicable');
  delete (chart as Partial<Chart>).ganzhi;
  const kongku=result(chart,'tianfu-kongku');expect(kongku.status).toBe('pending');
  expect(kongku.explanation).not.toContain('三條空庫前提都未成立');
});

it('all evidence uses unique native fact IDs; chart, sources and production defaults are not mutated',()=>{
  for(const chart of Object.values(charts)){
    const frozen=JSON.stringify(chart);const report=analyzeFirstBatch(chart);
    expect(report.results.length).toBeGreaterThan(2);
    expect(new Set(report.facts.map((f)=>f.id)).size).toBe(44);
    const ids=new Set(report.facts.map((f)=>f.id));
    for(const result of report.results)for(const id of result.factIds)expect(ids.has(id),id).toBe(true);
    expect(report.structuralLinks.every((l)=>l.movedNativeStars===false)).toBe(true);
    expect(JSON.stringify(chart)).toBe(frozen);
    expect(lookupNatalStar(chart,'天才').status).toBe('unknown');
    expect(createHash('sha256').update(JSON.stringify(analyzeFirstBatch(chart))).digest('hex')).toBe(createHash('sha256').update(JSON.stringify(report)).digest('hex'));
  }
});

it('台輔封誥 keep their independent roles; 台座 pair requirements do not silently transfer',()=>{
  const single=P1A_RULES.find((r)=>r.id==='single-taifu-ming')!;
  const together=P1A_RULES.find((r)=>r.id==='paired-taifeng-ming')!;
  expect(single.conditions.join('')).toContain('可有獨立性');
  expect(together.conditions.join('')).toContain('不把它定成所有作用必須成對');
  const chart=structuredClone(charts.C!);
  // In a hypothetical local geometry, move the native 文曲 anchor so 台輔 meets 命 while 封誥 does not.
  const curve=chart.palaces.flatMap((p)=>p.stars).find((s)=>s.name==='文曲')!;
  for(const p of chart.palaces)p.stars=p.stars.filter((s)=>s.name!=='文曲');
  chart.palaces.find((p)=>p.branch==='寅')!.stars.push(curve);
  expect(result(chart,'single-taifu-ming').status).toBe('supported');
  expect(result(chart,'paired-taifeng-ming').status).toBe('not_supported');
});

it('P1a reviewed parent hashes and all three complete reports remain reproducible',()=>{
  for(const [path,expected] of Object.entries(audit.parents)){
    const source=readFileSync(new URL(`../../../${path}`,import.meta.url),'utf8').replace(/\r\n/g,'\n');
    expect(createHash('sha256').update(source).digest('hex'),path).toBe(expected);
  }
  for(const sample of audit.samples){
    const report=analyzeFirstBatch(charts[sample.id]!);
    expect(createHash('sha256').update(JSON.stringify(report)).digest('hex'),sample.id).toBe(sample.report_sha256);
    expect(report.results.map((r)=>({id:r.id,status:r.status,sourceIds:r.sourceIds}))).toEqual(sample.results);
    expect(report.facts.filter((f)=>f.position.status==='available'&&f.position.source.method==='minor-p1a-v1').map((f)=>{
      if(f.position.status!=='available')throw Error('Expected known placement');
      return {star:f.position.star,branch:f.position.branch,palace:f.position.palace};
    })).toEqual(sample.new_positions);
  }
});

it('the narrow 壬科 branch explicitly requires its stated 羊陀夾, even in incomplete inputs',()=>{
  const chart=structuredClone(charts.A!);
  for(const p of chart.palaces)p.stars=p.stars.filter((s)=>s.name!=='擎羊');
  const r=result(chart,'tianfu-ren-ke');
  expect(r.checks.result.status).toBe('not_applicable');
  expect(r.status).toBe('pending');
});
