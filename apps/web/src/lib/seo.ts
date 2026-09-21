import { LEXICON } from '@guanwei/content';
import { SITE_URL } from './site';
import { canonicalOf } from './lexicon';

/**
 * sitemap 同 robots 嘅內容（工單 D2）
 *
 * 內容抽咗出嚟放喺呢度，`app/sitemap.ts` 同 `app/robots.ts` 只係接落
 * Next 嘅慣例 —— 咁樣呢兩樣嘢先測得到。
 * 一個 `MetadataRoute.Sitemap` 嘅回傳值，冇 server 係驗唔到嘅。
 *
 * ⚠ 兩條 route 都靠 `[locale]/layout.tsx` 嗰句 `dynamicParams = false`
 * 先行得到。詳情喺嗰兩個檔。
 */


/**
 * ⚠ 呢張係**白名單**，唔係清單。
 *
 * 架構 §9：得 `/`、`/lexicon/**`、`/about`、`/terms`、`/privacy` 可索引；
 * `/cast`、`/shelf`、`/book/**`、`/claim`、`/account`、`/pay/**` 一律 noindex。
 *
 * 所以呢度逐條列，唔掃目錄自動生成。自動生成有一個好陰險嘅特性：
 * 加一條新 route 就自動入表 —— 而新 route 大部分時候係私密層。
 * **一張要人手加嘅表，漏咗只係少一條流量；一張自動嘅表，漏咗係漏個人資料。**
 */
export type SitemapEntry = { loc: string; changefreq: string; priority: string };

export function sitemapEntries(): SitemapEntry[] {
  return [
    { loc: `${SITE_URL}/`, changefreq: 'monthly', priority: '1.0' },
    { loc: `${SITE_URL}/lexicon`, changefreq: 'weekly', priority: '0.8' },
    ...LEXICON.map((e) => ({
      /* 中文 slug 要 encode ——「紫微」喺 XML 入面要係 %E7%B4%AB%E5%BE%AE。
         同 canonical 共用一個 function，兩處唔會走音。 */
      loc: `${SITE_URL}${canonicalOf(e)}`,
      changefreq: 'monthly',
      priority: '0.6',
    })),
  ];
}

export function sitemapXml(): string {
  const body = sitemapEntries()
    .map(
      (e) =>
        `  <url>\n    <loc>${e.loc}</loc>\n` +
        `    <changefreq>${e.changefreq}</changefreq>\n` +
        `    <priority>${e.priority}</priority>\n  </url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/**
 * 私密層同流程層（架構 §2）。
 *
 * ⚠ `robots.txt` 同 `<meta robots>` 兩樣都要，唔係重複：
 *
 *   `<meta robots>` 話畀爬蟲聽「呢版唔好收錄」—— 但佢要**行咗入去**先睇到。
 *   `robots.txt` 話畀佢聽「呢個路徑唔好行」—— 佢連請求都唔會發。
 *
 * 對一個存住生辰嘅私密層嚟講，第二樣先係我哋想要嗰樣。
 */
export const DISALLOWED = [
  '/cast',
  '/shelf',
  '/book',
  '/claim',
  '/account',
  '/pay',
  '/api',
] as const;

export function robotsTxt(): string {
  return [
    'User-agent: *',
    'Allow: /$',
    'Allow: /lexicon',
    ...DISALLOWED.map((p) => `Disallow: ${p}`),
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n');
}
