import {En,Ja,synthHeading} from '@guanwei/content';
/* 同 english.ts 嘅 plainEn 一樣：英文唔用 *斜體* 記號（唔 import，免得同 mingshu 兜圈） */
import type {ChapterReading} from './chapter-reading';
const plainEn=(s:string)=>s.replace(/\*([^*\n]+)\*/g,(_m:string,t:string)=>t);
type Segment=ChapterReading['segments'][number];
type Line=NonNullable<Segment['statements']>[number];

/*
 * 綜合判讀章（財帛等）英日快照（2026-11-11，Issac：英日版跟返新版本）。
 * 判斷、建議、說明句要句句譯得到先出新版；有一句譯唔到就回 null，英日讀者照舊讀成書當刻嘅舊章。
 * 證據句（盤面註記，synth-facts.ts 短語規則）譯唔到就淨係略過嗰句。
 */
export function localizeSynthesis(all:Segment[],core=all.length):ChapterReading['localized']|null{
  /* 財帛章尾接返嘅舊章段落（2026-11-13，`core` 之後嗰啲）：成段譯得到先出；有一句或者小標題譯唔到，嗰段喺呢個語言留空
     （段數句數照同中文一樣，讀嗰陣略過空段），唔好因為尾段拖到成章退返舊版。 */
  const segments=all.slice(0,core),tail=all.slice(core);
  const lines=segments.flatMap((s)=>s.statements??[]);
  const one=(locale:'en'|'ja')=>{
    const R=locale==='en'?En:Ja;
    const ok=(l:Line)=>!R.renderParagraphs([l.text]).missing.length;
    if(lines.some((l)=>l.kind!=='evidence'&&!ok(l)))return null;
    const keep=(l:Line)=>l.kind!=='evidence'||ok(l);
    const out=R.renderParagraphs(lines.filter(keep).map((l)=>l.text));
    if(out.missing.length)return null;
    let cursor=0;
    const extra=tail.map((s)=>{
      const blank={...s,heading:undefined,text:'',statements:(s.statements??[]).map((l)=>({...l,text:''}))};
      const heading=s.heading?(locale==='en'?En.headingEn(s.heading):Ja.headingJa(s.heading)):undefined;
      const r=R.renderParagraphs((s.statements??[]).map((l)=>l.text));
      if(!s.statements?.length||r.missing.length||(s.heading&&!heading))return blank;
      const statements=s.statements.map((l,i)=>{const text=locale==='en'?plainEn(r.paras[i]!):r.paras[i]!;return {...l,text,en:locale==='en'?text:l.en};});
      return {...s,heading:heading??undefined,text:statements.map((l)=>l.text).join(locale==='en'?' ':''),statements};
    });
    return [...segments.map((s)=>{
      // 句數要同中文一樣（readingOf 逐句核）：略過嘅句留空
      const statements=(s.statements??[]).map((l)=>{if(!keep(l))return {...l,text:''};const text=out.paras[cursor++]!;return {...l,text,en:locale==='en'?text:l.en};});
      const heading=s.heading?synthHeading(s.heading)?.[locale]:undefined;
      return {...s,heading,text:statements.map((l)=>l.text).filter(Boolean).join(locale==='en'?' ':''),statements};
    }),...extra];
  };
  const en=one('en'),ja=one('ja');
  return en&&ja?{version:'ming-translations-v1',en,ja}:null;
}
