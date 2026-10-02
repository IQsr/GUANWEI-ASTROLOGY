import { z } from 'zod';
import type { Chart, Palace, PalaceName } from '@guanwei/ziwei';
import { shenLines } from './shen';
import { L3_BLOCKS } from './l3-data';
import { FORBIDDEN_TERMS } from './frame';
import { cjkCount } from './lexicon';


/**
 * 免費章之一：序 · 你的命盤（工單 C12 · 架構 §6、§8 · 內容系統 §2）
 *
 * ── 呢一章點解要有 ──
 *
 * 架構 §6 列咗免費五章，而到今日為止**得「命宮」一章生成得到** ——
 * 即係話一本免費書揭開，目錄五行，入面得一章有字。
 *
 * ── ⚠ 呢一章一個命理判斷都冇 ──
 *
 * 內容系統 §2：「揀咗要公開講 —— `/about` 同每本命書版權頁寫明
 * 依邊套體系。唔係免責，係學問嘅基本禮貌，亦係同唔標出處嘅玄學站
 * 最直接嘅分別。」
 *
 * 架構 §8：「真太陽時 —— 命書版權頁寫明用咗乜。」
 *
 * 兩句加埋就係呢一章：**佢係版權頁，唔係一章命書。**
 * 佢寫你嘅生辰點樣變成呢張盤、用咗邊套規矩，
 * 然後就交畀之後嗰幾章去讀。
 *
 * 所以佢唔使來源 —— 佢對斗數冇作出任何主張。
 * 而豁免要有代價，同章框一樣：**一個象義字都唔准有**，
 * 而且下面 `assertNoReading()` 會逐段掃。
 *
 * ── ⚠ 規矩由盤講，唔由呢度寫死 ──
 *
 * 「真太陽時校正咗」呢句，讀嘅係 `chart.meta.rules.trueSolarTime`。
 * 寫死一句「本書用真太陽時」，喺一張冇校正嘅盤上面就係一句大話 ——
 * 而佢印喺版權頁度，正正係讀者最當佢係真嗰個位置。
 */

/**
 * ⚠ 序用自己一套插槽，唔跟 §6 嗰張表。
 *
 * §6 插槽表（開場／結構／牽動／擾動／留白）係**逐宮章**嘅表：
 * 每一格都對住一層命理材料。序冇命理材料，所以夾硬塞入去
 * 就會出現一個叫「結構」但入面寫住生辰嘅格 —— 之後邊個讀 code
 * 都會以為嗰度有象義。
 */
/**
 * ⚠ 序嘅章名同章首，全個 repo 只喺呢度寫一次。
 *
 * 之前佢哋散喺三個地方：呢度、題名幕嗰版左頁（手寫咗兩句 stand-in）、
 * 落款嗰張目次。三份文字各寫各，改一份唔會影響另外兩份 ——
 * 而讀者見到嘅係「同一章喺三個位講唔同嘅嘢」。
 */
export const XU_SLUG = '序';
export const XU_TITLE = '序 · 你的命盤';

export const XU_SLOTS = ['章首', '生辰', '盤面', '體系', '留白'] as const;
export type XuSlot = (typeof XU_SLOTS)[number];

export type XuSegment = {
  slot: XuSlot;
  text: string;
  /** 永遠 null / 空 —— 序冇塊、冇規則，因為佢冇主張。 */
  source_id: null;
  rule_ids: string[];
};

const XuFrame = z
  .object({
    id: z.string(),
    slot: z.enum(['章首', '留白']),
    text: z.string().min(1),
    status: z.enum(['draft', 'reviewed', 'published']),
  })
  .superRefine((f, ctx) => {
    const bad = FORBIDDEN_TERMS.filter((t) => f.text.includes(t));
    if (bad.length) {
      ctx.addIssue({ code: 'custom', message: `${f.id}：序唔准講命理，出現咗「${bad.join('、')}」` });
    }
    const w = cjkCount(f.text);
    if (f.slot === '章首' && (w < 30 || w > 60)) {
      ctx.addIssue({ code: 'custom', message: `${f.id}：${w} 字，章首要 30–60` });
    }
    if (f.slot === '留白' && (w < 25 || w > 45)) {
      ctx.addIssue({ code: 'custom', message: `${f.id}：${w} 字，留白要 25–45（內容系統 §6）` });
    }
    if (f.slot === '留白' && !/你|自己/.test(f.text)) {
      ctx.addIssue({ code: 'custom', message: `${f.id}：留白句要對住讀者講` });
    }
  });

export const XU_FRAMES = [
  {
    id: 'frame.open.序',
    slot: '章首',
    status: 'reviewed',
    text: '你出生的那一刻，在這裡換算成一張命盤。十二宮的位置由此定下，往後每一章，都從這張盤讀起。',
  },
  {
    id: 'frame.close.序',
    slot: '留白',
    status: 'reviewed',
    text: '這張盤是屬於你的底圖，一生不變。往後翻開的每一章，讀的都是你自己。',
  },
].map((f) => XuFrame.parse(f));

const DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;

function year(n: number): string {
  return [...String(n)].map((d) => DIGITS[Number(d)]).join('');
}

function small(n: number): string {
  if (n < 10) return DIGITS[n]!;
  if (n < 20) return `十${n % 10 ? DIGITS[n % 10] : ''}`;
  return `${DIGITS[Math.floor(n / 10)]}十${n % 10 ? DIGITS[n % 10] : ''}`;
}

/**
 * 農曆日子寫法：初一、十五、廿三、三十。
 *
 * ⚠ 廿唔係「二十」嘅簡寫，係農曆寫日子嘅慣例。
 * 寫「二十三日」讀落係國曆，寫「廿三」先至係農曆 ——
 * 而呢一章成段嘢就係為咗分清楚兩者。
 */
export function lunarDay(d: number): string {
  if (d <= 10) return `初${small(d)}`;
  if (d < 20) return `十${DIGITS[d - 10]}`;
  if (d === 20) return '二十';
  if (d < 30) return `廿${DIGITS[d - 20]}`;
  return '三十';
}

export function lunarMonth(m: number, leap: boolean): string {
  const name = m === 1 ? '正月' : `${small(m)}月`;
  return leap ? `閏${name}` : name;
}

export type XuInput = {
  chart: Chart;
  /** 國曆生辰同出生地 —— 盤入面冇留低，由落款嗰邊帶過嚟。 */
  solar: { y: number; m: number; d: number };
  place: string;
  /*
   * ⚠ 2026-09 拎走咗 `declaration`（流派聲明全文）同 `contentVersion`（規則庫版本）：
   * 序唔再印設定細節同版本號（見 `xuChapter()` 體系段）。流派聲明全文照舊喺
   * `/about`，同引擎同源（工單 H2）；版本號照舊寫落 DB（R-008）。
   */
};

/**
 * ⚠ 一句都唔准讀象。
 *
 * 呢一章冇來源，靠嘅就係「佢冇講命理」。所以唔止章框要掃，
 * 生成出嚟嗰幾段一樣要掃 —— 否則加多一句「命宮坐紫微，主…」
 * 就靜靜雞開咗一道冇出處嘅後門。
 */
export function assertNoReading(segments: { slot: string; text: string }[]): void {
  for (const s of segments) {
    const bad = FORBIDDEN_TERMS.filter((t) => s.text.includes(t));
    if (bad.length) {
      throw new Error(`序 · ${s.slot}：出現咗象義字「${bad.join('、')}」—— 序冇來源，所以唔准讀象`);
    }
  }
}

const BOUNDARY: Record<string, string> = {
  'lunar-new-year': '年干支以農曆正月初一換年',
  lichun: '年干支以立春換年',
};

const LATE_ZI: Record<string, string> = {
  'next-day': '晚上十一時之後出生，算翌日早子時',
  'same-day': '晚上十一時之後出生，算當日晚子時',
};

const SIHUA: Record<string, string> = {
  zhongzhou: '四化用中州派一套',
  quanshu: '四化用《全書》一套',
};

/**
 * 序入面講流派嗰一句：淨係講邊一派，唔講設定細節（2026-09）。
 * 由盤嘅 `schoolProfile` 揀 —— 唔認得嘅流派就唔講，唔好估。
 */
const SCHOOL_LINE: Record<string, string> = {
  zhongzhou: '這張盤依中州派（王亭之）的算法排出。',
};

const TRUE_SOLAR = '出生時間已按出生地經度，校正為真太陽時。';
const ZONE_TIME = '出生時間按當地時區時間換算。';

/**
 * ⚠ 體系嗰一段用另一把尺，唔係豁免。
 *
 * `assertNoReading()` 掃到兩個字，而兩個都係真嘅：
 * 「真太陽時」入面有「太陽」，「四化用中州派一套」入面有「四化」。
 *
 * 第一個係天文（apparent solar time），唔係嗰粒星；
 * 第二個係版權頁一定要講嘅嘢 —— 架構 §8 要求寫明用咗乜，
 * 而「用咗邊套四化表」正正就係嗰三個分歧點之一。
 *
 * 所以唔係改句子（改唔到，兩個都係術語本身），亦都唔係開一張例外名單
 * （噉就係一道後門）。做法係：**體系段只准用佢自己嗰幾張設定表嘅字。**
 * 表入面有嘅字准，表入面冇嘅象義字一律擋 ——
 * 有人日後喺呢一段寫多句「命宮坐紫微」，照樣紅。
 */
const SETTINGS_VOCAB = [
  ...Object.values(BOUNDARY),
  ...Object.values(LATE_ZI),
  ...Object.values(SIHUA),
  ...Object.values(SCHOOL_LINE),
  TRUE_SOLAR,
  ZONE_TIME,
].join('');

export function assertSettingsOnly(text: string, declaration = ''): void {
  /*
   * ⚠ 流派聲明一定會提到星名（「太陽化祿、武曲化權、天府化科、天同化忌」）。
   *
   * 佢唔係一句讀象 —— 佢係「我哋用咗邊套四化表」嘅具體內容，
   * 而且由引擎出、有測試逼佢同 `sihua.json` 對得返。
   * 所以佢帶住自己嗰份詞彙入嚟，唔係加落一張例外名單度。
   */
  const vocab = SETTINGS_VOCAB + declaration;
  const bad = FORBIDDEN_TERMS.filter((t) => text.includes(t) && !vocab.includes(t));
  if (bad.length) {
    throw new Error(`序 · 體系：出現咗象義字「${bad.join('、')}」—— 版權頁只准講設定`);
  }
}

/** 序 · 你的命盤。 */
export function xuChapter(input: XuInput): { slug: string; title: string; segments: XuSegment[] } {
  const { chart, solar, place } = input;
  const seg = (slot: XuSlot, text: string): XuSegment => ({
    slot,
    text,
    source_id: null,
    rule_ids: [],
  });

  const [yg, yb] = chart.ganzhi.year;
  const hourBranch = chart.ganzhi.hour[1];

  const birth =
    `國曆${year(solar.y)}年${small(solar.m)}月${small(solar.d)}日，${hourBranch}時，生於${place}。` +
    `農曆${yg}${yb}年${lunarMonth(chart.lunar.m, chart.lunar.isLeapMonth)}${lunarDay(chart.lunar.d)}。`;

  const board =
    `五行局是${chart.wuxingJu.name}。命宮在${chart.mingGong}，身宮在${chart.shenGong}。` +
    `十二宮由此定位，往後每一章各讀其中一宮。`;

  /*
   * ⚠ 規矩逐條由盤度讀返出嚟，唔係喺呢度寫死。
   * 一張冇校正過真太陽時嘅盤，版權頁唔可以話佢校正過。
   */
  /*
   * ⚠ 2026-09 改（Issac）：版本號、流派設定 ID、年界、子時、四化表逐條列 ——
   * 全部收返去幕後，唔再印喺書度。讀者唔需要知我哋用緊邊個引擎版本，
   * 一串 `zhongzhou-v1@4f66c68baf4b17cf` 只會令一本命書讀落似一份系統報告。
   *
   * 佢哋冇唔見：`charts.engine_version`、`school_profile_id`、`chapters.content_version`
   * 照舊逐本寫落 DB（R-008「舊書唔自動重算」靠嗰幾格兌現，唔靠印出嚟）。
   *
   * 留低嘅得兩樣讀者真係用得著嘅：邊一派（信得過嘅出處）、有冇按出生地校正時間。
   */
  const r = chart.meta.rules;
  const school = SCHOOL_LINE[chart.meta.schoolProfile.split('@')[0]!.replace(/-v\d+$/, '')];
  const lines = [
    ...(school ? [school] : []),
    r.trueSolarTime ? TRUE_SOLAR : ZONE_TIME,
  ];

  const segments = [
    seg('章首', XU_FRAMES[0]!.text),
    seg('生辰', birth),
    seg('盤面', board),
    seg('體系', lines.join('')),
    seg('留白', XU_FRAMES[1]!.text),
  ];

  /*
   * ⚠ 體系段唔行同一把尺 —— 見 `assertSettingsOnly()` 上面嗰段。
   * 其餘四段一個象義字都唔准有。
   */
  assertNoReading(segments.filter((s) => s.slot !== '體系'));
  assertSettingsOnly(lines.join(''));

  return { slug: XU_SLUG, title: XU_TITLE, segments };
}


/* ───────────────────────────────────────────────────────────
 * 免費章之二：身宮與五行局（工單 C12b · 架構 §6）
 *
 * ── ⚠ 呢一章係一個「甲案」嘅結果 ──
 *
 * C12 嗰陣停咗低，因為材料已經有主人：`l3.shen.*` 六條塊一直由
 * **身宮所在嗰一宮嘅章**用緊（`l3For()` 個 `order` 入面）。
 * 一件事喺同一本書講兩次係個 bug，所以要揀邊章擁有佢。
 *
 * Issac 2026-09-20 揀咗甲：**新章攞走，逐宮章讓路。**
 * 所以 `l3For()` 個 order 剷咗 `shen`，而呢一章獨佔嗰六條塊。
 *
 * 代價寫喺呢度：身宮所在嗰一宮，個「牽動」格薄咗一塊。
 * `relation` 永遠喺度，所以嗰格唔會空 —— 但佢真係少咗一層。
 *
 * ── ⚠ 五行局嗰半，正文只講事實 ──
 *
 * 五行局有五條詞條（有來源、已審），但佢哋係**藏經閣資產**。
 * 將條目原文搬入正文，等於同註層講同一番話兩次 ——
 * 而內容 §4 早就寫定咗分工：「正文層零術語可讀，術語撳開有註層，
 * 註層＝藏經閣摘要。」
 *
 * 所以正文只寫盤面講到嘅嘢（邊個局、幾多歲起運），
 * 「木三局」三個字自己會被標成術語，撳開就係嗰條詞條。
 * 一份資產，寫一次，用兩次。
 * ─────────────────────────────────────────────────────────── */

export const SHEN_SLOTS = ['章首', '身宮', '身宮星', '五行局', '留白'] as const;
export type ShenSlot = (typeof SHEN_SLOTS)[number];

export type ShenSegment = {
  slot: ShenSlot;
  text: string;
  source_id: string | null;
  rule_ids: string[];
};

const ShenFrame = z
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

export const SHEN_FRAMES = [
  {
    id: 'frame.open.身宮',
    slot: '章首',
    status: 'reviewed',
    text: '這一章讀兩件事：你的五行局，還有身宮落在哪裡。五行局是你起運的起點，身宮是你後天最花力氣的地方。',
  },
  {
    id: 'frame.close.身宮',
    slot: '留白',
    status: 'reviewed',
    text: '身宮所在，就是你這些年最用力的地方；力氣用在這裡，最容易見到回報。',
  },
].map((f) => ShenFrame.parse(f));

export type ShenInput = {
  chart: Chart;
  /** 成書嗰年。有就講「寫這本書時你行緊邊個大限」；冇就只講起運。 */
  year?: number;
};

/** 身宮落喺邊一宮。十二宮入面只有六個可能。 */
export function shenPalace(chart: Chart): PalaceName | null {
  return chart.palaces.find((p) => p.isShen)?.name ?? null;
}

/** 年歲：大限去到一百幾歲（最後一個大限 113–122），`small()` 只去到九十九。 */
function ageCN(n: number): string {
  if (n < 100) return small(n);
  const r = n % 100;
  return `一百${r === 0 ? '' : r < 10 ? `零${small(r)}` : small(r)}`;
}

function starsOf(p: Palace): string {
  const majors = p.stars.filter((s) => s.kind === 'major').map((s) => s.name);
  return majors.length ? `，坐${majors.join('、')}` : '，宮內沒有主星';
}

/**
 * 五行局嗰段（2026-09-29 直白）：兩本書都冇講「你係乜局所以點」——
 * 局數只定起點，冇高低（詞條原文）。所以呢度唔作性格，講局數真正決定嘅嘢：
 * 你嘅大限時間線 —— 寫書嗰年行緊邊個大限、落喺邊宮、坐乜星、下一個幾時轉。
 *
 * ⚠ 只講事實，唔判斷大限好壞（大限解讀係另一層）。
 * ⚠ 本書寫咗就唔變（R-008），所以寫明「寫這本書時」，唔寫「現在」。
 */
export function juLine(chart: Chart, bookYear?: number): string {
  const first = chart.decadals[0];
  let t = `你是${chart.wuxingJu.name}。`;
  if (!first) return t;
  t += `大限由虛歲${ageCN(first.fromAge)}歲起，每十年一步。`;
  if (!bookYear) return t;
  const age = bookYear - chart.lunar.y + 1;
  const at = (branch: string) => chart.palaces.find((p) => p.branch === branch)!;
  const label = (p: Palace) => (p.name.endsWith('宮') ? p.name : `${p.name}宮`);
  if (age < first.fromAge) {
    const p = at(first.branch);
    return `${t}寫這本書時（${year(bookYear)}年），你虛歲${ageCN(age)}，第一個大限從虛歲${ageCN(first.fromAge)}歲開始，落在${label(p)}${starsOf(p)}。`;
  }
  const d = chart.decadals.find((x) => age >= x.fromAge && age <= x.toAge);
  if (!d) return t;
  const p = at(d.branch);
  t += `寫這本書時（${year(bookYear)}年），你虛歲${ageCN(age)}，正行第${ageCN(d.index)}個大限（${ageCN(d.fromAge)}至${ageCN(d.toAge)}歲），落在${label(p)}${starsOf(p)}。`;
  const next = chart.decadals.find((x) => x.index === d.index + 1);
  if (next) t += `下一個大限從虛歲${ageCN(next.fromAge)}歲開始，轉到${label(at(next.branch))}。`;
  return t;
}

/**
 * 身宮與五行局（2026-09-29 直白）。
 *
 *   身宮     結論：你把力氣放在邊（L3 塊，第一句就係結論）
 *   身宮星   盤面事實（身宮喺邊、坐乜）＋ 坐乜星／有乜化／命身組合（`shen.ts`，每句有原文）
 *   五行局   大限時間線（盤面事實）
 *   留白     章框
 *
 * 章首（「這一章讀兩件事⋯」）拎走：講方法（docs/voice.md 第六節）。
 */
export function shenChapter(
  input: ShenInput,
): { slug: string; title: string; segments: ShenSegment[] } | null {
  const { chart } = input;
  const where = shenPalace(chart);
  if (!where) return null;

  const block = L3_BLOCKS.find((b) => b.kind === 'shen' && b.key === where);
  if (!block) return null;
  const sp = chart.palaces.find((p) => p.isShen)!;
  const label = where.endsWith('宮') ? where : `${where}宮`;
  const lines = shenLines(chart);
  const opp = sp.borrowsFrom && !sp.stars.some((s) => s.kind === 'major') ? chart.palaces.find((p) => p.branch === sp.borrowsFrom) : undefined;
  const borrowed = opp ? `，借對宮的${opp.stars.filter((s) => s.kind === 'major').map((s) => s.name).join('、')}來看` : '';
  const fact = where === '命宮' ? `你的身宮和命宮在同一宮${starsOf(sp)}${borrowed}。` : `你的身宮落在${label}${starsOf(sp)}${borrowed}。`;

  const segments: ShenSegment[] = [
    { slot: '身宮', text: block.body, source_id: block.id, rule_ids: block.rule_ids },
    { slot: '身宮星', text: fact + lines.map((l) => l.text).join(''), source_id: lines.map((l) => l.id).join('+') || null, rule_ids: [] },
    { slot: '五行局', text: juLine(chart, input.year), source_id: null, rule_ids: [] },
    { slot: '留白', text: SHEN_FRAMES[1]!.text, source_id: null, rule_ids: [] },
  ];

  /* 留白係章框，唔准讀象；其餘係有來源嘅正文或者盤面事實（事實會講星名） */
  assertNoReading(segments.filter((s) => s.slot === '留白'));

  return { slug: '身宮與五行局', title: '身宮與五行局', segments };
}
