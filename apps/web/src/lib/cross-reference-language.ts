import data from './cross-reference-language.json';

/** Reviewed editorial wording only. Quotes, quote-part notes and star conditions are not interpreted here. */
export function referenceEditorialWording(text:string):string{
  return data.phrases.reduce((value,[before,after])=>value.replaceAll(before!,after!),text);
}

/** Display only: remove adjacent repeated palace headings, retaining all other section hierarchy and spelling. */
export function referenceSectionLabel(section:string):string{
  const parts=section.split(/([・·])/),result=[parts[0]??''];
  let previous=parts[0]?.trim();
  for(let i=2;i<parts.length;i+=2){
    const label=parts[i]!,current=label.trim();
    if(current===previous&&data.palaceSectionNames.includes(current))continue;
    result.push(parts[i-1]!,label);previous=current;
  }
  return result.join('');
}
