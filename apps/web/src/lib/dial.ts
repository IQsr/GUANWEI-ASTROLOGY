import type { Branch, Chart, Palace } from '@guanwei/ziwei/contract';
import type { ChartLayers } from '@/lib/layers';

/**
 * 章尾圓形星盤點出邊一格（2026-10-04）。
 *
 *   宮位章                                   嗰一宮
 *   性格的骨架、三方四正、序、一生十二步、給你的話   命宮
 *   身宮與五行局                               身宮
 *   這十年                                     大限命宮（左頁嘅大限層）
 *   這一年                                     流年命宮（左頁嘅流年層）
 *
 * 說明文字係書嘅內容（同章名一樣寫中文），唔跟介面語言轉。
 */
const MING_CHAPTERS = ['序', '性格的骨架', '三方四正', '一生十二步', '給你的話'];

function majors(chart: Chart, p: Palace): string[] {
  const own = p.stars.filter((s) => s.kind === 'major').map((s) => s.name);
  if (own.length) return own;
  const opp = p.borrowsFrom ? chart.palaces.find((x) => x.branch === p.borrowsFrom) : undefined;
  return opp ? opp.stars.filter((s) => s.kind === 'major').map((s) => s.name) : [];
}

const label = (name: string) => (name.endsWith('宮') ? name : `${name}宮`);

export function dialFor(
  chart: Chart,
  slug: string,
  layers: ChartLayers | null,
): { branch: Branch; stars: string[]; caption: string } | null {
  let p: Palace | undefined;
  let who: string;
  if (slug === '這十年' && layers?.decadal) {
    p = chart.palaces.find((x) => x.branch === layers.decadal!.ming);
    who = '這十年的大限命宮';
  } else if (slug === '這一年' && layers) {
    p = chart.palaces.find((x) => x.branch === layers.annual.ming);
    who = '這一年的流年命宮';
  } else if (slug === '身宮與五行局') {
    p = chart.palaces.find((x) => x.isShen);
    who = '身宮';
  } else if (MING_CHAPTERS.includes(slug) || slug === '這十年' || slug === '這一年') {
    p = chart.palaces.find((x) => x.name === '命宮');
    who = '命宮';
  } else {
    p = chart.palaces.find((x) => x.name === slug);
    who = p ? label(p.name) : '';
  }
  if (!p) return null;
  const stars = majors(chart, p);
  const own = p.stars.some((s) => s.kind === 'major');
  const tail = stars.length ? `${own ? '' : '借對宮 '}${stars.join('、')}` : '沒有主星';
  return { branch: p.branch, stars, caption: `${who}在${p.branch} · ${tail}` };
}
