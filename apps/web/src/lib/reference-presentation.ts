import {referenceEditorialWording} from './cross-reference-language';
export type ReferenceQuotePart = {id:string;blockIds?:string[];page:number;pageEnd?:number;text:string;note?:string};

/** Editorial notes only; the stored quote, conditions and source identities are never rewritten. */
export function referenceNoteSentences(text: string): string[] {
  return (text.match(/[^。！？]*[。！？]|[^。！？]+$/g) ?? []).map((sentence) => sentence.trim()).filter(Boolean);
}

/** Exact note deduplication only: different scopes, negations and complete original paragraphs stay distinct. */
export function referencePresentation<T extends {sourceNote?:string;book?:string;quoteParts?:ReferenceQuotePart[]}>(
  conditions:readonly string[], references:readonly T[], focus:readonly string[] = [], applicability:readonly string[] = [],
) {
  const normalize=(items:readonly string[])=>[...new Set(items.map((item)=>referenceEditorialWording(item).trim()).filter(Boolean))];
  const applicable=normalize(applicability);
  const alreadyShown=new Set(applicable);
  const shown=normalize(conditions).filter((condition)=>!alreadyShown.has(condition));
  const seen=new Set([...applicable,...shown].flatMap(referenceNoteSentences));
  const quoted=new Set<string>();
  const wanted=new Set(focus);
  const isDirect=(part:ReferenceQuotePart)=>[...(part.blockIds??[]),part.id].some((id)=>wanted.has(id));
  const all=references.map((reference)=>{
    const quoteParts=reference.quoteParts?.filter((part)=>{
      const key=JSON.stringify([reference.book,part.id,part.page,part.pageEnd,part.text,part.note]);
      if(quoted.has(key))return false;
      quoted.add(key);return true;
    });
    const sharedQuoteCount=reference.quoteParts ? reference.quoteParts.length-quoteParts!.length : 0;
    const presented={...reference,...(quoteParts ? {quoteParts,sharedQuoteCount}: {})};
    if(!reference.sourceNote)return presented;
    const sourceNote=referenceNoteSentences(referenceEditorialWording(reference.sourceNote)).filter((sentence)=>{
      if(seen.has(sentence))return false;
      seen.add(sentence);return true;
    }).join('');
    return {...presented,sourceNote:sourceNote||undefined};
  });
  const directReferences=all.flatMap((reference)=>{
    const parts=reference.quoteParts?.filter(isDirect);
    return parts?.length ? [{...reference,quoteParts:parts,sourceNote:undefined,sharedQuoteCount:0}] : [];
  });
  return {
    applicability:applicable,
    conditions:shown,
    directReferences,
    references:all.map((reference)=>reference.quoteParts
      ? {...reference,quoteParts:reference.quoteParts.filter((part)=>!isDirect(part))} : reference),
  };
}
