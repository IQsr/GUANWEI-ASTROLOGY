import {describe,it,expect} from 'vitest';
import {cast,annual,type Chart} from '@guanwei/ziwei';
import {lifeStepsChapter,lookBackEvent,pivotSteps,pivotRule} from '../src/daxian';
import {citation} from '../src/citation';
import {renderChapter as en} from '../src/en/render';
import {renderChapter as ja} from '../src/ja/render';

const chart=(y:number,m:number,d:number,h:number,min=20):Chart=>{
 const result=cast({solar:{y,m,d},time:{h,min},tz:'Asia/Hong_Kong',place:{lng:114.17,lat:22.32,label:'香港'},sex:'female'});
 if(!result.ok)throw new Error(result.message);return result.value;
};
const year=(c:Chart,y:number)=>{const r=annual(c,y);if(!r.ok)throw new Error(r.message);return r.value;};
const tl=chart(1990,3,21,14);

describe('一生十二步：原頁核對後的反例',()=>{
 it('同梁2014、2024不再錯借天府、紫府及武破案例判是非或出行',()=>{
   expect(lookBackEvent(tl,year(tl,2014))).toBeNull();
   expect(lookBackEvent(tl,year(tl,2024))).toBeNull();
   const chapter=lifeStepsChapter({chart:tl,year:2026})!;
   expect(chapter.segments.map((s)=>s.text).join('')).not.toMatch(/可能有過波折|捲入是非爭拗|搬屋|得到長輩或上司提攜|訊號沒有落在你身上/);
 });
 it('七殺辰宮：第九限申宮對拱貪狼，必須與原位宮一併列出（PDF363）',()=>{
   const c=chart(2008,7,3,6);const d=c.decadals.find((d)=>d.index===9)!;
   expect(d).toMatchObject({branch:'申',fromAge:85,toAge:94});
   expect(pivotSteps(c).steps).toEqual(expect.arrayContaining([3,4,5,9]));
   expect(lifeStepsChapter({chart:c,year:2026})!.segments[0]!.referenceConditions?.join('')).toContain('對拱');
 });
 it('天府丑宮：第2限天機化祿所在寅宮不得漏標（PDF351）',()=>{
   const c=chart(1976,1,13,0);expect(c.palaces.find((p)=>p.name==='命宮')?.branch).toBe('丑');
   expect(pivotSteps(c).steps).toContain(2);
   expect(lifeStepsChapter({chart:c,year:2026})!.segments[0]!.text).not.toContain('就是一生的轉折點');
 });
 it('同陰沒有四煞，仍須見吉；未見吉不能硬選吉支',()=>{
   let found:Chart|undefined;
   for(let d=1;d<=28&&!found;d++)for(let h=0;h<24;h++){
     const c=chart(1996,6,d,h);const m=c.palaces.find((p)=>p.name==='命宮')!;
     if(m.stars.filter((s)=>s.kind==='major').map((s)=>s.name).sort().join()==='天同,太陰'){found=c;break;}
   }
   expect(found).toBeDefined();
   const c=structuredClone(found!);
   for(const p of c.palaces)p.stars=p.stars.filter((s)=>s.kind==='major').map((s)=>{const {sihua,...rest}=s;return rest;});
   expect(pivotRule(c,'decade')).toBeNull();
 });
 it('按日期分段，逐段保存本盤限制；正文建議與判讀來源分開',()=>{
   const backs=lifeStepsChapter({chart:tl,year:2026})!.segments.filter((s)=>s.slot==='回看');
   expect(backs.length).toBeGreaterThan(0);expect(backs.length).toBeLessThanOrEqual(3);
   for(const s of backs){
     expect(s.text.match(/[〇一二三四五六七八九]{4}年（/g)).toHaveLength(1);
     expect(s.referenceApplicability?.join('')).toContain('所處大限');
     expect(s.referenceConditions?.join('')).toContain('不是完整的重要年份名單');
     expect(s.statements!.filter((s)=>s.kind==='editorial-advice').every((s)=>s.citations.length===0)).toBe(true);
     for(const id of s.statements!.flatMap((s)=>s.citations)){const c=citation(id)!;expect(c).not.toBeNull();expect(c.quoteParts?.length).toBeGreaterThan(0);}
     expect(en(s.text).missing,s.text).toEqual([]);expect(ja(s.text).missing,s.text).toEqual([]);
   }
 });
 it('新引用保留完整前提及疑字註，舊書引用不靜默改寫',()=>{
   const old=citation('huigu.xingji')!,revised=citation('life.steps.v2:huigu.xingji')!;
   expect(old.text).not.toContain('天机化忌');
   expect(revised.text).toContain('天机化忌');expect(revised.text).toContain('权术的天府');
   expect(revised.sourceNote).toContain('提取疑字');expect(revised.text).toContain('擎丰');
   expect(citation('life.steps.v2:daxian.pivot.七殺.辰戌')!.text).toContain('对拱');
   expect(citation('life.steps.v2:daxian.pivot.天府.丑未')!.text).toContain('禄存化禄');
   expect(citation('life.steps.v2:huigu.xueguang')!.text).toContain('紫微天府');
   expect(citation('life.steps.v2:huigu.dieji')!.text).toContain('武曲七杀');
 });
});

it('PDF12武曲羊陀夾忌：真實盤的正例及破壞相夾後的反例',()=>{
 let positive:Chart|undefined;
 for(let m=1;m<=12&&!positive;m++)for(let h=0;h<24;h++){
  const c=chart(1990,m,1,h);const p=c.palaces.find((p)=>p.branch==='申')!;
  if(p.stars.some((s)=>s.name==='武曲')&&p.stars.some((s)=>s.name==='祿存')){positive=c;break;}
 }
 expect(positive).toBeDefined();
 const A=year(positive!,2032),event=lookBackEvent(positive!,A);
 expect(event?.kind).toBe('錢');
 expect(event?.sources.map((s)=>s.passage_id)).toEqual(['huigu.yangtuo.jiaji']);
 expect(event?.rules.join('')).toContain('不一定代表事業失敗');
 const c=structuredClone(positive!);
 for(const p of c.palaces)p.stars=p.stars.filter((s)=>!['擎羊','陀羅'].includes(s.name));
 const noFlank=structuredClone(A);
 for(const f of [noFlank.liuyao.annual,noFlank.liuyao.decadal])if(f){f.擎羊='子';f.陀羅='午';}
 expect(lookBackEvent(c,noFlank)).toBeNull();
});
