/**
 * 命宮寫作層（新架構試點，2026-10-19，見 docs/architecture-v2-plan-2026-10-19.md §2.3、§5）
 *
 * 判斷層（card.ts `cardsFor`）揀好卡，呢度只負責寫：一個話題一段，次序固定
 *   結論 → 因為 → 留意 → 做法
 * 結論係嗰個話題嘅 claim 卡；因為由卡嘅條件同 binding 砌（盤上中咗乜）；
 * 留意係 caveat 卡；做法係 advice 卡。
 *
 * 本命章（`writeMing`）只寫本命層。大限、流年層另外由 `mingDecade`／`mingYear` 出，
 * 唔撈入本命章（plan §2.4：運限章只講同本命唔同嘅地方）。
 *
 * 中英一齊出：英文用卡嘅 `en`，因為句亦逐款砌英文。唔掂 ja，亦唔掂 tm.json（舊書照舊渲染）。
 *
 * 讀者文字規矩（GUIDE.md 第五節）卡本身已經守；呢度砌嘅因為句只講盤上有乜，
 * 唔講卡 id、唔抄條件語法、`{decades}` 一定填實。
 */
import { annual as annualOf, type AnnualChart, type Chart, type Decadal } from '@guanwei/ziwei';
import { cardsFor, MING_TOPICS, type Card, type Hit } from './card';
import { evaluate, GEJU_DEF, type Condition, type EvalContext, type GejuName, type Layer, type PalaceRef } from './condition';
import { num } from './steps';
import { leanOf, xingxiOf, type Xingxi } from './xingxi';
import { evEn, HUA_EN, POLE_EN } from './en/facts';
import { BRANCH_EN, PALACE_EN, cap, listEn, star as starEn } from './en/terms';

export type MingTopic = (typeof MING_TOPICS)[number];

/** 一句讀者文字（中英），連出處：卡 id 同原文段落 id。 */
export type MingLine = { zh: string; en: string; card: string; sources: string[] };

/** 因為：一樣盤上嘅事實。 */
export type MingReason = {
  zh: string;
  en: string;
  /** 命中條件所屬的卡；純盤面事實／通用後備句沒有卡來源。 */
  source_ids?: string[];
  citations?: string[];
};

export type MingSection = {
  topic: MingTopic;
  layer: Card['layer'];
  /**
   * 結論。通常係 claim 卡；個話題冇 claim 命中（例如只得 caveat），就由第一張 caveat（再冇就 advice）頂上，
   * `kind` 照記原本係乜卡。
   */
  conclusion: MingLine & { kind: Card['kind'] };
  reasons: MingReason[];
  caveats: MingLine[];
  advice: MingLine[];
  /** 呢段用咗邊幾張卡（次序同上）。 */
  source_ids: string[];
  /** 原文段落 id（去重）。 */
  citations: string[];
  /** 排好嘅四格（留意、做法冇就唔出）。 */
  parts: { part: '結論' | '因為' | '留意' | '做法'; zh: string; en: string }[];
  text: { zh: string; en: string };
};

export type MingChapter = {
  palace: '命宮';
  system: { n: number; name: string; borrowed: boolean } | null;
  sections: MingSection[];
  text: { zh: string; en: string };
};

/* ── 標題、標籤 ─────────────────────────────────────── */

export const MING_TOPIC_EN: Record<MingTopic, string> = {
  本質: 'Who you are',
  格局: 'Your pattern',
  處事: 'How you get things done',
  待人: 'How you deal with people',
  運程: 'Your course over the years',
};

const LABEL = {
  zh: { because: '因為', watch: '留意：', act: '做法：' },
  en: { because: 'Because ', watch: 'Watch: ', act: 'What to do: ' },
};

/* ── 歲數：`{decades}` ─────────────────────────────── */

/** 「虛歲三十四至四十三歲、五十四至六十三歲」（同大限章一樣用中文數字、虛歲）。 */
export function decadesZh(ds: readonly Decadal[]): string {
  return `虛歲${ds.map((d) => `${num(d.fromAge)}至${num(d.toAge)}歲`).join('、')}`;
}

/** 英文寫實歲，括號註虛歲（en/facts.ts `ageRange` 同一個規矩，2026-10-05 詞彙表）。 */
export function decadesEn(ds: readonly Decadal[]): string {
  const real = listEn(ds.map((d) => `${Math.max(0, d.fromAge - 1)}–${d.toAge - 1}`));
  const cn = listEn(ds.map((d) => `${d.fromAge}–${d.toAge}`));
  return `roughly ages ${real} (${cn} by Chinese reckoning)`;
}

/**
 * 卡寫「{decades}這幾段時間」，但實際中幾多個十年要睇盤：一個就唔可以講「這幾段」。
 * 只改緊接 `{decades}` 嗰個量詞。
 */
function fillZh(claim: string, ds: readonly Decadal[]): string {
  const n = ds.length;
  return claim.replace(/\{decades\}(這幾段時間|這兩段時間|這段時間|這幾個十年|這兩個十年|這個十年|這幾段十年|這段十年|這十年)?/, (_, w?: string) => {
    if (!w) return decadesZh(ds);
    const unit = w.endsWith('時間') ? '段時間' : '個十年';
    return `${decadesZh(ds)}，這${n === 1 ? '' : n === 2 ? '兩' : '幾'}${unit}`;
  });
}

function fillEn(en: string, ds: readonly Decadal[]): string {
  const n = ds.length;
  const d = decadesEn(ds);
  let s = en
    .replace(/^\{decades\}:/, `${cap(d)}:`)
    .replace(/^\{decades\} /, `The years at ${d} `)
    .replace(/During \{decades\}/, `During the years at ${d}`)
    .replace(/\{decades\}/, `at ${d}`);
  /* 單數、眾數跟實際中幾多個十年 */
  if (n === 1) {
    s = s
      .replace(/these decades are/, 'this decade is')
      .replace(/these decades tend/, 'this decade tends')
      .replace(/^The decades (.*?) are /, 'The decade $1 is ')
      .replace(/^In the decades /, 'In the decade ')
      .replace(/is the pivots/, 'is the pivot')
      .replace(/is the turning points/, 'is the turning point')
      .replace(/how they go/, 'how it goes');
  } else {
    s = s.replace(/^The decade (.*?) is /, 'The decades $1 are ');
  }
  return s;
}

/* ── 因為：由條件同盤面砌事實 ─────────────────────── */

const LAYER_ZH: Record<Layer, string> = { natal: '你的', decade: '這十年的', annual: '這一年的' };
const LAYER_EN: Record<Layer, string> = { natal: 'your', decade: "this decade's", annual: "this year's" };
const HUA_SUFFIX_ZH: Record<Layer, string> = { natal: '', decade: '這十年', annual: '這一年' };
const HUA_SUFFIX_EN: Record<Layer, string> = { natal: '', decade: ' this decade', annual: ' this year' };

const palZh = (ref: PalaceRef) => `${LAYER_ZH[ref.layer ?? 'natal']}${ref.name.endsWith('宮') ? ref.name : `${ref.name}宮`}`;
const palEn = (ref: PalaceRef) => `${LAYER_EN[ref.layer ?? 'natal']} ${PALACE_EN[ref.name] ?? ref.name}`;
const sEn = (zh: string) => starEn(zh) ?? zh;

const BRIGHT_ZH: Record<string, string> = { 廟: '足', 旺: '足', 得: '尚可', 利: '尚可', 平: '一般', 不: '弱', 陷: '弱' };
const BRIGHT_EN: Record<string, string> = { 足: 'strong', 尚可: 'fairly strong', 一般: 'middling', 弱: 'weak' };

const GEJU_EN: Record<GejuName, string> = {
  baiguan: 'the "hundred officials pay court" pattern',
  zaiye: 'the "lone ruler out of office" pattern',
  kongku: 'the "empty treasury" pattern',
  luku: 'the "exposed treasury" pattern',
  caiyinShape: 'the "flanked by wealth and shelter" shape',
  caiyin: 'the "seal flanked by wealth and shelter" pattern',
  xingji: 'the "seal flanked by punishment and obstruction" pattern',
  shizhong: 'the "jade hidden in stone" pattern',
};

/** 一串星／化名縮短：六煞齊列叫「煞星」、六吉齊列叫「吉星」⋯⋯唔好一列六個名。 */
const GROUPS: { zh: string; en: string; members: string[] }[] = [
  { zh: '煞星', en: 'the harsh stars', members: ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'] },
  { zh: '煞星', en: 'the harsh stars', members: ['擎羊', '陀羅', '火星', '鈴星'] },
  { zh: '吉星', en: 'the helper stars', members: ['左輔', '右弼', '天魁', '天鉞', '文昌', '文曲'] },
  { zh: '輔佐吉星', en: 'the aide stars', members: ['左輔', '右弼', '天魁', '天鉞'] },
  { zh: '吉化', en: 'a favourable transformation', members: ['化祿', '化權', '化科'] },
];
function groupWords(words: readonly string[]): { zh: string; en: string } {
  let rest = [...words];
  const zh: string[] = [];
  const en: string[] = [];
  for (const g of GROUPS) {
    if (g.members.every((m) => rest.includes(m))) {
      rest = rest.filter((w) => !g.members.includes(w));
      zh.push(g.zh);
      en.push(g.en);
    }
  }
  for (const w of rest) {
    zh.push(w);
    const h = /^化(.)$/.exec(w);
    en.push(h ? (HUA_EN[h[1]!] ?? w) : sEn(w));
  }
  return { zh: zh.join('、'), en: listEn(en) };
}

/** 盤上某個地支，某個化（「化忌」）係邊粒星化。 */
function huaStarAt(chart: Chart, branch: string | null, word: string): string | null {
  const h = /^化(.)$/.exec(word);
  if (!h || !branch) return null;
  return chart.palaces.find((p) => p.branch === branch)?.stars.find((s) => s.sihua === h[1])?.name ?? null;
}

/** 一個見到嘅字：星名照寫；「化忌」寫成「武曲化忌」。 */
function seenWord(chart: Chart, branch: string | null, word: string): { zh: string; en: string } {
  const s = huaStarAt(chart, branch, word);
  const h = /^化(.)$/.exec(word);
  if (s && h) return { zh: `${s}化${h[1]}`, en: `${sEn(s)} turning to ${HUA_EN[h[1]!]}` };
  if (h) return { zh: word, en: HUA_EN[h[1]!] ?? word };
  return { zh: word, en: sEn(word) };
}

const hasStar = (chart: Chart, s: string) => s === '天刑' || chart.palaces.some((p) => p.stars.some((x) => x.name === s));

const WHERE_ZH = { same: '同宮', sanfang: '的三方四正', jia: '兩旁' } as const;
const WHERE_EN = { same: 'in the same palace', sanfang: 'among its four directions', jia: 'on either side' } as const;

/**
 * 一條條件喺呢張盤上點解成立：一串讀得明嘅事實。
 *
 * 用結構化欄位（星、宮、層、化）重寫，唔直接抄 binding 嘅 note（note 係俾人核對用，帶地支括號同術語）。
 * `any` 只講第一個成立嘅分支；`not` 只講幾款講得清楚嘅（「三方四正沒有煞星」），其餘唔講。
 */
export function explain(cond: Condition, ctx: EvalContext): MingReason[] {
  const { chart } = ctx;
  if ('all' in cond) return cond.all.flatMap((c) => explain(c, ctx));
  if ('any' in cond) {
    const c = cond.any.find((x) => evaluate(x, ctx).status === 'matched');
    return c ? explain(c, ctx) : [];
  }
  if ('not' in cond) return explainNot(cond.not, ctx);
  const r = evaluate(cond, ctx);
  if (r.status !== 'matched') return [];
  const b = r.bindings;

  if ('shenIn' in cond) return [{ zh: `身宮落在${palZh(cond.shenIn)}`, en: `your Body Palace falls in ${palEn(cond.shenIn)}` }];
  if ('empty' in cond) {
    return [{ zh: `${palZh(cond.empty)}沒有主星，借對宮的星來看`, en: `${palEn(cond.empty)} has no major star and borrows from the opposite palace` }];
  }
  if ('together' in cond) return [{ zh: `${cond.together.join('、')}同在一宮`, en: `${listEn(cond.together.map(sEn))} share a palace` }];
  if ('between' in cond) {
    const [x, y] = cond.between;
    return [{ zh: `${cond.star}被${x}、${y}左右夾着`, en: `${sEn(cond.star)} is flanked by ${sEn(x)} and ${sEn(y)}` }];
  }
  if ('opposite' in cond) {
    const [x, y] = cond.opposite;
    return [{ zh: `${x}與${y}相對`, en: `${sEn(x)} faces ${sEn(y)} across the chart` }];
  }
  if ('sanfangOf' in cond) {
    if ('contains' in cond) {
      return [{ zh: `${palZh(cond.sanfangOf)}的三方四正有${cond.contains}`, en: `${sEn(cond.contains)} is among the four directions of ${palEn(cond.sanfangOf)}` }];
    }
    const found = [...new Set(b.map((x) => x.star).filter((x): x is string => !!x))];
    if (!found.length) {
      const cls = cond.count === 'malefic' ? ['煞星', 'harsh star'] : cond.count === 'benefic' ? ['吉星', 'helper star'] : ['主星', 'major star'];
      return [{ zh: `${palZh(cond.sanfangOf)}的三方四正沒有${cls[0]}`, en: `no ${cls[1]} sits among the four directions of ${palEn(cond.sanfangOf)}` }];
    }
    /* 「主星」數目唔係讀者關心嘅嘢 */
    if (cond.count === 'major') return [];
    const g = groupWords(found);
    return [{ zh: `${palZh(cond.sanfangOf)}的三方四正有${g.zh}`, en: `${g.en} sit among the four directions of ${palEn(cond.sanfangOf)}` }];
  }
  if ('brightnessIn' in cond || 'brightness' in cond) {
    return b.flatMap((x) => {
      const s = x.star ? chart.palaces.find((p) => p.branch === x.branch)?.stars.find((y) => y.name === x.star) : undefined;
      const w = s?.brightness ? BRIGHT_ZH[s.brightness] : undefined;
      if (!x.star || !w) return [];
      return [{ zh: `${x.star}在${x.branch}宮力量${w}`, en: `${sEn(x.star)} is ${BRIGHT_EN[w]} in the ${BRANCH_EN[x.branch ?? ''] ?? x.branch} position` }];
    });
  }
  if ('hua' in cond && 'star' in cond) {
    const l = cond.layer ?? 'natal';
    return [{ zh: `${HUA_SUFFIX_ZH[l]}${cond.star}化${cond.hua}`, en: `${sEn(cond.star)} turns to ${HUA_EN[cond.hua]}${HUA_SUFFIX_EN[l]}` }];
  }
  if ('hua' in cond) {
    const l = cond.layer ?? 'natal';
    const s = b[0]?.star ?? '';
    return [{
      zh: `${HUA_SUFFIX_ZH[l]}${s}化${cond.hua}，落在${palZh(cond.in)}`,
      en: `${sEn(s)} turns to ${HUA_EN[cond.hua]}${HUA_SUFFIX_EN[l]} in ${palEn(cond.in)}`,
    }];
  }
  if ('at' in cond) {
    const at = b[0]?.branch ?? cond.at[0]!;
    return [{ zh: `${cond.star}在${at}宮`, en: `${sEn(cond.star)} sits in the ${BRANCH_EN[at] ?? at} position` }];
  }
  if ('decadeOrder' in cond) {
    const fwd = cond.decadeOrder === 'forward';
    return [{ zh: `你的大限是${fwd ? '順' : '逆'}行的`, en: `your ten-year periods run ${fwd ? 'forward' : 'backward'} around the chart` }];
  }
  if ('decadeAge' in cond) {
    const d = ctx.annual?.decadal;
    if (!d) return [];
    return [{ zh: `這十年是${decadesZh([d])}`, en: `this decade covers ${decadesEn([d])}` }];
  }
  if ('jia' in cond) {
    const sides = b.map((x) => {
      const m = /見(.+)$/.exec(x.note);
      const ws = (m?.[1] ?? '').split('、').filter(Boolean).map((w) => seenWord(chart, x.branch, w));
      return { zh: ws.map((w) => w.zh).join('、'), en: listEn(ws.map((w) => w.en)) };
    });
    if (sides.length < 2) return [];
    return [{
      zh: `${cond.jia}兩旁一邊有${sides[0]!.zh}，另一邊有${sides[1]!.zh}`,
      en: `${sEn(cond.jia)} has ${sides[0]!.en} on one side and ${sides[1]!.en} on the other`,
    }];
  }
  if ('meets' in cond) {
    const reach = cond.reach ?? 'sanfang';
    if (b.length === 1 && b[0]!.note.includes('不見')) return explainNot({ meets: cond.meets, stars: cond.stars, reach }, ctx);
    const words: { zh: string; en: string }[] = [];
    for (const x of b) {
      const m = /見(.+?)（/.exec(x.note);
      if (!m) continue;
      const w = seenWord(chart, x.branch, m[1]!);
      if (!words.some((y) => y.zh === w.zh)) words.push(w);
    }
    /* 錨星自己化（「武曲的三方四正見武曲化祿」）：直接講「武曲化祿」 */
    const self = words.filter((w) => w.zh.startsWith(`${cond.meets}化`));
    const others = words.filter((w) => !self.includes(w));
    const out: MingReason[] = self.map((w) => ({ zh: w.zh, en: w.en.replace(' turning to ', ' turns to ') }));
    if (!others.length) return out;
    /* 輔佐、煞星成組就縮短；化就照寫「某星化某」 */
    const plain = others.filter((w) => !w.zh.includes('化')).map((w) => w.zh);
    const g = groupWords(plain);
    const hua = others.filter((w) => w.zh.includes('化'));
    const zh = [g.zh, ...hua.map((w) => w.zh)].filter(Boolean).join('、');
    const en = listEn([g.en, ...hua.map((w) => w.en)].filter(Boolean));
    return [...out, { zh: `${cond.meets}${WHERE_ZH[reach]}見${zh}`, en: `${sEn(cond.meets)} meets ${en} ${WHERE_EN[reach]}` }];
  }
  if ('flow' in cond) {
    const l = cond.layer;
    const same = (cond.reach ?? 'same') === 'same';
    const where = (cond.in.layer ?? 'natal') === l ? cond.in.name : palZh(cond.in);
    const whereEn = (cond.in.layer ?? 'natal') === l ? `the ${PALACE_EN[cond.in.name] ?? cond.in.name}` : palEn(cond.in);
    return [{
      zh: `${HUA_SUFFIX_ZH[l]}的流${cond.flow}${same ? '進入' : '照到'}${where}`,
      en: `${LAYER_EN[l]} moving ${sEn(cond.flow)} ${same ? 'enters' : 'reaches'} ${whereEn}`,
    }];
  }
  if ('deLu' in cond) {
    const words: { zh: string; en: string }[] = [];
    for (const x of b) {
      const w = x.star === '祿存'
        ? { zh: '祿存', en: sEn('祿存') }
        : x.star && x.hua
          ? { zh: `${x.layer === 'natal' ? '' : HUA_SUFFIX_ZH[x.layer]}${x.star}化祿`, en: `${sEn(x.star)} turning to Abundance${HUA_SUFFIX_EN[x.layer]}` }
          : { zh: `${HUA_SUFFIX_ZH[x.layer]}的流祿存`, en: `${LAYER_EN[x.layer]} moving ${sEn('祿存')}` };
      if (!words.some((y) => y.zh === w.zh)) words.push(w);
    }
    return [{ zh: `${cond.deLu}會到${words.map((w) => w.zh).join('、')}`, en: `${sEn(cond.deLu)} is joined by ${listEn(words.map((w) => w.en))}` }];
  }
  if ('geju' in cond) {
    return [{ zh: `你的盤成「${GEJU_DEF[cond.geju].name}」`, en: `your chart forms ${GEJU_EN[cond.geju]}` }];
  }
  /* { star, in } */
  if ('star' in cond && 'in' in cond) {
    return [{ zh: `${palZh(cond.in)}有${cond.star}`, en: `${sEn(cond.star)} sits in ${palEn(cond.in)}` }];
  }
  return [];
}

/** `not` 入面講得清楚嘅幾款：見唔到某啲星。 */
function explainNot(c: Condition, ctx: EvalContext): MingReason[] {
  if ('meets' in c) {
    if (!hasStar(ctx.chart, c.meets) || (c.op && c.op !== 'gte') || (c.n ?? 1) !== 1) return [];
    const reach = c.reach ?? 'sanfang';
    const g = groupWords(c.stars);
    return [{ zh: `${c.meets}${WHERE_ZH[reach]}沒有${g.zh}`, en: `${sEn(c.meets)} meets none of ${g.en} ${WHERE_EN[reach]}` }];
  }
  if ('sanfangOf' in c && 'contains' in c) {
    return [{ zh: `${palZh(c.sanfangOf)}的三方四正沒有${c.contains}`, en: `${sEn(c.contains)} is not among the four directions of ${palEn(c.sanfangOf)}` }];
  }
  if ('sanfangOf' in c && 'count' in c && c.op === 'gte' && c.n === 1 && c.count === 'malefic') {
    return [{ zh: `${palZh(c.sanfangOf)}的三方四正沒有煞星`, en: `no harsh star sits among the four directions of ${palEn(c.sanfangOf)}` }];
  }
  return [];
}

/** 你的命宮係乜星（每章講一次）。 */
function systemReason(chart: Chart, x: { system: Xingxi; borrowed: boolean }): MingReason {
  const m = chart.palaces.find((p) => p.name === '命宮')!;
  const stars = x.system.stars;
  const en = listEn(stars.map(sEn));
  if (x.borrowed) {
    return { zh: `你的命宮沒有主星，借對宮的${stars.join('、')}來看`, en: `your Life Palace has no major star and borrows ${en} from the opposite palace` };
  }
  return {
    zh: `你的命宮是${stars.join('、')}${stars.length > 1 ? '同坐' : '坐'}${m.branch}宮`,
    en: `your Life Palace holds ${en} in the ${BRANCH_EN[m.branch] ?? m.branch} position`,
  };
}

/** 偏向：只有卡寫咗 pole 先講。 */
function poleReason(chart: Chart, system: Xingxi): MingReason | null {
  const lean = leanOf(chart, system);
  if (lean.state === 'none') return null;
  const miss: string[] = [];
  if (lean.state === 'tie') {
    const seen = [...lean.seen[system.poles[0]]!, ...lean.seen[system.poles[1]]!].join('、');
    return {
      zh: `你的盤兩頭的條件一樣多（${seen}），「${system.poles[0]}」與「${system.poles[1]}」平衡`,
      en: `your chart is balanced between ${POLE_EN[system.poles[0]] ?? system.poles[0]} and ${POLE_EN[system.poles[1]] ?? system.poles[1]} (${evEn(seen, miss)})`,
    };
  }
  const seen = lean.seen[lean.pole]!.join('、');
  return {
    zh: `你的盤偏向「${lean.pole}」（${seen}）`,
    en: `your chart leans toward ${POLE_EN[lean.pole] ?? lean.pole} (${evEn(seen, miss)})`,
  };
}

/** 個話題冇新事實可講嗰陣嘅一句（每個話題字眼唔同，一章唔會重複）。 */
const FALLBACK: Record<MingTopic, MingReason> = {
  本質: { zh: '這是你命宮這組星本身的性質', en: 'this is the nature of the stars in your Life Palace themselves' },
  格局: { zh: '你的格局來自命宮這組星本身', en: 'your pattern comes from the stars in your Life Palace themselves' },
  處事: { zh: '你處事的這一面，來自命宮這組星本身', en: 'this side of how you work comes from the stars in your Life Palace themselves' },
  待人: { zh: '你待人的這一面，來自命宮這組星本身', en: 'this side of how you deal with people comes from the stars in your Life Palace themselves' },
  運程: { zh: '你適合哪類十年，由命宮這組星本身決定', en: 'which kinds of decade suit you is set by the stars in your Life Palace themselves' },
};

/**
 * 本命運程卡嘅 `decades` 條件（大限層）：共同事實講一次，各十年的獨有事實亦保留，
 * 「這十年」改講「那幾個十年」（本命章唔係講某一個十年）。
 */
function explainDecades(chart: Chart, cond: Condition, ds: readonly Decadal[]): MingReason[] {
  const per = ds.map((d) => {
    const a = annualOf(chart, chart.lunar.y + d.fromAge - 1);
    return a.ok ? explain(cond, { chart, annual: a.value }) : [];
  });
  const relabel = (rs: MingReason[], sub: readonly Decadal[]) => {
    /* 一個十年就講明歲數（同一段可能有兩張卡各講一個十年，「那個十年」會撈亂） */
    const one = sub.length === 1 ? sub[0]! : null;
    const zh = one ? `${num(one.fromAge)}至${num(one.toAge)}歲那個十年` : '那幾個十年';
    const en = one ? `the decade at roughly ages ${Math.max(0, one.fromAge - 1)}–${one.toAge - 1}` : 'those decades';
    return rs.map((r) => ({
      zh: r.zh.replace(/這十年/g, zh),
      en: r.en.replace(/this decade's ([A-Z][A-Za-z ]*?Palace)/g, `the $1 of ${en}`).replace(/ this decade/g, ` in ${en}`),
    }));
  };
  const common = (per[0] ?? []).filter((r) => per.every((rs) => rs.some((x) => x.zh === r.zh)));
  const shared = new Set(common.map((r) => r.zh));
  /* 「順行」可以共用，但不能因此刪掉貪狼／巨門各自對應的年齡。 */
  return [
    ...relabel(common, ds),
    ...per.flatMap((rs, i) => relabel(rs.filter((r) => !shared.has(r.zh)), [ds[i]!])),
  ];
}

/** 「這十年的命宮有武曲；這十年的命宮有天府」→「這十年的命宮有武曲、天府」 */
function mergeIn(facts: MingReason[]): MingReason[] {
  const out: (MingReason & { place?: string; stars?: string[]; starsEn?: string[]; placeEn?: string })[] = [];
  for (const f of facts) {
    const z = /^(.+宮)有(\S+)$/.exec(f.zh);
    const e = /^(.+) sits in (.+)$/.exec(f.en);
    const prev = z && e ? out.find((o) => o.place === z[1]) : undefined;
    if (z && e && prev) {
      prev.stars!.push(z[2]!);
      prev.starsEn!.push(e[1]!);
      prev.zh = `${prev.place}有${prev.stars!.join('、')}`;
      prev.en = `${listEn(prev.starsEn!)} sit in ${prev.placeEn}`;
    } else if (z && e) {
      out.push({ ...f, place: z[1]!, stars: [z[2]!], starsEn: [e[1]!], placeEn: e[2]! });
    } else out.push(f);
  }
  return out.map((o) => ({ zh: o.zh, en: o.en }));
}

/* ── 砌段 ──────────────────────────────────────────── */

type Ctx = {
  chart: Chart;
  annual?: AnnualChart;
  x: { system: Xingxi; borrowed: boolean };
  /** 成章已經講過嘅句（中文），唔講第二次。 */
  said: Set<string>;
  /** 第一段先講命宮係乜星；運限段講嗰十年／嗰年。 */
  lead: MingReason | null;
};

function line(h: Hit): MingLine {
  const c = h.card;
  const ds = h.decades ?? [];
  return {
    zh: ds.length ? fillZh(c.claim, ds) : c.claim,
    en: c.en ? (ds.length ? fillEn(c.en, ds) : c.en) : '',
    card: c.id,
    sources: c.sources.map((s) => s.id),
  };
}

const endZh = (s: string) => (/[。！？]$/.test(s) ? s : `${s}。`);
const endEn = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);

function section(topic: MingTopic, layer: Card['layer'], hits: Hit[], cx: Ctx): MingSection | null {
  const mine = hits.filter((h) => h.card.topic === topic && !cx.said.has(line(h).zh));
  if (!mine.length) return null;
  /* 一個話題一把聲：claim 只揀一張（判斷層已經保證最多一張，呢度再守一次） */
  const claim = mine.find((h) => h.card.kind === 'claim');
  const caveats = mine.filter((h) => h.card.kind === 'caveat');
  const advice = mine.filter((h) => h.card.kind === 'advice');
  const head = claim ?? caveats[0] ?? advice[0]!;
  const rest = (xs: Hit[]) => xs.filter((h) => h !== head);
  const used = [head, ...rest(caveats), ...rest(advice)];

  /* 因為：先講命宮／嗰段時間，再講偏向，再講各卡條件中咗乜（去重、唔重複全章講過嘅） */
  const ctx: EvalContext = { chart: cx.chart, annual: cx.annual };
  const facts: MingReason[] = [];
  /* 「天梁在巳宮」：章頭已經講咗命宮係乜星坐邊個宮，唔再講 */
  const mingBranch = cx.chart.palaces.find((p) => p.name === '命宮')!.branch;
  const known = new Set(cx.x.borrowed ? [] : cx.x.system.stars.map((s) => `${s}在${mingBranch}宮`));
  const add = (r: MingReason | null) => {
    if (!r || !r.zh || known.has(r.zh) || cx.said.has(r.zh)) return;
    const existing = facts.find((f) => f.zh === r.zh);
    if (existing) {
      // 同一句依據可能支撐多張卡；去重文字時不能去掉後一張卡的來源。
      existing.source_ids = [...new Set([...(existing.source_ids ?? []), ...(r.source_ids ?? [])])];
      existing.citations = [...new Set([...(existing.citations ?? []), ...(r.citations ?? [])])];
    } else facts.push({ ...r });
  };
  add(cx.lead);
  const polar = used.filter((h) => h.card.pole);
  if (polar.length) {
    const reason = poleReason(cx.chart, cx.x.system);
    if (reason) add({ ...reason, source_ids: polar.map((h) => h.card.id), citations: [...new Set(polar.flatMap((h) => h.card.sources.map((s) => s.id)))] });
  }
  for (const h of used) {
    /* 合併只喺同一張卡之內做：兩張卡講唔同嘅十年，唔可以撈埋一句 */
    const own = [
      ...(h.card.when ? explain(h.card.when, ctx) : []),
      /* 本命運程卡：共同前提及每個十年的獨有依據。 */
      ...(h.card.decades && h.decades?.length ? explainDecades(cx.chart, h.card.decades, h.decades) : []),
    ];
    for (const r of mergeIn(own)) add({ ...r, source_ids: [h.card.id], citations: h.card.sources.map((s) => s.id) });
  }
  // 不可先保留全部結論／年齡，再以四項上限靜默刪掉其必要依據。
  const reasons = facts;
  if (!reasons.length) reasons.push(layer === 'natal' ? FALLBACK[topic] : FALLBACK.運程);
  cx.lead = null;

  const conclusion = { ...line(head), kind: head.card.kind };
  const cav = rest(caveats).map(line);
  const adv = rest(advice).map(line);
  for (const l of [conclusion, ...cav, ...adv]) cx.said.add(l.zh);
  for (const r of reasons) cx.said.add(r.zh);

  const parts: MingSection['parts'] = [
    { part: '結論', zh: endZh(conclusion.zh), en: endEn(conclusion.en) },
    { part: '因為', zh: endZh(`${LABEL.zh.because}${reasons.map((r) => r.zh).join('；')}`), en: endEn(`${LABEL.en.because}${reasons.map((r) => r.en).join('; ')}`) },
  ];
  if (cav.length) parts.push({ part: '留意', zh: `${LABEL.zh.watch}${cav.map((l) => endZh(l.zh)).join('')}`, en: `${LABEL.en.watch}${cav.map((l) => endEn(l.en)).join(' ')}` });
  if (adv.length) parts.push({ part: '做法', zh: `${LABEL.zh.act}${adv.map((l) => endZh(l.zh)).join('')}`, en: `${LABEL.en.act}${adv.map((l) => endEn(l.en)).join(' ')}` });

  return {
    topic,
    layer,
    conclusion,
    reasons,
    caveats: cav,
    advice: adv,
    source_ids: used.map((h) => h.card.id),
    citations: [...new Set(used.flatMap((h) => h.card.sources.map((s) => s.id)))],
    parts,
    text: { zh: parts.map((x) => x.zh).join('\n'), en: parts.map((x) => x.en).join('\n') },
  };
}

function render(title: { zh: string; en: string }, sections: MingSection[]): { zh: string; en: string } {
  return {
    zh: [title.zh, ...sections.map((s) => `${s.layer === 'natal' ? `【${s.topic}】\n` : ''}${s.text.zh}`)].filter(Boolean).join('\n\n'),
    en: [title.en, ...sections.map((s) => `${s.layer === 'natal' ? `${MING_TOPIC_EN[s.topic]}\n` : ''}${s.text.en}`)].filter(Boolean).join('\n\n'),
  };
}

/**
 * 本命命宮章：五個話題，冇卡命中嘅話題唔出。
 * `pool` 畀測試換卡；平時用 `CARDS`。
 */
export function writeMing(chart: Chart, opts: { pool?: Card[] } = {}): MingChapter {
  const x = xingxiOf(chart);
  if (!x) return { palace: '命宮', system: null, sections: [], text: { zh: '', en: '' } };
  const hits = cardsFor(chart, undefined, 'natal', opts.pool);
  const cx: Ctx = { chart, x, said: new Set(), lead: systemReason(chart, x) };
  const sections = MING_TOPICS.map((t) => section(t, 'natal', hits, cx)).filter((s): s is MingSection => !!s);
  return {
    palace: '命宮',
    system: { n: x.system.n, name: x.system.name, borrowed: x.borrowed },
    sections,
    text: render({ zh: '命宮', en: 'Life Palace' }, sections),
  };
}

/**
 * 某一個十年嘅命宮運程（大限層卡）。卡本身用「這十年」開頭；因為句第一樣講嗰十年係幾多歲。
 * 用嗰十年第一年嘅流年資料計（同 card.ts `decadesFor` 一樣）。
 */
export function mingDecade(chart: Chart, decade: Decadal, opts: { pool?: Card[] } = {}): MingSection | null {
  const a = annualOf(chart, chart.lunar.y + decade.fromAge - 1);
  if (!a.ok) return null;
  return flowSection(chart, a.value, 'decade', { zh: `這十年是${decadesZh([decade])}`, en: `this decade covers ${decadesEn([decade])}` }, opts.pool);
}

/** 某一年嘅命宮運程（流年層卡）。卡本身用「這一年」開頭。 */
export function mingYear(chart: Chart, year: number, opts: { pool?: Card[] } = {}): MingSection | null {
  const a = annualOf(chart, year);
  if (!a.ok) return null;
  const age = a.value.nominalAge;
  return flowSection(
    chart,
    a.value,
    'annual',
    { zh: `這一年你虛歲${num(age)}`, en: `this year you are around ${Math.max(0, age - 1)} (${age} by Chinese reckoning)` },
    opts.pool,
  );
}

/** 寫書嗰年：行緊嗰個十年同嗰一年，各自一段（冇卡就 null）。 */
export function mingFlow(chart: Chart, year: number, opts: { pool?: Card[] } = {}): { decade: MingSection | null; annual: MingSection | null } {
  const a = annualOf(chart, year);
  const d = a.ok ? a.value.decadal : null;
  return { decade: d ? mingDecade(chart, d, opts) : null, annual: mingYear(chart, year, opts) };
}

function flowSection(chart: Chart, a: AnnualChart, layer: 'decade' | 'annual', lead: MingReason, pool?: Card[]): MingSection | null {
  const x = xingxiOf(chart);
  if (!x) return null;
  const hits = cardsFor(chart, a, layer, pool);
  return section('運程', layer, hits, { chart, annual: a, x, said: new Set(), lead });
}
