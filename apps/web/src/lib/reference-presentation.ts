import {coveredPageLocator, referencePages} from './reference-pages';
import {referenceEditorialWording} from './cross-reference-language';
import referenceLanguage from './cross-reference-language.json';
export type ReferenceBackground={label:string;description:string;conditions:string[];citationIds:string[]};
export type ReferenceQuotePart = {id:string;blockIds?:string[];page:number;pageEnd?:number;text:string;note?:string};

/** Editorial notes only; the stored quote, conditions and source identities are never rewritten. */
export function referenceNoteSentences(text: string): string[] {
  return (text.match(/[^。！？]*[。！？]|[^。！？]+$/g) ?? []).map((sentence) => sentence.trim()).filter(Boolean);
}

/** Exact note deduplication only: different scopes, negations and complete original paragraphs stay distinct. */
export function referencePresentation<T extends {id?:string;sourceNote?:string;book?:string;quoteParts?:ReferenceQuotePart[]}>(
  conditions:readonly string[], references:readonly T[], focus:readonly string[] = [], applicability:readonly string[] = [], background:readonly ReferenceBackground[] = [],
) {
  const normalize=(items:readonly string[])=>[...new Set(items.map((item)=>referenceEditorialWording(item).trim()).filter(Boolean))];
  const applicable=normalize(applicability);
  const alreadyShown=new Set(applicable);
  const shown=normalize(conditions).filter((condition)=>!alreadyShown.has(condition));
  // Section labels identify editorial roles; they must not defeat exact note deduplication.
  const noteKey=(sentence:string)=>{
    const label=referenceLanguage.sectionLabels.find(label=>sentence.startsWith(label));
    return label ? sentence.slice(label.length) : sentence;
  };
  const seen=new Set([...applicable,...shown,...background.flatMap(group=>normalize(group.conditions))].flatMap(referenceNoteSentences).map(noteKey));
  const quoted=new Set<string>();
  const wanted=new Set(focus);
  const isDirect=(part:ReferenceQuotePart)=>[...(part.blockIds??[]),part.id].some((id)=>wanted.has(id));
  const backgroundIds=new Set(background.flatMap(group=>group.citationIds));
  const coveredByBook=new Map<string,Set<number>>();
  for(const reference of references){
    if(!reference.book||!reference.quoteParts?.length)continue;
    const pages=coveredByBook.get(reference.book)??new Set<number>();
    for(const page of referencePages(reference.quoteParts))pages.add(page);
    coveredByBook.set(reference.book,pages);
  }
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
      // Pure locators already represented by this book's visible quote headers add no information.
      const covered=reference.book?coveredByBook.get(reference.book):undefined;
      if(covered&&coveredPageLocator(sentence,covered))return false;
      const key=noteKey(sentence);
      if(seen.has(key))return false;
      seen.add(key);return true;
    }).join('');
    return {...presented,sourceNote:sourceNote||undefined};
  });
  const active=all.filter(reference=>!reference.id||!backgroundIds.has(reference.id));
  const backgrounds=background.map(group=>({...group,conditions:normalize(group.conditions).map(note=>referenceLanguage.backgroundPhrases.reduce((text,[before,after])=>text.replaceAll(before!,after!),note)),references:all.filter(reference=>reference.id&&group.citationIds.includes(reference.id))}));
  const directReferences=active.flatMap((reference)=>{
    const parts=reference.quoteParts?.filter(isDirect);
    return parts?.length ? [{...reference,quoteParts:parts,sourceNote:undefined,sharedQuoteCount:0}] : [];
  });
  return {
    applicability:applicable,
    conditions:shown,
    directReferences,
    backgrounds,
    references:active.map((reference)=>reference.quoteParts
      ? {...reference,quoteParts:reference.quoteParts.filter((part)=>!isDirect(part))} : reference),
  };
}


/** Display editorial roles on separate lines; concatenation still reproduces the exact stored condition. */
export function referenceConditionParts(text:string):{label:string;text:string}[]{
  const roles=referenceLanguage.sectionLabels.map(label=>({label,index:text.indexOf(label)})).filter(role=>role.index>=0).sort((a,b)=>a.index-b.index);
  if(roles.length!==3)return [{label:'',text}];
  return [
    ...(roles[0]!.index ? [{label:'',text:text.slice(0,roles[0]!.index)}] : []),
    ...roles.map((role,i)=>({label:role.label,text:text.slice(role.index+role.label.length,roles[i+1]?.index??text.length)})),
  ];
}
