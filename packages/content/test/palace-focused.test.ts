import { setTestHuas, moveTestStar, setTestBranch } from './helpers/chart-mutations';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { cast, type BirthInput, type Chart, type Palace } from '@guanwei/ziwei';
import { palaceReading } from '../src/palace-reader';
import { citation } from '../src/citation';
import data from '../src/cards/palace-focused.json';
import audit from '../src/cards/palace-focused-review.json';
import index from '../../../tools/wang-reference/deep-index.json';
import fixtures from '../../../apps/web/src/lib/free-ming-preview.json';
const input: BirthInput = { solar: { y: 1992, m: 9, d: 12 }, time: { h: 19, min: 41 }, sex: 'male', tz: 'Australia/Sydney', place: { lng: 151.2093, lat: -33.8688, label: '悉尼' } };
const result = cast(input); if (!result.ok) throw Error(result.message);
const chart = result.value;
const run = (c: Chart, p = '夫妻') => palaceReading(c, p, 2026)!;
const has = (c: Chart, heading: string, p = '夫妻') => run(c, p).some((s) => s.heading === heading);
const palace = (c: Chart, name: string) => c.palaces.find((p) => p.name === name)!;
const remove = (c: Chart, names: string[]) => { for (const p of c.palaces) p.stars = p.stars.filter((s) => !names.includes(s.name)); };

it('120組合／宮支與逐條修飾綁定核讀紀錄；引用保存完整原段及跨頁', () => {
  for (const p of ['夫妻', '田宅']) expect(data.profiles.filter((r) => r.palace === p)).toHaveLength(60);
  const hash = (path: string) => createHash('sha256').update(readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n')).digest('hex');
  expect(hash('../src/cards/palace-focused.json')).toBe(audit.data_sha256);
  expect(hash('../src/palace-focused.ts')).toBe(audit.reader_sha256);
  expect(data.pdf_sha256).toBe(index.book.sha256);
  expect(audit.profiles.map((p) => p.id)).toEqual(data.profiles.map((p) => p.id));
  expect(audit.rules.map((r) => r.when)).toEqual(data.rules.map((r) => r.when));
  const anchors = new Map(index.blocks.map((b) => [b.id, b]));
  for (const [id, s] of Object.entries(data.sources)) {
    const source = citation(`palace.focused.v1:${id}`)!;
    expect(source.text).toBe(s.excerpt); expect(source.page).toBe(s.quotePages[0]);
    for (const b of s.quoteBlocks) expect(anchors.get(b)?.text_sha256, b).toBe(s.block_sha256[b as keyof typeof s.block_sha256]);
    expect(s.quoteSpans.map((part) => part.id)).toEqual(s.quoteBlocks);
    for (const part of s.quoteSpans) expect(createHash('sha256').update(s.excerpt.slice(part.start, part.end)).digest('hex'),part.id)
      .toBe(s.block_sha256[part.id as keyof typeof s.block_sha256]);
    // 每個抽取段以原有字詞完整出現，原段順序及非連續省略標記由核讀資料保存。
    expect(s.sourceNote).toContain('完整原段'); expect(s.sourceNote).toContain('跨頁');
  }
  const join = Object.values(data.sources).find((s) => s.quoteBlocks.includes('wtz.deep.p555.b015'))!;
  expect(join.excerpt).toContain('事业上\n的承继');
});

it('72合成盤兩章完整選中實坐組合與借星；不拼兩條單星，不改命盤', () => {
  const seen = new Set<string>();
  for (const fixture of fixtures) {
    const r = cast(fixture.input as BirthInput); if (!r.ok) throw Error(r.message);
    const frozen = JSON.stringify(r.value);
    for (const name of ['夫妻', '田宅']) {
      const rows = run(r.value, name);
      expect(rows.length).toBeGreaterThanOrEqual(4);
      expect(rows[0]!.statements[0]!.kind).toBe('evidence');
      const p = palace(r.value, name);
      if (!p.borrowsFrom) seen.add(rows[0]!.statements.at(-1)!.source_ids[0]!);
      for (const row of rows) {
        expect(row.text).toBe(row.statements.map((s) => s.text).join(''));
        expect(row.text.length).toBeGreaterThan(20);
        const cites = [...new Set(row.statements.flatMap((s) => s.citations))];
        if (cites.length) { expect(row.referenceConditions!.length).toBeGreaterThan(2); expect(cites.every((id) => citation(id)?.text)).toBe(true); }
      }
      if (p.borrowsFrom) {
        expect(rows[0]!.text).toContain('本宮沒有主星');
        expect(rows[0]!.referenceConditions!.join('')).toContain('未把對宮的四化');
        expect(rows.flatMap((r) => r.statements).some((s) => s.kind === 'interpretation')).toBe(false);
      }
      expect(rows.at(-1)!.statements.flatMap((s) => s.citations)).toEqual([]);
    }
    expect(JSON.stringify(r.value)).toBe(frozen);
  }
  expect(seen.size).toBe(120);
});

it('已批廉破地劫、陽巨陀鈴樣稿按實際盤面出段；空宮的真輔星仍參與核對', () => {
  expect(has(chart, '有共同生活，也要有感情上的連結')).toBe(true);
  const spouse = run(chart).find((s) => s.heading === '有共同生活，也要有感情上的連結')!;
  expect(spouse.text).toContain('地劫在夫妻宮酉同宮');
  expect(spouse.text).toContain('地空在福德宮丑三方會照');
  const property = run(chart, '田宅').find((s) => s.heading === '這張盤，要把助力與牽扯一起讀')!;
  expect(property.text).toContain('陀羅在兄弟宮戌三方會照');
  expect(property.text).toContain('鈴星在子女宮申對照');
  expect(property.text).not.toContain('鈴星在田宅宮寅同宮');
});

it('移除必要前提即停用修飾；會照不能觸發廉貞火星同宮分支', () => {
  const c = structuredClone(chart); remove(c, ['地空', '地劫']);
  expect(has(c, '有共同生活，也要有感情上的連結')).toBe(false);
  palace(c, '命宮').stars.push({ name: '地空', kind: 'aux' });
  expect(has(c, '有共同生活，也要有感情上的連結')).toBe(false);
  moveTestStar(c, '火星', palace(c, '夫妻'));
  expect(has(c, '環境造成的距離，要另作一層觀察')).toBe(true);
  palace(c, '夫妻').stars = palace(c, '夫妻').stars.filter((s) => s.name !== '火星');
  expect(has(c, '環境造成的距離，要另作一層觀察')).toBe(false);
});

function synthetic(stars: string[], branch: Palace['branch']): Chart {
  const c = structuredClone(chart); const p = palace(c, '夫妻');
  setTestBranch(c, p, branch); delete p.borrowsFrom;
  const outside = c.palaces.find((q) => q !== p)!;
  for (const star of [...p.stars]) if (!stars.includes(star.name)) moveTestStar(c, star.name, outside);
  for (const name of stars) moveTestStar(c, name, p);
  return c;
}
it('辰戌貪狼火鈴與亥陰忌例外有獨立路徑；改宮支後不錯帶', () => {
  const c = synthetic(['貪狼', '火星'], '辰');
  expect(has(c, '這組火鈴，不能套用始熱終冷')).toBe(true);
  setTestBranch(c, palace(c, '夫妻'), '子');
  expect(has(c, '這組火鈴，不能套用始熱終冷')).toBe(false);
  const yin = synthetic(['太陰'], '亥'); setTestHuas(yin, { 太陰: '忌' });
  expect(has(yin, '這個化忌，保留能夠協助的一面')).toBe(true);
  setTestBranch(yin, palace(yin, '夫妻'), '巳');
  expect(has(yin, '這個化忌，保留能夠協助的一面')).toBe(false);
});
