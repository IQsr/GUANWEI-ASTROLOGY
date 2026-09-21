/**
 * 內容 schema（工單 C1）
 *
 * 出處：docs/voice-spec.md §17（interpretation object）、內容系統 §11（基塊 frontmatter）
 *
 * 兩個唔同層次嘅嘢，刻意分開：
 *
 *   Block          —— 人手寫嘅內容庫（L0 詞條、L1 基塊、L2 修飾語…）。
 *                     靜態文字，唔綁任何一個命盤。C4 / C5 寫嘅就係呢啲。
 *
 *   Interpretation —— 一個命盤 × 一個主題 × 一個時間層嘅結論物件。
 *                     要有證據、規則 ID、去重群、評級同置信度。
 *
 * ⚠ **而家冇任何嘢產生得到 Interpretation。** 規範要求每項實質判斷都有
 * evidence[] 同已審核嘅 rule_id，而我哋冇規則庫、冇 school_profile、
 * 引擎亦未做自化／飛化／疊宮／流年。呢個 schema 先鎖低形狀，
 * 等真係開始做嗰陣唔使推倒重來 —— 亦都令個缺口睇得見。
 * 詳情見 docs/voice.md 第五節。
 */
import { z } from 'zod';

/* ──────────────────────────────────────────────
   一、內容庫（人手寫）
   ────────────────────────────────────────────── */

/** 來源。少過兩個 → build fail（內容系統 §8、工單 C1 驗收）。 */
export const Source = z.object({
  book: z.string().min(1),
  ref: z.string().min(1),
});

export const BlockStatus = z.enum(['draft', 'reviewed', 'published']);

/** 層級。L4 時間層要有引擎支援先寫得，見 voice.md 第五節。 */
export const BlockLevel = z.enum(['L0', 'L1', 'L2', 'L3', 'L4', 'L5']);

export const Block = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(\.[a-z0-9-]+)+$/, 'id 要係 base.wuqu.caibo 呢種形式'),
    level: BlockLevel,
    /** L1 基塊先有。 */
    star: z.string().optional(),
    palace: z.string().optional(),
    school: z.string().min(1),
    words: z.number().int().positive(),
    /**
     * 兩個來源係硬性要求。
     * 兩個講法唔同 → 唔准自己調和，寫成「各家說法不一」或者標 disputed（內容系統 §8）。
     */
    sources: z.array(Source).min(2, '每條基塊至少兩個來源 —— 少過兩個唔准入 build'),
    disputed: z.boolean().default(false),
    status: BlockStatus,
    /** 反例：規範本身要引用禁用詞（voice-spec §3 最後一段）。標咗就唔掃黑名單。 */
    counterexample: z.boolean().default(false),
    body: z.string().min(1),
  })
  .superRefine((b, ctx) => {
    if (b.level === 'L1' && (!b.star || !b.palace)) {
      ctx.addIssue({ code: 'custom', message: 'L1 基塊一定要有 star 同 palace' });
    }
    if (b.disputed && b.status === 'published') {
      ctx.addIssue({
        code: 'custom',
        message: 'disputed 嘅塊唔准 published —— 各家說法不一就要寫出嚟，唔係靜靜雞出街',
      });
    }
  });

export type Block = z.infer<typeof Block>;

/* ──────────────────────────────────────────────
   二、結論物件（引擎產生，仲未有引擎）
   ────────────────────────────────────────────── */

export const Grade = z.union([
  z.literal(3), z.literal(2), z.literal(1), z.literal(0),
  z.literal(-1), z.literal(-2), z.literal(-3),
  z.null(),
]);

export const Confidence = z.enum(['high', 'medium', 'low', 'undetermined']);

export const TimeLayer = z.enum(['natal', 'decade', 'annual']);

/** 角色，唔係分數。禁止相加（voice-spec §13）。 */
export const EvidenceRole = z.enum([
  'core',        // 核心：本命 / 大限 / 流年 / 四化
  'structural',  // 結構驗證：三方四正
  'modifier',    // 修正：自化、輔星煞曜、廟旺
  'link',        // 關聯：限流疊宮
  'none',        // 未取得推理資格（權重 0）
]);

export const Evidence = z.object({
  id: z.string().min(1),
  /** 要解析得返去原始盤面。fixture:// 只准喺測試用。 */
  source_ref: z.string().min(1),
  layer: TimeLayer,
  palace: z.string().nullable(),
  star: z.string().nullable(),
  transformation: z.enum(['祿', '權', '科', '忌']).nullable(),
  /** 已審核規則 ID。冇規則就唔准即席創作星曜含義（§10）。 */
  rule_id: z.string().min(1),
  direction: z.enum(['support', 'counter', 'mitigating', 'unresolved']),
  role: EvidenceRole,
  /** 去重群。同一機制衍生嘅證據合埋一群，只計一次（§15）。 */
  independence_group: z.string().min(1),
});

export const CrossCheck = z.object({
  status: z.enum(['passed', 'failed', 'not_applicable']),
  reason: z.string().min(1),
});

export const Interpretation = z
  .object({
    claim_id: z.string().min(1),
    chart_id: z.string().min(1),
    spec_version: z.string().min(1),

    /** 唔准留空，唔准用未鎖定嘅 latest（§17）。 */
    school_profile_id: z.string().min(1).refine((s) => s !== 'latest', '唔准用 latest'),
    rule_registry_version: z.string().min(1).refine((s) => s !== 'latest', '唔准用 latest'),

    topic: z.string().min(1),
    time_scope: z.object({
      layer: TimeLayer,
      year: z.number().int().nullable(),
      start: z.string().nullable(),
      end: z.string().nullable(),
      year_boundary: z.string(),
    }),

    input_quality: z.enum(['complete', 'incomplete']),
    missing_inputs: z.array(z.string()),

    evidence: z.array(Evidence),
    supporting_ids: z.array(z.string()),
    counter_ids: z.array(z.string()),
    mitigating_ids: z.array(z.string()),
    /** 空 list 一定要有檢查說明 —— 「未見反證」唔等於「已檢查過冇反證」。 */
    evidence_check_note: z.string().min(1),

    cross_checks: z.object({
      natal: CrossCheck,
      decade: CrossCheck,
      annual: CrossCheck,
      san_fang_si_zheng: CrossCheck,
      transformations: CrossCheck,
      overlap: CrossCheck,
    }),

    rating: z.object({
      candidate_grade: Grade,
      final_grade: Grade,
      status: z.enum(['resolved', 'conflicted', 'undetermined']),
      change_reason: z.string().min(1),
      passed_gates: z.array(z.string()),
    }),

    interpretation_confidence: Confidence,
    confidence_reason: z.string().min(1),

    /** 象 → 勢 → 事 → 解（§18）。 */
    xiang: z.string().min(1),
    shi_trend: z.string().nullable(),
    shi_scenarios: z.array(z.object({
      text: z.string().min(1),
      condition: z.string().min(1),
      evidence_ids: z.array(z.string()).min(1),
    })).max(3, '事最多三個 —— 列一長串事件係提高「總有一個中」嘅機會'),
    jie: z.array(z.object({
      type: z.enum(['action', 'observation', 'general_advice', 'data_request']),
      text: z.string().min(1),
    })).max(3),

    user_context_refs: z.array(z.string()),
    unknowns: z.array(z.string()),
    risk_flags: z.array(z.string()),
    prohibited_inferences: z.array(z.string()),

    title: z.string().nullable(),
    body: z.string().nullable(),
    reader_note: z.string().nullable(),

    review_status: z.enum(['draft', 'needs_review', 'approved', 'rejected']),
    review_reasons: z.array(z.string()),
  })
  .superRefine((o, ctx) => {
    const g = o.rating.final_grade;

    // §16.6：唔滿足門檻就 grade=null，而且唔准生成有確定方向嘅個人化頁
    if (g === null && (o.title || o.body)) {
      ctx.addIssue({
        code: 'custom',
        message: 'grade 係 null 就唔准有 title / body —— 只可以出 reader_note',
      });
    }

    // §17：low / undetermined 唔准出方向評級
    if ((o.interpretation_confidence === 'low' || o.interpretation_confidence === 'undetermined') && g !== null) {
      ctx.addIssue({
        code: 'custom',
        message: `置信度 ${o.interpretation_confidence} 唔准發布方向評級（而家係 ${g}）`,
      });
    }

    // §17：medium 上限進／逆
    if (o.interpretation_confidence === 'medium' && g !== null && Math.abs(g) > 2) {
      ctx.addIssue({ code: 'custom', message: 'medium 置信度上限係 ±2（進／逆）' });
    }

    // §16.3：盛／險要高置信度 + 人工覆核
    if (g !== null && Math.abs(g) === 3) {
      if (o.interpretation_confidence !== 'high') {
        ctx.addIssue({ code: 'custom', message: '盛／險必須 high 置信度' });
      }
      if (o.review_status === 'approved' && !o.review_reasons.includes('manual_review_passed')) {
        ctx.addIssue({ code: 'custom', message: '盛／險必須人工覆核（review_reasons 要有 manual_review_passed）' });
      }
    }

    // §13：年度結論要三層都查過
    if (o.time_scope.layer === 'annual' && g !== null) {
      for (const k of ['natal', 'decade', 'annual'] as const) {
        if (o.cross_checks[k].status !== 'passed') {
          ctx.addIssue({ code: 'custom', message: `年度結論要本命／大限／流年三層都 passed（${k} 係 ${o.cross_checks[k].status}）` });
        }
      }
    }

    // §14：禁止單一訊號下結論
    const groups = new Set(
      o.evidence.filter((e) => e.direction === 'support' && e.role !== 'none').map((e) => e.independence_group),
    );
    if (g !== null && g !== 0 && groups.size < 2) {
      ctx.addIssue({
        code: 'custom',
        message: `只有 ${groups.size} 個去重支持群 —— 單一訊號唔准下結論（§14）`,
      });
    }

    // §16.1/2/3：門檻
    if (g !== null && Math.abs(g) === 2 && groups.size < 3) {
      ctx.addIssue({ code: 'custom', message: '進／逆要至少三群同向證據（§16.2）' });
    }
    if (g !== null && Math.abs(g) === 3 && groups.size < 4) {
      ctx.addIssue({ code: 'custom', message: '盛／險要至少四群同向證據（§16.3）' });
    }

    // §16.5：平唔可以由缺資料產生
    if (g === 0 && o.input_quality !== 'complete') {
      ctx.addIssue({ code: 'custom', message: '「平」要輸入完整先出得 —— 缺資料應該係 null（交錯／未定）' });
    }

    // §11：fixture 唔准出街
    if (o.review_status === 'approved' && o.evidence.some((e) => e.source_ref.startsWith('fixture://'))) {
      ctx.addIssue({ code: 'custom', message: 'fixture:// 係測試資料，唔准 approved' });
    }
  });

export type Interpretation = z.infer<typeof Interpretation>;
