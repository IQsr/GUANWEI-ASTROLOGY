import {referenceSectionLabel} from '@/lib/cross-reference-language';
import {expect,it} from 'vitest';
import {coveredPageLocator,referencePageLabel} from '@/lib/reference-pages';
import {referencePresentation} from '@/lib/reference-presentation';
import {hans} from '@/lib/hans';

it('source headers retain actual nonconsecutive pages and complete continuous cross-page paragraphs',()=>{
 expect(referencePageLabel([{page:453},{page:454},{page:429},{page:431},{page:453}])).toBe('429、431、453–454');
 expect(referencePageLabel([{page:573,pageEnd:574}])).toBe('573–574');
 expect(referencePageLabel([{page:429,pageEnd:431},{page:435}])).toBe('429–431、435');
});

it('only a fully covered location-only note can be omitted; missing pages, qualifications and uncertainties remain',()=>{
 for(const convert of [(s:string)=>s,hans]){
  const note=convert('所引原段見PDF第453、454頁；起訖頁碼之間，並非每頁都有引文。');
  expect(coveredPageLocator(note,new Set([453,454]))).toBe(true);
  expect(coveredPageLocator(note,new Set([453]))).toBe(false);
  expect(coveredPageLocator(convert('所引原段見PDF第453–454頁。'),new Set([453,454]))).toBe(true);
  for(const extra of ['若見空劫，另論。','原頁字形存疑，不作判斷依據。','但這裡只讀本命。'])expect(coveredPageLocator(note+convert(extra),new Set([453,454]))).toBe(false);
 }
});

it('deduplicated background quotes leave no detached covered page locator; original notes, doubts, limits and other books survive',()=>{
 const raw='所引原段見PDF第573、574頁；起訖頁碼之間，並非每頁都有引文。';
 const part={id:'original',page:573,pageEnd:574,text:'原文；若有科文，另論。',note:'原頁疑字：t，照錄。'};
 const refs=[{id:'current',book:'A',quoteParts:[part]},
  {id:'background',book:'A',quoteParts:[part],sourceNote:raw+'但只限同度，會照不代替。原頁疑字保留。'},
  {id:'different-book',book:'B',quoteParts:[],sourceNote:raw},
  {id:'missing-page',book:'A',quoteParts:[],sourceNote:'所引原段見PDF第575頁。'}];
 const bg=[{label:'背景',description:'另讀',conditions:[],citationIds:['background','different-book','missing-page']}];
 const before=structuredClone({refs,bg});
 const out=referencePresentation([],refs,['original'],[],bg),shown=out.backgrounds[0]!.references;
 expect(shown[0]!.quoteParts).toEqual([]);
 expect(shown[0]!.sourceNote).toBe('但只限同度，會照不代替。原頁疑字保留。');
 expect(shown[1]!.sourceNote).toBe(raw);expect(shown[2]!.sourceNote).toContain('575');
 expect(out.directReferences[0]!.quoteParts).toEqual([part]);
 expect({refs,bg}).toEqual(before);
 // Non-background long references use the same coverage check; substantive notes still stay.
 const current=referencePresentation([],refs).references;
 expect(current[1]!.sourceNote).toBe('但只限同度，會照不代替。原頁疑字保留。');
 expect(current[2]!.sourceNote).toBe(raw);
 expect(current[3]!.sourceNote).toContain('575');
});

it('only adjacent identical palace headings collapse; other names, repeated subjects and original labels remain unchanged',()=>{
 for(const convert of [(s:string)=>s,hans]){
  for(const palace of ['財帛宮','福德宮','官祿宮']){
   const raw=convert(`下篇・宮垣論・${palace}・${palace}・篇首`);
   expect(referenceSectionLabel(raw)).toBe(convert(`下篇・宮垣論・${palace}・篇首`));
   expect(referenceSectionLabel(referenceSectionLabel(raw))).toBe(referenceSectionLabel(raw));
  }
 }
 const raw='下篇 · 福德宮 · 福德宮 · 福德宮 · 廉貞';
 expect(referenceSectionLabel(raw)).toBe('下篇 · 福德宮 · 廉貞');
 for(const section of ['下篇・財帛宮・福德宮・篇首','財帛宮・總論・財帛宮','天機・天機','下篇 · 官祿宮 · 天機','無分隔標題'])expect(referenceSectionLabel(section)).toBe(section);
});
