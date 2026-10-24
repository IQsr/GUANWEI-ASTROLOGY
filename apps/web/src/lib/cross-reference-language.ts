import data from './cross-reference-language.json';

/** Reviewed editorial wording only. Quotes, quote-part notes and star conditions are not interpreted here. */
export function referenceEditorialWording(text:string):string{
  return data.phrases.reduce((value,[before,after])=>value.replaceAll(before!,after!),text);
}
