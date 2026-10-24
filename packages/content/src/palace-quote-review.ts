/** PDF472 and PDF571 visually checked on 2026-10-23. These are notes, not silent textual emendations. */
const pageNotes: Record<string,string> = {
  'wtz.deep.p472.b005': '原頁疑字｜「太阳属阴火」在所據PDF第472頁亦如此。本節按太陰段落定位，這句的星名及五行字樣存疑；原文照錄，不據此新增太陽或五行判斷。',
  'wtz.deep.p571.b002': '原頁疑字｜「故福建省德宫」在所據PDF第571頁亦如此；照錄字形，未按語意猜改。',
  'wtz.deep.p571.b003': '原頁疑字｜「化忌0：」「遣求」「富屋费人」「町洋疾厄宫及命宫丽推断」在所據PDF第571頁亦如此；疑句照錄，不用來增加判斷。',
  'wtz.deep.p571.b004': '原頁疑字｜「裨上精神空虚」在所據PDF第571頁亦如此；照錄待校。',
  'wtz.deep.p571.b005': '原頁疑字｜「偏重二精神」在所據PDF第571頁亦如此；照錄待校。',
  'wtz.deep.p571.b007': '原頁疑字｜「不叮终日」在所據PDF第571頁亦如此；照錄待校。',
  'wtz.deep.p571.b009': '原頁疑字｜「晶评饮食」在所據PDF第571頁亦如此；照錄待校。',
};
export type QuotePart = { id: string; blockIds?: string[]; page: number; pageEnd?: number; text: string; note?: string };
type QuotedSource = { excerpt:string; quoteSpans?:readonly {id:string;start:number;end:number}[]; quoteBlocks?:readonly string[]; quotePages?:readonly number[] };

/** Keep a complete cross-page paragraph together; no fuzzy matching or substring-based quotation cuts. */
export function locatedQuoteParts(source: QuotedSource): QuotePart[] | undefined {
  if (source.quoteSpans?.length) {
    const parts: QuotePart[] = [];
    for (const [i,span] of source.quoteSpans.entries()) {
      const match=span.id.match(/\.p(\d+)\./); if(!match) return undefined;
      const page=Number(match[1]);
      const text=source.excerpt.slice(span.start,span.end);
      const previous=source.quoteSpans[i-1];
      const between=previous ? source.excerpt.slice(previous.end,span.start) : '';
      const last=parts.at(-1);
      if(last && !between.includes('……')) {
        const blockIds=[...(last.blockIds??[last.id]),span.id];
        const note=[last.note,pageNotes[span.id]].filter(Boolean).join('');
        parts[parts.length-1]={...last,id:blockIds.join('+'),blockIds,pageEnd:page,text:last.text+between+text,...(note?{note}:{})};
      } else parts.push({id:span.id,page,text,...(pageNotes[span.id]?{note:pageNotes[span.id]}:{})});
    }
    return parts;
  }
  if(source.quoteBlocks?.length && source.quotePages?.length) return [{
    id:source.quoteBlocks.join('+'),blockIds:[...source.quoteBlocks],page:source.quotePages[0]!,
    ...(source.quotePages[1]!>source.quotePages[0]! ? {pageEnd:source.quotePages[1]} : {}),text:source.excerpt,
  }];
  return undefined;
}
