import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cast, type BirthInput, type Chart } from '@guanwei/ziwei';
import { palaceReading, palaceReadingCiteId, PALACE_READER_PALACES } from '../src/palace-reader';
import { citation } from '../src/citation';
import data from '../src/cards/palace-readings.json';
import audit from '../src/cards/palace-readings-review.json';
import index from '../../../tools/wang-reference/deep-index.json';
import fixtures from '../../../apps/web/src/lib/free-ming-preview.json';

const input: BirthInput = { solar: { y: 1990, m: 3, d: 21 }, time: { h: 14, min: 20 }, sex: 'female',
  tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' } };
const result = cast(input); if (!result.ok) throw Error(result.message);
const chart = result.value;
const run = (c: Chart, palace: string) => palaceReading(c, palace, 2026)!;
const find = (c: Chart, palace: string, id: string) => run(c, palace).find((s) => s.statements.some((l) => l.source_ids.includes(id)));

it('十一宮154主題全部有語意審核紀錄、完整段落指紋與可解析新引用', () => {
  expect(data.palaces).toHaveLength(11);
  expect(audit.profiles).toHaveLength(154);
  const hash = createHash('sha256').update(readFileSync(new URL('../src/cards/palace-readings.json', import.meta.url), 'utf8').replace(/\r\n/g, '\n')).digest('hex');
  expect(hash).toBe(audit.data_sha256);
  expect(data.pdf_sha256).toBe(index.book.sha256);
  const blocks = new Map(index.blocks.map((b) => [b.id, b]));
  for (const [id, source] of Object.entries(data.sources)) {
    const chunks = source.excerpt.split('\n……\n');
    expect(chunks).toHaveLength(source.quoteBlocks.length);
    for (const [i, block] of source.quoteBlocks.entries()) {
      const expected = source.block_sha256[block as keyof typeof source.block_sha256];
      expect(blocks.get(block)?.text_sha256, block).toBe(expected);
      expect(createHash('sha256').update(chunks[i]!).digest('hex'), block).toBe(expected);
    }
    const pages = source.quoteBlocks.map((b) => blocks.get(b)!.pdf_page);
    expect(source.quotePages).toEqual([Math.min(...pages), Math.max(...pages)]);
    const c = citation(palaceReadingCiteId(id))!;
    expect(c.text).toBe(source.excerpt);
    expect(c.page).toBe(source.quotePages[0]);
    expect(c.pageEnd).toBe(source.quotePages[1]! > source.quotePages[0]! ? source.quotePages[1] : undefined);
    expect(c.sourceNote).toBe(source.sourceNote);
  }
  for (const p of data.palaces) {
    expect(p.profiles).toHaveLength(14);
    expect(new Set(p.profiles.map((r) => r.star)).size).toBe(14);
    for (const r of p.profiles) {
      const reviewed = audit.profiles.find((a) => a.palace === p.palace && a.star === r.star)!;
      expect(reviewed.sources).toEqual(r.sources);
      expect(reviewed.conditions).toEqual(r.conditions);
      for (const s of r.sources) expect(citation(palaceReadingCiteId(s))).not.toBeNull();
    }
  }
});

it('72合成盤的十一宮都有可讀稿；引用與編輯提示分開，借星不搬對宮條件', () => {
  const seen = new Set<string>();
  let borrowed = 0; let pairs = 0;
  for (const fixture of fixtures) {
    const r = cast(fixture.input as BirthInput); if (!r.ok) throw Error(r.message);
    for (const palace of PALACE_READER_PALACES) {
      const before = JSON.stringify(r.value);
      const rows = run(r.value, palace);
      expect(JSON.stringify(r.value)).toBe(before);
      expect(rows.length).toBeGreaterThanOrEqual(4);
      for (const s of rows) {
        expect(s.text).toBe(s.statements.map((l) => l.text).join(''));
        expect(s.text.length).toBeGreaterThan(20);
        const cites = s.statements.flatMap((l) => l.citations);
        if (cites.length) {
          expect(s.referenceConditions?.length).toBeGreaterThan(2);
          expect(cites.every((id) => citation(id))).toBe(true);
        }
        if (s.statements.every((l) => l.kind === 'editorial-advice')) expect(cites).toEqual([]);
      }
      const p = r.value.palaces.find((q) => q.name === palace)!;
      const own = p.stars.filter((s) => data.palaces[0]!.profiles.some((x) => x.star === s.name));
      if (own.length === 2) pairs++;
      if (!own.length) {
        borrowed++;
        expect(rows[0]!.text).toContain('本宮沒有主星');
        expect(rows[0]!.referenceConditions?.join('')).toContain('未把對宮的四化');
        expect(rows.flatMap((s) => s.statements).some((l) => l.kind === 'interpretation')).toBe(false);
      }
      for (const s of own) seen.add(`${palace}/${s.name}`);
    }
  }
  expect(borrowed).toBeGreaterThan(0); expect(pairs).toBeGreaterThan(0);
  // 覆蓋每宮十四星的正文路徑，不拿測試覆蓋率冒充所有分支已逐盤語意審核。
  expect(seen.size).toBe(154);
});

describe('已批財帛、官祿示範按實際條件選段', () => {
  it('本例保留太陽祿、天同忌、空劫與子午機的負荷和創業限制', () => {
    const wealth = find(chart, '財帛', 'wealth-taiyin-chenxu')!;
    expect(wealth.text).toContain('太陽化祿'); expect(wealth.text).toContain('天同化忌');
    expect(find(chart, '財帛', 'wealth-kongjie')!.text).toContain('地空');
    const career = find(chart, '官祿', 'career-tianji-ziwu-load')!;
    for (const modifier of ['天同化忌', '火星', '地空', '地劫']) expect(career.text).toContain(modifier);
    expect(career.referenceConditions?.join('')).toContain('命宮申會照');
    expect(find(chart, '官祿', 'career-tianji-ziwu-limit')!.text).toContain('開創新事業這一面');
  });
  it('逐項移除條件不錯帶四化；空劫會照不當成財帛同宮', () => {
    const c = structuredClone(chart);
    for (const p of c.palaces) for (const s of p.stars) if (s.name === '太陽' || s.name === '天同') delete s.sihua;
    expect(find(c, '財帛', 'wealth-taiyin-chenxu')).toBeUndefined();
    const wealth = c.palaces.find((p) => p.name === '財帛')!;
    const empty = wealth.stars.filter((s) => s.name === '地空' || s.name === '地劫');
    wealth.stars = wealth.stars.filter((s) => !empty.includes(s));
    c.palaces.find((p) => p.name === '命宮')!.stars.push(...empty);
    expect(find(c, '財帛', 'wealth-kongjie')).toBeUndefined();
    expect(find(c, '官祿', 'career-tianji-ziwu-load')!.text).not.toContain('天同化忌');
    expect(find(c, '官祿', 'career-tianji-ziwu-load')!.text).not.toContain('火鈴同度');
  });
  it('年少讀者不套用成人生活情境，疑字與必要例外不被剪掉', () => {
    const youth = cast({ ...input, solar: { y: 2012, m: 4, d: 20 } }); if (!youth.ok) throw Error(youth.message);
    for (const palace of PALACE_READER_PALACES) expect(run(youth.value, palace).at(-1)!.text).toContain('你仍在成長');
    const special = data.sources[data.special['career-tianji-ziwu-limit'] as keyof typeof data.sources];
    expect(special.excerpt).toContain('在午宫者'); expect(special.excerpt).toContain('在子宫');
    expect(special.sourceNote).toContain('不直接套用子宮');
    expect(data.sources[data.special['wealth-kongjie'] as keyof typeof data.sources].excerpt).toContain('贪狼化总');
  });
});
