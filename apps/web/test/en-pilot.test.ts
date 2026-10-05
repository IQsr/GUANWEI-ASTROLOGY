import { describe, expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { En } from '@guanwei/content';
import { bookChapters } from '@/lib/mingshu';
import { chapterDrafts } from '@/lib/chengshu';

/**
 * 英文版試做（2026-10-05）：示範盤（1990-03-21 14:20 香港，女）嘅命宮，逐句譯晒、過英文檢查。
 * 全書英文未做 —— 呢個測試只鎖住試做嗰章，等翻譯表同模板唔會靜靜雞壞。
 */
const r = cast({ solar: { y: 1990, m: 3, d: 21 }, time: { h: 14, min: 20 }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: 'female' });
const chs = r.ok ? bookChapters(r.value, { seed: 'sample', year: 2026, solar: { y: 1990, m: 3, d: 21 }, place: '香港' }) ?? [] : [];
const drafts = chapterDrafts(chs, 'sample');
const ming = drafts.find((d) => d.slug === '命宮')!;

describe('英文試做：示範盤命宮', () => {
  it('每一句都譯到（冇漏中文）', () => {
    const out = En.renderChapter(ming.body);
    expect(out.missing).toEqual([]);
    expect(out.text).not.toMatch(/[一-鿿]/);
    expect(out.text.split('\n\n')).toHaveLength(ming.slots.length);
    console.log(`EN ${En.chapterTitleEn(ming.title)}\n${out.text}`);
  });

  it('章名', () => {
    expect(En.chapterTitleEn(ming.title)).toBe('I · The Life Palace');
  });

  it('翻譯表全部過英文檢查', () => {
    for (const s of En.allEnglish()) expect(En.scanEnglish(s), s).toEqual([]);
  });
});
