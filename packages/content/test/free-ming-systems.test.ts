import { setTestHuas } from './helpers/chart-mutations';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { cast, sanFangPalaces, type BirthInput } from '@guanwei/ziwei';
import { freeMingReading } from '../src/free-ming-reader';
import { citation } from '../src/citation';
import data from '../src/cards/free-ming-systems.json';
import review from '../src/cards/free-ming-systems-review.json';
import index from '../../../tools/wang-reference/deep-index.json';

const hash = (path: string) => createHash('sha256').update(readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n')).digest('hex');
it('全部星系稿、讀過的原段、選段與來源指紋綁定；三組先行稿沒有被通用稿取代', () => {
  expect(data.profiles.map((p) => p.n)).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
  expect(data.profiles.filter((p) => p.scope === 'borrowed-only').map((p) => p.n)).toEqual([17, 55, 60]);
  expect(data.pdf_sha256).toBe(index.book.sha256);
  expect(hash('../src/cards/free-ming-systems.json')).toBe(review.data_sha256);
  expect(hash('../src/free-ming-systems.ts')).toBe(review.selector_sha256);
  const blocks = new Map(index.blocks.map((b) => [b.id, b]));
  for (const [id, s] of Object.entries(data.sources)) {
    expect(blocks.get(id), id).toMatchObject({ text_sha256: s.sha256, pdf_page: s.page, section_title: s.section });
    expect(s.excerpt.length).toBeGreaterThan(0); expect(s.excerpt.length).toBeLessThanOrEqual(400);
    expect(citation(`free.systems.v1:${id}`), id).toMatchObject({ author: '王亭之', page: s.quotePages[0], text: s.excerpt, excerpt: true });
  }
  for (const p of data.profiles) {
    const reviewed = review.sections.find((s) => s.n === p.n)!;
    const ids = [...p.lead.sources, ...p.detail.sources, ...p.bone.sources, ...p.limit.sources, ...p.signals.flatMap((s) => s.sources)];
    for (const id of ids) {
      expect(id in data.sources, `${p.n}/${id}`).toBe(true);
      expect(reviewed.read_blocks, `${p.n}/${id}`).toContain(id);
    }
    expect(p.conditions).not.toBe('');
  }
});

const input = (solar: BirthInput['solar'], time: BirthInput['time']): BirthInput => ({ solar, time, sex: 'female', tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' } });
const chart = (b: BirthInput) => { const r = cast(b); if (!r.ok) throw Error(r.message); return r.value; };

it('太陰單項四化修飾只看實際同宮星與指定四化，不以另一星化忌代替', () => {
  const profile = data.profiles.find((p) => p.n === 4)!;
  // 找一張同星系實盤，再隔離四化；mutation僅測必要條件，並非宣稱真實出生。
  let found: ReturnType<typeof chart> | undefined;
  for (let m = 1; m <= 12 && !found; m++) for (let h = 0; h < 24 && !found; h += 2) {
    const c = chart(input({ y: 1982, m, d: 15 }, { h, min: 20 }));
    const ming = c.palaces.find((p) => p.name === '命宮')!;
    if (['巳', '亥'].includes(ming.branch) && ming.stars.some((s) => s.name === '太陰')) found = c;
  }
  expect(found).toBeDefined();
  const moon = found!.palaces.find((p) => p.name === '命宮')!.stars.find((s) => s.name === '太陰')!;
  setTestHuas(found!, { 太陰: '忌' });
  const selected = (c: typeof found) => freeMingReading(c!, 2026)!.ming.flatMap((p) => p.statements).flatMap((s) => s.source_ids);
  const signal = profile.signals.find((s) => s.hua === '忌')!.id;
  expect(selected(found)).toContain(signal);
  setTestHuas(found!, { 太陰: null, 天機: '忌' });
  const four = sanFangPalaces(found!.palaces, found!.palaces.find((p) => p.name === '命宮')!.branch);
  // The alternative hua is already assigned to 天機, with four-hua coverage preserved.
  expect(selected(found)).not.toContain(signal);
});

it('相對比較及疑句保留：紫殺不走極端、天梁不跨星系排名、府科版本不混用', () => {
  expect(data.profiles.find((p) => p.n === 53)!.lead.text).toContain('多數人並不走到極端');
  expect(data.profiles.find((p) => p.n === 44)!.lead.text).toContain('不代表比所有其他星系都安定');
  expect(data.profiles.find((p) => p.n === 25)!.limit.text).toContain('庚干與壬干不同的存疑');
  expect(data.profiles.find((p) => p.n === 35)!.conditions).toContain('不轉為自動定類');
  expect(data.sources['wtz.deep.p194.b005'].excerpt).toContain('通常无如此强烈的极端性质');
  expect(data.sources['wtz.deep.p166.b009'].excerpt).toContain('并不代表比其它星系稳定');
});
