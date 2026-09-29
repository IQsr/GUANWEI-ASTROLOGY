import { z } from 'zod';
import type { Chart } from '@guanwei/ziwei';
import { FORBIDDEN_TERMS } from './frame';
import { cjkCount } from './lexicon';
import { assertNoReading } from './free';
import { leanOf, xingxiOf, type Xingxi } from './xingxi';

/* ───────────────────────────────────────────────────────────
 * 免費章之四、五：性格的骨架、三方四正（工單 B5 · 架構 §6）
 *
 * 材料全部喺 `xingxi/systems.json`（六十星系，王亭之《深造講義》上篇）。
 * 呢個檔只負責揀：你個盤屬邊個星系、條軸偏向邊頭、盤上見到乜。
 *
 * ── ⚠ 次序同 §6 名單唔同 ──
 *
 * §6 列嘅係「三方四正 / 性格的骨架」，但書入面係骨架行先：
 * 骨架講呢個星系嘅本質、講出條軸（例：順從與叛逆）；
 * 三方四正講邊啲力量推向邊頭，最後落一句你偏向邊頭。
 * 倒轉嚟讀，三方四正就要講一條未介紹過嘅軸。
 *
 * ── 每一格邊度嚟 ──
 *
 *   章首、留白     章框（冇來源，唔准讀象，同序、身宮一樣掃）
 *   命宮          盤面事實（命宮喺邊、坐乜星、係咪借對宮）
 *   骨架          `core`（有來源：xingxi.N）
 *   四正          `trine`（有來源）
 *   推力          `leanOf().seen`：書列嘅條件，喺你個盤上中咗邊幾條
 *   偏向          `lean[pole]`（有來源）
 * ─────────────────────────────────────────────────────────── */

export const GUJIA_SLUG = '性格的骨架';
export const SANFANG_SLUG = '三方四正';

export type XingxiSegment = {
  slot: '章首' | '命宮' | '結論' | '長處' | '骨架' | '四正' | '推力' | '偏向' | '提醒' | '留白';
  text: string;
  source_id: string | null;
  rule_ids: string[];
};

const XingxiFrame = z
  .object({
    id: z.string(),
    slot: z.enum(['章首', '留白']),
    text: z.string().min(1),
    status: z.enum(['draft', 'reviewed', 'published']),
  })
  .superRefine((f, ctx) => {
    const bad = FORBIDDEN_TERMS.filter((t) => f.text.includes(t));
    if (bad.length) {
      ctx.addIssue({ code: 'custom', message: `${f.id}：章框唔准講命理，出現咗「${bad.join('、')}」` });
    }
    const w = cjkCount(f.text);
    if (f.slot === '章首' && (w < 30 || w > 60)) {
      ctx.addIssue({ code: 'custom', message: `${f.id}：${w} 字，章首要 30–60` });
    }
    if (f.slot === '留白' && (w < 25 || w > 45)) {
      ctx.addIssue({ code: 'custom', message: `${f.id}：${w} 字，留白要 25–45` });
    }
    if (f.slot === '留白' && !/你|自己/.test(f.text)) {
      ctx.addIssue({ code: 'custom', message: `${f.id}：留白句要對住讀者講` });
    }
  });

export const XINGXI_FRAMES = [
  {
    id: 'frame.open.性格的骨架',
    slot: '章首',
    status: 'draft',
    text: '命宮的星，連同它對面和兩側的星，合起來是一個星系。這一章讀這個星系的本質，也就是你性格的底子。',
  },
  {
    id: 'frame.close.性格的骨架',
    slot: '留白',
    status: 'draft',
    text: '骨架是天生的，長成怎樣的人，看你怎樣用它。回頭看看，這個底子在你身上站不站得住。',
  },
  {
    id: 'frame.open.三方四正',
    slot: '章首',
    status: 'draft',
    text: '一個宮從來不單獨讀。這一章看你命宮的對面和兩側，也就是三方四正，看它們把你推向哪一邊。',
  },
  {
    id: 'frame.close.三方四正',
    slot: '留白',
    status: 'draft',
    text: '推力不等於定局。哪一股力量在你身上用得多，你自己最清楚。',
  },
].map((f) => XingxiFrame.parse(f));

function frame(id: string): string {
  return XINGXI_FRAMES.find((f) => f.id === id)!.text;
}

function sourced(slot: XingxiSegment['slot'], text: string, x: Xingxi): XingxiSegment {
  return { slot, text, source_id: x.sources[0]!.passage_id, rule_ids: [] };
}

function plain(slot: XingxiSegment['slot'], text: string): XingxiSegment {
  return { slot, text, source_id: null, rule_ids: [] };
}

/** 性格的骨架。命宮屬邊個星系都揾唔到（資料冇嗰個組合）就回 null，唔出一章空嘅。 */
export function gujiaChapter(input: {
  chart: Chart;
}): { slug: string; title: string; segments: XingxiSegment[] } | null {
  const { chart } = input;
  const found = xingxiOf(chart);
  const m = chart.palaces.find((p) => p.name === '命宮');
  if (!found || !m) return null;
  const { system: x, borrowed } = found;

  /* 盤面事實：同序嘅「命宮在寅」同一類。借對宮嗰陣要講明 —— `core` 寫嘅係「某星坐命」。 */
  const stars = x.stars.join('、');
  const where = borrowed
    ? `你的命宮在${m.branch}，宮內沒有主星，借對宮的${stars}來讀。`
    : `你的命宮在${m.branch}，坐${stars}。`;

  /*
   * 直白版：結論 → 長處與留意 → 依據（盤面事實 ＋ 書嘅理由）→ 留白。
   * 冇章首：「這一章讀⋯」係講方法，第一段直接就係答案（docs/voice.md 第六節）。
   */
  const segments = x.plain
    ? [
        sourced('結論', x.plain.summary, x),
        sourced('長處', `${x.plain.strength}${x.plain.watch}`, x),
        sourced('骨架', `${where}${x.plain.basis}`, x),
        plain('留白', frame('frame.close.性格的骨架')),
      ]
    : [
        plain('章首', frame('frame.open.性格的骨架')),
        plain('命宮', where),
        sourced('骨架', x.core, x),
        plain('留白', frame('frame.close.性格的骨架')),
      ];
  assertNoReading(segments.filter((s) => s.slot === '章首' || s.slot === '留白'));
  return { slug: GUJIA_SLUG, title: GUJIA_SLUG, segments };
}

/**
 * 直白版嘅「原因」：只講盤上有嘅，唔列冇嘅條件。
 * 贏嗰頭行先；另一頭有就講「力量較小」，冇就直講冇。
 */
function reason(x: Xingxi, pole: string, seen: Record<string, string[]>): string {
  const [a, b] = x.poles;
  const ev = (p: string) => seen[p]!.join('、');
  if (!seen[a]!.length && !seen[b]!.length) return '這樣看，是因為你的盤上兩邊都沒有特別的推力。';
  if (pole === '平衡') {
    return `這樣看，是因為你的盤上兩邊都有：${ev(a)}，推你偏向${a}；${ev(b)}，推你偏向${b}。`;
  }
  const other = pole === a ? b : a;
  const rest = seen[other]!.length ? `；也有${ev(other)}，推你偏向${other}，只是力量較小` : `；推你偏向${other}的，一樣也沒有`;
  return `這樣看，是因為你的盤上有${ev(pole)}，推你偏向${pole}${rest}。`;
}

/**
 * 三方四正。推力嗰段逐樣講盤上見到乜；兩頭都冇就直講冇，唔好扮有。
 */
export function sanfangChapter(input: {
  chart: Chart;
}): { slug: string; title: string; segments: XingxiSegment[] } | null {
  const { chart } = input;
  const found = xingxiOf(chart);
  if (!found) return null;
  const x = found.system;
  const { pole, seen } = leanOf(chart, x);

  const side = (p: string) => (seen[p]!.length ? `推向${p}的，有${seen[p]!.join('、')}` : `推向${p}的，一樣也沒有`);
  const push =
    seen[x.poles[0]]!.length + seen[x.poles[1]]!.length === 0
      ? '在你的盤上，上面這些條件一樣也沒有出現，兩股力量不相上下。'
      : `在你的盤上，${side(x.poles[0])}；${side(x.poles[1])}。`;

  /* 直白版：結論 → 原因（盤上有乜）→ 提醒 → 留白。唔再列「見⋯則⋯」嘅條件清單。 */
  const segments = x.plain
    ? [
        sourced('偏向', x.plain.lean[pole]!, x),
        plain('推力', reason(x, pole, seen)),
        ...(x.plain.note ? [sourced('提醒', x.plain.note, x)] : []),
        plain('留白', frame('frame.close.三方四正')),
      ]
    : [
        plain('章首', frame('frame.open.三方四正')),
        sourced('四正', x.trine, x),
        plain('推力', push),
        sourced('偏向', x.lean[pole]!, x),
        plain('留白', frame('frame.close.三方四正')),
      ];
  assertNoReading(segments.filter((s) => s.slot === '章首' || s.slot === '留白'));
  return { slug: SANFANG_SLUG, title: SANFANG_SLUG, segments };
}
