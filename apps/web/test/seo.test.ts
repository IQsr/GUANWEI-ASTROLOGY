/**
 * 工單 D2 —— sitemap、robots、相關條目互連
 *
 * ⚠ 呢度守嘅係**內容**。「serve 唔 serve 得到」係另一件事，
 * 由 `scripts/check-routes.mjs` 真係開個 server 撳一撳 ——
 * D2 就係撞到「build 產出啱晒但 server 回 404」先加咗嗰一層。
 */
import { describe, expect, it } from 'vitest';
import { LEXICON } from '@guanwei/content';
import { DISALLOWED, robotsTxt, sitemapEntries, sitemapXml } from '@/lib/seo';
import { hrefOf, relatedOf, slugOf } from '@/lib/lexicon';
import { SITE_URL } from '@/lib/site';

describe('sitemap 涵蓋全部詞條頁', () => {
  it('首頁 ＋ 目錄 ＋ 35 條', () => {
    const e = sitemapEntries();
    expect(e).toHaveLength(37);
    expect(e[0]!.loc).toBe(`${SITE_URL}/`);
    expect(e[1]!.loc).toBe(`${SITE_URL}/lexicon`);
  });

  it('每一條詞條都喺入面，一條都唔漏', () => {
    const locs = new Set(sitemapEntries().map((x) => x.loc));
    for (const entry of LEXICON) {
      const url = `${SITE_URL}/lexicon/${entry.kind}/${encodeURIComponent(slugOf(entry))}`;
      expect(locs.has(url), entry.id).toBe(true);
    }
  });

  /**
   * 中文 slug 要 encode ——「紫微」擺喺 XML 入面要係 %E7%B4%AB%E5%BE%AE。
   * 唔 encode 嘅話 XML 本身仲係 valid，但唔同爬蟲處理法唔同，
   * 而 sitemap 規格寫明要 URL-escape。
   */
  it('中文 slug encode 咗', () => {
    const xml = sitemapXml();
    expect(xml).toContain('%E7%B4%AB%E5%BE%AE');
    expect(xml).not.toContain('<loc>' + SITE_URL + '/lexicon/star/紫微');
  });

  /**
   * ⚠ sitemap 係一張**白名單**，唔係一張清單。
   *
   * 自動掃目錄生成有一個好陰險嘅特性：加一條新 route 就自動入表 ——
   * 而新 route 大部分時候係私密層。
   * 一張要人手加嘅表，漏咗只係少一條流量；一張自動嘅表，漏咗係漏個人資料。
   */
  it('私密層一條都唔喺 sitemap 入面', () => {
    const xml = sitemapXml();
    for (const p of DISALLOWED) expect(xml.includes(p), p).toBe(false);
  });

  it('XML 收得成、冇未跳脫嘅字元', () => {
    const xml = sitemapXml();
    expect(xml.startsWith('<?xml')).toBe(true);
    expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
    /* loc 入面唔應該有生 & —— 有就代表未 encode。 */
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      expect(m[1]!.includes('&'), m[1]).toBe(false);
    }
  });
});

describe('robots：兩道閘唔係重複', () => {
  /**
   * `<meta robots>` 話畀爬蟲聽「呢版唔好收錄」—— 但佢要行咗入去先睇到。
   * `robots.txt` 話畀佢聽「呢個路徑唔好行」—— 佢連請求都唔會發。
   * 對一個存住生辰嘅私密層嚟講，第二樣先係我哋想要嗰樣。
   */
  it('私密層同流程層全部擋晒', () => {
    const txt = robotsTxt();
    for (const p of DISALLOWED) expect(txt, p).toContain(`Disallow: ${p}`);
  });

  it('指得返去 sitemap', () => {
    expect(robotsTxt()).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });

  it('架構 §2 嘅私密層一個都冇漏', () => {
    /* 呢個 list 對返架構 §2 全站地圖。加新私密 route 要記得喺度加。 */
    for (const p of ['/cast', '/shelf', '/book', '/claim', '/account', '/pay']) {
      expect(DISALLOWED as readonly string[], p).toContain(p);
    }
  });
});

describe('⚠ 相關條目互連：唔改資料，改 render', () => {
  /**
   * `see_also` 係人手寫嘅，所以單向：紫微寫住「見天府」，天府未必寫返。
   * 三十五條入面有 44 條單向邊，而且兩條（子女宮、木三局）一條入邊都冇。
   *
   * 對讀者嚟講冇所謂方向。但對爬蟲嚟講方向好重要 ——
   * 一條冇入邊嘅頁，由搜尋結果入嚟之後就係一條死路。
   *
   * 所以唔改資料去夾對稱（`see_also` 係作者嘅意思），
   * 改為喺 render 嗰陣做聯集。
   */
  it('每一條都連得返去，一條孤島都冇', () => {
    for (const e of LEXICON) {
      expect(relatedOf(e).length, e.id).toBeGreaterThan(0);
    }
  });

  it('聯集係雙向嘅：A 連 B，B 就連得返 A', () => {
    for (const e of LEXICON) {
      for (const r of relatedOf(e)) {
        expect(relatedOf(r).some((x) => x.id === e.id), `${e.id} ↔ ${r.id}`).toBe(true);
      }
    }
  });

  it('作者寫嘅出邊行先，而且唔會連返自己', () => {
    for (const e of LEXICON) {
      const rel = relatedOf(e);
      expect(rel.some((r) => r.id === e.id), e.id).toBe(false);
      expect(new Set(rel.map((r) => r.id)).size, e.id).toBe(rel.length);
      for (const [i, id] of e.see_also.entries()) expect(rel[i]!.id).toBe(id);
    }
  });

  it('每條相關連結都行得到一版真嘅頁', () => {
    const paths = new Set(LEXICON.map(hrefOf));
    for (const e of LEXICON) {
      for (const r of relatedOf(e)) expect(paths.has(hrefOf(r)), hrefOf(r)).toBe(true);
    }
  });
});
