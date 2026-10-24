import { natalSihuaCoverage, type Chart, type Palace, type Sihua } from '@guanwei/ziwei';

/** Hypothetical condition fixtures, not claims that these hua assignments represent a real birth. */
export function setTestHuas(chart: Chart, requested: Record<string, Sihua | null>): void {
  const stars=chart.palaces.flatMap((p)=>p.stars);
  for(const star of stars)delete star.sihua;
  for(const [name,hua] of Object.entries(requested)){
    const star=stars.find((s)=>s.name===name);if(!star)throw Error(`Missing fixture star ${name}`);
    if(hua)star.sihua=hua;
  }
  for(const hua of ['祿','權','科','忌'] as const){
    if(stars.some((s)=>s.sihua===hua))continue;
    const filler=stars.find((s)=>!s.sihua&&!(s.name in requested));
    if(!filler)throw Error('Incomplete hypothetical hua fixture');
    filler.sihua=hua;
  }
  if(natalSihuaCoverage(chart).status!=='available')throw Error('Conflicting hypothetical hua fixture');
}

export function moveTestStar(chart: Chart, name: string, target: Palace): void {
  const star=chart.palaces.flatMap((p)=>p.stars).find((s)=>s.name===name);
  if(!star)throw Error(`Missing fixture star ${name}`);
  for(const p of chart.palaces)p.stars=p.stars.filter((s)=>s.name!==name);
  target.stars.push(star);
}

/** Swap coordinates so twelve branches remain unique when exercising a branch condition. */
export function setTestBranch(chart: Chart, target: Palace, branch: Palace['branch']): void {
  const other=chart.palaces.find((p)=>p.branch===branch)!;
  other.branch=target.branch;target.branch=branch;
}
