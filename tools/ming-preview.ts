/** 本機編輯預覽。輸出來自真正 writeMing，沒有按日期指定成稿。 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { cast, SCHOOL_PROFILE, type Chart } from '../packages/ziwei/src/index';
import { writeMing } from '../packages/content/src/ming-writer';

const samples = [
  { solar: { y: 1990, m: 5, d: 15 }, time: { h: 10, min: 0 }, sex: 'male' as const, tz: 'Asia/Taipei', place: { lng: 121.5654, lat: 25.033, label: '台北' } },
  { solar: { y: 1996, m: 7, d: 18 }, time: { h: 3, min: 30 }, sex: 'male' as const, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' } },
  { solar: { y: 1984, m: 11, d: 2 }, time: { h: 21, min: 15 }, sex: 'female' as const, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' } },
];
const output: { label: string; chart: Chart }[] = samples.map((input) => {
  const r = cast(input); if (!r.ok) throw Error(JSON.stringify(r));
  return { label: `${input.solar.y}-${input.solar.m}-${input.solar.d} ${input.time.h}:${String(input.time.min).padStart(2, '0')} ${input.place.label} ${input.sex === 'male' ? '男' : '女'}`, chart: r.value };
});
let seed = 20261020;
const rnd = (n: number) => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n); };
const want = new Set([1, 7, 11, 21, 45]);
for (let i = 0; i < 20000 && want.size; i++) {
  const input = { solar: { y: 1950 + rnd(60), m: 1 + rnd(12), d: 1 + rnd(28) }, time: { h: rnd(24), min: rnd(60) }, sex: i % 2 ? 'male' as const : 'female' as const, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' } };
  const r = cast(input); if (!r.ok) continue;
  const m = writeMing(r.value); const n = m.system?.n;
  if (!n || !want.has(n) || !m.sections.length) continue;
  want.delete(n);
  output.push({ label: `抽樣 ${input.solar.y}-${input.solar.m}-${input.solar.d} ${input.time.h}:${String(input.time.min).padStart(2, '0')} 香港 ${input.sex === 'male' ? '男' : '女'}`, chart: r.value });
}
if (want.size) throw Error('沒有抽齊預覽星系');
const path = resolve(process.argv[2] ?? 'tmp/ming-expanded-generated.md');
const counts: number[] = [];
const sections = output.map(({ label, chart }, i) => {
  const m = writeMing(chart);
  counts.push((m.text.zh.match(/[\u3400-\u9fff]/g) ?? []).length);
  const citations = [...new Set(m.sections.flatMap((s) => s.citations))];
  return `## ${i + 1}. ${label}｜${m.system!.name}\n\n${m.text.zh}\n\n編輯核對：來源 ${citations.join('、')}。本盤另有 ${m.omitted?.length ?? 0} 張命中卡未在核讀範圍，沒有輸出。`;
});
mkdirSync(dirname(path), { recursive: true });
writeFileSync(path, '# 命宮展開寫作層：實際自動輸出\n\n以下八篇均由同一個 `writeMing(chart)` 預設路徑生成。前三張沿用閱讀比較稿的輸入，另外五張由固定種子抽取；沒有人工替換正文。情境與建議屬編輯內容，正文只採本次核讀放行的判斷。此檔是可重建的編輯預覽，不是原書全文。\n\n' + sections.join('\n\n---\n\n') + '\n');
console.log(JSON.stringify({ path, schoolProfile: SCHOOL_PROFILE.ref, chapters: counts.length, cjkCharacters: counts }));
