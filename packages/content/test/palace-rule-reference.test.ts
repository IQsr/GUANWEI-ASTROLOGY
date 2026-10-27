import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {cast,type BirthInput} from '@guanwei/ziwei';
import {palaceReading} from '../src/palace-reader';
import {evaluatePalacePredicate} from '../src/palace-predicate';
import {palaceRuleReference} from '../src/palace-rule-reference';
import {readerReferenceLanguage} from '../src/reader-reference-language';
import remaining from '../src/cards/palace-remaining.json';
import focused from '../src/cards/palace-focused.json';
import remainingReview from '../src/cards/palace-remaining-review.json';
import focusedReview from '../src/cards/palace-focused-review.json';
import fixtures from '../../../apps/web/src/lib/free-ming-preview.json';

it('72盤逐項核對保持原有規則條件、結果與引用；未符合分支不再掛出，要求不寫成本盤已有',()=>{
 let matched=0,checked=0,omitted=0;
 for(const fixture of fixtures){
  const result=cast(fixture.input as BirthInput);if(!result.ok)throw Error(result.message);const chart=result.value;
  for(const palace of [...remaining.palaces,'夫妻','田宅']){
   const p=chart.palaces.find(p=>p.name===palace)!;if(p.borrowsFrom)continue;
   const names=p.stars.filter(s=>s.kind==='major').map(s=>s.name).sort();
   const rules=(palace==='夫妻'||palace==='田宅'?focused:remaining).rules.filter(r=>r.palace===palace&&r.keys.some(k=>k.startsWith('has:')?names.includes(k.slice(4)):k.split('+').sort().join('+')===names.join('+')));
   const rows=palaceReading(chart,palace,2026,true)!,notes=rows.flatMap(s=>s.referenceConditions??[]).join('');
   for(const rule of rules){
    const evaluation=evaluatePalacePredicate(rule.when,chart,p);
    const selected=rows.some(s=>s.statements.some(l=>l.source_ids.includes(rule.id)));
    if(selected)expect(evaluation.status).toBe('matched');
    // 2026-10-26: an unmatched branch is neither noted nor cited in the new-book reference path.
    if(evaluation.status==='unmatched'){
     expect(notes).not.toContain(rule.heading+'。規則要求與限制：');
     const shownRules=rules.filter(r=>r!==rule&&evaluatePalacePredicate(r.when,chart,p).status!=='unmatched');
     const sourceIds=new Set(rows.flatMap(s=>s.statements.flatMap(l=>l.citations)));
     const profileIds=new Set(rows.flatMap(s=>s.statements.filter(l=>!rules.some(r=>l.source_ids.includes(r.id))).flatMap(l=>l.citations)));
     for(const id of rule.sources){const cite=`palace.${palace==='夫妻'||palace==='田宅'?'focused':'remaining'}.v1:${id}`;
      if(!shownRules.some(r=>r.sources.includes(id))&&!profileIds.has(cite))expect(sourceIds.has(cite)).toBe(false);}
     omitted++;continue;
    }
    // The two approved samples intentionally retain their own original reference path.
    if(!notes.includes(rule.heading+'。規則要求與限制：'))continue;
    const note=palaceRuleReference(rule,evaluation,selected);expect(notes).toContain(note);checked++;
    const sourceIds=new Set(rows.flatMap(s=>s.statements.flatMap(l=>l.citations)));
    for(const id of rule.sources)expect(sourceIds).toContain(`palace.${palace==='夫妻'||palace==='田宅'?'focused':'remaining'}.v1:${id}`);
    expect(readerReferenceLanguage(note)).not.toMatch(/引擎|冒充|本輪|指紋|產品|已批|觸發|點票|輸出|選段|正文/);
    const shown=readerReferenceLanguage(note),[requirements,actual]=shown.split('本盤核對結果：');
    expect(requirements).toContain('規則要求與限制：');
    for(const condition of rule.conditions)expect(requirements).toContain(readerReferenceLanguage(condition).replaceAll('沒有由單一化禄觸發不相關組合。', '單一化禄不能代替其他組合所需的配合。'));
    for(const check of evaluation.checks)expect(actual).toContain(readerReferenceLanguage(check));
    if(evaluation.status==='matched'){matched++;expect(actual).toContain('本盤符合');}
   }
  }
 }
 expect(checked).toBeGreaterThan(30);expect(matched).toBeGreaterThan(0);expect(omitted).toBeGreaterThan(100);
});

it('缺資料不會標成確認沒有，符合但未另起段也不會標成失效',()=>{
 const rule={heading:'測試分支',conditions:['本宮須有天相；會照不能代替同宮。']};
 const unknown=palaceRuleReference(rule,{matched:false,status:'not_applicable',facts:[],checks:['天傷尚未實作。'],reason:'尚未實作'},false);
 expect(unknown).toContain('資料尚未齊備');expect(unknown).not.toContain('本盤未符合');expect(unknown).toContain('未確認不等於本盤沒有');
 const reserved=palaceRuleReference(rule,{matched:true,status:'matched',facts:[],checks:['天相在本宮同度。']},false);
 expect(reserved).toContain('並不表示其作用已被抵銷');
});

it('兩份既有逐項審核同時綁定規則參照格式，沒有改動判斷前提或原文資料',()=>{
 const hash=createHash('sha256').update(readFileSync(new URL('../src/palace-rule-reference.ts',import.meta.url),'utf8').replace(/\r\n/g,'\n')).digest('hex');
 for(const review of [remainingReview,focusedReview]){
  expect(review.reference_formatter_sha256).toBe(hash);
  expect(review.reference_format_review.scope).toContain('判斷前提、選段次序及原文資料不變');
 }
});

it('strips internal extraction notes from reader-facing section labels', async () => {
  const { readerReferenceLanguage } = await import('../src/reader-reference-language');
  expect(readerReferenceLanguage('下篇・宮垣論・官祿宮・巨門〔原提取標題為臣門，待核字形〕')).toBe('下篇・宮垣論・官祿宮・巨門');
  expect(readerReferenceLanguage('篇首／五官〔傳統疾病論述，僅作文本導航〕')).toBe('篇首／五官');
  expect(readerReferenceLanguage('紫微〔原提取序號為l，按正文核位〕')).toBe('紫微');
  expect(readerReferenceLanguage('七殺〔編輯導航：正文起句，原書無獨立標題〕')).toBe('七殺〔按段落起句定位；原書無獨立標題〕');
});
