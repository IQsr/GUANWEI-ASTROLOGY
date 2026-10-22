import data from './cards/free-ming-systems.json';

/** 獨立短註版本；不覆寫舊書或三組先行稿的來源 ID。 */
export const systemReadingCiteId = (id: string) => `free.systems.v1:${id}`;
const sources = new Map(Object.entries(data.sources).map(([id, source]) => [systemReadingCiteId(id), source]));
export const systemReadingSource = (id: string) => sources.get(id) ?? null;
