import type { Card } from './card';
import { cardReviewKey } from './ming-prose';
import data from './cards/ming-backed.json';

export { MING_WRITER_VERSION } from './ming-version';
export type BackedLine = (typeof data.profiles)[number]['lines'][number];
const profiles = new Map<string, { card_key: string; lines: BackedLine[] }>([
  ...data.profiles.map((p) => [p.card, p] as const),
  ...Object.entries(data.extras),
]);

/** 舊卡的核讀閘之外，再要求本次逐句核讀的稿與卡指紋相符。 */
export function backedLines(card: Card): readonly BackedLine[] | null {
  const p = profiles.get(card.id);
  return p?.card_key === cardReviewKey(card) ? p.lines : null;
}

export { backedCiteId, backedSource } from './ming-backed-sources';
