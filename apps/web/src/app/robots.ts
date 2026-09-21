import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { DISALLOWED } from '@/lib/seo';

/**
 * robots.txt（工單 D2）
 *
 * 同 `sitemap.ts` 一樣，要 `[locale]` 嗰句 `dynamicParams = false` 先行得到。
 */
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/lexicon'],
        disallow: [...DISALLOWED],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
