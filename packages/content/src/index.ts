/**
 * @guanwei/content — 內容 schema、lint 同規則庫（工單 C1、C2）
 *
 * 規範全文喺 docs/voice-spec.md；repo 呢邊點對應見 docs/voice.md。
 * 呢個 package 只做機器捉得到嗰半。
 */
export * from './schema';
export * from './lint';
export * from './condition';
export * from './rule';
export * from './registry';
export * from './lexicon';
export * from './lexicon-data';
export * from './baseblock';
export * from './baseblock-data';
export * from './modifier';
export * from './modifier-data';
export * from './structure';
export * from './frame';
export * from './frame-data';
export * from './valence';
export * from './infer';
export * from './l3';
export * from './l3-data';
export * from './assemble';
export * from './gate';
export * from './free';
export * from './barnum';
export * from './reader';
export * from './xingxi';
export * from './xingxi-chapters';
export * from './card';
export * from './ming-writer';
export * from './free-ming-reader';
export { withConditionalBranches, huaMentions } from './free-ming-systems';
export { withRelocatedHedges, isRelocatableHedge } from './hedge-relocate';
export * from './palace-reader';
export * from './palace-advice';
export * from './palace-narrative';
export * from './palace-plain';
export * from './plain-variant';
export * from './shen';
export * from './daxian';
export * from './liunian';
export * from './life';
export * from './epilogue';
export * from './youth';
export * from './plain';
export * from './rectify';
export * as En from './en/index';
export * as Ja from './ja/index';
export * from './branch';
export * from './citation';

export * from './reader-reference-language';
