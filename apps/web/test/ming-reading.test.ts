import { describe, expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { citeOf, writeMing } from '@guanwei/content';
import { bookChapters, citesFor, localizeMarked } from '@/lib/mingshu';
import { chapterDrafts, readingContentVersion } from '@/lib/chengshu';
import { readingOf, readingSegments } from '@/lib/chapter-reading';
import { markBook } from '@/lib/zhu';
import { englishChapters } from '@/lib/english';
import { japaneseChapters } from '@/lib/japanese';
import { hans } from '@/lib/hans';
import { buildAsks, leadsFromBodies } from '@/lib/wenmu';
import { focusOf } from '@/lib/suidu';

const solar = { y: 1984, m: 8, d: 16 };
const birth = { solar, time: { h: 12, min: 0 }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: 'female' as const };
const r = cast(birth);
if (!r.ok) throw Error('cast');
const chart = r.value;
const sources = bookChapters(chart, { seed: 'reading', year: 2026, solar, place: '香港' })!;
const drafts = JSON.parse(JSON.stringify(chapterDrafts(sources, readingContentVersion('rules@test')))) as ReturnType<typeof chapterDrafts>;
const ming = drafts.find((d) => d.slug === '命宮')!;
const marked = markBook([{ palace: '命宮', segments: readingSegments(ming.body, ming.slots, ming.reading) }]);

describe('繁簡命宮展開版：生成 → 存檔 → 書頁', () => {
  it('正文用真實展開稿，段落、逐句資料及版本一同存下', () => {
    expect(ming.content_version).toBe('rules@test+ming-expanded-v1');
    expect(readingOf(ming.reading, ming.body)).toEqual(ming.reading);
    expect(ming.slots).toContain('展開');
    const actual = writeMing(chart).sections.flatMap((s) => s.parts).filter((p) => p.part !== '因為').map((p) => p.zh);
    const body = readingSegments(ming.body, ming.slots, ming.reading).filter((s) => s.slot !== '因為').map((s) => s.text);
    expect(body).toEqual(actual);
    expect(ming.reading!.segments.at(-1)!.slot).toBe('因為');
    expect(marked[0]!.segments.some((s) => s.heading === '本質')).toBe(true);
    expect(marked[0]!.segments.filter((s) => s.heading === '盤面與出處')).toHaveLength(1);
  });

  it('來源可解析為書名、PDF 頁序及章節，例子／建議不冒充原書', () => {
    const notes = citesFor(marked);
    expect(Object.keys(notes).length).toBeGreaterThan(0);
    for (const n of Object.values(notes)) {
      expect(n.book).toContain('王亭之');
      expect(n.page).toBeGreaterThan(0);
      expect(n.pageConvention).toBe('pdf');
      expect(n.section).not.toBe('');
      expect(n.text.length).toBeGreaterThan(0);
      expect(n.text.length).toBeLessThanOrEqual(150);
      expect(n.excerpt).toBe(true);
    }
    const editorial = marked[0]!.segments.filter((s) => ['情境', '做法'].includes(s.slot));
    expect(editorial.length).toBeGreaterThan(0);
    for (const s of editorial) expect(s.runs.some((r) => r.cite)).toBe(false);
  });

  it('簡體轉正文及小標，來源 ID 與頁碼不變', () => {
    const simplified = localizeMarked(marked, 'zh-Hans');
    expect(simplified[0]!.segments[0]!.heading).toBe(hans('本質'));
    expect(simplified[0]!.segments.flatMap((s) => s.runs.filter((r) => r.cite))).toEqual(marked[0]!.segments.flatMap((s) => s.runs.filter((r) => r.cite)));
    expect(citesFor(simplified, 'zh-Hans')).toMatchObject(Object.fromEntries(Object.entries(citesFor(marked)).map(([id, n]) => [id, { page: n.page, pageConvention: 'pdf' }])));
  });

  it('顯式標成編輯例子的句子，即使撞中舊句索引也不掛原書', () => {
    const text = '這一年，錢這一方面，你的財祿有增加的機會；工作上的計劃容易卡住或要返工。';
    expect(citeOf(text)?.length).toBeGreaterThan(0);
    const annotated = markBook([{ palace: '命宮', segments: [{ slot: '情境', text, statements: [
      { text, en: '', kind: 'editorial-example', source_ids: [], citations: ['not-a-quote'] },
    ] }] }]);
    expect(annotated[0]!.segments[0]!.runs.some((r) => r.cite)).toBe(false);
  });

  it('舊書照讀存檔原文；新資料與正文不符時不掛錯來源', () => {
    const old = '你的命宮坐紫微。';
    expect(readingSegments(old, ['開場'])).toEqual([{ slot: '開場', text: old }]);
    expect(readingOf(ming.reading, ming.body + '改動')).toBeNull();
    const bad = markBook([{ palace: '命宮', segments: readingSegments(ming.body + '改動', ming.slots, ming.reading) }]);
    expect(bad[0]!.segments.flatMap((s) => s.runs).some((r) => r.cite)).toBe(false);
    expect(readingOf({ format: 'ming-expanded-v1', segments: [null], international: {} }, '')).toBeNull();
  });

  it('英日沿用成書時保存的舊版，目次與正文一致並可譯出', () => {
    const chs = drafts.map((d) => ({ text: d.body, slots: d.slots, reading: d.reading }));
    const i = drafts.indexOf(ming);
    const legacy = ming.reading!.international;
    expect(legacy.text).not.toBe(ming.body);
    for (const translated of [englishChapters(chs)[i]!, japaneseChapters(chs)[i]!]) {
      expect(translated.map((s) => s.slot)).toEqual(legacy.slots);
      expect(translated.map((s) => s.text).join('')).not.toContain('〔');
    }
    const leads = leadsFromBodies(drafts);
    const zh = buildAsks(leads, 'zh-Hant').find((a) => a.slug === '命宮')!;
    expect(zh.answer).toBe(ming.body.split('\n\n')[0]);
    expect(zh.sources.length).toBeGreaterThan(0);
    expect(buildAsks(leads, 'en').find((a) => a.slug === '命宮')!.answer).toBe(englishChapters(chs)[i]![0]!.text);
  });

  it('年少讀者不套成人情境與建議；隨讀高亮分清解讀與編輯段', () => {
    const solar = { y: 2012, m: 8, d: 16 };
    const young = cast({ ...birth, solar });
    if (!young.ok) throw Error('cast');
    const m = bookChapters(young.value, { seed: 'young', year: 2026, solar, place: '香港' })!.find((c) => c.slug === '命宮')!;
    expect(m.slots).not.toContain('情境');
    expect(m.reading!.segments.flatMap((s) => s.statements ?? []).some((l) => l.kind === 'editorial-advice')).toBe(false);
    expect(focusOf('展開')).toBe('palace');
    expect(focusOf('情境')).toBe('none');
    expect(focusOf('做法')).toBe('none');
  });
});
