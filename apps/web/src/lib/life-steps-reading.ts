import {En,Ja,isLookbackZhOnly} from '@guanwei/content';
import type {ChapterReading} from './chapter-reading';
type Segment=ChapterReading['segments'][number];
/** Keep reviewed evidence in the saved snapshot; this narrative chapter does not show reference panels. */
export function lifeStepsReading(input:Segment[]):ChapterReading {
 const segments=input.map((s)=>({...s,referenceDisplay:'hidden' as const,statements:s.statements??[{text:s.text,en:'',kind:'evidence' as const,source_ids:[],citations:[]}]}));
 // 2026-11-10：回看新句（今年卡、全書後備、收尾句）只有中文，英日版略過，照舊淨講盤面
 const intl=(l:{source_ids:string[]})=>!isLookbackZhOnly(l.source_ids);
 const lines=segments.flatMap((s)=>s.statements.filter(intl));
 const english=En.renderParagraphs(lines.map((l)=>l.text)),japanese=Ja.renderParagraphs(lines.map((l)=>l.text));
 const localized=(locale:'en'|'ja'):Segment[]=>{
   let cursor=0;return segments.map((s)=>{
     // 句數要同中文一樣（chapter-reading readingOf 逐句核）：中文獨有句留空
     const statements=s.statements.map((line)=>{if(!intl(line))return {...line,text:''};const text=(locale==='en'?english:japanese).paras[cursor++]!;return {...line,text,en:locale==='en'?text:line.en};});
     return {...s,heading:undefined,text:statements.map((l)=>l.text).filter(Boolean).join(locale==='en'?' ':''),statements};
   });
 };
 return {format:'ming-expanded-v1',writer:'life-steps-reader-v2',segments,
  international:{text:segments.map((s)=>s.statements.filter(intl).map((l)=>l.text).join('')).join('\n\n'),slots:segments.map((s)=>s.slot)},
  ...(!english.missing.length&&!japanese.missing.length?{localized:{version:'ming-translations-v1' as const,en:localized('en'),ja:localized('ja')}}:{})};
}
