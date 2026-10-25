import referenceLanguage from './cross-reference-language.json';
import type {ReferenceQuotePart} from './reference-presentation';

/** Exact pages occupied by the displayed original paragraphs, including continuous cross-page text. */
export function referencePages(parts:readonly Pick<ReferenceQuotePart,'page'|'pageEnd'>[]):number[]{
  return [...new Set(parts.flatMap(part=>{
    const end=part.pageEnd??part.page;
    if(!Number.isInteger(part.page)||!Number.isInteger(end)||part.page<1||end<part.page)return [];
    return Array.from({length:end-part.page+1},(_,i)=>part.page+i);
  }))].sort((a,b)=>a-b);
}

/** Consecutive pages form a range; a gap stays explicit instead of implying an unquoted page. */
export function referencePageLabel(parts:readonly Pick<ReferenceQuotePart,'page'|'pageEnd'>[]):string{
  const pages=referencePages(parts),ranges:string[]=[];
  for(let i=0;i<pages.length;i++){
    const start=pages[i]!;let end=start;
    while(pages[i+1]===end+1){i++;end=pages[i]!;}
    ranges.push(end===start?String(start):`${start}–${end}`);
  }
  return ranges.join('、');
}

/** Only the exact generated location-only note is eligible; restrictions and uncertainty remain intact. */
export function coveredPageLocator(sentence:string,covered:ReadonlySet<number>):boolean{
  const match=referenceLanguage.sourceLocationPatterns.map(pattern=>sentence.match(new RegExp(pattern))).find(Boolean);
  if(!match)return false;
  const ranges=match[1]!.split(/[、，,]/).map(value=>value.split(/[–—－-]/).map(Number));
  if(ranges.some(range=>range.length>2||range.some(page=>!Number.isInteger(page)||page<1)||range.length===2&&range[1]!<range[0]!))return false;
  const pages=referencePages(ranges.map(range=>({page:range[0]!,pageEnd:range[1]??range[0]!})));
  return pages.length>0&&pages.every(page=>covered.has(page));
}
