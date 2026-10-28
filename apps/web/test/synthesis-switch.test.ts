import { it, expect } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { createBookChapters } from '@/lib/mingshu';
import { chapterDrafts } from '@/lib/chengshu';
import { englishChapters } from '@/lib/english';
import { japaneseChapters } from '@/lib/japanese';
import { readingOf } from '@/lib/chapter-reading';

/* 綜合判讀層開關（docs/synthesis-switch-on-plan.md）：只換錢、今年兩章正文；章名、編號、英日照舊。 */
const BIRTHS = [[1974, 1, 13, 8], [1965, 5, 25, 12], [2004, 9, 25, 0]] as const;

it('開咗綜合判讀層：章名同編號唔變，英日照舊讀舊章，中文讀到新章', () => {
  for (const [y, m, d, h] of BIRTHS) {
    const c = cast({ solar: { y, m, d }, time: { h, min: 0 }, sex: 'female', tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' } });
    if (!c.ok) throw Error(c.code);
    const base = { seed: 't', year: 2026, solar: { y, m, d }, place: '香港', birthSex: 'female' as const };
    const off = createBookChapters(c.value, base)!, on = createBookChapters(c.value, { ...base, synthesis: true })!;
    expect(chapterDrafts(on, 'v').map((x) => x.title)).toEqual(chapterDrafts(off, 'v').map((x) => x.title));
    const swapped = on.filter((ch) => (ch.reading as { writer?: string } | undefined)?.writer === 'synthesis-v1');
    expect(swapped.length).toBeGreaterThan(0);
    for (const ch of swapped) expect(readingOf(ch.reading, ch.text)).not.toBeNull();
    expect(englishChapters(on)).toEqual(englishChapters(off));
    expect(japaneseChapters(on)).toEqual(japaneseChapters(off));
  }
}, 120000);
