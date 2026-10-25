import data from './cards/book-p1-sources.json';
const sources:Record<string,(typeof data.sources)[keyof typeof data.sources]>=data.sources;
/** Additive namespace: existing saved quotations are never repointed. */
export function bookP1Source(id:string){return id.startsWith('book.p1.v1:')?sources[id.slice('book.p1.v1:'.length)]??null:null;}
