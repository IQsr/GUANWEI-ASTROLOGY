import data from './cards/free-ming-reading.json';

/** 獨立版本的短註；不覆寫舊書使用的 ming.backed / corpus ID。 */
export const freeMingCiteId = (id: string) => `free.reading.v1:${id}`;
const sources = new Map(Object.entries(data.sources).map(([id, source]) => [freeMingCiteId(id), source]));
export const freeMingSource = (id: string) => sources.get(id) ?? null;
