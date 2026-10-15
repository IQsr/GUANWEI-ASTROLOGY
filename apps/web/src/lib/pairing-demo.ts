import 'server-only';
import p01 from './pairing-demo/01.pack.json';
import p02 from './pairing-demo/02.pack.json';
import p03 from './pairing-demo/03.pack.json';
import p04 from './pairing-demo/04.pack.json';
import p05 from './pairing-demo/05.pack.json';
import s01 from './pairing-demo/01.sonnet.json';
import s02 from './pairing-demo/02.sonnet.json';
import s03 from './pairing-demo/03.sonnet.json';
import s04 from './pairing-demo/04.sonnet.json';
import s05 from './pairing-demo/05.sonnet.json';

/**
 * 兩人對照預覽用嘅定稿（2026-10-15）
 *
 * 由 `packages/content/tools/pairing` 抄過嚟：packs/NN.json（事實包，連生辰）同
 * out/claude-sonnet-5-5/NN.json（Sonnet 5.5 第四輪，冇偏向）。只係睇排版用，唔係產品資料。
 */
type Birth = Parameters<typeof import('@guanwei/ziwei').cast>[0];
export type Fact = { id: string; kind: string; text: string; cite: string };
export type Person = { key: 'A' | 'B'; name: string; facts: Fact[]; birth: Birth };
export type Sentence = { text: string; kind: '轉述' | '對照'; facts: string[] };
export type Synthesis = { headline: Sentence; sections: { title: string; sentences: Sentence[] }[] };
export type PairDemo = { id: string; people: [Person, Person]; out: Synthesis };

const RAW: [string, unknown, unknown][] = [
  ['01', p01, s01],
  ['02', p02, s02],
  ['03', p03, s03],
  ['04', p04, s04],
  ['05', p05, s05],
];

export const PAIR_DEMOS: PairDemo[] = RAW.map(([id, pack, out]) => ({
  id,
  people: (pack as { people: [Person, Person] }).people,
  out: out as Synthesis,
}));

/** 一句引用嘅出處（盤面事實唔列；同一出處只列一次） */
export function citesOf(pair: PairDemo, s: Sentence): string[] {
  const facts = new Map(pair.people.flatMap((p) => p.facts.map((f) => [f.id, f] as const)));
  const cites = s.facts.map((id) => facts.get(id)).filter((f): f is Fact => Boolean(f) && f!.kind !== '盤面').map((f) => f.cite);
  return [...new Set(cites)];
}
