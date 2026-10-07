import { describe, expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { En } from '@guanwei/content';
import { bookChapters } from '@/lib/mingshu';
import { chapterDrafts } from '@/lib/chengshu';

/**
 * 英文版：宮位章以外嘅八章（2026-10-05）。
 * 序、性格的骨架、身宮與五行局、一生十二步、這十年、這一年、給你的話 ——
 * （「三方四正」章 2026-10-07 併入骨架，新書唔再出；舊書嘅推力句照樣有英文）
 * 隨機 150 張盤逐句譯到、過英文檢查。加埋 en-palaces，成本書每一章都有英文。
 */
const DONE = ['序', '性格的骨架', '身宮與五行局', '一生十二步', '這十年', '這一年', '給你的話'];

describe('英文：宮位章以外嘅章', () => {
  it('150 張盤，七章逐句譯到，冇漏中文，過英文檢查', () => {
    const missing = new Set<string>();
    const lint = new Set<string>();
    const seen = new Set<string>();
    for (let i = 0; i < 150; i++) {
      const solar = { y: 1950 + ((i * 13) % 60), m: 1 + ((i * 7) % 12), d: 1 + ((i * 5) % 28) };
      const r = cast({ solar, time: { h: (i * 5) % 24, min: 40 }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: i % 2 ? 'female' : 'male' });
      if (!r.ok) continue;
      const drafts = chapterDrafts(bookChapters(r.value, { seed: String(i), year: 2026, solar, place: '香港' }) ?? [], 'en-test');
      for (const d of drafts.filter((x) => DONE.includes(x.slug))) {
        seen.add(d.slug);
        const out = En.renderChapter(d.body);
        out.missing.forEach((m) => missing.add(`${d.slug}：${m}`));
        En.scanEnglish(out.text).forEach((c) => lint.add(`${c}：${d.slug}`));
        expect(En.chapterTitleEn(d.title), d.title).toBeTruthy();
      }
    }
    expect([...seen].sort()).toEqual([...DONE].sort());
    expect([...missing]).toEqual([]);
    expect([...lint]).toEqual([]);
  }, 180_000);
});
