import type { Run } from './zhu';

/** 顯示時合併段內出處；逐句 run 及存書資料不變，引用依原出現次序去重。 */
export function paragraphCitations(runs: readonly Run[]) {
  return {
    runs: runs.filter((r) => !r.cite),
    citations: [...new Set(runs.flatMap((r) => r.cite ?? []))],
  };
}

/** 跨頁兩個舊定位可解析成同一段完整節錄；顯示一次，逐句ID仍原樣保存。 */
export function uniqueReferences<T extends { book: string; page: number; pageEnd?: number; section: string; text: string; sourceNote?: string }>(references: readonly T[]): T[] {
  const seen = new Set<string>();
  return references.filter((r) => {
    const key = JSON.stringify([r.book, r.page, r.pageEnd, r.section, r.text, r.sourceNote]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
