import { it, expect } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { createBookChapters } from '@/lib/mingshu';
import { chapterDrafts } from '@/lib/chengshu';
import { englishChapters } from '@/lib/english';
import { japaneseChapters } from '@/lib/japanese';
import { readingOf } from '@/lib/chapter-reading';

/* 綜合判讀層開關（docs/synthesis-switch-on-plan.md）：只換錢、今年兩章正文；章名、編號、英日照舊。 */
const BIRTHS = [[1974, 1, 13, 8], [1965, 5, 25, 12], [2004, 9, 25, 0]] as const;

it('開咗綜合判讀層：章名同編號唔變，中文讀到新章；財帛、這一年章英日讀新版，其餘英日照舊', () => {
  for (const [y, m, d, h] of BIRTHS) {
    const c = cast({ solar: { y, m, d }, time: { h, min: 0 }, sex: 'female', tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' } });
    if (!c.ok) throw Error(c.code);
    const base = { seed: 't', year: 2026, solar: { y, m, d }, place: '香港', birthSex: 'female' as const };
    const off = createBookChapters(c.value, base)!, on = createBookChapters(c.value, { ...base, synthesis: true })!;
    expect(chapterDrafts(on, 'v').map((x) => x.title)).toEqual(chapterDrafts(off, 'v').map((x) => x.title));
    const swapped = on.filter((ch) => (ch.reading as { writer?: string } | undefined)?.writer === 'synthesis-v1');
    expect(swapped.length).toBeGreaterThan(0);
    for (const ch of swapped) expect(readingOf(ch.reading, ch.text)).not.toBeNull();
    // 2026-11-11（Issac：英日版跟返新版本）：財帛、這一年章有英日快照就讀新版；冇快照（有句譯唔到）同其餘章照舊讀舊章
    const enOn = englishChapters(on), enOff = englishChapters(off), jaOn = japaneseChapters(on), jaOff = japaneseChapters(off);
    const newer = on.flatMap((ch, i) => ((ch.reading as { localized?: unknown } | undefined)?.localized ? [i] : []));
    expect(newer.length).toBeGreaterThan(0);
    // 英文句首變化（BookState）全書共用：新版章唔再經佢，後面章嘅句首會輪另一個次序，所以只比段落結構
    enOn.forEach((segs, i) => { if (!newer.includes(i)) expect(segs.map((x) => x.slot), on[i]!.slug).toEqual(enOff[i]!.map((x) => x.slot)); });
    jaOn.forEach((segs, i) => { if (!newer.includes(i)) expect(segs.map((x) => x.slot), on[i]!.slug).toEqual(jaOff[i]!.map((x) => x.slot)); });
    for (const i of newer) {
      const r = on[i]!.reading as { localized: { en: { text: string }[]; ja: { text: string }[] } };
      /* 2026-11-13 財帛章尾補返舊章兩節：呢個語言譯唔到嘅尾段存做空段，讀嗰陣略過 */
      expect(enOn[i]).toEqual(r.localized.en.filter((x) => x.text));
      expect(jaOn[i]).toEqual(r.localized.ja.filter((x) => x.text));
      expect(enOn[i]!.map((x) => x.text).join(' ')).not.toMatch(/[一-鿿]/);
    }
  }
}, 120000);
