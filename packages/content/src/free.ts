import { z } from 'zod';
import type { Chart, PalaceName } from '@guanwei/ziwei';
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
    text: '這一章不讀吉凶。它把你出生那一刻換算成一張盤，並且寫明這本書用的是哪一套算法。往後每一章，都從這裡長出來。',
  },
  {
    id: 'frame.close.序',
    slot: '留白',
    status: 'reviewed',
    text: '以上都只是位置。位置本身不說好壞，往下幾章做的是把它們讀成傾向，最後交回你自己驗證。',
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
  /**
   * ⚠ 流派聲明要由引擎出，唔准喺呢度抄一份（工單 H2 第一條 AC）。
   *
   * `SCHOOL_PROFILE.declaration`。同一句要出現喺 `/about`、
   * 每本命書版權頁、命書四化章 —— **三處同源**。
   *
   * 第一版喺呢個檔案入面自己寫咗一句「本書以三合派為骨…」，
   * 即係 H2 明文禁止嗰樣：聲明同資料各講各話，正正就係我哋
   * 批評緊競品嗰件事。所以佢而家係一個參數，唔係一句文案。
   */
  declaration: string;
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
  '出生時間已按出生地經度作真太陽時校正。',
  '出生時間未作真太陽時校正，按時區時間直接換算。',
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
  const r = chart.meta.rules;
  const lines = [
    `${input.declaration}（流派設定 ${chart.meta.schoolProfile}）`,
    r.trueSolarTime
      ? '出生時間已按出生地經度作真太陽時校正。'
      : '出生時間未作真太陽時校正，按時區時間直接換算。',
    `${BOUNDARY[r.yearBoundary] ?? r.yearBoundary}；${LATE_ZI[r.lateZiHour] ?? r.lateZiHour}；${SIHUA[r.sihuaSet] ?? r.sihuaSet}。`,
    `排盤引擎 ${chart.meta.engineVersion}。遇到各家說法不一的地方，本書會在該處寫明，不會替你挑一邊。`,
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
  assertSettingsOnly(lines.join(''), input.declaration);

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

export const SHEN_SLOTS = ['章首', '五行局', '身宮', '留白'] as const;
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
    text: '這一章讀兩件事：你的局數，還有身宮落在哪裡。前者是起算點，後者是你後天花力氣的地方。兩樣都在說位置，不評高低。',
  },
  {
    id: 'frame.close.身宮',
    slot: '留白',
    status: 'reviewed',
    text: '著力的地方會隨年歲移動，位置卻不會。值得你自己看的是：這些年花掉的力氣，落在哪裡。',
  },
].map((f) => ShenFrame.parse(f));

export type ShenInput = { chart: Chart };

/** 身宮落喺邊一宮。十二宮入面只有六個可能。 */
export function shenPalace(chart: Chart): PalaceName | null {
  return chart.palaces.find((p) => p.isShen)?.name ?? null;
}

/**
 * 身宮與五行局。
 *
 * ⚠ 一句命理文字都唔喺呢度生 —— 身宮嗰段係原封不動嘅 L3 塊，
 * 五行局嗰段只講盤面數值（同序嘅「命宮在寅」同一類）。
 * 組裝器嗰條規矩（「冇一句文字係喺呢個檔案入面生出嚟」）呢度一樣守。
 */
export function shenChapter(
  input: ShenInput,
): { slug: string; title: string; segments: ShenSegment[] } | null {
  const { chart } = input;
  const where = shenPalace(chart);
  if (!where) return null;

  const block = L3_BLOCKS.find((b) => b.kind === 'shen' && b.key === where);
  if (!block) return null;

  /* 起運虛歲由引擎出 —— 唔係喺呢度按局數查表算多次。 */
  const fromAge = chart.decadals[0]?.fromAge ?? null;
  const ju =
    `你的五行局是${chart.wuxingJu.name}。` +
    (fromAge === null ? '' : `大限由虛歲${small(fromAge)}歲起，之後每十年一步。`);

  const segments: ShenSegment[] = [
    { slot: '章首', text: SHEN_FRAMES[0]!.text, source_id: null, rule_ids: [] },
    { slot: '五行局', text: ju, source_id: null, rule_ids: [] },
    { slot: '身宮', text: block.body, source_id: block.id, rule_ids: block.rule_ids },
    { slot: '留白', text: SHEN_FRAMES[1]!.text, source_id: null, rule_ids: [] },
  ];

  /* 章首、五行局、留白三格唔准讀象；身宮嗰格係一塊有來源嘅正文，所以唔掃。 */
  assertNoReading(segments.filter((s) => s.slot !== '身宮'));

  return { slug: '身宮與五行局', title: '身宮與五行局', segments };
}
