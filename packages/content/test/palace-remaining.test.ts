import { setTestHuas } from './helpers/chart-mutations';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { cast, oppositeBranch, sanFangPalaces, type BirthInput, type Chart, type Palace } from '@guanwei/ziwei';
import { palaceReading } from '../src/palace-reader';
import { citation } from '../src/citation';
import data from '../src/cards/palace-remaining.json';
import audit from '../src/cards/palace-remaining-review.json';
import index from '../../../tools/wang-reference/deep-index.json';
import fixtures from '../../../apps/web/src/lib/free-ming-preview.json';
const run = (c: Chart, p: string) => palaceReading(c, p, 2026)!;
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const charts = fixtures.map((f) => { const r = cast(f.input as BirthInput); if (!r.ok) throw Error(r.message); return r.value; });
const pOf = (c: Chart, name: string) => c.palaces.find((p) => p.name === name)!;
const hasId = (c: Chart, p: string, id: string) => run(c, p).some((r) => r.statements.some((s) => s.source_ids.includes(id)));
const primary = (p: Palace) => p.stars.filter((s) => s.kind === 'major').map((s) => s.name).sort().join('+');
const chartFor = (p: string, key: string, branch?: string) => {
  const found = charts.find((c) => primary(pOf(c,p)) === key.split('+').sort().join('+') && (!branch || branch.includes(pOf(c,p).branch)));
  if (!found) throw Error(`Missing fixture ${p}/${key}/${branch}`); return structuredClone(found);
};
const remove = (c: Chart, names: string[]) => { for (const p of c.palaces) p.stars = p.stars.filter((s) => !names.includes(s.name)); };

it('九宮540選擇入口與54條條件綁定覆核；完整引段與跨頁逐段吻合原索引', () => {
  for (const p of data.palaces) expect(data.profiles.filter((r) => r.palace === p)).toHaveLength(60);
  expect(data.rules.filter((r) => !('since' in r))).toHaveLength(54);
  expect(data.rules.filter((r) => 'since' in r)).toHaveLength(21);
  expect(data.pdf_sha256).toBe(index.book.sha256);
  expect(audit.profiles.map((p) => p.id)).toEqual(data.profiles.map((p) => p.id));
  expect(audit.rules.map((r) => r.when)).toEqual(data.rules.map((r) => r.when));
  for (const [file, expected] of [['cards/palace-remaining.json',audit.data_sha256],['palace-remaining.ts',audit.reader_sha256]]) {
    expect(hash(readFileSync(new URL(`../src/${file}`,import.meta.url),'utf8').replace(/\r\n/g,'\n'))).toBe(expected);
  }
  const blocks = new Map(index.blocks.map((b) => [b.id,b]));
  for (const [id,s] of Object.entries(data.sources)) {
    const cited = citation(`palace.remaining.v1:${id}`)!;
    expect(cited.text).toBe(s.excerpt); expect(cited.page).toBe(s.quotePages[0]);
    expect(s.quoteSpans.map((b) => b.id)).toEqual(s.quoteBlocks);
    for (const part of s.quoteSpans) {
      const expected = s.block_sha256[part.id as keyof typeof s.block_sha256];
      expect(blocks.get(part.id)?.text_sha256,part.id).toBe(expected);
      expect(hash(s.excerpt.slice(part.start,part.end)),part.id).toBe(expected);
    }
    const pages = s.quoteBlocks.map((b) => blocks.get(b)!.pdf_page);
    expect(s.quotePages).toEqual([Math.min(...pages),Math.max(...pages)]);
    expect(s.sourceNote).toContain('完整原段'); expect(s.sourceNote).toContain('跨頁');
  }
});

it('72盤九宮覆蓋538個新實坐入口及借星；兩個已批樣稿沿用；不變更命盤', () => {
  const seen = new Set<string>(); let borrowed = 0; let retained = 0;
  for (const chart of charts) {
    const before = JSON.stringify(chart);
    for (const palace of data.palaces) {
      const rows = run(chart,palace); const p = pOf(chart,palace);
      expect(rows.length,palace).toBeGreaterThanOrEqual(4);
      const first = rows[0]!.statements.at(-1)!.source_ids[0]!;
      if (!p.borrowsFrom) {
        if (first.endsWith('-base') && rows[0]!.statements.at(-1)!.citations.some((id) => id.startsWith('palace.remaining.v1:'))) seen.add(first);
        else retained++;
      } else {
        borrowed++; expect(rows[0]!.text).toContain('本宮沒有主星');
        expect(rows[0]!.referenceConditions!.join('')).toContain('未把對宮的四化');
        expect(rows.flatMap((r) => r.statements).some((s) => s.kind === 'interpretation')).toBe(false);
      }
      for (const row of rows) {
        expect(row.text).toBe(row.statements.map((s) => s.text).join(''));
        expect(row.text.length).toBeGreaterThan(20);
        const ids = [...new Set(row.statements.flatMap((s) => s.citations))];
        if (ids.length) { expect(row.referenceConditions!.length).toBeGreaterThan(2); expect(ids.every((id) => citation(id)?.text)).toBe(true); }
      }
      if (palace === '疾厄') expect(rows.flatMap((r) => r.statements).some((s) => s.kind === 'interpretation')).toBe(false);
      expect(rows.at(-1)!.statements.flatMap((s) => s.citations)).toEqual([]);
    }
    expect(JSON.stringify(chart)).toBe(before);
  }
  expect(seen.size).toBe(538); expect(borrowed).toBeGreaterThan(0); expect(retained).toBeGreaterThan(0);
});

it('武府兄弟的命宮支持不能拿別宮輔弼代替', () => {
  const c = chartFor('兄弟','武曲+天府'); remove(c,['左輔','右弼']);
  pOf(c,'命宮').stars.push({name:'左輔',kind:'aux'});
  expect(hasId(c,'兄弟','siblings-wufu-help')).toBe(true);
  pOf(c,'命宮').stars = pOf(c,'命宮').stars.filter((s) => s.name !== '左輔');
  pOf(c,'兄弟').stars.push({name:'左輔',kind:'aux'});
  expect(hasId(c,'兄弟','siblings-wufu-help')).toBe(false);
});

it('空宮的真輔星參與會照，但不搬借入主星；移出四方即停用', () => {
  const c = chartFor('子女','紫微+貪狼'); remove(c,['左輔','右弼']);
  const p = pOf(c,'子女'); const empty = c.palaces.find((q) => q.branch === oppositeBranch(p.branch))!;
  expect(empty.borrowsFrom).toBeTruthy(); expect(primary(empty)).toBe('');
  empty.stars.push({name:'左輔',kind:'aux'},{name:'右弼',kind:'aux'});
  expect(hasId(c,'子女','children-zi-fubi')).toBe(true);
  const outside = c.palaces.find((q) => !sanFangPalaces(c.palaces,p.branch).includes(q))!;
  outside.stars.push(...empty.stars.filter((s) => s.name === '右弼'));
  empty.stars = empty.stars.filter((s) => s.name !== '右弼');
  expect(hasId(c,'子女','children-zi-fubi')).toBe(false);
});

it('機梁子女火星只限同宮；廉殺火鈴加廉祿的感情例外須同時成立', () => {
  const c = chartFor('子女','天機+天梁'); remove(c,['火星']);
  const p = pOf(c,'子女'); const opp = c.palaces.find((q) => q.branch === oppositeBranch(p.branch))!;
  opp.stars.push({name:'火星',kind:'aux'});
  expect(hasId(c,'子女','children-jiliang-fire')).toBe(false);
  opp.stars = opp.stars.filter((s) => s.name !== '火星'); p.stars.push({name:'火星',kind:'aux'});
  expect(hasId(c,'子女','children-jiliang-fire')).toBe(true);
  const l = chartFor('子女','廉貞+七殺'); remove(l,['火星','鈴星']);
  setTestHuas(l, { 廉貞: '祿' });
  expect(hasId(l,'子女','children-liansha-fire-lu')).toBe(false);
  pOf(l,'子女').stars.push({name:'鈴星',kind:'aux'});
  expect(hasId(l,'子女','children-liansha-fire-lu')).toBe(true);
  setTestHuas(l, { 廉貞: null });
  expect(hasId(l,'子女','children-liansha-fire-lu')).toBe(false);
});

it('命遷反向不可混用；武忌府科共存，機科僕役仍不增加穩定', () => {
  const z = chartFor('遷移','紫微+七殺'); setTestHuas(z, { 紫微: '權' });
  expect(hasId(z,'遷移','travel-zisha-quan')).toBe(true);
  expect(hasId(z,'遷移','travel-fu-opp-quan')).toBe(false);
  const f = chartFor('遷移','天府','巳亥'); setTestHuas(f, { 紫微: '權' });
  expect(hasId(f,'遷移','travel-fu-opp-quan')).toBe(true);
  const w = chartFor('財帛','武曲+天府');
  setTestHuas(w, { 武曲: '忌', 天府: '科' });
  expect(hasId(w,'財帛','wealth-wufu-ji-ke')).toBe(true);
  setTestHuas(w, { 武曲: '忌', 天府: null });
  expect(hasId(w,'財帛','wealth-wufu-ji-ke')).toBe(false);
  const j = chartFor('僕役','天機'); setTestHuas(j, { 天機: '科' });
  const row = run(j,'僕役').find((r) => r.statements.some((s) => s.source_ids.includes('friends-ji-ke')))!;
  expect(row.text).toContain('不增加穩定');
});

it('原書必要否定、例外及跨頁續文留在引用；青年末段保留閱讀方法', () => {
  const source = (id:string) => citation(`palace.remaining.v1:${id}`)!.text;
  expect(source('siblings-rule-po-lucun')).toContain('恰恰相反');
  expect(source('health-rule-sha-same')).toContain('若更兼见其它煞曜');
  expect(source('career-七殺+廉貞')).toContain('空劫不是');
  expect(source('wealth-廉貞+破軍')).toContain('破军化禄则不宜见火星');
  expect(source('wealth-廉貞+破軍')).toContain('与禄存同度者，则喜见火星');
  expect(source('travel-rule-fu-opp-quan')).toContain('创立事业，\n主远涉');
  const youth = cast({ ...(fixtures[0]!.input as BirthInput), solar:{y:2012,m:4,d:20} });
  if (!youth.ok) throw Error(youth.message);
  for (const p of data.palaces) expect(run(youth.value,p).at(-1)!.text).toContain('你仍在成長');
});
