/**
 * L1 基塊（工單 C4 / C5）
 *
 * 出處：內容系統 §3、§10、docs/voice-spec.md §6、§12
 *
 * ── 點解基塊只有 120–150 字 ──
 *
 * 原本嘅設計係 168 條 × 220 字 ≈ 37,000 字，逐條由零寫起。
 * C3 交咗之後呢個做法過時咗：十四主星同十二宮各自已經有詞條，
 * 星嘅本質喺 `star.*` 講過，宮嘅框架喺 `palace.*` 講過。
 *
 * 所以基塊唔應該再重複嗰兩樣。佢只需要答一條問題：
 *
 *   **呢粒星喺呢個宮，同佢喺其他宮有咩唔同？**
 *
 *   紫微係主導，兄弟宮係平輩 —— 交集就係「主導遇上平輩」嗰個張力。
 *   L0 已經講咗「主導」同「平輩」係乜，基塊唔使再講一次。
 *
 * 咁樣總量由 37,000 降到約 22,000 字，而且**特異性更高**：
 * 一條只寫交集嘅塊，寫唔成通用嘅安慰話。
 *
 * ── 兩個硬性要求 ──
 *
 *   1. 至少一個 scope: 'cell' 嘅來源 —— 即係真係講緊呢一格嘅原文。
 *      淨係引星級或者宮級來源，等於冇證據支持呢個交集。
 *
 *   2. 過到反巴納姆檢查 —— 七十二條互相比對，太似就 fail。
 *      呢個係機器版嘅巴納姆測試：一條可以搬去第二格用嘅塊，
 *      對讀者嚟講就係一句人人都啱嘅廢話。
 */
import { z } from 'zod';
import { CORPUS, cjkCount, normaliseForMatch } from './lexicon';
import { Topic } from './rule';
import { phraseValence } from './valence';

/**
 * 來源嘅範圍。**呢個欄位存在嘅理由係誠實。**
 *
 *   cell    —— 原文真係講緊「呢粒星喺呢個宮」
 *   star    —— 原文講緊呢粒星，但唔係呢個宮
 *   palace  —— 原文講緊呢個宮，但唔係呢粒星
 *
 * 星級同宮級來源有價值，但佢哋撐唔起一個交集結論。
 * 唔分開標，就會出現「兩個來源」但兩個都唔係講緊嗰件事。
 */
export const SourceScope = z.enum(['cell', 'star', 'palace']);

export const BaseSource = z.object({
  corpus: z.string().min(1),
  passage_id: z.string().min(1),
  quote: z.string().min(4),
  scope: SourceScope,
});

/** 宮 → 主題（voice-spec §12）。子女、遷移、父母三宮規範冇列入口，歸 self。 */
export const PALACE_TOPIC: Record<string, Topic> = {
  命宮: 'self', 兄弟: 'social', 夫妻: 'relationship', 子女: 'self',
  財帛: 'finance', 疾厄: 'load', 遷移: 'self', 僕役: 'social',
  官祿: 'career', 田宅: 'home', 福德: 'load', 父母: 'self',
};


/**
 * ⚠ **基塊嘅方向 —— 逐格掙返嚟，唔係一次過開個掣。**
 *
 * C8 照出咗一件事：一百六十八條基塊派生嘅規則，**一條都投唔到方向票**。
 * 因為 C4 寫基塊嗰陣就決定咗「基塊只寫交集張力，唔寫吉凶」——
 * 「紫微坐命」登記嘅象義係主導／承擔／標準／體面，四個都唔係方向。
 *
 * 結果係同一副樣本盤，七個主題得一個出到方向。
 *
 * 決定（Issac，2026-09-14）：**甲 ＋ 局部乙**。
 * 照收「大部分章冇方向」呢個現實；等 B5 攞到第二本書之後，
 * **只做原文明寫得出方向嗰幾格**，其餘照樣冇方向。
 *
 * 呢個欄位就係「局部」兩個字嘅落實。要畀一格基塊有方向，三樣缺一不可：
 *
 *   1. `valence` —— 順定阻
 *   2. `xiang`   —— 一個**已經喺方向詞庫登記**嘅詞，而且方向要夾
 *   3. `source`  —— 一個 **cell 級**、引文要喺原文逐字搵得返嘅出處
 *
 * 第三樣係重點。「紫微屬土」（star 級）撐唔起「紫微坐命係順」——
 * 要有一句真係講緊呢一格、而且真係講緊方向嘅原文。
 * 搵唔到就冇方向，冇得靠感覺補。
 *
 * `directionalBlocks()` 回嘅數而家係 0，有測試守住 ——
 * 同 `singleBookEntries()` 一樣，佢係一個要靠做嘢先郁得到嘅數字。
 */
export const BlockDirection = z
  .object({
    valence: z.enum(['support', 'pressure']),
    xiang: z.string().min(1),
    source: BaseSource,
  })
  .superRefine((d, ctx) => {
    if (d.source.scope !== 'cell') {
      ctx.addIssue({
        code: 'custom',
        message: `方向要 cell 級來源 —— 「${d.source.quote.slice(0, 12)}…」係 ${d.source.scope} 級，撐唔起呢一格嘅方向`,
      });
    }
    const v = phraseValence(d.xiang);
    if (v === 'unclassified') {
      ctx.addIssue({
        code: 'custom',
        message: `象義「${d.xiang}」未喺 valence.json 分類過 —— 唔准喺呢度順手開一個新方向詞`,
      });
    } else if (v !== d.valence) {
      ctx.addIssue({
        code: 'custom',
        message: `象義「${d.xiang}」喺詞庫係 ${v}，但呢度寫 ${d.valence} —— 兩邊對唔返`,
      });
    }
  });

export const BaseBlock = z
  .object({
    id: z.string().regex(/^base\.[^\s.]+\.[^\s.]+$/, 'id 要係 base.紫微.兄弟 呢種形式'),
    star: z.string().min(1),
    palace: z.string().min(1),
    /** 只寫交集。星性同宮框架喺 L0 詞條，唔好喺度重複。 */
    body: z.string().min(1),
    sources: z.array(BaseSource).min(2, '每條基塊至少兩個來源（內容系統 §8）'),
    /** 冇就冇方向 —— 呢個係預設，唔係缺漏。 */
    direction: BlockDirection.optional(),
    disputed: z.boolean().default(false),
    status: z.enum(['draft', 'reviewed', 'published']),
    note: z.string().optional(),
  })
  .superRefine((b, ctx) => {
    const [, star, palace] = b.id.split('.');
    if (star !== b.star || palace !== b.palace) {
      ctx.addIssue({ code: 'custom', message: `${b.id}：id 同 star/palace 唔夾` });
    }
    if (!PALACE_TOPIC[b.palace]) {
      ctx.addIssue({ code: 'custom', message: `${b.id}：唔認得宮位 ${b.palace}` });
    }
    const w = cjkCount(b.body);
    if (w < 120 || w > 150) {
      ctx.addIssue({ code: 'custom', message: `${b.id}：${w} 字，要 120–150（內容系統 §3）` });
    }
    /*
     * ⚠ 人稱只有兩個：**「你」（讀者）同「它」（星）**。
     *
     * C9 掃出嚟嘅：章框（60 句）同 L3（70 條）全部用「你」，
     * 但有十四條基塊用「他」講讀者 —— 即係同一章入面兩種人稱。
     * 讀者唔會覺得係兩個層，佢會覺得係寫得唔小心。
     *
     * 第三者唔用代名詞，用具體稱呼（對方、旁人、長輩、朋友）——
     * 因為「他」喺一章入面可以指星、指讀者、指伴侶，讀者要估。
     * 「其他」「他人」係詞，唔係代名詞，所以照用得。
     *
     * 呢條寫入 schema 而唔係做一次過嘅修正，理由同之前幾條一樣：
     * 改完一次唔等於唔會再出現。
     */
    const ta = b.body.match(/(?<!其)他(?!人)|她/);
    if (ta) {
      ctx.addIssue({
        code: 'custom',
        message: `${b.id}：用咗「${ta[0]}」—— 讀者一律用「你」，第三者用具體稱呼，唔用代名詞`,
      });
    }
    if (!b.sources.some((s) => s.scope === 'cell')) {
      ctx.addIssue({
        code: 'custom',
        message: `${b.id}：冇 cell 級來源 —— 星級同宮級來源撐唔起一個交集結論`,
      });
    }
    for (const src of [...b.sources, ...(b.direction ? [b.direction.source] : [])]) {
      const c = CORPUS[src.corpus];
      const p = c?.passages[src.passage_id];
      if (!p) {
        ctx.addIssue({ code: 'custom', message: `${b.id}：搵唔到 ${src.corpus}/${src.passage_id}` });
        continue;
      }
      if (!normaliseForMatch(p.text).includes(normaliseForMatch(src.quote))) {
        ctx.addIssue({
          code: 'custom',
          message: `${b.id}：引文喺 ${src.passage_id} 搵唔返 —— 「${src.quote.slice(0, 18)}…」`,
        });
      }
    }
  });

export type BaseBlock = z.infer<typeof BaseBlock>;

/* ──────────────────────────────────────────────
   反巴納姆：機器版
   ────────────────────────────────────────────── */

function trigrams(s: string): Set<string> {
  const t = s.replace(/[^㐀-鿿]/g, '');
  const out = new Set<string>();
  for (let i = 0; i + 3 <= t.length; i++) out.add(t.slice(i, i + 3));
  return out;
}

/** Jaccard 相似度。0 = 完全唔同，1 = 一模一樣。 */
export function similarity(a: string, b: string): number {
  const A = trigrams(a);
  const B = trigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}

export type Pair = { a: string; b: string; score: number };

/**
 * 搵出最似嘅幾對基塊。
 *
 * 呢個唔係風格檢查，係**內容檢查**：
 * 如果 `base.紫微.財帛` 同 `base.武曲.財帛` 似到可以互換，
 * 噉其中一條就冇講到「呢粒星」，只講咗「呢個宮」——
 * 而宮嘅嘢 L0 詞條已經講咗。
 */
export function mostSimilar(blocks: BaseBlock[], top = 10): Pair[] {
  const out: Pair[] = [];
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      out.push({
        a: blocks[i]!.id,
        b: blocks[j]!.id,
        score: similarity(blocks[i]!.body, blocks[j]!.body),
      });
    }
  }
  return out.sort((x, y) => y.score - x.score).slice(0, top);
}

export function buildBaseBlocks(raw: unknown[]): BaseBlock[] {
  const out = raw.map((r) => BaseBlock.parse(r));
  const seen = new Set<string>();
  for (const b of out) {
    if (seen.has(b.id)) throw new Error(`基塊 ID 重複：${b.id}`);
    seen.add(b.id);
  }
  return out;
}

/* ──────────────────────────────────────────────
   基塊 → 規則（工單 C2 嗰句「順手 declare」）
   ────────────────────────────────────────────── */

/**
 * 每粒星嘅容許象義範圍。
 *
 * 呢個係**詞義範圍，唔係吉凶對照**（§14）。
 * 內容出自 L0 星曜詞條 —— 詞條講咗嗰幾個詞，規則就准用嗰幾個詞，
 * 唔准喺基塊入面憑空多加一個。
 */
export const STAR_XIANG: Record<string, string[]> = {
  紫微: ['主導', '承擔', '標準', '體面'],
  天府: ['守成', '收納', '周全', '底盤'],
  太陽: ['照亮', '付出', '外顯', '責任'],
  太陰: ['積累', '照料', '內斂', '細緻'],
  武曲: ['決斷', '執行', '務實', '承擔成本'],
  天機: ['機變', '思慮', '轉圜', '學習'],
  天同: ['和緩', '隨順', '自足', '享受'],
  廉貞: ['投入', '原則', '規範', '濃度'],
  貪狼: ['慾望', '好奇', '才藝', '社交'],
  巨門: ['探究', '質疑', '辨析', '表達'],
  天相: ['規範', '協調', '體面', '可靠'],
  天梁: ['庇護', '原則', '公道', '照顧他人'],
  七殺: ['決斷', '獨立', '承擔壓力', '開闢'],
  破軍: ['更替', '開創', '破除舊局', '投入成本'],
};

/** 每粒星都禁嘅嘢。逐格再加宮位自己嗰批。 */
const STAR_PROHIBITED = ['單星定事件', '由一粒星直接評級', '把象義讀成性格評價'];

const PALACE_PROHIBITED: Record<string, string[]> = {
  命宮: ['把命宮讀成一個人的全部'],
  兄弟: ['推斷手足人數或遭遇'],
  夫妻: ['夫妻宮有忌不等於離婚', '不得代言伴侶', '不得推婚次'],
  子女: ['推斷生育結果'],
  財帛: ['收入、資產、現金流不可混同', '不得作為買賣借貸依據'],
  疾厄: ['不作臨床風險評級', '疾厄大限不等於患病'],
  遷移: ['遷移宮不等於搬遷或移民'],
  僕役: ['不得指認小人'],
  官祿: ['不得混同能力與環境', '不預測職位或行業'],
  田宅: ['不得直接等同買樓'],
  福德: ['不作情緒或心理狀態評估'],
  父母: ['不得由讀者命盤推論父母遭遇'],
};

/**
 * 一條基塊派生一條規則。
 *
 * C2 個工單寫住「C4 / C5 每條基塊順手 declare 一條規則 —— 唔係另外寫三百條」。
 * 呢個 function 就係嗰句嘅落實：規則唔係人手寫多一份，係由基塊算出嚟，
 * 所以佢哋**唔可能失去同步**。
 *
 * 觸發條件就係最直接嗰條：呢粒星坐呢個宮。
 */
export function blockToRule(b: BaseBlock): Record<string, unknown> {
  const xiang = STAR_XIANG[b.star];
  if (!xiang) throw new Error(`${b.id}：冇登記 ${b.star} 嘅容許象義`);
  return {
    rule_id: `base.${b.star}.${b.palace}`,
    version: '1.0',
    schools: ['zhongzhou-v1'],
    requires: ['natal'],
    role: 'core',
    // 一粒星只坐一個宮，所以同一粒星十二條規則之中至多一條會中
    independence_group: `base.${b.star}`,
    trigger: { star: b.star, in: { name: b.palace } },
    exclude: null,
    /*
     * 方向（如果有）就係多一個象義詞 —— **冇特事特辦嘅路徑**。
     * 推理器唔識「基塊有方向」呢回事，佢只識查 allowed_xiang。
     * 所以要令一格基塊投到票，唯一嘅方法就係畀佢一個查得到嘅象義詞。
     */
    allowed_xiang: b.direction ? [...xiang, b.direction.xiang] : xiang,
    prohibited_inferences: [...STAR_PROHIBITED, ...(PALACE_PROHIBITED[b.palace] ?? [])],
    topics: [PALACE_TOPIC[b.palace]],
    depends_on: [],
    review_status: b.status === 'draft' ? 'draft' : 'approved',
    review_reasons: [`由基塊 ${b.id} 派生；象義範圍出自 L0 星曜詞條`],
    sources: b.sources.map((s) => ({ book: '紫微斗數全書', ref: `${s.passage_id}（${s.scope}）` })),
    note: `容許象義係詞義範圍，唔係吉凶對照。正文喺基塊 ${b.id}。`,
  };
}

/**
 * ⚠ 尾句重述前文嘅塊 —— **一份人手覆核清單，唔係一道閘**。
 *
 * C8b 砌章嗰陣，喺修飾語度捉到十一條「X。X，這一點要講白」——
 * 純粹湊字數嘅重複，已經改晒，而且 `Modifier` 個窗由八字收到七字。
 *
 * 順手用同一個訊號掃基塊，二十五條中。但睇落去之後冇一刀切改，因為**佢哋唔同質**：
 *
 *   「理由永遠找得到。理由永遠找得到，這一點要講白。」     ← 純湊字數，冇加嘢
 *   「⋯路徑越短越好。路徑越短越好，這在需要繞的地方就成了代價。」 ← 重述一次然後轉折，係修辭
 *
 * 第二種係好嘅寫法。一個捉得到兩者嘅正則，一定會連第二種一齊剷 ——
 * 而 C5 已經學過：機械刪句會令文氣散晒，要成批重寫。
 *
 * 所以呢度只回一份清單，由人睇。數字釘咗喺測試度，
 * 同 `singleBookEntries()` 一樣：**佢只會因為有人真係去改而跌**。
 *
 * 讀者實際見到嗰啲唔使等呢份清單 —— 組裝器有重複片段偵測器，
 * 拼埋之後真係逐字重複嘅，喺砌章嗰一刻就剷走。
 */
export function restatingTails(blocks: BaseBlock[]): { id: string; run: string | null }[] {
  const sentencesOf = (t: string) => (t.match(/[^。！？]*[。！？]|[^。！？]+$/g) ?? []).filter((x) => x.trim());
  const cjk = (t: string) => t.replace(/[^㐀-鿿]/g, '');
  const sharedRun = (a: string, b: string, n: number): string | null => {
    const x = cjk(a);
    const y = cjk(b);
    for (let i = 0; i + n <= x.length; i++) if (y.includes(x.slice(i, i + n))) return x.slice(i, i + n);
    return null;
  };
  const out: { id: string; run: string | null }[] = [];
  for (const b of blocks) {
    const ss = sentencesOf(b.body);
    if (ss.length < 2) continue;
    const last = ss[ss.length - 1]!;
    for (const prev of ss.slice(0, -1)) {
      const run = sharedRun(last, prev, 6);
      if (run || similarity(last, prev) >= 0.3) {
        out.push({ id: b.id, run });
        break;
      }
    }
  }
  return out;
}

export function blocksToRules(blocks: BaseBlock[]): Record<string, unknown>[] {
  return blocks.map(blockToRule);
}

/**
 * ⚠ 有方向嘅基塊。**而家係 0，而且應該一直睇得見。**
 *
 * 呢個數字同 `singleBookEntries()` 係同一種東西：
 * 一個唔會自己郁、要靠做嘢先加得到嘅計數器。
 *
 * 佢會升，但只會喺 B5 攞到第二本書、而且某一格真係引得出一句
 * 講緊方向嘅 cell 級原文嗰陣先升。**唔准為咗令某一章有方向而倒返轉去搵理由。**
 */
export function directionalBlocks(blocks: BaseBlock[]): BaseBlock[] {
  return blocks.filter((b) => b.direction);
}
