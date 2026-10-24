import data from './cards/cross-palace-sources.json';
import {freeMingSource} from './free-ming-sources';
import {palaceReadingSource} from './palace-reader';
/** New citation namespace; all previously saved source identities remain unchanged. */
const sources:Record<string,(typeof data.sources)[keyof typeof data.sources]>=data.sources;
type Alias={legacyCiteId:string;quoteSpans:{id:string;start:number;end:number}[];sourceNote?:string};
const aliases:Record<string,Alias>=data.aliases;
export function crossPalaceSource(id:string){
  if(!id.startsWith('cross.reading.v1:'))return null;
  const key=id.slice('cross.reading.v1:'.length);
  if(sources[key])return sources[key];
  const alias=aliases[key];if(!alias)return null;
  const original=palaceReadingSource(alias.legacyCiteId)??freeMingSource(alias.legacyCiteId);
  return original?{...original,quoteSpans:alias.quoteSpans,...(alias.sourceNote?{sourceNote:alias.sourceNote}:{})}:null;
}
