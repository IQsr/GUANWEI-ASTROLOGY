/**
 * L3 結構層正文（工單 C8b）
 *
 * ── 點解呢個檔案喺 C8b 出現，而唔係 C7 ──
 *
 * C7 交咗 L3 嘅**規則**：三方四正 24 條、空宮 12 條、身宮 6 條、格局 30 條。
 * 但內容系統 §3 嘅 L3 一欄寫嘅係「約 60 條」——**內容**，唔係規則。
 *
 * 呢個差別 C7 嗰陣睇唔出，因為規則自己有 `allowed_xiang`，讀落好似有嘢。
 * 到 C8b 要砌「牽動」插槽（§6 插槽表，60–120 字，**必需**）先發現冇文可揀 ——
 * 一個必需插槽冇內容來源。
 *
 * 所以呢個檔案係 C7 漏低嗰半。記低係因為：**規則同正文係兩件嘢**，
 * 一條規則寫完唔等於嗰一層寫完，而「有 allowed_xiang」好容易令人以為寫完咗。
 *
 * ── L3 塊唔自己帶來源 ──
 *
 * 基塊（L1）自己帶兩個來源，然後派生規則；L3 掉轉 —— 規則先有，塊係嗰條規則嘅正文。
 * 所以 L3 塊只需要指返去佢解釋緊嗰條**已審核**規則，來源喺規則度。
 *
 * 呢個唔係鬆咗：schema 會核 `rule_ids` 每一條都存在而且 approved，
 * 指去一條唔存在或者未審核嘅規則就 parse 唔到。
 * 即係話 —— **冇規則就冇正文**，同 §10 尾句「缺少已審核規則時，不得即席創作」同一個方向。
 */
import { z } from 'zod';
import { cjkCount } from './lexicon';
import { similarity } from './baseblock';
import { RULE_REGISTRY } from './registry';

export const L3Kind = z.enum(['relation', 'sanfang', 'shen', 'geju', 'empty']);

/**
 * `relation` 塊唔准出現嘅字 —— 同 L5 章框同一道閘，理由亦都一樣。
 *
 * 一塊講「財帛宮同命宮、官祿宮互相牽動」嘅文，講嘅係**幾何**：
 * 三方四正邊幾個宮，係算出嚟嘅，唔係一個對斗數嘅主張。
 * 所以佢可以冇規則、冇來源 —— 但代價係佢一個象義都唔准講。
 */
const NO_CLAIM_TERMS = [
  '紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰',
  '貪狼', '巨門', '天相', '天梁', '七殺', '破軍',
  '左輔', '右弼', '文昌', '文曲', '天魁', '天鉞', '祿存', '天馬',
  '擎羊', '陀羅', '火星', '鈴星', '地空', '地劫',
  '化祿', '化權', '化科', '化忌', '廟', '旺', '落陷',
];

export const L3Block = z
  .object({
    id: z.string().regex(/^l3\.(relation|sanfang|shen|geju|empty)\./, 'id 要係 l3.kind.…'),
    kind: L3Kind,
    /** 宮名（sanfang / shen / empty）或者格局 id（geju）。 */
    key: z.string().min(1),
    variant: z.enum(['pressure', 'support']).optional(),
    body: z.string().min(1),
    /**
     * 呢一塊係邊條規則嘅正文。
     *
     * 空**只准**喺 `relation` 塊 —— 嗰啲講幾何唔講象義，所以冇嘢好引。
     * 其餘一律要指返去一條已審核規則：冇規則就冇正文。
     */
    rule_ids: z.array(z.string().min(1)),
    status: z.enum(['draft', 'reviewed', 'published']),
  })
  .superRefine((b, ctx) => {
    const w = cjkCount(b.body);
    if (w < 40 || w > 70) {
      ctx.addIssue({ code: 'custom', message: `${b.id}：${w} 字，L3 塊要 40–70（牽動插槽 40–140，最多砌兩塊）` });
    }
    if (b.kind === 'relation') {
      const bad = NO_CLAIM_TERMS.filter((t) => b.body.includes(t));
      if (bad.length) {
        ctx.addIssue({
          code: 'custom',
          message: `${b.id}：關係塊講幾何，唔准講象義，但出現咗「${bad.join('、')}」`,
        });
      }
    } else if (b.rule_ids.length === 0) {
      ctx.addIssue({ code: 'custom', message: `${b.id}：唔係關係塊就一定要指返去一條已審核規則` });
    }
    for (const id of b.rule_ids) {
      const r = RULE_REGISTRY.rules.find((x) => x.rule_id === id);
      if (!r) {
        ctx.addIssue({ code: 'custom', message: `${b.id}：規則庫冇 ${id} —— 冇規則就唔准有正文` });
      } else if (r.review_status !== 'approved') {
        ctx.addIssue({ code: 'custom', message: `${b.id}：${id} 係 ${r.review_status}，未審核嘅規則唔准有正文` });
      }
    }
    if ((b.kind === 'sanfang') !== Boolean(b.variant)) {
      ctx.addIssue({ code: 'custom', message: `${b.id}：只有三方四正塊先分壓力／支持` });
    }
    /* 同基塊、修飾語一樣嘅句內重複閘 —— 湊字數就係巴納姆嘅入口。 */
    const cjk = b.body.replace(/[^㐀-鿿]/g, '');
    const seen = new Map<string, number>();
    for (let i = 0; i + 10 <= cjk.length; i++) {
      const seg = cjk.slice(i, i + 10);
      const at = seen.get(seg);
      if (at !== undefined && i - at >= 10) {
        ctx.addIssue({ code: 'custom', message: `${b.id}：同一塊入面重複咗「${seg}」` });
        break;
      }
      if (at === undefined) seen.set(seg, i);
    }
  });

export type L3Block = z.infer<typeof L3Block>;

export function buildL3(raw: unknown[]): L3Block[] {
  const out = raw.map((r) => L3Block.parse(r));
  const seen = new Set<string>();
  for (const b of out) {
    if (seen.has(b.id)) throw new Error(`L3 塊 ID 重複：${b.id}`);
    seen.add(b.id);
  }
  return out;
}

/**
 * 反巴納姆。
 *
 * 呢度捉嘅係一件好具體嘅嘢：十二個宮嘅三方四正塊，
 * 如果只係換個宮名就當寫咗十二條，讀者見到嘅就係同一句講十二次。
 */
export function mostSimilarL3(blocks: L3Block[], top = 5): { a: string; b: string; score: number }[] {
  const out: { a: string; b: string; score: number }[] = [];
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      out.push({ a: blocks[i]!.id, b: blocks[j]!.id, score: similarity(blocks[i]!.body, blocks[j]!.body) });
    }
  }
  return out.sort((x, y) => y.score - x.score).slice(0, top);
}
