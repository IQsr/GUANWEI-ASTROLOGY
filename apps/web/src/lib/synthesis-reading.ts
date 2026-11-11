import {En,Ja} from '@guanwei/content';
import type {ChapterReading} from './chapter-reading';
type Segment=ChapterReading['segments'][number];
type Line=NonNullable<Segment['statements']>[number];

/*
 * 綜合判讀章（財帛等）英日快照（2026-11-11，Issac：英日版跟返新版本）。
 * 判斷、建議、說明句要句句譯得到先出新版；有一句譯唔到就回 null，英日讀者照舊讀成書當刻嘅舊章。
 * 證據句（盤面註記，synth-facts.ts 短語規則）譯唔到就淨係略過嗰句。
 */
export function localizeSynthesis(segments:Segment[]):ChapterReading['localized']|null{
  const lines=segments.flatMap((s)=>s.statements??[]);
  const one=(locale:'en'|'ja')=>{
    const R=locale==='en'?En:Ja;
    const ok=(l:Line)=>!R.renderParagraphs([l.text]).missing.length;
    if(lines.some((l)=>l.kind!=='evidence'&&!ok(l)))return null;
    const keep=(l:Line)=>l.kind!=='evidence'||ok(l);
    const out=R.renderParagraphs(lines.filter(keep).map((l)=>l.text));
    if(out.missing.length)return null;
    let cursor=0;
    return segments.map((s)=>{
      // 句數要同中文一樣（readingOf 逐句核）：略過嘅句留空
      const statements=(s.statements??[]).map((l)=>{if(!keep(l))return {...l,text:''};const text=out.paras[cursor++]!;return {...l,text,en:locale==='en'?text:l.en};});
      return {...s,heading:undefined,text:statements.map((l)=>l.text).filter(Boolean).join(locale==='en'?' ':''),statements};
    });
  };
  const en=one('en'),ja=one('ja');
  return en&&ja?{version:'ming-translations-v1',en,ja}:null;
}
