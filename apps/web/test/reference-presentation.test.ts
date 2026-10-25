import {referenceEditorialWording} from '@/lib/cross-reference-language';
import { expect, it } from 'vitest';
import { referenceConditionParts, referenceNoteSentences, referencePresentation } from '@/lib/reference-presentation';

it('相同條件與來源註記只顯示一次，否定、例外及不同頁碼仍完整可見', () => {
  const condition = '採見空劫，不把三方當空劫夾；並不預告必分手。';
  const common = '各段不一定連續。原文字形及疑字照錄。';
  const refs = [
    {id:'one',page:403,text:'原文；若無煞，另論。',sourceNote:`${common}${condition}`},
    {id:'two',page:404,text:'另一原段；但此支有例外。',sourceNote:`${common}所引原段見PDF第404頁。`},
  ];
  const conditions = [condition,condition,'只有同宮才符合，三方會照不能代替。'];
  const before = structuredClone({conditions,refs});
  const out = referencePresentation(conditions,refs);
  expect(out.conditions).toEqual([condition,'只有同宮才符合，三方會照不能代替。']);
  expect(out.references[0]!.sourceNote).toBe(common);
  expect(out.references[1]!.sourceNote).toBe('所引原段見PDF第404頁。');
  expect(out.references.map((r) => [r.id,r.page,r.text])).toEqual(refs.map((r) => [r.id,r.page,r.text]));
  expect({conditions,refs}).toEqual(before);
});

it('不合併意思不同的條件，亦不跨條件句去刪字或改原文', () => {
  const conditions = ['子宮：若見火星，另論。','午宮：若無火星，另論。'];
  const refs = [{text:'不能改寫的原文。不能改寫的原文。',sourceNote:'若見火星，另論。若無火星，另論。'}];
  const out = referencePresentation(conditions,refs);
  expect(out.conditions).toEqual(conditions);
  expect(out.references[0]!.text).toBe(refs[0]!.text);
  expect(out.references[0]!.sourceNote).toBe(refs[0]!.sourceNote);
});

it('刪重後每一句來源說明至少仍出現一次；沒有來源註記不憑空補內容', () => {
  const conditions = ['本盤條件已確認。'];
  const refs = [{id:'a',sourceNote:'本盤條件已確認。原書仍有例外。'},{id:'b',sourceNote:'原書仍有例外。PDF第403頁。'},{id:'c'}];
  const out = referencePresentation(conditions,refs);
  const shown = [...out.conditions,...out.references.map((r) => r.sourceNote ?? '')].join('');
  for (const ref of refs) for (const sentence of referenceNoteSentences(ref.sourceNote ?? '')) expect(shown).toContain(sentence);
  expect(out.references[2]).toEqual({id:'c'});
});

it('只改編輯工作口吻，宮位、對宮、否定及疑字原文完全保留',()=>{
  const note='空福德借宮標記指向財帛同陰；借宮幾何由排盤契約核對，財福對讀由原書總論支持。';
  const caveat='215頁只支持機梁三合原有同陰結構，不是假稱原書有本樣本福德空宮專斷；未採用福德同陰所有同度分支。';
  const refs=[{book:'原書',text:note,quoteParts:[{id:'p1',page:215,text:note,note:'原頁疑字：化主。'}],sourceNote:caveat}];
  const original=structuredClone(refs),panel=referencePresentation([note],refs);
  expect(panel.conditions[0]).toContain('福德沒有主星，借對宮財帛的天同、太陰');
  expect(panel.conditions.join('')).not.toContain('排盤契約');
  expect(panel.references[0]!.sourceNote).not.toMatch(/假稱|本樣本/);
  expect(panel.references[0]!.sourceNote).toContain('並非這張盤福德空宮的專門判詞');
  expect(panel.references[0]!.sourceNote).toContain('未採用福德同陰所有同度分支');
  expect(panel.references[0]!.text).toBe(note);
  expect(panel.references[0]!.quoteParts).toEqual(original[0]!.quoteParts);
  expect(refs).toEqual(original);
});

it('頂部適用範圍已交代的完整條件不在下方重列，其他分支與限制仍在',()=>{
  const raw='這段將已列明的本命宮位連讀；原書各段與編輯綜合解說分開理解。';
  const normalized=referenceEditorialWording(raw);
  const conditions=[raw,'本宮若見甲，才採用。','對宮若無甲，不採用。'];
  const refs=[{text:'原段。',sourceNote:'先看星系，再連讀各宮。這裡把相關原段合讀，是編輯解說，並非原書對本盤的一句逐字判詞。另有日夜前提。'}];
  const before=structuredClone({conditions,refs});
  const panel=referencePresentation(conditions,refs,[],[normalized]);
  expect(panel.applicability).toEqual([normalized]);
  expect(panel.conditions).toEqual(['本宮若見甲，才採用。','對宮若無甲，不採用。']);
  expect(panel.references[0]!.sourceNote).toBe('先看星系，再連讀各宮。另有日夜前提。');
  expect({conditions,refs}).toEqual(before);
});


it('規則要求的標籤不令相同來源註記重複；本盤結果與原文仍分開保留',()=>{
 const limit='只限同宮；會照不能代替。',actual='核對本宮火星：未見所列配合。';
 const conditions=[`配合分支。規則要求與限制：${limit}本盤核對結果：${actual}適用判斷：不套用。`];
 const refs=[{book:'原書',text:limit,sourceNote:limit,quoteParts:[{id:'p1',page:1,text:limit}]}];
 const before=structuredClone({conditions,refs}),panel=referencePresentation(conditions,refs);
 expect(panel.conditions).toEqual(conditions);expect(panel.references[0]!.sourceNote).toBeUndefined();
 expect(panel.references[0]!.text).toBe(limit);expect(panel.references[0]!.quoteParts).toEqual(refs[0]!.quoteParts);
 expect({conditions,refs}).toEqual(before);
});


it('繁簡條件均分行呈現規則、本盤及判斷，每字與先後次序保留，普通限制不改',()=>{
 for(const text of [
  '分支。規則要求與限制：本宮須有天相；會照不能代替同度。本盤核對結果：未見。適用判斷：不套用。',
  '分支。规则要求与限制：本宫须有天相；会照不能代替同度。本盘核对结果：未见。适用判断：不套用。',
 ]){
  const parts=referenceConditionParts(text);expect(parts).toHaveLength(4);
  expect(parts.map(p=>p.label+p.text).join('')).toBe(text);
  expect(parts.slice(1).every(p=>p.label.length>0)).toBe(true);
 }
 const text='只有同宮才符合；未確認不等於沒有。';
 expect(referenceConditionParts(text)).toEqual([{label:'',text}]);
});
