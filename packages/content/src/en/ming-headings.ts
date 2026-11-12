import headings from './ming-headings.json';
import { mingHeading } from '../ming-translations';

/**
 * 新版命宮、性格的骨架（reader-backed-v1）嘅段落小標題英文（2026-11-12 英文第一批）。
 * 舊版逐句稿嘅小標題照用 `ming-translations` 嗰份。
 */
const H = headings as Record<string, string>;
export function headingEn(zh: string): string | null {
  return H[zh] ?? mingHeading(zh, 'en');
}
