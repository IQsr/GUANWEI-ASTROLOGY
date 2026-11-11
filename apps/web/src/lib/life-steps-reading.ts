import {En,Ja,afterCondition,isLookbackZhOnly} from '@guanwei/content';
import type {ChapterReading} from './chapter-reading';
type Segment=ChapterReading['segments'][number];
type Line=NonNullable<Segment['statements']>[number];
/*
 * 2026-11-10（Issac：英日版跟返新版本）：回看新句（今年卡、全書後備、收尾句）都譯。
 * 一張卡嘅判斷句譯唔到 → 嗰種語言成組（條件、判斷、例子、證據）略過；淨係證據句譯唔到 → 只略過證據句。
 */
const cardOf=(l:Line)=>l.source_ids[0]!.replace(/\.(applies|example)$/,'');
function keepFor(lines:Line[],translates:(zh:string)=>boolean):(l:Line)=>boolean{
  const dead=new Set(lines.filter((l)=>isLookbackZhOnly(l.source_ids)&&l.kind==='interpretation'&&!translates(l.text)).map(cardOf));
  const kept=lines.filter((l)=>isLookbackZhOnly(l.source_ids)&&l.kind==='interpretation'&&!dead.has(cardOf(l)));
  return (l)=>{
    if(!isLookbackZhOnly(l.source_ids))return true;
    if(l.source_ids[0]==='lookback.close')return kept.length>0&&translates(l.text);
    if(dead.has(cardOf(l)))return false;
    return l.kind==='interpretation'||translates(l.text);
  };
}

/** Keep reviewed evidence in the saved snapshot; this narrative chapter does not show reference panels. */
export function lifeStepsReading(input:Segment[]):ChapterReading {
 const segments=input.map((s)=>({...s,referenceDisplay:'hidden' as const,statements:s.statements??[{text:s.text,en:'',kind:'evidence' as const,source_ids:[],citations:[]}]}));
 const all=segments.flatMap((s)=>s.statements);
 const keepEn=keepFor(all,(zh)=>!En.renderParagraphs([zh]).missing.length),keepJa=keepFor(all,(zh)=>!Ja.renderParagraphs([zh]).missing.length);
 const english=En.renderParagraphs(all.filter(keepEn).map((l)=>l.text)),japanese=Ja.renderParagraphs(all.filter(keepJa).map((l)=>l.text));
 const localized=(locale:'en'|'ja'):Segment[]=>{
   const keep=locale==='en'?keepEn:keepJa,out=locale==='en'?english:japanese;
   let cursor=0;return segments.map((s)=>{
     // 句數要同中文一樣（chapter-reading readingOf 逐句核）：略過嘅句留空
     let prev:string|undefined;
     const statements=s.statements.map((line)=>{if(!keep(line))return {...line,text:''};const raw=out.paras[cursor++]!;const text=afterCondition(locale,prev,raw);prev=text;return {...line,text,en:locale==='en'?text:line.en};});
     const texts=statements.map((l)=>l.text).filter(Boolean);
     return {...s,heading:undefined,text:texts.join(locale==='en'?' ':''),statements};
   });
 };
 // 讀嗰陣先譯嘅後備（舊書冇 localized）：照舊淨用盤面句
 const intl=(l:Line)=>!isLookbackZhOnly(l.source_ids);
 return {format:'ming-expanded-v1',writer:'life-steps-reader-v2',segments,
  international:{text:segments.map((s)=>s.statements.filter(intl).map((l)=>l.text).join('')).join('\n\n'),slots:segments.map((s)=>s.slot)},
  ...(!english.missing.length&&!japanese.missing.length?{localized:{version:'ming-translations-v1' as const,en:localized('en'),ja:localized('ja')}}:{})};
}
