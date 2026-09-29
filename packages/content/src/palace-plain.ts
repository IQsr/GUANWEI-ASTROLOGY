import { z } from 'zod';
import raw from './plain/palace.json';
import { FORBIDDEN_TERMS } from './frame';
import { cjkCount } from './lexicon';
import { scanPlain } from './plain';

/**
 * 十二宮章嘅結論句（直白，2026-09-29 · docs/voice.md 第六節）
 *
 * 每粒主星 × 每個宮一條：`summary` 係章嘅第一句 —— 你喺呢方面係點樣；
 * `watch` 係一句「要留意的是：⋯」。兩句都由嗰格基塊（`base.星.宮`）撮出嚟，
 * 唔加基塊冇講過嘅象義，所以出處跟返基塊。
 *
 * 基塊本身照舊入書，擺喺結論後面做依據（星名、引文、廟旺都喺嗰度）。
 */
export const PalacePlain = z
  .object({
    id: z.string(),
    star: z.string(),
    palace: z.string(),
    summary: z.string(),
    watch: z.string(),
  })
  .superRefine((x, ctx) => {
    const issue = (m: string) => ctx.addIssue({ code: 'custom', message: `${x.id}：${m}` });
    if (x.id !== `plain.${x.star}.${x.palace}`) issue('id 要係 plain.星.宮');
    const ws = cjkCount(x.summary);
    if (ws < 8 || ws > 40) issue(`summary ${ws} 字，要 8–40`);
    for (const f of scanPlain(x.summary, 'summary', { leadsWithConclusion: true })) issue(`summary ${f.code} ${f.message}`);
    const ww = cjkCount(x.watch);
    if (ww < 10 || ww > 40) issue(`watch ${ww} 字，要 10–40`);
    if (!x.watch.startsWith('要留意的是：')) issue('watch 要以「要留意的是：」開頭');
    if (!x.watch.includes('你')) issue('watch 要對住讀者講');
    const terms = FORBIDDEN_TERMS.filter((t) => x.watch.includes(t));
    if (terms.length) issue(`watch 有術語「${terms.join('、')}」`);
    for (const f of scanPlain(x.watch, 'watch')) issue(`watch ${f.code} ${f.message}`);
  });
export type PalacePlain = z.infer<typeof PalacePlain>;

/* 一次過報晒所有唔合格嘅條目 */
export const PALACE_PLAIN: PalacePlain[] = (() => {
  const results = (raw as unknown[]).map((r) => PalacePlain.safeParse(r));
  const bad = results.flatMap((r) => (r.success ? [] : r.error.issues.map((i) => i.message)));
  if (bad.length) throw new Error(`十二宮結論句唔合格（${bad.length} 處）：\n${bad.join('\n')}`);
  return results.map((r) => r.data!);
})();

export function palacePlain(star: string, palace: string): PalacePlain | undefined {
  return PALACE_PLAIN.find((x) => x.star === star && x.palace === palace);
}
