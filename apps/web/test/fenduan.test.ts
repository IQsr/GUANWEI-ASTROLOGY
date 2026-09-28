import { describe, expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { legacyFrameTexts, transitionBank } from '@guanwei/content';
import { chaptersOf, restoreParagraphs } from '@/lib/mingshu';
import { needsResplit, resplit } from '@/lib/fenduan';

/**
 * 舊書讀嗰陣分段（2026-09）
 *
 * 2026-09 之前寫落 DB 嘅宮位章係成章 `join('')`、冇 slots。R-008 唔准改 DB，
 * 所以讀嗰陣用盤同 token 重砌、逐字對返先分段。
 *
 * 呢度守三樣嘢：
 * 1. 分完段，將段接返埋一定等於原本存咗嘅字 —— 一個字都冇多、冇少、冇改
 * 2. 舊書入面嘅過場句認得返，自己一段
 * 3. 對唔上（字改過、年唔啱、token 唔啱）就原封不動，唔會喺錯位斷句
 */

describe('resplit', () => {
  const segs = [
    { slot: '章首', text: '甲。' },
    { slot: '結構', text: '乙乙。' },
    { slot: '留白', text: '丙。' },
  ];

  it('逐段對得上就分段', () => {
    expect(resplit('甲。乙乙。丙。', segs, [])).toEqual({ text: '甲。\n\n乙乙。\n\n丙。', slots: ['章首', '結構', '留白'] });
  });

  it('過場句自己一段', () => {
    expect(resplit('甲。乙乙。接著。丙。', segs, ['接著。'])).toEqual({
      text: '甲。\n\n乙乙。\n\n接著。\n\n丙。',
      slots: ['章首', '結構', '過場', '留白'],
    });
  });

  it('改過一個字、多咗尾、唔喺句庫嘅橋 → 唔分', () => {
    expect(resplit('甲。乙丁。丙。', segs, [])).toBeNull();
    expect(resplit('甲。乙乙。丙。多', segs, [])).toBeNull();
    expect(resplit('甲。乙乙。自己作。丙。', segs, ['接著。'])).toBeNull();
  });

  /** 2026-09 章首同收束句改寫過：舊書入面係舊句，都要認得返 */
  it('舊句（改寫之前嗰句）都認得，包括前面有過場句', () => {
    const alt = (slot: string) => (slot === '章首' ? ['舊甲。'] : slot === '留白' ? ['舊丙。'] : []);
    expect(resplit('舊甲。乙乙。接著。舊丙。', segs, ['接著。'], alt)).toEqual({
      text: ['舊甲。', '乙乙。', '接著。', '舊丙。'].join('\n\n'),
      slots: ['章首', '結構', '過場', '留白'],
    });
    /* 唔係舊句名單入面嘅，照舊唔分 */
    expect(resplit('亂寫。乙乙。丙。', segs, [], alt)).toBeNull();
  });

  it('淨係冇分段嘅舊章先要分', () => {
    expect(needsResplit({ text: '甲乙', slots: [] })).toBe(true);
    expect(needsResplit({ text: '甲\n\n乙', slots: [] })).toBe(false);
    expect(needsResplit({ text: '甲乙', slots: ['結構'] })).toBe(false);
    expect(needsResplit({ text: null, slots: [] })).toBe(false);
  });
});

describe('restoreParagraphs：真引擎', () => {
  const r = cast({
    solar: { y: 1990, m: 6, d: 16 },
    time: { h: 7, min: 34 },
    sex: 'female',
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
  });
  if (!r.ok) throw new Error('排唔到盤');
  const chart = r.value;
  const seed = '5f1c6a8e-3b0d-4c2a-9e7f-1a2b3c4d5e6f';
  const palaces = chaptersOf(chart, { seed, year: 2026 })!;
  /** 舊書嗰種存法：成章 join('')、冇 slots */
  const stored = palaces.map((c) => ({ slug: c.palace as string, text: c.segments.map((s) => s.text).join(''), slots: [] as string[] }));

  it('十二章全部分返，接返埋一個字都冇變', () => {
    const out = restoreParagraphs(stored, { chart, seed, years: [2026] });
    out.forEach((ch, i) => {
      expect(ch.slots.length, ch.slug).toBeGreaterThan(2);
      expect(ch.text!.split('\n\n').join(''), ch.slug).toBe(stored[i]!.text);
      expect(ch.slots, ch.slug).toEqual(palaces[i]!.segments.map((s) => s.slot));
    });
  });

  it('舊書有過場句：認得返，格名「過場」', () => {
    const t = transitionBank('結構', '牽動')[0]!.text;
    const ming = palaces[0]!;
    const at = ming.segments.findIndex((s) => s.slot === '牽動');
    const text = [...ming.segments.slice(0, at).map((s) => s.text), t, ...ming.segments.slice(at).map((s) => s.text)].join('');
    const [out] = restoreParagraphs([{ slug: ming.palace, text, slots: [] }], { chart, seed, years: [2026] });
    expect(out!.slots[at]).toBe('過場');
    expect(out!.text!.split('\n\n')[at]).toBe(t);
    expect(out!.text!.split('\n\n').join('')).toBe(text);
  });

  it('2026-09 之前嘅舊書：章首同收束句係舊句，照樣分得返', () => {
    const ming = palaces[0]!;
    const old = ming.segments.map((s) =>
      s.slot === '章首'
        ? legacyFrameTexts('命宮', 'open')[0]!
        : s.slot === '留白' && s.source_id?.startsWith('frame.close')
          ? legacyFrameTexts('命宮', 'close')[2]!
          : s.text,
    );
    const text = old.join('');
    const [out] = restoreParagraphs([{ slug: ming.palace, text, slots: [] }], { chart, seed, years: [2026] });
    expect(out!.slots).toEqual(ming.segments.map((s) => s.slot));
    expect(out!.text!.split('\n\n')).toEqual(old);
  });

  it('成書年份喺後備年份入面都搵得返', () => {
    const [out] = restoreParagraphs([stored[0]!], { chart, seed, years: [2027, 2026] });
    expect(out!.slots.length).toBeGreaterThan(2);
  });

  it('token 唔啱、字改過 → 原封不動', () => {
    const [wrongSeed] = restoreParagraphs([stored[0]!], { chart, seed: 'another', years: [2026] });
    const edited = { ...stored[1]!, text: stored[1]!.text.replace('。', '，') };
    const [wrongText] = restoreParagraphs([edited], { chart, seed, years: [2026] });
    /* seed 只揀收束句；若果揀中同一句，分段一樣係啱嘅 —— 所以只要求：分就一定逐字對得返 */
    expect(wrongSeed!.text!.split('\n\n').join('')).toBe(stored[0]!.text);
    expect(wrongText).toBe(edited);
  });

  it('新章同冇字嘅章唔郁', () => {
    const fresh = { slug: '命宮', text: '甲\n\n乙', slots: ['結構', '留白'] };
    const locked = { slug: '官祿', text: null, slots: [] };
    const out = restoreParagraphs([fresh, locked], { chart, seed, years: [2026] });
    expect(out[0]).toBe(fresh);
    expect(out[1]).toBe(locked);
  });
});
