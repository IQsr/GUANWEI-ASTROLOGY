import { z } from 'zod';
import type { Chart } from '@guanwei/ziwei';
import { FORBIDDEN_TERMS } from './frame';
import { cjkCount } from './lexicon';
import { assertNoReading } from './free';
import { leanOf, xingxiOf, type Xingxi } from './xingxi';

/* ───────────────────────────────────────────────────────────
 * 免費章之四：性格的骨架（工單 B5 · 架構 §6）
 *
 * 材料全部喺 `xingxi/systems.json`（六十星系，王亭之《深造講義》上篇）。
 * 呢個檔只負責揀：你個盤屬邊個星系、條軸偏向邊頭、盤上見到乜。
 *
 * ── 2026-10-07：「三方四正」章併入嚟 ──
 *
 * 以前骨架之後有一章叫「三方四正」，但佢講嘅係條軸偏向邊頭，唔係三方四正：
 * 量過 2000 張盤，約九成嘅推力唔係嚟自三方四正（係「命宮在寅」「同宮見文曲」之類），
 * 兩成冇推力；而且「在寅宮，貪狼偏向感情」同下一章「你偏向情感，因為命宮在寅」講兩次。
 * 真正嘅三方四正（三方煞吉、格局、對宮三合）命宮章「牽動」已經講咗。
 * 舊書已經寫咗「三方四正」章喺 DB，照讀（R-008），web 嗰邊嘅章名表照留。
 *
 * ── 結論唔同命宮章重覆（同日）──
 *
 * 命宮章緊接喺前面，已經有「結論 ＋ 要留意的是」。所以骨架唔再出 `summary`、`watch`：
 * 結論改由「偏向」做 —— 呢個係骨架章自己先有嘅新嘢；長處只出 `strength`，
 * 而且同偏向講同一樣嘢（`overlaps()`）就唔出。
 * `summary` / `watch` 仲喺〈給你的話〉用。
 *
 *   偏向（plain.lean）→ 骨架（命宮坐乜 ＋ basis ＋ 你嗰邊地支）→ 推力 → 長處 → 提醒 → 留白
 *
 * 推力只講盤上見到、骨架未講過嘅：地支條件如果 `byBranch` 已經講咗，就唔再列做推力。
 * 留白係章框（冇來源，唔准讀象）。其餘有來源：xingxi.N。
 * ─────────────────────────────────────────────────────────── */

export const GUJIA_SLUG = '性格的骨架';

export type XingxiSegment = {
  slot: '偏向' | '骨架' | '推力' | '長處' | '提醒' | '留白';
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

/**
 * 「推力」：只講盤上有、上面未講過嘅，唔列冇嘅條件。
 * `said` 係骨架段已經講咗嘅證據（地支）—— 唔再當推力講一次。
 * 贏嗰頭行先；另一頭有就講「力量較小」，冇就直講冇 —— 唔好扮有。
 * 冇嘢要講就回 null（例如贏嗰頭淨係靠地支，骨架段已經講咗）。
 */
function reason(x: Xingxi, pole: string, seen: Record<string, string[]>, said: string | null): string | null {
  const [a, b] = x.poles;
  const left = (p: string) => seen[p]!.filter((e) => e !== said);
  const ev = (p: string) => left(p).join('、');
  /* 另一頭淨係得骨架段講過嘅地支：唔可以話「一樣也沒有」 */
  const onlySaid = (p: string) => !left(p).length && seen[p]!.length > 0;
  if (!seen[a]!.length && !seen[b]!.length) return '這樣看，是因為你的盤上兩邊都沒有特別的推力。';
  if (pole === '平衡') {
    /* 一頭淨係得骨架段講過嘅地支：只補講另一頭，「也有」接返上面 */
    if (!left(a).length && !left(b).length) return null;
    if (!left(a).length || !left(b).length) {
      const o = left(a).length ? a : b;
      return `這樣看，是因為你的盤上也有${ev(o)}，推你偏向${o}。`;
    }
    return `這樣看，是因為你的盤上兩邊都有：${ev(a)}，推你偏向${a}；${ev(b)}，推你偏向${b}。`;
  }
  if (!left(pole).length) return null;
  const other = pole === a ? b : a;
  if (onlySaid(other)) return `這樣看，是因為你的盤上有${ev(pole)}，推你偏向${pole}。`;
  const rest = left(other).length ? `；也有${ev(other)}，推你偏向${other}，只是力量較小` : `；推你偏向${other}的，一樣也沒有`;
  return `這樣看，是因為你的盤上有${ev(pole)}，推你偏向${pole}${rest}。`;
}

/**
 * 兩句有冇講同一樣嘢：最長嘅共同片段（唔計標點）夠唔夠 `n` 個字。
 * 用嚟睇「偏向」同「長處」：180 個組合入面 24 個係同一句換個講法
 * （例：「旁人放心把事情交給你」／「別人放心把事情交給你」）。
 */
export function overlaps(a: string, b: string, n = 4): boolean {
  const strip = (t: string) => t.replace(/[，。、：；！？「」]/g, '|');
  const x = strip(a);
  const y = strip(b);
  for (let i = 0; i + n <= x.length; i++) {
    const piece = x.slice(i, i + n);
    if (!piece.includes('|') && y.includes(piece)) return true;
  }
  return false;
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
  const { pole, seen } = leanOf(chart, x);

  /* 盤面事實：同序嘅「命宮在寅」同一類。借對宮嗰陣要講明。 */
  const stars = x.stars.join('、');
  const where = borrowed
    ? `你的命宮在${m.branch}，宮內沒有主星，借對宮的${stars}來讀。`
    : `你的命宮在${m.branch}，坐${stars}。`;
  /* 星系按主星所在嘅地支分（借對宮就用對宮），讀者只讀到自己嗰邊 */
  const starBranch = borrowed ? m.borrowsFrom! : m.branch;
  const byBranch = x.plain.byBranch?.[starBranch];
  /* 同 `leanOf()` 地支證據嘅寫法一樣 */
  const said = byBranch ? (starBranch === m.branch ? `命宮在${m.branch}` : `主星在${starBranch}`) : null;
  const why = reason(x, pole, seen, said);
  const lean = x.plain.lean[pole]!;
  /* 長處同偏向講同一樣嘢就唔出（「你的長處是」唔計） */
  const strength = overlaps(lean, x.plain.strength.replace(/^你的長處是/, '')) ? null : x.plain.strength;

  const segments = [
    sourced('偏向', lean, x),
    sourced('骨架', `${where}${x.plain.basis}${byBranch ?? ''}`, x),
    ...(why ? [plain('推力', why)] : []),
    ...(strength ? [sourced('長處', strength, x)] : []),
    ...(x.plain.note ? [sourced('提醒', x.plain.note, x)] : []),
    plain('留白', frame('frame.close.性格的骨架')),
  ];
  assertNoReading(segments.filter((s) => s.slot === '留白'));
  return { slug: GUJIA_SLUG, title: GUJIA_SLUG, segments };
}
