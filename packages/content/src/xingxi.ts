/**
 * 六十星系（工單 B5 · 2026-09，兩個免費章：三方四正、性格的骨架）
 *
 * 出處：王亭之《中州派紫微斗數深造講義》上篇「六十基本星系」（pp.42–218）。
 * ⚠ 有版權：文字係我哋自己寫嘅，每個星系標頁碼，最多引一句短句（見 sources/zhongzhou.json）。
 *
 * ── 點解係星系，唔係三方四正 ──
 *
 * 書嘅方法（上篇前言）：先睇一個宮嘅星曜組合連埋佢三方四正嘅組合，構成一個「星系」；
 * 再按星系嘅性質睇宮與宮之間點牽動。書入面兩次警告「誤信坊本單憑〔三方四正〕來推斷」。
 * 所以呢兩章讀嘅係**命宮嗰個星系**：佢嘅本質（性格的骨架），同埋三方四正點樣推佢（三方四正）。
 *
 * ── 每個星系有一條「軸」──
 *
 * 書逐個星系講明要睇乜：紫微子午睇「精神與物質」、破軍寅申睇「叛逆性與順從性」、
 * 廉府辰戌睇「感情與理智」⋯⋯而且列出邊啲條件推向邊一頭（邊粒星化乜、邊啲煞同宮）。
 * 我哋將嗰啲條件寫成資料（`rules`），喺讀者嘅盤上逐條對，**揀一句**：偏向甲、偏向乙、或者平衡。
 * 唔係「若⋯則⋯」兩邊都講 —— 呢張盤係點，就講點。
 */
import { z } from 'zod';
import { sanFangPalaces, type Chart, type Palace } from '@guanwei/ziwei';
import raw from './xingxi/systems.json';
import { cjkCount } from './lexicon';
import { scanPlain } from './plain';
import { FORBIDDEN_TERMS } from './frame';

const HUA = z.enum(['祿', '權', '科', '忌']);

/**
 * 一條條件。全部喺命宮嘅三方四正（本宮、對宮、兩個三合宮）入面睇。
 *
 *   hua    某粒星化咗乜（例：武曲化祿）
 *   near   同某粒星同宮嘅輔星、煞星（例：太陰同宮見鈴星、陀羅）
 *   inMing 命宮本身見某啲星
 *   branch 命宮喺邊個地支（例：辰宮七殺多理想）
 *   inFour 三方四正合共見到其中最少 `min` 粒（例：百官朝拱 —— 輔弼魁鉞會照）
 */
const Cond = z.union([
  z.object({ hua: z.record(z.string(), z.array(HUA).min(1)) }),
  z.object({ near: z.string(), any: z.array(z.string()).min(1) }),
  z.object({ inMing: z.array(z.string()).min(1) }),
  z.object({ branch: z.array(z.string()).min(1) }),
  z.object({ inFour: z.array(z.string()).min(1), min: z.number().int().min(1) }),
]);
export type XingxiCond = z.infer<typeof Cond>;

const Source = z.object({
  corpus: z.literal('zhongzhou'),
  passage_id: z.string(),
  quote: z.string().min(4).max(20),
});

/**
 * 直白版（2026-09 試點，見 `plain.ts`、docs/voice.md 第六節）。
 * 有呢欄嘅星系，兩章改用「結論 → 長處與留意 → 依據」嘅排法；冇嘅照舊。
 */
const Plain = z.object({
  /** 骨架第一段：你係點樣嘅人。唔准星名。 */
  summary: z.string(),
  /** 長處。 */
  strength: z.string(),
  /** 要留意。 */
  watch: z.string(),
  /** 點解咁講：可以有星名，擺喺結論後面做證據。 */
  basis: z.string(),
  /** 三方四正結論：三句揀一句，第一句唔准星名。 */
  lean: z.record(z.string(), z.string()),
  /** 一句同呢個星系有關嘅實際提醒（唔係條件清單）。 */
  note: z.string().optional(),
});
export type XingxiPlain = z.infer<typeof Plain>;

export const Xingxi = z
  .object({
    n: z.number().int().min(1).max(60),
    name: z.string(),
    /** 命宮主星（排好次序）。空宮借對宮嗰陣用對宮嘅星。 */
    stars: z.array(z.string()).min(1).max(2),
    branches: z.tuple([z.string(), z.string()]),
    page: z.number().int(),
    /** 條軸嘅兩頭，例：['順從', '叛逆']。 */
    poles: z.tuple([z.string(), z.string()]),
    /** 性格的骨架：呢個星系嘅本質。 */
    core: z.string(),
    /** 三方四正：對宮、三合宮點樣推。 */
    trine: z.string(),
    /** 三句揀一句：偏向 poles[0]、偏向 poles[1]、平衡。 */
    lean: z.record(z.string(), z.string()),
    rules: z.array(z.object({ pole: z.string(), when: Cond })).min(2),
    sources: z.array(Source).min(1),
    status: z.enum(['draft', 'reviewed']),
    plain: Plain.optional(),
  })
  .superRefine((x, ctx) => {
    const need = [...x.poles, '平衡'];
    for (const k of need) if (!x.lean[k]) ctx.addIssue({ code: 'custom', message: `${x.n}：少咗 lean.${k}` });
    for (const r of x.rules) {
      if (!x.poles.includes(r.pole)) ctx.addIssue({ code: 'custom', message: `${x.n}：rule 嘅 pole「${r.pole}」唔喺兩頭` });
    }
    for (const p of x.poles) {
      if (!x.rules.some((r) => r.pole === p)) ctx.addIssue({ code: 'custom', message: `${x.n}：${p} 一條條件都冇` });
    }
    const w = (s: string) => cjkCount(s);
    if (w(x.core) < 60 || w(x.core) > 130) ctx.addIssue({ code: 'custom', message: `${x.n}：core ${w(x.core)} 字，要 60–130` });
    if (w(x.trine) < 50 || w(x.trine) > 120) ctx.addIssue({ code: 'custom', message: `${x.n}：trine ${w(x.trine)} 字，要 50–120` });
    for (const k of need) {
      const t = x.lean[k] ?? '';
      if (w(t) < 18 || w(t) > 50) ctx.addIssue({ code: 'custom', message: `${x.n}：lean.${k} ${w(t)} 字，要 18–50` });
      if (!t.includes('你')) ctx.addIssue({ code: 'custom', message: `${x.n}：lean.${k} 要對住讀者講` });
    }

    if (x.plain) {
      const p = x.plain;
      const len = (f: string, t: string, a: number, b: number) => {
        if (w(t) < a || w(t) > b) ctx.addIssue({ code: 'custom', message: `${x.n}：plain.${f} ${w(t)} 字，要 ${a}–${b}` });
      };
      const lint = (f: string, t: string, lead: boolean) => {
        for (const e of scanPlain(t, f, { leadsWithConclusion: lead })) {
          ctx.addIssue({ code: 'custom', message: `${x.n}：plain.${f} ${e.code} ${e.message}` });
        }
      };
      len('summary', p.summary, 12, 40);
      len('strength', p.strength, 10, 36);
      len('watch', p.watch, 10, 36);
      len('basis', p.basis, 30, 90);
      if (p.note) len('note', p.note, 10, 40);
      lint('summary', p.summary, true);
      lint('strength', p.strength, true);
      /* 留意句以「要留意的是：」開頭，唔行第一句規矩；但一樣要講你、唔准術語 */
      lint('watch', p.watch, false);
      if (!p.watch.includes('你')) ctx.addIssue({ code: 'custom', message: `${x.n}：plain.watch 要對住讀者講` });
      const wt = FORBIDDEN_TERMS.filter((t) => p.watch.includes(t));
      if (wt.length) ctx.addIssue({ code: 'custom', message: `${x.n}：plain.watch 有術語「${wt.join('、')}」` });
      lint('basis', p.basis, false);
      if (p.note) lint('note', p.note, false);
      for (const k of need) {
        const t = p.lean[k] ?? '';
        if (!t) ctx.addIssue({ code: 'custom', message: `${x.n}：少咗 plain.lean.${k}` });
        len(`lean.${k}`, t, 14, 45);
        lint(`lean.${k}`, t, true);
      }
    }
  });
export type Xingxi = z.infer<typeof Xingxi>;

export const XINGXI: Xingxi[] = (raw as unknown[]).map((r) => Xingxi.parse(r));

const MAJOR = new Set(['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍']);

function ming(chart: Chart): Palace | undefined {
  return chart.palaces.find((p) => p.name === '命宮');
}

/**
 * 命宮屬邊個星系。空宮就借對宮嘅主星（書亦係咁做，例如「借星安宮」）。
 * 回 `borrowed: true` 畀章節寫明「借對宮」。資料未寫到嗰個星系就回 null。
 */
export function xingxiOf(chart: Chart): { system: Xingxi; borrowed: boolean } | null {
  const m = ming(chart);
  if (!m) return null;
  let stars = m.stars.filter((s) => MAJOR.has(s.name)).map((s) => s.name);
  let borrowed = false;
  if (stars.length === 0 && m.borrowsFrom) {
    const opp = chart.palaces.find((p) => p.branch === m.borrowsFrom);
    stars = (opp?.stars ?? []).filter((s) => MAJOR.has(s.name)).map((s) => s.name);
    borrowed = true;
  }
  const key = [...stars].sort().join('·');
  /* 借星嗰陣用對宮嘅地支揾星系（星系係按主星所在嘅地支分） */
  const branch = borrowed ? m.borrowsFrom! : m.branch;
  const system = XINGXI.find((x) => [...x.stars].sort().join('·') === key && x.branches.includes(branch));
  return system ? { system, borrowed } : null;
}

/**
 * 一條條件喺呢張盤上中咗乜。回一串讀得出嘅證據（例：「武曲化祿」「天府同宮見左輔」），
 * 冇中就回空 —— 所以「中唔中」同「中咗乜」係同一個答案，唔會各講各。
 */
function evidence(m: Palace, four: Palace[], c: XingxiCond): string[] {
  if ('hua' in c) {
    return four.flatMap((p) =>
      p.stars.filter((s) => s.sihua && c.hua[s.name]?.includes(s.sihua)).map((s) => `${s.name}化${s.sihua}`),
    );
  }
  if ('near' in c) {
    return four.flatMap((p) => {
      if (!p.stars.some((s) => s.name === c.near)) return [];
      const with_ = p.stars.filter((s) => c.any.includes(s.name)).map((s) => s.name);
      return with_.length ? [`${c.near}同宮見${with_.join('、')}`] : [];
    });
  }
  if ('inMing' in c) {
    const found = m.stars.filter((s) => c.inMing.includes(s.name)).map((s) => s.name);
    return found.length ? [`命宮見${found.join('、')}`] : [];
  }
  if ('inFour' in c) {
    const names = new Set(four.flatMap((p) => p.stars.map((s) => s.name)));
    const seen = c.inFour.filter((n) => names.has(n));
    return seen.length >= c.min ? [`三方四正會${seen.join('、')}`] : [];
  }
  return c.branch.includes(m.branch) ? [`命宮在${m.branch}`] : [];
}

/**
 * 呢張盤喺條軸上偏向邊頭。逐條條件喺命宮三方四正對，數兩頭各中幾條；
 * 多嗰頭贏，一樣多就「平衡」。`seen` 係兩頭各自喺盤上見到乜 —— 三方四正章逐樣講出嚟。
 */
export function leanOf(
  chart: Chart,
  x: Xingxi,
): { pole: string; score: Record<string, number>; seen: Record<string, string[]> } {
  const m = ming(chart)!;
  const four = sanFangPalaces(chart.palaces, m.branch);
  const score: Record<string, number> = { [x.poles[0]]: 0, [x.poles[1]]: 0 };
  const seen: Record<string, string[]> = { [x.poles[0]]: [], [x.poles[1]]: [] };
  for (const r of x.rules) {
    const e = evidence(m, four, r.when);
    if (!e.length) continue;
    score[r.pole]! += 1;
    for (const t of e) if (!seen[r.pole]!.includes(t)) seen[r.pole]!.push(t);
  }
  const [a, b] = x.poles;
  const pole = score[a]! > score[b]! ? a : score[b]! > score[a]! ? b : '平衡';
  return { pole, score, seen };
}
