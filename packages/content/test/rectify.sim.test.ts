import { describe, it } from 'vitest';
import type { ShichenIndex } from '@guanwei/ziwei';
import { candidates, nextQuestion, posterior, predictions, qid, questionPool, type Answer, type Model, type Question } from '../src/rectify';

/**
 * 定時辰模擬（2026-10-05）。平時唔跑：`SIM=1 npx vitest run test/rectify.sim.test.ts`
 *
 * 隨機揀一個生日同時辰當「真」，用真盤嘅預測答問題（加記錯同唔記得），睇揀唔揀得返啱嘅時辰。
 *
 * ⚠ 呢個只係驗「問題分唔分得開候選盤」。佢假設咗命盤真係預測到人生大事 ——
 *   現實準唔準，模擬答唔到，要真人試。
 */
let seed = 20261005;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;

/** 大概時段：夜（子丑寅）、朝（卯辰巳）、晝（午未申）、晚（酉戌亥） */
const BANDS: ShichenIndex[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [9, 10, 11],
];

const MODEL: Model = { hit: 0.75, base: 0.3 };
const NOW = 2026;

type Scenario = { name: string; truth: Model; band: boolean; budget: number };

function trial(s: Scenario) {
  const birth = {
    solar: { y: 1960 + Math.floor(rnd() * 45), m: 1 + Math.floor(rnd() * 12), d: 1 + Math.floor(rnd() * 28) },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: rnd() < 0.5 ? ('male' as const) : ('female' as const),
  };
  const real = Math.floor(rnd() * 12) as ShichenIndex;
  const only = s.band ? BANDS.find((b) => b.includes(real)) : undefined;
  const cs = candidates(birth, only);
  const truthIdx = cs.findIndex((c) => c.shichen === real);
  if (truthIdx < 0) return null;
  const from = cs[0]!.chart.lunar.y + 17;
  const preds = cs.map((c) => predictions(c.chart, from, NOW - 1));
  const pool = questionPool(preds);
  /* 分唔開：同真盤預測一模一樣嘅候選 */
  const twins = preds.filter((p, i) => i !== truthIdx && p.size === preds[truthIdx]!.size && [...p].every((x) => preds[truthIdx]!.has(x))).length;

  const answers: { q: Question; a: Answer }[] = [];
  const asked = new Set<string>();
  for (let k = 0; k < s.budget; k++) {
    const post = posterior(preds, answers, MODEL);
    const q = nextQuestion(preds, post, asked, MODEL, pool);
    if (!q) break;
    asked.add(qid(q));
    let a: Answer;
    if (rnd() < 0.15) a = 'unsure';
    else {
      const p = preds[truthIdx]!.has(qid(q)) ? s.truth.hit : s.truth.base;
      a = rnd() < p ? 'yes' : 'no';
    }
    answers.push({ q, a });
  }
  const post = posterior(preds, answers, MODEL);
  const best = post.indexOf(Math.max(...post));
  return { n: cs.length, ok: best === truthIdx, top: post[best]!, twins };
}

describe.skipIf(!process.env.SIM)('定時辰模擬', () => {
  it('跑', () => {
    const truths: [string, Model][] = [
      ['樂觀（盤好準）', { hit: 0.75, base: 0.3 }],
      ['中等', { hit: 0.65, base: 0.38 }],
      ['悲觀（盤唔太準）', { hit: 0.55, base: 0.45 }],
    ];
    const rows: string[] = [];
    for (const band of [false, true])
      for (const [tn, truth] of truths)
        for (const budget of [5, 8, 12]) {
          const s: Scenario = { name: tn, truth, band, budget };
          const rs = Array.from({ length: 250 }, () => trial(s)).filter((r) => r !== null);
          const acc = rs.filter((r) => r.ok).length / rs.length;
          const conf = (th: number) => {
            const c = rs.filter((r) => r.top >= th);
            return `${Math.round((c.length / rs.length) * 100)}% 有把握，當中 ${c.length ? Math.round((c.filter((r) => r.ok).length / c.length) * 100) : 0}% 啱`;
          };
          const twins = rs.filter((r) => r.twins > 0).length / rs.length;
          rows.push(
            `${band ? '知時段(3選1)' : '唔知(12選1)'} | ${tn} | ${budget}題 | 啱 ${Math.round(acc * 100)}% | ≥0.8：${conf(0.8)} | ≥0.9：${conf(0.9)} | 有分唔開嘅雙胞盤 ${Math.round(twins * 100)}%`,
          );
        }
    console.log(`SIMRESULT\n${rows.join('\n')}`);
  }, 600_000);
});
