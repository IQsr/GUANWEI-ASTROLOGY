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
import { closeFor } from './frame-data';
import { palacePlain } from './palace-plain';
import { lifeLine } from './life';
import { cjkCount } from './lexicon';
import { similarity } from './baseblock';
import { L3_BLOCKS, l3For } from './l3-data';
import { linkLine, palaceLabel } from './link';
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
/*
 * ⚠ 2026-09 改咗兩格：開場上限 70 → 90、結構下限 60 → 40。
 *
 * 開場由基塊第一句起。以前好多塊第一句係一句短引文（「《全書》寫『入廟文武皆宜』，語氣寬。」），
 * 拎走咗冇解釋嘅引文之後，開場由真正讀人嗰句起，而嗰句本身可以去到八十幾字。
 * 結構跟基塊下限一齊降（基塊 120 → 70，見 baseblock.ts）：拎走嘅係內部規則句，唔係內容。
 */
/*
 * ⚠ 2026-09-29 直白（docs/voice.md 第六節）：章首（「財帛宮看你與錢的關係⋯」—— 講方法）拎走，
 * 換成「結論」：第一句就講你喺呢方面係點樣，跟住一句「要留意的是」。基塊變成後面嘅依據。
 */
export const SLOT_SPEC = [
  { slot: '結論' as const, min: 15, max: 80, required: true },
  /* 直白：開場由一句盤面事實起，重複結論嘅句剷走 —— 短基塊可能淨低嗰句事實 */
  { slot: '開場' as const, min: 8, max: 90, required: true },
  /*
   * ⚠ 2026-10-02：結構格可以空。基塊同結論重複嘅句剷走、廟旺修飾語又只喺命宮出，
   * 短基塊（例如田宅）可能乜都唔剩 —— 嗰陣由後面嘅「生活」格講具體，唔使硬湊。
   */
  { slot: '結構' as const, min: 0, max: 200, required: false },
  /* 生活裡的樣子（2026-09-30）：結論講成一個現代場景，每格一段（`life.ts`） */
  { slot: '生活' as const, min: 25, max: 110, required: true },
  /* 2026-10-05：開頭唔再列範疇，後面幾章（三宮都講過）淨係得指返句，二三十字 */
  { slot: '牽動' as const, min: 20, max: 140, required: true },
  { slot: '擾動' as const, min: 0, max: 60, required: false },
  /* 2026-10-02：宮位章唔再以反思問題收（改由「生活」格收），留白只剩疾厄嘅免責句 */
  { slot: '留白' as const, min: 0, max: 45, required: false },
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
 * 基塊剷走同結論重複嗰幾句之後，餘下嘅句（直白版，2026-09-29）。
 *
 * 結論句係由基塊第一句撮出嚟，所以要剷；但剷咗之後，下一句如果用「這種方式」「這使」開頭，
 * 就指住一句讀者冇讀到嘅句。呢啲句喺基塊入面寫成自己站得住（點名講邊粒星）——
 * `test/anaphor.test.ts` 逐塊驗。
 */
export function afterConclusion(body: string, conclusion: string): string[] {
  const dup = (t: string) =>
    conclusion !== '' &&
    cjkCount(t) >= 6 &&
    (sharesRun(t, conclusion, 6) || sentences(conclusion).some((c) => similarity(t, c) >= 0.45));
  return sentences(body).filter((t) => !dup(t));
}

/**
 * 結構格頭一句要講得出係邊粒星（2026-10-02）。
 *
 * 基塊頭一句（點名嗰句）同結論重複，組裝時剷咗；剩低嘅頭一句可能冇主語
 * （「不搶、不計較、願意配合⋯」「改造的成本高，但對它而言⋯」）。400 本書量到七十幾款。
 * 「它」開頭就換做星名；冇點名就加「星名：」—— 同擾動格「擎羊：⋯」一樣嘅寫法。
 */
export function withSubject(text: string, star: string, others: readonly string[] = []): string {
  if (!text) return text;
  const first = sentences(text)[0] ?? '';
  /* 頭一句已經講緊呢格任何一粒主星（例如同座嗰粒），就唔使加 */
  if ([star, ...others].some((s) => first.slice(0, 12).includes(s))) return text;
  if (text.startsWith('它')) return star + text.slice(1);
  if (/^(你|《全書》)/.test(text)) return text;
  return `${star}：${text}`;
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
  /**
   * 成本書已經用過嘅修飾語同格局塊（id）。`assembleAll()` 逐章傳落嚟 ——
   * 同一句唔准喺一本書出兩次（2026-09）。單獨砌一章就唔使畀。
   */
  used?: Set<string>;
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
  /* 空段唔出（直白版剷走重複句之後，短基塊嘅結構格可能乜都唔剩）—— 空段會令段數同格名對唔上 */
  let lifeSeg: Segment | null = null;
  const push = (seg: Segment) => {
    if (seg.text.trim() !== '') segments.push(seg);
  };
  /*
   * ⚠ 唔再出過場句（2026-09）。
   *
   * 量過：一本書大約 29 句過場，得 8 句唔同 ——「接著要看它牽動到哪裡。」
   * 一本書出現 8–9 次。句句都啱、都喺白名單，但讀落就係重複、係填充。
   * 格與格之間改由排版分節（網頁嗰邊喺 牽動／留白 前面加一個分節記號），
   * 唔再用字過場。
   *
   * 句庫（frames.json）同檢查閘嘅白名單保留：舊書（R-008，寫咗落 DB 唔會變）
   * 仲有過場段，閘要照樣認得佢哋。
   */

  /* ── 結論（直白）──────────────────────────────────────── */
  let conclusion = '';
  /*
   * 領銜主星（空宮就借對宮嗰粒）喺呢個宮嘅結論句 ＋ 留意句。
   * 兩句都由嗰格基塊撮出嚟（`palace-plain.ts`），出處同規則跟返基塊。
   */
  {
    const own = majorsIn(p);
    const opp = own.length === 0 && p.borrowsFrom ? chart.palaces.find((x) => x.branch === p.borrowsFrom) : undefined;
    const lead = (own[0] ?? (opp ? majorsIn(opp)[0] : undefined))?.name;
    const pp = lead ? palacePlain(lead, palace) : undefined;
    if (pp) {
      conclusion = `${pp.summary}${pp.watch}`;
      push({
        slot: '結論',
        text: `${pp.summary}${pp.watch}`,
        source_id: pp.id,
        rule_ids: [`base.${lead}.${palace}`].filter((id) => matchedRuleIds.has(id)),
      });
    } else {
      missing.push({ slot: '結論', reason: `${palace} 揀唔到領銜主星嘅結論句` });
    }
  }

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
    /*
     * 直白（2026-09-29）：結論句由基塊第一句撮出嚟，所以基塊入面同結論重複嘅句要剷走，
     * 唔係讀者一開頭就讀兩次「用做事表達在意」。開場由一句盤面事實起（你的夫妻宮坐武曲、天府），
     * 跟住係基塊餘下嘅依據。空宮嗰陣上面已經有借對宮嗰句，唔使再講。
     */
    const fact = borrowed ? '' : `你的${palaceLabel(palace)}坐${stars.map((s) => s.name).join('、')}。`;
    const cut = leadIn(fact + afterConclusion(lead.block.body, conclusion).join(''), SLOT_SPEC[1]!.min);
    const names = stars.map((s) => s.name);
    push({
      slot: '開場',
      /* 空宮冇「你的X宮坐…」嗰句事實，開場頭一句就係基塊 —— 一樣要講得出係邊粒星 */
      text: borrowed ? withSubject(cut.lead, lead.star.name, names) : cut.lead,
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
    /*
     * ⚠ 一本書入面同一句唔出兩次（2026-09）。
     *
     * 空宮借對宮主星嗰陣，以前連嗰粒星嘅廟旺修飾語都一齊借 —— 但對宮嗰章自己已經講過。
     * 讀者喺命宮讀到「日麗中天：…」，翻去遷移又讀一次。廟旺係嗰粒星喺**佢自己個宮**嘅強弱，
     * 屬於對宮嗰章，所以借星嘅章唔貼。其餘（四化、格局）用 `used` 擋：先到先得。
     */
    const fresh = (id: string) => {
      if (opts.used?.has(id)) return false;
      opts.used?.add(id);
      return true;
    };
    const leadStar = stars.find((x) => x.name === lead.star.name) ?? lead.star;
    /*
     * ⚠ 廟旺修飾語只喺命宮出（2026-10-02）。佢哋係「星 × 廟旺」寫嘅、同宮位無關，講嘅係性格
     * （「日生人太陰落陷：收得太緊，該說的話留在心裡」）—— 擺喺財帛、福德讀落離題。
     */
    if (leadStar.brightness && borrowed === null && palace === '命宮') {
      const m = brightnessModifier(leadStar.name, leadStar.brightness);
      if (m && fresh(m.id)) {
        structure.push(m.text);
        ids.push(m.id);
      }
    }
    /*
     * 同座嗰粒星擺喺領銜星嘅廟旺**之後**（2026-09）：以前次序係「領銜星 → 同座星 → 領銜星嘅廟旺」，
     * 讀者讀完巨門，突然一句「日麗中天」—— 講緊嘅其實係前面嗰粒太陽。
     *
     * 而且同座星由**第一句提到佢名嘅句**開始攞：塊嘅頭一句有時係一句冇解釋嘅引文，
     * 讀者唔知講緊邊粒星。
     */
    for (const b of blocks.slice(1)) {
      const ss = sentences(b.block.body);
      const at = ss.findIndex((x) => x.includes(b.star.name));
      structure.push(leadIn(at > 0 ? ss.slice(at).join('') : b.block.body, 40).lead);
      ids.push(b.block.id);
      rules.push(`base.${b.star.name}.${palace}`);
    }
    for (const st of p.stars) {
      if (!st.sihua) continue;
      const m = sihuaModifier(st.name, st.sihua);
      if (!m || !fresh(m.id)) continue;
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
    const kept = [...sentences(cut.lead), ...sentences(conclusion)];
    const structureText = withSubject(
      sentences(structure.join(''))
        .filter((t) => {
          if (cjkCount(t) < 10) return true;
          if (kept.some((l) => similarity(t, l) >= 0.55)) return false;
          if (kept.some((l) => sharesRun(t, l, 8))) return false;
          kept.push(t);
          return true;
        })
        .join('')
        .trim(),
      lead.star.name,
      names,
    );
    push({
      slot: '結構',
      text: structureText,
      source_id: ids.join('+'),
      rule_ids: rules.filter((id) => matchedRuleIds.has(id)),
    });

    /*
     * 生活裡的樣子（2026-09-30）：同結論跟同一粒領銜星。有王亭之出處就記出處，
     * 冇就記返嗰格基塊 —— 句子只講基塊講過嘅嘢（見 life.ts）。
     */
    const life = lifeLine(lead.star.name, palace);
    if (life) {
      lifeSeg = {
        slot: '生活',
        text: life.text,
        source_id: life.source?.passage_id ?? lead.block.id,
        rule_ids: [`base.${lead.star.name}.${palace}`].filter((id) => matchedRuleIds.has(id)),
      };
    } else {
      missing.push({ slot: '生活', reason: `${lead.star.name}·${palace} 冇生活場景` });
    }
  }

  /* ── 擾動（L2 六煞，有先出）──────────────────────────── */
  /*
   * ⚠ 2026-10-05 睇稿指南第 2 節：煞星擺喺牽動**前面**。佢講緊呢一宮本身（逐宮寫），
   * 應該同開場、結構讀埋一齊；牽動先至轉去講其他宮。舊書（R-008）照舊次序。
   */
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
    /* 直白：「鈴星：外表沉⋯」讀落似一個標籤，改成一句話 —— 同宮還有鈴星：⋯ */
    const shaText = mods
      .map((m, i) => `${i === 0 ? '同宮還有' : '還有'}${stripDefinition(m!.text, m!.star)}`)
      .join('');
    push({
      slot: '擾動',
      text: shaText,
      source_id: mods.map((m) => m!.id).join('+'),
      rule_ids: shaHere.map((s) => `sha.${s.name}.${palace}`).filter((id) => matchedRuleIds.has(id)),
    });
  }

  /* ── 牽動（L3 結構層）────────────────────────────────── */
  /*
   * ⚠ 2026-09：牽動格頭一句唔再用固定嘅關係塊（「命宮與遷移宮正對…四件事要一起讀。
   * 單看一宮會得出沒有條件的結論」—— 每本書一樣）。改為講**呢張盤**嘅對宮同三合宮坐咗乜，
   * 每截由嗰粒星喺嗰個宮嘅基塊撮出嚟（見 link.ts）。關係塊留喺資料度，唔再出街。
   */
  const l3 = l3For(palace, p, chart, matchedRuleIds, opts.used).filter((b) => b.kind !== 'relation');
  const link = linkLine(chart, p, opts.used);
  if (!link && l3.length === 0) {
    missing.push({ slot: '牽動', reason: `${palace} 三方四正搵唔齊，亦冇 L3 結構塊命中` });
  } else {
    push({
      slot: '牽動',
      /* 「X宮的三方四正見多顆煞曜。」係術語、而且一本書出十次 —— 留後面嗰句白話（2026-10-02） */
      /*
       * 2026-10-05 睇稿指南第 9 節：先講「因為連住其他宮，呢一面變咗乜」（L3：三方煞吉、格局、身宮），
       * 再講其他宮坐咗乜星做依據。以前倒轉，讀者要讀完一張清單先知重點。
       */
      text: [...l3.map((b) => b.body.replace(/^\S{1,3}宮的三方四正見多顆[煞吉]曜。/, '')), link?.text ?? ''].join(''),
      source_id: [...(link ? ['frame.link', ...link.sources] : []), ...l3.map((b) => b.id)].join('+'),
      rule_ids: l3.flatMap((b) => b.rule_ids),
    });
  }

  /*
   * ── 收尾：生活裡的樣子（2026-10-02）─────────────────────
   *
   * 以前每章以一條反思問題收（「⋯還是⋯？」），一本書九條同款，讀到第三章就睇得出係模板。
   * 而家用「生活」格收：一個具體場景，比一條抽象問題更有用。留白句庫照留（舊書、閘要認得）。
   */
  if (lifeSeg) push(lifeSeg);
  void closeFor;

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
    .filter((seg) => seg.slot !== '過場' && seg.slot !== '結論')
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
/** 讀者讀嘅次序：命宮起，順住十二宮。同 apps/web `PALACE_ORDER` 一樣。 */
export const READING_ORDER = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'] as const;

export function assembleAll(
  chart: Chart,
  byTopic: Record<string, InferResult>,
  opts: AssembleOptions,
): Chapter[] {
  /*
   * 成本書共用一個 `used`：格局橫跨三方四正，一個「祿馬交馳」以前財帛、官祿各講一次。
   *
   * ⚠ 要跟**讀者讀嘅次序**砌（命宮、兄弟、夫妻…），唔係 `chart.palaces` 嘅地支次序 ——
   * 先讀到嗰章攞，後面嗰章讓。砌完照舊按地支次序回，唔郁呢個函數嘅輸出次序。
   */
  const used = new Set<string>();
  const names = chart.palaces.map((p) => p.name).filter((n) => PALACE_TOPIC[n]);
  const rank = (n: string) => {
    const i = (READING_ORDER as readonly string[]).indexOf(n);
    return i === -1 ? READING_ORDER.length : i;
  };
  const built = new Map<string, Chapter>();
  for (const n of [...names].sort((a, b) => rank(a) - rank(b))) {
    built.set(n, assemble(chart, n, byTopic[PALACE_TOPIC[n]!]!, { ...opts, used }));
  }
  return names.map((n) => built.get(n)!);
}

/** 診斷：全盤有幾多個插槽揀唔到塊。 */
export function missingSlots(chapters: Chapter[]): { palace: string; slot: string; reason: string }[] {
  return chapters.flatMap((c) => c.missing.map((m) => ({ palace: c.palace, ...m })));
}

export { L3_BLOCKS };
