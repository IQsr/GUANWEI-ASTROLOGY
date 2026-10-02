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
 * 骨架講你係點樣嘅人；三方四正講你偏向條軸嘅邊一頭、點解。
 *
 * ── 直白（2026-09，docs/voice.md 第六節）──
 *
 * 兩章都係結論先行、只講盤上有嘅，冇章首（「這一章讀⋯」係講方法）。
 * 材料用星系嘅 `plain` 欄；`core` / `trine` / `lean` 係較長嘅初稿，保留做對照，唔再入書。
 *
 *   性格的骨架   結論（summary）→ 長處與留意 → 依據（命宮坐乜 ＋ basis ＋ 你嗰邊地支）→ 留白
 *   三方四正     偏向（plain.lean）→ 原因（`leanOf().seen`，只講盤上見到嘅）→ 提醒（如有）→ 留白
 *
 * 留白係章框（冇來源，唔准讀象）。其餘有來源：xingxi.N。
 * ─────────────────────────────────────────────────────────── */

export const GUJIA_SLUG = '性格的骨架';
export const SANFANG_SLUG = '三方四正';

export type XingxiSegment = {
  slot: '結論' | '長處' | '骨架' | '推力' | '偏向' | '提醒' | '留白';
  text: string;
  source_id: string | null;
  rule_ids: string[];
};

const XingxiFrame = z
  .object({
    id: z.string(),
    slot: z.literal('留白'),
    text: z.string().min(1),
    status: z.enum(['draft', 'reviewed', 'published']),
  })
  .superRefine((f, ctx) => {
    const bad = FORBIDDEN_TERMS.filter((t) => f.text.includes(t));
    if (bad.length) {
      ctx.addIssue({ code: 'custom', message: `${f.id}：章框唔准講命理，出現咗「${bad.join('、')}」` });
    }
    const w = cjkCount(f.text);
    if (w < 25 || w > 45) {
      ctx.addIssue({ code: 'custom', message: `${f.id}：${w} 字，留白要 25–45` });
    }
    if (!/你|自己/.test(f.text)) {
      ctx.addIssue({ code: 'custom', message: `${f.id}：留白句要對住讀者講` });
    }
  });

export const XINGXI_FRAMES = [
  {
    id: 'frame.close.性格的骨架',
    slot: '留白',
    status: 'draft',
    text: '骨架是天生的，長成怎樣的人，看你怎樣用它；用在對的地方，同一副骨架就是長處。',
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

  /* 盤面事實：同序嘅「命宮在寅」同一類。借對宮嗰陣要講明。 */
  const stars = x.stars.join('、');
  const where = borrowed
    ? `你的命宮在${m.branch}，宮內沒有主星，借對宮的${stars}來讀。`
    : `你的命宮在${m.branch}，坐${stars}。`;
  /* 星系按主星所在嘅地支分（借對宮就用對宮），讀者只讀到自己嗰邊 */
  const starBranch = borrowed ? m.borrowsFrom! : m.branch;

  const segments = [
    sourced('結論', x.plain.summary, x),
    sourced('長處', `${x.plain.strength}${x.plain.watch}`, x),
    sourced('骨架', `${where}${x.plain.basis}${x.plain.byBranch?.[starBranch] ?? ''}`, x),
    plain('留白', frame('frame.close.性格的骨架')),
  ];
  assertNoReading(segments.filter((s) => s.slot === '留白'));
  return { slug: GUJIA_SLUG, title: GUJIA_SLUG, segments };
}

/**
 * 「原因」：只講盤上有嘅，唔列冇嘅條件。
 * 贏嗰頭行先；另一頭有就講「力量較小」，冇就直講冇 —— 唔好扮有。
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

/** 三方四正。 */
export function sanfangChapter(input: {
  chart: Chart;
}): { slug: string; title: string; segments: XingxiSegment[] } | null {
  const { chart } = input;
  const found = xingxiOf(chart);
  if (!found) return null;
  const x = found.system;
  const { pole, seen } = leanOf(chart, x);

  const segments = [
    sourced('偏向', x.plain.lean[pole]!, x),
    plain('推力', reason(x, pole, seen)),
    ...(x.plain.note ? [sourced('提醒', x.plain.note, x)] : []),
    plain('留白', frame('frame.close.三方四正')),
  ];
  assertNoReading(segments.filter((s) => s.slot === '留白'));
  return { slug: SANFANG_SLUG, title: SANFANG_SLUG, segments };
}
