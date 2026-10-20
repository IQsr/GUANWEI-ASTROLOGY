import data from './cards/ming-backed.json';

/** 來源解析只依賴資料；不把卡核讀或排盤引擎帶入讀者端。 */
export const backedCiteId = (card: string, index: number) => `ming.backed:${card}:${index}`;
const profiles = [...data.profiles, ...Object.entries(data.extras).map(([card, p]) => ({ card, ...p }))];
const sources = new Map(profiles.flatMap((p) => p.lines.map((l, i) => [backedCiteId(p.card, i), l.source] as const)));

/** 一個據對應當句核讀的原段及短節錄；不改動舊存書所用的來源 ID。 */
export function backedSource(id: string) { return sources.get(id) ?? null; }
