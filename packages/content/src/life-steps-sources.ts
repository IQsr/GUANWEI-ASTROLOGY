import data from './daxian/life-sources.json';
const sources:Record<string,(typeof data.sources)[keyof typeof data.sources]>=data.sources;
export const lifeStepsCite=(id:string)=>`life.steps.v2:${id}`;
/** A new identity preserves the reference text of previously saved books. */
export function lifeStepsSource(id:string){return id.startsWith('life.steps.v2:')?sources[id.slice('life.steps.v2:'.length)]??null:null;}
