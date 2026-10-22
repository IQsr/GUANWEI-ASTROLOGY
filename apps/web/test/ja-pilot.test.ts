import { describe, expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { Ja } from '@guanwei/content';
import { bookChapters } from '@/lib/mingshu';
import { chapterDrafts } from '@/lib/chengshu';

/**
 * 日文版試做（2026-10-15）：示範盤（1990-03-21 14:20 香港，女）嘅命宮，逐句譯晒、過日文檢查。
 * 全書日文未做 —— 呢個測試只鎖住試做嗰章，等翻譯表同模板唔會靜靜雞壞。對照稿：docs/ja-pilot.md。
 */
const r = cast({ solar: { y: 1990, m: 3, d: 21 }, time: { h: 14, min: 20 }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: 'female' });
const chs = r.ok ? bookChapters(r.value, { seed: 'sample', year: 2026, solar: { y: 1990, m: 3, d: 21 }, place: '香港' }) ?? [] : [];
const drafts = chapterDrafts(chs, 'sample');
const ming = drafts.find((d) => d.slug === '命宮')!;
const previous = ming.reading?.internationalSnapshot;
const source = previous?.reading?.international ?? previous ?? ming.reading?.international ?? { text: ming.body, slots: ming.slots };

describe('日文試做：示範盤命宮', () => {
  it('每一句都譯到，段數不變，過日文檢查', () => {
    const out = Ja.renderChapter(source.text);
    expect(out.missing).toEqual([]);
    expect(out.text.split('\n\n')).toHaveLength(source.slots.length);
    expect(Ja.scanJapanese(out.text)).toEqual([]);
  });

  it('章名', () => {
    expect(Ja.chapterTitleJa(ming.title)).toBe('一 · 命宮');
    expect(Ja.chapterTitleJa('八 · 僕役')).toBe('八 · 交友宮');
  });

  it('翻譯表全部過日文檢查', () => {
    for (const s of Ja.allJapanese()) expect(Ja.scanJapanese(s), s).toEqual([]);
  });

  it('日文檢查捉得到漏譯', () => {
    expect(Ja.scanJapanese('你的命宮坐天同。')).not.toEqual([]);
    expect(Ja.scanJapanese('天同が化祿になる。')).not.toEqual([]);
  });
});
