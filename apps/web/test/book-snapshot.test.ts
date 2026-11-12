import { it, expect } from 'vitest';
import { cast, type BirthInput } from '@guanwei/ziwei';
import { createBookChapters } from '@/lib/mingshu';
import { englishChapters } from '@/lib/english';
import samples from './fixtures/sample-charts.json';
import previews from '../src/lib/free-ming-preview.json';

/*
 * 最新版快照（2026-11-12，取代舊版樣本書存檔鎖）
 *
 * 用正式起書嘅同一條路（`createBookChapters`，開埋綜合判讀層）生成八本樣本書，
 * 中文同英文全文寫成文字檔放喺 `__snapshots__/books/`。
 *
 * 內容有改：行 `vitest run test/book-snapshot.test.ts -u` 更新快照，
 * PR diff 就會逐句顯示改咗乜 —— 睇過冇問題先 merge。唔使再登記改動或者加開關。
 */
type Sample = { id: string; input: BirthInput; seed?: string };
const CHARTS: Sample[] = [
  ...(samples as Sample[]),
  ...(previews as unknown as Omit<Sample, 'id'>[]).slice(0, 5).map((p, i) => ({ ...p, id: `preview-${i}` })),
];

it.each(CHARTS.map((c) => [c.id, c] as const))('book %s matches the current-version snapshot', async (id, c) => {
  const r = cast(c.input);
  if (!r.ok) throw Error(r.message);
  const book = createBookChapters(r.value, {
    seed: c.seed ?? 'sample', year: 2026, solar: c.input.solar, place: c.input.place.label,
    birthSex: c.input.sex, birthInput: c.input, synthesis: true,
  })!;
  const zh = book.map((ch) => `## ${ch.slug}${ch.title ? `（${ch.title}）` : ''}\n\n${ch.text}`).join('\n\n');
  const en = englishChapters(book).map((segs, i) => `## ${book[i]!.slug}\n\n${segs.map((s) => (s.heading ? `### ${s.heading}\n\n` : '') + s.text).join('\n\n')}`).join('\n\n');
  await expect(`${zh}\n`).toMatchFileSnapshot(`./__snapshots__/books/${id}.zh.md`);
  await expect(`${en}\n`).toMatchFileSnapshot(`./__snapshots__/books/${id}.en.md`);
}, 120000);
