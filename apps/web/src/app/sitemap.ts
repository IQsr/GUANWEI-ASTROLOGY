import type { MetadataRoute } from 'next';
import { sitemapEntries } from '@/lib/seo';

/**
 * sitemap.xml（工單 D2）
 *
 * 內容同白名單理由喺 `lib/seo.ts`。呢度只係接落 Next 嘅慣例。
 *
 * ⚠ 呢條 route 要行得到，靠 `[locale]/layout.tsx` 嗰句 `dynamicParams = false`。
 * 冇嗰句，根層嘅 `[locale]`（regex `^/([^/]+?)$`）會連 `/sitemap.xml`
 * 一齊當成一個 locale 去 render，render 出嚟係 404，
 * 而**嗰個 404 會覆蓋返 route handler 嘅輸出**：
 *
 *   .next/server/app/sitemap.xml.body  ← 內容啱晒，37 條 URL
 *   .next/server/app/sitemap.xml.meta  ← {"status":404}
 *
 * 即係 build 產出係啱嘅，但 server 永遠回 404 ——
 * **sitemap 喺 production 一樣會係 404，而且冇人會發現**，
 * 因為冇人會特登去撳自己個 sitemap。
 */
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries().map((e) => ({
    url: e.loc,
    changeFrequency: e.changefreq as MetadataRoute.Sitemap[number]['changeFrequency'],
    priority: Number(e.priority),
  }));
}
