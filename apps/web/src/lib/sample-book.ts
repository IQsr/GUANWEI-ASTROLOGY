import 'server-only';
import { cast } from '@guanwei/ziwei';
import type { Chart as ZChart } from '@guanwei/ziwei/contract';
import { bookChapters } from '@/lib/mingshu';
import { chapterDrafts, type ChapterDraft } from '@/lib/chengshu';
import { chartLayers } from '@/lib/layers.server';
import type { ChartLayers } from '@/lib/layers';
import type { ChapterMeta } from '@/lib/juan-view';
import { SAMPLE_BOOK } from '@/lib/journey';

/**
 * 示範命書（2026-10-04 · `/sample`）
 *
 * 首頁「看一本示範命書」：未落款嘅訪客，可以先睇吓一本書係點 —— 用真嘅閱讀介面、真嘅內容庫，
 * 只係生辰係虛構嘅。全書開晒（包括深度章），等人睇到畀錢之後有乜。
 *
 * ⚠ 唔寫 DB、唔讀 session：成本書喺 build 嗰陣由引擎計出嚟，所有人見到同一份。
 * ⚠ 檔名特登唔叫 `*.server`：`check-privacy` 當 import `*.server` 嘅頁係撈用戶資料、唔准靜態；呢度冇用戶資料，要靜態。
 * ⚠ 生辰同 `/tokens/shuzhuo` 一樣（1990-03-21 14:20 香港，女）—— 內容團隊睇慣呢個盤。
 */
const BIRTH = {
  solar: { y: 1990, m: 3, d: 21 },
  time: { h: 14, min: 20 },
  tz: 'Asia/Hong_Kong',
  place: { lng: 114.17, lat: 22.32, label: '香港' },
  sex: 'female' as const,
};

export type SampleBook = {
  chart: ZChart;
  layers: ChartLayers | null;
  year: number;
  drafts: ChapterDraft[];
  chapters: ChapterMeta[];
};

let memo: SampleBook | null = null;

export function sampleBook(): SampleBook | null {
  if (memo) return memo;
  const r = cast(BIRTH);
  if (!r.ok) return null;
  /* 寫書嗰年 = build 嗰年（同真書一樣：寫低嗰年就唔變） */
  const year = new Date().getFullYear();
  const sources = bookChapters(r.value, { seed: SAMPLE_BOOK, year, solar: BIRTH.solar, place: BIRTH.place.label });
  if (!sources) return null;
  const drafts = chapterDrafts(sources, SAMPLE_BOOK);
  memo = {
    chart: r.value,
    layers: chartLayers(r.value, year),
    year,
    drafts,
    chapters: drafts.map((d) => ({ id: d.slug, slug: d.slug, title: d.title, ord: d.ord, tier: d.tier })),
  };
  return memo;
}
