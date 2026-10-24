import { expect, it } from 'vitest';
import { cast, type BirthInput, type Chart } from '@guanwei/ziwei';
import { palaceReading, palaceNarrative, readerReferenceLanguage, citation } from '@guanwei/content';
import { referencePresentation, referenceNoteSentences } from '@/lib/reference-presentation';
import { bookChapters, citesFor } from '@/lib/mingshu';
import { markBook } from '@/lib/zhu';
import { readingSegments } from '@/lib/chapter-reading';
import samples from './fixtures/palace-before.json';

const charts = samples.map((s) => { const c=cast(s.input as BirthInput);if(!c.ok)throw Error(c.message);return {id:s.id,chart:c.value}; });
const chart = (id: string) => charts.find((s) => s.id===id)!.chart;
const read = (c: Chart,p: string) => palaceNarrative(c,p,2026,palaceReading(c,p,2026)!);

it('借武貪財帛完成所得與投入的解釋，不將對宮武曲化忌當本宮修飾', () => {
  const c=chart('A');const rows=read(c,'財帛');const follow=rows.find((r)=>r.statements.some((s)=>s.source_ids.includes('wealth-武曲+貪狼-丑未-follow')))!;
  expect(follow.heading).toBe('借武貪，先看所得與投入');
  expect(follow.text).toContain('時間、應酬與後續責任');
  expect(follow.text).not.toMatch(/不能只寫|仍要保留|本盤武曲.*化忌/);
  expect(follow.referenceConditions!.join('')).toContain('祿權又遇文曲化忌');
});

it('父母原書三項四化未齊與齊備分開；借星不採實坐的個人分支', () => {
  const c=chart('C');
  expect(read(c,'父母').map((r)=>r.text).join('')).toContain('未見齊廉貞化祿、破軍化權、武曲化科');
  const full=structuredClone(c);
  for(const p of full.palaces)for(const s of p.stars){if(s.name==='廉貞')s.sihua='祿';if(s.name==='破軍')s.sihua='權';if(s.name==='武曲')s.sihua='科';}
  const text=read(full,'父母').map((r)=>r.text).join('');
  expect(text).toContain('見廉貞化祿、破軍化權、武曲化科同會');
  expect(text).toContain('列為兩代感情融洽與提攜的支持');
  expect(text).not.toContain('未見齊');
  const outside=structuredClone(full);const parent=outside.palaces.find((p)=>p.name==='父母')!;
  parent.stars=parent.stars.filter((s)=>s.kind!=='major');
  const borrowed=read(outside,'父母').map((r)=>r.text).join('');
  expect(borrowed).not.toContain('本盤父母宮三方四正見廉貞化祿');
});

it('武曲化忌只按福德本宮採用，補引完整原段；移到對宮不保留該解讀', () => {
  const c=chart('A');const rows=read(c,'福德');
  expect(rows.map((r)=>r.text).join('')).toContain('本盤武曲在福德宮丑化忌');
  const extra='palace.remaining.v1:wellbeing-武曲';
  expect(rows.flatMap((r)=>r.statements.flatMap((s)=>s.citations))).toContain(extra);
  expect(citation(extra)!.text).toContain('若武曲于福德宫化忌');
  const other=structuredClone(c);other.palaces.find((p)=>p.name==='福德')!.stars.find((s)=>s.name==='武曲')!.sihua=undefined;
  other.palaces.find((p)=>p.name==='財帛')!.stars.push({ ...c.palaces.find((p)=>p.name==='福德')!.stars.find((s)=>s.name==='武曲')! });
  const changed=read(other,'福德');
  expect(changed.map((r)=>r.text).join('')).not.toContain('本盤武曲在福德宮丑化忌');
  expect(changed.flatMap((r)=>r.statements.flatMap((s)=>s.citations))).not.toContain(extra);
});

it('點名的短第二段有完整解釋；官祿的據沒有未收尾的引句', () => {
  const friends=read(chart('TL'),'僕役').find((r)=>r.statements.some((s)=>s.source_ids.includes('friends-破軍+紫微-丑未-follow')))!;
  expect(friends.text).toContain('原先有人分擔的事');
  expect(friends.text).toContain('相處仍然融洽');
  expect(friends.text).not.toMatch(/知識、分工|交接/);
  expect(friends.text.match(/。/g)!.length).toBeGreaterThanOrEqual(3);
  const wellbeing=read(chart('A'),'福德').find((r)=>r.statements.some((s)=>s.source_ids.includes('wellbeing-武曲+貪狼-丑未-follow')))!;
  expect(wellbeing.text).toContain('已有成果能否真正帶來滿足');
  for(const r of read(chart('TL'),'官祿'))for(const c of r.referenceConditions??[])expect(readerReferenceLanguage(c)).not.toMatch(/[：:]$/);
});

it('實際夫妻據刪重後每項條件、原文與獨特註記仍在，空劫說明只顯示一次', () => {
  const s=samples.find((s)=>s.id==='A')!;const chapters=bookChapters(chart('A'),{seed:s.seed,year:2026,solar:s.input.solar,place:s.input.place.label})!;
  const c=chapters.find((c)=>c.slug==='夫妻')!;const marked=markBook([{palace:c.slug,segments:readingSegments(c.text,c.slots,c.reading)}]);
  const refs=citesFor(marked);const row=c.reading!.segments.find((s)=>s.statements?.some((line)=>line.source_ids.includes('rule-00')))!;
  const refsInRow=[...new Set(row.statements!.flatMap((s)=>s.citations))].map((id)=>refs[id]!);
  const before=structuredClone({conditions:row.referenceConditions,refsInRow});
  const panel=referencePresentation(row.referenceConditions!,refsInRow);
  const all=[...panel.conditions,...panel.references.map((s)=>s.sourceNote??'')].join('');
  expect(all.split('與相鄰兩宮的空劫夾法分開').length-1).toBe(1);
  for(const condition of row.referenceConditions!)expect(panel.conditions).toContain(condition);
  for(const reference of refsInRow)for(const sentence of referenceNoteSentences(reference.sourceNote??''))expect(all).toContain(sentence);
  expect(panel.references.map((s)=>s.text)).toEqual(refsInRow.map((s)=>s.text));
  expect({conditions:row.referenceConditions,refsInRow}).toEqual(before);
});
