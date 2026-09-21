/**
 * L2 修飾語（工單 C6）
 *
 * 出處：內容系統 §3、docs/voice-spec.md §13、§14、§15
 *
 * ── 修飾語同基塊嘅分別 ──
 *
 * 基塊（L1）講「呢粒星喺呢個宮」，係一個交集結論，所以規範要求佢有
 * cell 級來源。修飾語（L2）唔係結論 —— 佢係**加喺結論上面嘅條件**：
 *
 *   「紫微坐官祿」               ← 基塊，講方向
 *   「而且落陷」                 ← 修飾語，講強弱
 *   「而且化權」                 ← 修飾語，講機制
 *   「而且同擎羊同宮」           ← 修飾語，講條件
 *
 * 規範 §13 把廟旺、輔星煞曜、自化全部列做**修正權重 1**，
 * 而且明寫「不得單星定事件；廟旺必吉、落陷必凶」。
 * 所以修飾語**永遠唔可以獨立支撐一個評級** —— 佢只可以細化已經成立嘅方向。
 *
 * 因為佢唔係結論，所以佢唔需要 cell 級來源（星級就夠）；
 * 但代價係佢亦都拎唔到核心票。呢兩件事係同一個設計決定嘅兩面。
 *
 * ── 三種修飾語 ──
 *
 *   brightness  廟旺利陷。**同基塊共用去重群** —— 因為講緊同一粒星。
 *   sihua       四化。自己一個群（每層每化一個）。§13 列做所屬層嘅核心機制。
 *   malefic     六煞同宮。每粒煞星自己一個群 —— 佢哋係另一粒星，唔係同一粒星嘅屬性。
 *
 * 第一個同第三個嘅分別最容易做錯：
 * 「紫微落陷」同「紫微坐官祿」講緊同一粒星，唔可以算兩票（§15）；
 * 「擎羊同宮」係另一粒星，可以算另一群，但佢嘅角色仍然只係修正。
 */
import { z } from 'zod';
import { CORPUS, cjkCount, normaliseForMatch } from './lexicon';

export const ModifierKind = z.enum(['brightness', 'sihua', 'malefic']);

/** 七檔廟旺收成五檔 —— 內容系統 §3 講「每星五句」。 */
export const BRIGHTNESS_BANDS = {
  廟旺: ['廟', '旺'],
  得利: ['得', '利'],
  平: ['平'],
  不: ['不'],
  陷: ['陷'],
} as const;
export type BrightnessBand = keyof typeof BRIGHTNESS_BANDS;

export const MALEFICS = ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'] as const;

export const ModifierSource = z.object({
  corpus: z.string().min(1),
  passage_id: z.string().min(1),
  quote: z.string().min(4),
  /** 修飾語唔需要 cell 級 —— 但一定要標清楚係邊一級。 */
  scope: z.enum(['cell', 'star', 'palace']),
});

export const Modifier = z
  .object({
    id: z.string().regex(/^mod\.(brightness|sihua|malefic)\.[^\s.]+\.[^\s.]+$/, 'id 要係 mod.kind.主體.細目'),
    kind: ModifierKind,
    /** 被修飾嘅星（brightness / sihua），或者煞星本身（malefic）。 */
    star: z.string().min(1),
    /** brightness = 檔位；sihua = 化別；malefic = 宮位。 */
    key: z.string().min(1),
    /** 插入基塊之後嘅一句。30–50 字。 */
    text: z.string().min(1),
    sources: z.array(ModifierSource).min(1),
    status: z.enum(['draft', 'reviewed', 'published']),
    note: z.string().optional(),
  })
  .superRefine((m, ctx) => {
    const [, kind, star, key] = m.id.split('.');
    if (kind !== m.kind || star !== m.star || key !== m.key) {
      ctx.addIssue({ code: 'custom', message: `${m.id}：id 同欄位唔夾` });
    }
    const w = cjkCount(m.text);
    if (w < 30 || w > 50) {
      ctx.addIssue({ code: 'custom', message: `${m.id}：${w} 字，要 30–50（內容系統 §3）` });
    }
    /*
     * ⚠ 同一句入面唔准有重複片段。
     *
     * 呢條規矩由一個犯過三次嘅錯誤生出嚟：寫短咗，然後補一句去湊字數，
     * 而補嗰句往往就係前面嗰句換個講法。字數夠咗，讀落係同一件事講兩次。
     * 相似度檢查捉唔到 —— 因為佢比較嘅係兩條之間，唔係一條入面。
     *
     * 修飾語得三十到五十字，重複嘅代價比基塊更大：一句入面講兩次，
     * 等於成句得一半資訊。所以呢度用七字窗，比基塊嗰條嚴。
     *
     * ⚠ 本來係八字窗。C8b 砌命宮章嗰陣，樣章度見到
     * 「興趣廣而不深：什麼都碰一點，什麼都停在入門。什麼都停在入門，這是實況。」
     * —— 一條 C6 修飾語，湊字數湊出嚟嘅重複，**差一個字避開咗個閘**：
     * 「什麼都停在入門」啱啱好七個字。
     *
     * 同一個錯第六次。所以個窗收窄到七 —— 唔係因為七係一個好數字，
     * 係因為八漏咗一個真個案，而漏咗一次就會漏第二次。
     */
    const cjk = m.text.replace(/[^㐀-鿿]/g, '');
    const seen = new Map<string, number>();
    for (let i = 0; i + 7 <= cjk.length; i++) {
      const seg = cjk.slice(i, i + 7);
      const at = seen.get(seg);
      if (at !== undefined && i - at >= 7) {
        ctx.addIssue({ code: 'custom', message: `${m.id}：同一句入面重複咗「${seg}」—— 湊字數就係巴納姆嘅入口` });
        break;
      }
      if (at === undefined) seen.set(seg, i);
    }
    if (m.kind === 'brightness' && !(m.key in BRIGHTNESS_BANDS)) {
      ctx.addIssue({ code: 'custom', message: `${m.id}：唔認得廟旺檔 ${m.key}` });
    }
    if (m.kind === 'sihua' && !'祿權科忌'.includes(m.key)) {
      ctx.addIssue({ code: 'custom', message: `${m.id}：唔認得化別 ${m.key}` });
    }
    if (m.kind === 'malefic' && !MALEFICS.includes(m.star as never)) {
      ctx.addIssue({ code: 'custom', message: `${m.id}：${m.star} 唔喺六煞名單` });
    }
    for (const src of m.sources) {
      const p = CORPUS[src.corpus]?.passages[src.passage_id];
      if (!p) {
        ctx.addIssue({ code: 'custom', message: `${m.id}：搵唔到 ${src.corpus}/${src.passage_id}` });
        continue;
      }
      if (!normaliseForMatch(p.text).includes(normaliseForMatch(src.quote))) {
        ctx.addIssue({
          code: 'custom',
          message: `${m.id}：引文喺 ${src.passage_id} 搵唔返 —— 「${src.quote.slice(0, 18)}…」`,
        });
      }
    }
  });

export type Modifier = z.infer<typeof Modifier>;

/** 某個廟旺級數屬邊一檔。 */
export function bandOf(level: string): BrightnessBand | null {
  for (const [band, levels] of Object.entries(BRIGHTNESS_BANDS)) {
    if ((levels as readonly string[]).includes(level)) return band as BrightnessBand;
  }
  return null;
}

export function buildModifiers(raw: unknown[]): Modifier[] {
  const out = raw.map((r) => Modifier.parse(r));
  const seen = new Set<string>();
  for (const m of out) {
    if (seen.has(m.id)) throw new Error(`修飾語 ID 重複：${m.id}`);
    seen.add(m.id);
  }
  return out;
}

/* ──────────────────────────────────────────────
   修飾語 → 規則
   ────────────────────────────────────────────── */

const PALACES = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'] as const;

/**
 * ⚠ **廟旺唔派生規則。**
 *
 * 呢個係 C6 最重要嘅一個決定，而且佢同直覺相反。
 *
 * 廟旺講緊嘅係「呢粒星幾強」—— 同基塊講緊嘅「呢粒星坐呢個宮」係**同一粒星**。
 * 規範 §15 寫得好白：「同一顆星、同一次四化、同一路徑被重述為不同句子，只算一群。」
 * 如果廟旺自己派生一條規則、自己一個去重群，噉「紫微坐官祿」同「紫微落陷」
 * 就會變成兩票 —— 而佢哋其實係同一粒星嘅兩句描述。
 *
 * 所以廟旺修飾語係**貼喺基塊規則上面**，由組裝器（C8b）用
 * `brightnessModifier()` 查出嚟，唔進入門檻計數。
 *
 * 六煞唔同：擎羊係另一粒星，唔係主星嘅屬性，所以佢可以自己一群 ——
 * 但角色只係 modifier，拎唔到核心票。
 */
export function sihuaRules(): Record<string, unknown>[] {
  const HUA = ['祿', '權', '科', '忌'] as const;
  const XIANG: Record<string, string[]> = {
    祿: ['資源', '順流', '得以展開'],
    權: ['推動', '承擔', '決定權'],
    科: ['呈現', '秩序', '名目'],
    忌: ['牽制', '反覆', '需要承擔'],
  };
  const FORBID: Record<string, string[]> = {
    祿: ['祿必富', '單一化祿判「順」'],
    權: ['權必升', '單一化權判「進」'],
    科: ['科必考上', '把呈現讀成成就'],
    忌: ['忌必凶', '單一化忌判「慎」或「逆」', '預言破財、疾病或離婚'],
  };
  const out: Record<string, unknown>[] = [];
  for (const hua of HUA) {
    for (const palace of PALACES) {
      out.push({
        rule_id: `sihua.natal-${hua}.${palace}`,
        version: '1.0',
        schools: ['zhongzhou-v1'],
        requires: ['natal'],
        role: 'core',
        // 一層一個化只落一個宮，所以十二條至多中一條
        independence_group: `sihua.natal.${hua}`,
        trigger: { hua, in: { name: palace }, layer: 'natal' },
        exclude: null,
        allowed_xiang: XIANG[hua],
        prohibited_inferences: [...FORBID[hua]!, '宮名不等於事件'],
        topics: [PALACE_TOPIC_LOCAL[palace]],
        depends_on: [],
        review_status: 'approved',
        review_reasons: ['象義範圍出自規範 §14；觸發條件係四化落宮，純結構'],
        sources: [
          { book: '觀微・名書 語言規範與推理規範 v1.0', ref: '§14 四化與單一訊號禁則' },
          { book: '紫微斗數全書', ref: '卷二 · 安祿權科忌四星變化訣' },
        ],
        note: '容許象義係詞義範圍，唔係吉凶對照。單一四化唔准下結論（§14）。',
      });
    }
  }
  return out;
}

/** 六煞同宮。每粒煞自己一群 —— 佢哋係另一粒星，但角色只係修正。 */
export function maleficRules(mods: Modifier[]): Record<string, unknown>[] {
  return mods
    .filter((m) => m.kind === 'malefic')
    .map((m) => ({
      rule_id: `sha.${m.star}.${m.key}`,
      version: '1.0',
      schools: ['zhongzhou-v1'],
      requires: ['natal'],
      role: 'modifier',
      independence_group: `sha.${m.star}`,
      trigger: { star: m.star, in: { name: m.key } },
      exclude: null,
      allowed_xiang: ['條件', '強弱', '表現方式'],
      prohibited_inferences: ['單一煞曜下結論', '煞星等於災禍', '宮名不等於事件'],
      topics: [PALACE_TOPIC_LOCAL[m.key]],
      depends_on: [],
      review_status: 'approved',
      review_reasons: [`由修飾語 ${m.id} 派生；角色係修正權重 1（§13）`],
      sources: m.sources.map((s) => ({ book: '紫微斗數全書', ref: `${s.passage_id}（${s.scope}）` })),
      note: `正文喺修飾語 ${m.id}。修正層唔拎核心票。`,
    }));
}

/** 同 baseblock.ts 嗰個一樣。放喺度避免 circular import。 */
const PALACE_TOPIC_LOCAL: Record<string, 'self' | 'social' | 'relationship' | 'finance' | 'load' | 'career' | 'home'> = {
  命宮: 'self', 兄弟: 'social', 夫妻: 'relationship', 子女: 'self',
  財帛: 'finance', 疾厄: 'load', 遷移: 'self', 僕役: 'social',
  官祿: 'career', 田宅: 'home', 福德: 'load', 父母: 'self',
};
