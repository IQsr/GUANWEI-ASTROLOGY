// 將 cards.mjs 嘅卡併入 palace-remaining.json／palace-focused.json 同兩份 review。
// 重跑會先移走舊嘅 since=palace-conditions-v2 卡同出處，所以可以改完卡再跑。
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { remaining, focused } from './cards.mjs';

const SINCE = 'palace-conditions-v2';
const sha = (t) => createHash('sha256').update(t).digest('hex');
const lib = new Map(JSON.parse(fs.readFileSync('tmp/wang-reference/deep/library.json', 'utf8')).blocks.map((b) => [b.id, b]));
const idx = new Map(JSON.parse(fs.readFileSync('tools/wang-reference/deep-index.json', 'utf8')).blocks.map((b) => [b.id, b]));
const PALACE = { 兄弟: '兄弟宮', 財帛: '財帛宮', 官祿: '官祿宮', 僕役: '僕役宮', 福德: '福德宮', 夫妻: '夫妻宮', 田宅: '田宅宮' };
const NOTE = {
  remaining: (pages) => `保存所選完整原段及跨頁續文；「……」分隔各抽取段，非連續選段不冒充連續全文。實際選段位於PDF第${pages.join('、')}頁；區間不表示中間每頁均被引出。原文字形及疑字保留，疑句不建立新規則。引文是作者的術數論述，與已核盤面、編輯對照分開；不作病患診斷、親屬存亡、資產回報或某年事件預告。`,
  focused: (pages) => `保留所選完整原段；「……」分隔非連續節錄，跨頁續段以換行相接。本組實際選段位於PDF第${pages.join('、')}頁；起訖區間不表示中間各頁均被引出。原文字形及疑字保留；不明疑字未新增規則。書中判詞、已核盤面與編輯對照分開；未推算婚次、親屬存亡、災病、資產回報或某年事件。`,
};

function source(card, kind) {
  let excerpt = '';
  const spans = [], hashes = {};
  card.source.groups.forEach((group, g) => {
    if (g) excerpt += '\n……\n';
    group.forEach((id, i) => {
      const b = lib.get(id), m = idx.get(id);
      if (!b || !m) throw Error(`Missing block ${id}`);
      if (sha(b.text) !== m.text_sha256) throw Error(`Block text drifted from index: ${id}`);
      if (i) excerpt += '\n';
      spans.push({ id, start: excerpt.length, end: excerpt.length + b.text.length });
      excerpt += b.text; hashes[id] = m.text_sha256;
    });
  });
  const ids = spans.map((s) => s.id);
  const pages = [...new Set(ids.map((id) => idx.get(id).pdf_page))];
  return {
    page: pages[0], quotePages: [Math.min(...pages), Math.max(...pages)],
    section: `下篇・宮垣論・${PALACE[card.palace]}・${card.source.section}`,
    excerpt, quoteBlocks: ids, quoteSpans: spans, block_sha256: hashes,
    sourceNote: `${NOTE[kind](pages)}${kind === 'focused' ? card.conditions.join('') : ''}`,
  };
}

function merge(file, reviewFile, cards, kind) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const review = JSON.parse(fs.readFileSync(reviewFile, 'utf8'));
  const old = new Set(data.rules.filter((r) => r.since === SINCE).map((r) => r.id));
  data.rules = data.rules.filter((r) => !old.has(r.id));
  review.rules = review.rules.filter((r) => !old.has(r.id));
  for (const id of Object.keys(data.sources)) if (id.startsWith('cond2-')) delete data.sources[id];
  for (const c of cards) {
    const sid = `cond2-${c.id}`;
    data.sources[sid] = source(c, kind);
    data.rules.push({ id: c.id, palace: c.palace, keys: c.keys, when: c.when, heading: c.heading, text: c.text,
      sources: [sid], conditions: c.conditions, priority: c.priority, since: SINCE });
    review.rules.push({ id: c.id, when: c.when, sources: [sid], conditions: c.conditions,
      decision: '2026-10-26 日夜生／雜曜第一批：逐條讀原段前後文，必要條件、否定及例外入 when；事件與他人品格斷語不用；未符合不反推相反結果', since: SINCE });
  }
  review.conditions_v2_review = 'docs/palace-conditions-v2-2026-10-26.md';
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  fs.writeFileSync(reviewFile, `${JSON.stringify(review, null, 2)}\n`);
  return data;
}

const dir = 'packages/content/src/cards/';
merge(`${dir}palace-remaining.json`, `${dir}palace-remaining-review.json`, remaining, 'remaining');
merge(`${dir}palace-focused.json`, `${dir}palace-focused-review.json`, focused, 'focused');
console.log(`remaining +${remaining.length}, focused +${focused.length}`);
