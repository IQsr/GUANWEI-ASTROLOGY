/**
 * 組裝器（工單 C8b）
 *
 * 出處：內容系統 §6 插槽表、§7 AI 收尾、§9 字數預算、docs/voice-spec.md §18
 *
 * ── 分工 ──
 *
 * C8 推理器出一個**已評級嘅結論物件**；C8b 由嗰個物件揀塊、砌章。
 * 兩者之間有一條唔准過嘅界：**組裝器唔准改評級，推理器唔准寫字。**
 *
 * 所以呢度全部係查表同拼接 —— 冇一句文字係喺呢個檔案入面生出嚟嘅，
 * 每一段都追得返去一舊塊（`source_id`）同一條規則（`rule_ids`）。
 * 工單 AC 第四條：「每句追得返去邊一塊 ＋ 邊條規則。」
 *
 * ── 決定 V-001 嘅後果：觀察章係常態 ──
 *
 * `grade: null` 由例外變成常態（Issac，2026-09-14），
 * 而 schema 明文禁止 `grade: null` 有 `title` / `body` —— 只可以出 `reader_note`。
 *
 * 所以呢度最緊要嗰個設計決定係：
 *
 *   **觀察章唔係短版，係另一種章。**
 *
 * 佢一樣有象、有基塊、有結構、有留白 —— L1 講張力、L5 講留白，
 * 兩層本來就唔講方向，所以佢哋喺觀察章度一個字都唔使刪。
 * 唔同嘅只係中間少咗一句「所以呢個方向係順／逆」。
 *
 * 一個寫成三行免責聲明嘅觀察章，讀者見到嘅係「乜都冇講」；
 * 而我哋真係有嘢講 —— 只係唔係一個方向。
 */
import type { Brightness, Chart, Palace, PalaceName } from '@guanwei/ziwei';
import { BASE_BLOCKS } from './baseblock-data';
import { PALACE_TOPIC } from './baseblock';
import { brightnessModifier, maleficModifier, sihuaModifier } from './modifier-data';
import { MALEFICS } from './modifier';
import { chapterFooter, emptyPalaceLine, type Slot } from './frame';
import { closeFor, openFor, transitionBank } from './frame-data';
import { cjkCount } from './lexicon';
import { similarity } from './baseblock';
import { L3_BLOCKS, l3For } from './l3-data';
import type { InferResult } from './infer';

/**
 * §6 插槽表。字數係**上限唔係目標** —— 內容系統 §1 第四行。
 *
 * `章首` 唔喺原表入面：原表嘅「開場」指 L1 基塊首句，
 * 而 C7 嘅 L5 開場導語係擺喺佢前面嗰一句（講「呢章讀乜、唔讀乜」）。
 * 兩者唔同層，所以分開兩格。
 */
/*
 * ⚠ 俾規範嘅一個編輯建議（同 voice.md 第四節嗰條並列）。
 *
 * §6 插槽表嘅字數上限，假設咗**一個宮一粒主星、一粒煞**：
 *
 *   結構 120–200 = 基塊餘下 ＋ 一個廟旺 ＋ 一個四化
 *   擾動 0–60    = 一句煞曜提示
 *
 * 但盤唔係咁排：紫微天府可以同宮，官祿可以同時坐擎羊同火星。
 * C8b 跑十二章出嚟，兩個超標**全部**係呢個原因 ——
 * 父母（天機＋巨門，結構 210）同官祿（擎羊＋火星，擾動 82）。
 *
 * 呢度冇調參數去夾個數字。調到啱就係一條冇理由嘅規則，
 * 而且下一副雙星盤照樣爆。正確做法係規範嗰邊認咗一格可以有幾粒星，
 * 或者修飾語寫短啲。喺嗰個決定之前，`outOfRange` 照報。
 */
export const SLOT_SPEC = [
  { slot: '章首' as const, min: 30, max: 50, required: true },
  { slot: '開場' as const, min: 30, max: 70, required: true },
  { slot: '結構' as const, min: 60, max: 200, required: true },
  { slot: '牽動' as const, min: 40, max: 140, required: true },
  { slot: '擾動' as const, min: 0, max: 60, required: false },
  { slot: '留白' as const, min: 25, max: 45, required: true },
] as const;

export type ChapterSlot = (typeof SLOT_SPEC)[number]['slot'];

export type Segment = {
  slot: ChapterSlot | '過場';
  text: string;
  /** 追得返去邊一舊塊。`null` = 過場句（唔帶新資訊，所以冇塊）。 */
  source_id: string | null;
  /** 撐住呢一段嘅已審核規則。空 = 呢段唔係一個命理主張（章首、過場、留白）。 */
  rule_ids: string[];
};

export type Chapter = {
  palace: PalaceName;
  topic: string;
  /**
   * 由 C8 嚟嘅**主題**評級 —— 唔係呢一宮嘅評級。
   *
   * ⚠ 呢個分別要睇得見，所以欄名有 `topic_` 前綴。
   * 主題得七個，宮位有十二個：命宮、子女、遷移、父母四個宮共用 `self`。
   * 照抄主題評級去做「父母章嘅評級」，就係 §13 禁止嘅
   * 「把同一組星從不同角度重複計票」—— 只不過呢次係跨章重複。
   */
  topic_grade: number | null;
  topic_kind: InferResult['trace']['kind'];
  /** 成章嘅文。 */
  text: string;
  segments: Segment[];
  words: number;
  /** 逐格字數對返 §6 插槽表。超出範圍就列喺 `outOfRange`。 */
  slotWords: Record<string, number>;
  outOfRange: { slot: string; words: number; min: number; max: number }[];
  /**
   * ⚠ 跨插槽重複。
   *
   * 呢個係 C8b 砌第一章嗰陣即刻見到嘅嘢：C5 基塊嘅最後一句係**結構註**
   * （「官祿要連命宮、財帛、遷移一起交代」），而 C7／C8b 嘅 L3 關係塊
   * 講嘅係同一件事。C5 寫嗰句係因為**嗰陣未有 L3 層**；而家有咗，兩句撞埋。
   *
   * 呢度只**報**唔**剷**。C5 學過：機械刪句會令文氣散晒，要成批重寫。
   * 正確嘅修法係內容修法 —— 而家 L3 接咗嗰份工，基塊嗰句應該退場，
   * 但嗰個係一百六十八條塊嘅編輯工作，唔係組裝器可以順手做嘅嘢。
   */
  duplicates: { a: string; b: string; score: number }[];
  /** 空宮借咗邊個宮。命書一定要明寫（內容系統 §6）。 */
  borrowed: { from: PalaceName; stars: string[] } | null;
  /**
   * ⚠ 揀唔到塊嘅插槽。**呢個 list 唔准靠人記得去睇** —— 有測試守住。
   *
   * 佢存在嘅理由：一個插槽冇內容嗰陣，最容易嘅做法係靜靜雞跳過佢，
   * 咁樣個章讀落仲係完整嘅，但實際上少咗一層。留低一個名，
   * 就令「呢一層未寫」同「呢一層寫咗但唔適用」分得開。
   */
  missing: { slot: ChapterSlot; reason: string }[];
};

/** 同 frame.ts 一樣嘅 FNV-1a。組裝要可重現，所以一個 random 都唔准有。 */
function hashSeed(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * 兩段文有冇一段 `n` 字以上嘅**逐字**重複。
 *
 * 相似度捉唔到呢種：貪狼基塊寫「興趣廣而不深：什麼都碰一點，什麼都停在入門」，
 * 「平」檔廟旺修飾語寫「什麼都停在入門，這是實況」——
 * 兩句長短差好遠，三連詞 Jaccard 得 0.25，過唔到任何一個合理門檻。
 * 但讀者見到嘅係「什麼都停在入門」原字出現咗兩次。
 *
 * 所以呢度用返 C4／C6 嗰個偵測器（重複片段），
 * 只係範圍由「一句入面」擴到「一格入面兩條塊之間」。
 */
function sharesRun(a: string, b: string, n: number): boolean {
  const x = a.replace(/[^㐀-鿿]/g, '');
  const y = b.replace(/[^㐀-鿿]/g, '');
  for (let i = 0; i + n <= x.length; i++) if (y.includes(x.slice(i, i + n))) return true;
  return false;
}

/**
 * 「擎羊化氣為刑，快而直。做事乾脆⋯⋯」→「擎羊：做事乾脆⋯⋯」
 *
 * 剝走第一句（定義），保留星名（歸屬）。
 * 剝唔到就原文照出 —— 寧願重複，唔好剝到讀者唔知講緊邊粒星。
 */
function stripDefinition(text: string, star: string): string {
  const ss = sentences(text);
  if (ss.length < 2 || !ss[0]!.startsWith(star)) return text;
  return `${star}：${ss.slice(1).join('')}`;
}

function sentences(s: string): string[] {
  return s.match(/[^。！？]*[。！？]|[^。！？]+$/g)?.filter((x) => x.trim()) ?? [s];
}

/**
 * 開場 = 基塊開頭，夠 `min` 字為止。
 *
 * §6 插槽表寫「開場 = L1 基塊首句，40–70 字」—— 嗰個假設咗基塊首句有四十字。
 * 我哋嘅唔係：C5 好多條塊開頭係一句引文（「《全書》寫『廟旺武職崢嶸』」，十七字），
 * 得十幾廿字。照「首句」切，開場成格得九個字。
 *
 * 所以呢度切嘅係「開頭夠字為止」，唔係「第一句」——
 * 意思一樣（塊嘅開頭），但唔會因為原文有一句短引文就崩。
 */
function leadIn(body: string, min: number): { lead: string; rest: string } {
  const ss = sentences(body);
  let lead = '';
  let i = 0;
  while (i < ss.length && cjkCount(lead) < min) lead += ss[i++];
  return { lead, rest: ss.slice(i).join('') };
}

const MAJOR = new Set(BASE_BLOCKS.map((b) => b.star));

function majorsIn(p: Palace): { name: string; brightness?: Brightness; sihua?: string }[] {
  return p.stars.filter((s) => MAJOR.has(s.name));
}

export type AssembleOptions = {
  /** 輪替種 —— 一本書一個。同一本書永遠揀返同一句（AC 第一條）。 */
  seed: string;
};

/**
 * 砌一章。
 *
 * **純函數。** 同一個 (chart, palace, inferResult, seed) 跑兩次，
 * 出嚟嘅 `Chapter` 逐個欄位一樣 —— 工單 C8b 驗收標準第一條。
 */
export function assemble(
  chart: Chart,
  palace: PalaceName,
  res: InferResult,
  opts: AssembleOptions,
): Chapter {
  const p = chart.palaces.find((x) => x.name === palace);
  if (!p) throw new Error(`盤上冇 ${palace}`);
  const { seed } = opts;
  const segments: Segment[] = [];
  const missing: Chapter['missing'] = [];
  const o = res.interpretation;
  const matchedRuleIds = new Set(o.evidence.map((e) => e.rule_id));
  const push = (seg: Segment) => segments.push(seg);
  /**
   * 過場句要揀一句**唔會同跟住嗰段撞**嘅。
   *
   * 樣章第一次跑出嚟係咁：
   *   〔過場〕這一宮不是獨立看的。
   *   〔牽動〕命宮不是獨立看的。它與遷移宮正對⋯⋯
   *
   * 兩句都啱、都有出處、各自都過晒閘 —— 但擺埋一齊就係同一句講兩次。
   * 呢種撞法冇得喺寫嗰陣避，因為兩邊係喺唔同工單、唔同層寫嘅（C7 章框 vs C8b L3）。
   * 所以要喺組裝嗰一刻先至避得到：bank 有三句，揀唔撞嗰句。
   */
  const transition = (from: Slot, to: Slot, next: string) => {
    const bank = transitionBank(from, to);
    if (bank.length === 0) return;
    const start = Math.abs(hashSeed(`${seed}:${palace}:${from}>${to}`)) % bank.length;
    const nextHead = sentences(next)[0] ?? next;
    for (let i = 0; i < bank.length; i++) {
      const t = bank[(start + i) % bank.length]!;
      if (similarity(t.text, nextHead) < 0.25) {
        push({ slot: '過場', text: t.text, source_id: t.id, rule_ids: [] });
        return;
      }
    }
  };

  /* ── 章首（L5）──────────────────────────────────────── */
  const open = openFor(palace);
  push({ slot: '章首', text: open.text, source_id: open.id, rule_ids: [] });

  /* ── 開場 ＋ 結構（L1 ＋ L2）────────────────────────── */
  /*
   * 空宮：借對宮主星讀，但**一定明寫**（內容系統 §6、工單 AC 第三條）。
   * 「空宮本身就係訊息，照實講反而可信。」
   */
  let stars = majorsIn(p);
  let borrowed: Chapter['borrowed'] = null;
  if (stars.length === 0) {
    const opp = p.borrowsFrom ? chart.palaces.find((x) => x.branch === p.borrowsFrom) : undefined;
    const oppStars = opp ? majorsIn(opp) : [];
    borrowed = opp ? { from: opp.name, stars: oppStars.map((s) => s.name) } : null;
    push({
      slot: '開場',
      text: emptyPalaceLine(palace, oppStars.map((s) => s.name)),
      source_id: 'frame.empty',
      rule_ids: [`structure.empty.${palace}`].filter((id) => matchedRuleIds.has(id)),
    });
    stars = oppStars;
  }

  const blocks = stars
    .map((s) => ({ star: s, block: BASE_BLOCKS.find((b) => b.star === s.name && b.palace === palace) }))
    .filter((x): x is { star: (typeof stars)[number]; block: NonNullable<(typeof x)['block']> } => Boolean(x.block));

  if (blocks.length === 0) {
    missing.push({ slot: '開場', reason: `${palace} 冇主星，對宮亦冇 —— 兩宮同看，但基塊揀唔到` });
    missing.push({ slot: '結構', reason: '冇基塊就冇結構段' });
  } else {
    const lead = blocks[0]!;
    const cut = leadIn(lead.block.body, SLOT_SPEC[1]!.min);
    push({
      slot: '開場',
      text: cut.lead,
      source_id: lead.block.id,
      rule_ids: [`base.${lead.star.name}.${palace}`].filter((id) => matchedRuleIds.has(id)),
    });

    /* 結構 = L1 餘下 ＋ L2 廟旺 ＋ L2 四化（§6 插槽表）。 */
    const structure: string[] = [cut.rest];
    const ids: string[] = [lead.block.id];
    const rules: string[] = [`base.${lead.star.name}.${palace}`];
    /*
     * 同宮兩粒主星（例如紫微天府同宮，或者空宮借返兩粒）：
     * **領銜嗰粒攞全文，同座嗰粒只攞開頭。**
     *
     * 唔係為咗慳字數 —— 兩條塊各自一百五十字擺埋一齊，
     * 讀者會見到同一格講兩次，而兩次都係完整嘅一套講法。
     * 結構格嘅上限係兩百字，本來就假設咗一格一套講法。
     */
    for (const b of blocks.slice(1)) {
      structure.push(leadIn(b.block.body, 40).lead);
      ids.push(b.block.id);
      rules.push(`base.${b.star.name}.${palace}`);
    }
    /*
     * ── 廟旺同四化嘅分別 ──
     *
     * **廟旺只貼領銜嗰粒星。** 理由係 C6 定咗嘅：廟旺同基塊共用去重群 ——
     * 佢係貼喺嗰粒星嘅塊上面嘅條件，唔係一件獨立嘅嘢。
     * 同座嗰粒星只攞咗開頭一句，就唔應該連佢嘅條件一齊搬過嚟。
     *
     * **四化貼晒呢個宮入面每一粒化咗嘅星。**
     *
     * ⚠ 呢一行本來同廟旺一樣只貼領銜星，係 C10 嘅巴納姆測量捉到嘅：
     * 一百二十本書度量出嚟，**生年四化只有 68% 真係出現喺書入面**，
     * 三分一靜靜雞跌咗 —— 因為佢哋落喺同座星或者落喺左輔、文昌呢啲輔星度，
     * 而輔星唔係「領銜星」，永遠輪唔到。
     *
     * 而生年四化係兩副盤之間**最大嗰個差異來源**（十個天干 × 邊粒星）。
     * 跌咗三分一，即係兩個四化完全唔同嘅人，本書睇落差唔多一樣。
     * C10 度到最似一對書重疊 96%，追落去就係呢個。
     *
     * 分別喺邊：廟旺係「呢粒星幾強」，係星嘅屬性；
     * 四化係一個**機制**，C6 畀咗佢自己一個去重群，就係認咗佢獨立。
     * 一件獨立嘅嘢，唔應該因為佢唔係領銜星就唔講。
     */
    const leadStar = stars.find((x) => x.name === lead.star.name) ?? lead.star;
    if (leadStar.brightness) {
      const m = brightnessModifier(leadStar.name, leadStar.brightness);
      if (m) {
        structure.push(m.text);
        ids.push(m.id);
      }
    }
    for (const st of p.stars) {
      if (!st.sihua) continue;
      const m = sihuaModifier(st.name, st.sihua);
      if (!m) continue;
      structure.push(m.text);
      ids.push(m.id);
      rules.push(`sihua.natal-${st.sihua}.${palace}`);
    }

    /*
     * ⚠ 剷走同開場逐字重複嗰句。
     *
     * C5 學過「機械刪句會令文氣散晒」，所以呢度個門檻定得好高（0.6，近乎逐字）。
     * 剷一句**一模一樣**嘅重複唔會令文氣散 —— 佢本來就係雜音。
     *
     * 呢個重複由一件真嘢嚟：C5 寫高風險宮嘅時候，
     * 十四粒星嘅塊入面用咗同一句免責話（「《全書》這一格列出具體病症，本書一律不採用」）。
     * 逐條塊睇冇問題；但一個宮坐兩粒主星嗰陣，讀者一章入面會見到兩次。
     * 真正嘅修法喺內容嗰邊（C5 嗰十二句要各自寫過），呢度只係唔好畀佢出街。
     */
    /*
     * 剷走同前文逐字重複嗰句 —— 對開場，**亦都對結構自己前面嗰啲**。
     *
     * 第二半係樣章照出嚟嘅：貪狼基塊寫「什麼都碰一點，什麼都停在入門」，
     * 而「平」檔廟旺修飾語寫「什麼都停在入門，這是實況」。
     * 兩條塊各自寫嗰陣冇問題（一條講星性，一條講強弱），
     * 但佢哋喺同一格拼埋，讀者見到嘅係同一句講兩次。
     *
     * 門檻仍然係 0.55（近乎逐字）。剷雜音唔會散文氣，剷內容先會。
     */
    const kept = sentences(cut.lead);
    const structureText = sentences(structure.join(''))
      .filter((t) => {
        if (cjkCount(t) < 10) return true;
        if (kept.some((l) => similarity(t, l) >= 0.55)) return false;
        if (kept.some((l) => sharesRun(t, l, 8))) return false;
        kept.push(t);
        return true;
      })
      .join('')
      .trim();
    push({
      slot: '結構',
      text: structureText,
      source_id: ids.join('+'),
      rule_ids: rules.filter((id) => matchedRuleIds.has(id)),
    });
  }

  /* ── 牽動（L3 結構層）────────────────────────────────── */
  const l3 = l3For(palace, p, chart, matchedRuleIds);
  if (l3.length === 0) {
    missing.push({ slot: '牽動', reason: `${palace} 冇 L3 結構塊命中 —— 三方四正、空宮、身宮、格局全部冇` });
  } else {
    const l3Text = l3.map((b) => b.body).join('');
    transition('結構', '牽動', l3Text);
    push({
      slot: '牽動',
      text: l3Text,
      source_id: l3.map((b) => b.id).join('+'),
      rule_ids: l3.flatMap((b) => b.rule_ids),
    });
  }

  /* ── 擾動（L2 六煞，有先出）──────────────────────────── */
  const shaHere = p.stars.filter((s) => (MALEFICS as readonly string[]).includes(s.name));
  if (shaHere.length > 0) {
    const mods = shaHere.map((s) => maleficModifier(s.name, palace)).filter(Boolean);
    /*
     * ⚠ 剝走煞星嘅**定義句**，淨低呢一宮嘅部分。
     *
     * C10 度一百二十本書，發現有六句**每一本書都有**：
     *
     *   「擎羊化氣為刑，快而直。」「地劫主奪，成形之後被拿走。」⋯⋯
     *
     * 追落去：C6 寫六煞修飾語嗰陣，每粒煞嘅十二條都用同一句開頭。
     * 而六粒煞喺每一副盤都一定有位置，所以呢六句人人都收到。
     *
     * 佢哋唔係假嘅 —— 佢哋係**定義**。但一句定義同一句發現，
     * 喺讀者眼中一樣：「地劫主奪，成形之後被拿走」讀落好似講緊你。
     * 一句人人都收到、又讀得成講緊你嘅說話，就係巴納姆。
     *
     * 定義嘅正確位置係註層（內容系統 §4：術語第一次出現加墨點，撳開 150–200 字），
     * 而註層嘅內容就係 L0 詞條。**而家六煞冇 L0 詞條** —— 呢個係 C3 漏低嘅，
     * 佢寫咗十四主星、十二宮、四化、五行局，冇寫六煞。
     *
     * 喺詞條寫得出之前，呢度保留星名（讀者要知講緊邊粒星），剝走定義。
     */
    const shaText = mods.map((m) => stripDefinition(m!.text, m!.star)).join('');
    transition('牽動', '擾動', shaText);
    push({
      slot: '擾動',
      text: shaText,
      source_id: mods.map((m) => m!.id).join('+'),
      rule_ids: shaHere.map((s) => `sha.${s.name}.${palace}`).filter((id) => matchedRuleIds.has(id)),
    });
  }

  /* ── 留白（L5）──────────────────────────────────────── */
  const close = closeFor(palace, seed);
  transition(shaHere.length > 0 ? '擾動' : '牽動', '留白', close.text);
  push({ slot: '留白', text: close.text, source_id: close.id, rule_ids: [] });

  const footer = chapterFooter(palace);
  if (footer) push({ slot: '留白', text: footer, source_id: 'frame.footer', rule_ids: [] });

  /*
   * ── 一章入面冇「勢」呢個插槽 ──
   *
   * 呢個係組裝寫到一半先睇得清楚嘅一件事：
   * **內容系統 §6 嘅插槽表根本冇評級嗰一格。**
   * 章首、開場、結構、牽動、擾動、留白 —— 六格全部係描述同留白。
   *
   * 所以一章唔會因為主題評級係 +1 就多一句「所以順」。
   * 章入面嘅方向感，全部由**塊自己嘅文字**帶（例如化祿修飾語嗰句
   * 「財路相對順，但順的來源，多數仍然是自己動手」）——
   * 而嗰句係有出處嘅正文，唔係一個由門檻算出嚟嘅分數。
   *
   * §16 嘅評級係一個**機讀欄位**，佢屬於結論物件，唔屬於章。
   * 呢個分工令 V-001「大部分章冇方向」嘅代價細好多：
   * 冇方向嘅係評級，唔係章 —— **章照樣有象、有結構、有牽動、有留白**。
   */
  const text = segments.map((s) => s.text).join('');
  const words = cjkCount(text);

  const slotWords: Record<string, number> = {};
  for (const seg of segments) slotWords[seg.slot] = (slotWords[seg.slot] ?? 0) + cjkCount(seg.text);
  const outOfRange = SLOT_SPEC.filter((sp) => {
    const w = slotWords[sp.slot] ?? 0;
    if (w === 0) return sp.required;
    return w < sp.min || w > sp.max;
  }).map((sp) => ({ slot: sp.slot, words: slotWords[sp.slot] ?? 0, min: sp.min, max: sp.max }));

  /*
   * 跨格重複要**逐句**比，唔可以逐格比。
   *
   * 一格三百字對一格一百字，就算入面有一句一模一樣，
   * 三連詞 Jaccard 都會畀稀釋到零點零幾 —— 即係話逐格比根本捉唔到。
   * 而讀者見到嘅正正係嗰一句。
   */
  const real = segments
    .filter((seg) => seg.slot !== '過場' && seg.slot !== '章首')
    .flatMap((seg) => sentences(seg.text).map((t) => ({ slot: seg.slot, t })));
  const duplicates: Chapter['duplicates'] = [];
  for (let i = 0; i < real.length; i++) {
    for (let j = i + 1; j < real.length; j++) {
      if (real[i]!.slot === real[j]!.slot) continue;
      if (cjkCount(real[i]!.t) < 10 || cjkCount(real[j]!.t) < 10) continue;
      const score = similarity(real[i]!.t, real[j]!.t);
      if (score >= 0.25) {
        duplicates.push({ a: `${real[i]!.slot}：${real[i]!.t}`, b: `${real[j]!.slot}：${real[j]!.t}`, score });
      }
    }
  }
  duplicates.sort((x, y) => y.score - x.score);

  return {
    palace,
    topic: PALACE_TOPIC[palace]!,
    topic_grade: o.rating.final_grade,
    topic_kind: res.trace.kind,
    text,
    segments,
    words,
    slotWords,
    outOfRange,
    duplicates,
    borrowed,
    missing,
  };
}

/** 十二宮逐章。 */
export function assembleAll(
  chart: Chart,
  byTopic: Record<string, InferResult>,
  opts: AssembleOptions,
): Chapter[] {
  return chart.palaces
    .map((p) => p.name)
    .filter((n) => PALACE_TOPIC[n])
    .map((n) => assemble(chart, n, byTopic[PALACE_TOPIC[n]!]!, opts));
}

/** 診斷：全盤有幾多個插槽揀唔到塊。 */
export function missingSlots(chapters: Chapter[]): { palace: string; slot: string; reason: string }[] {
  return chapters.flatMap((c) => c.missing.map((m) => ({ palace: c.palace, ...m })));
}

export { L3_BLOCKS };
