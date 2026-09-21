/**
 * 工單 D1 —— 藏經閣路由
 *
 * ⚠ 兩條 AC 都係**build 產出**嘅性質，唔係原始碼嘅性質，
 * 所以佢哋由 `scripts/check-lexicon-build.mjs` 喺 `next build` 之後掃
 * （已經接咗落 `pnpm build`）。呢度守嘅係路由層嘅規矩。
 */
import { describe, expect, it } from 'vitest';
import { LEXICON, lexiconCoverage } from '@guanwei/content';
import {
  KINDS,
  LEXICON_LOCALE,
  allEntryParams,
  entriesOf,
  entryOf,
  hrefOf,
  isKind,
  slugOf,
  teaser,
} from '@/lib/lexicon';

describe('路由涵蓋全部詞條', () => {
  it('35 條，一條都冇漏', () => {
    expect(allEntryParams()).toHaveLength(LEXICON.length);
    expect(LEXICON.length).toBe(lexiconCoverage().done);
    expect(LEXICON.length).toBe(35);
  });

  it('四類加埋等於全部 —— 加一個新 kind 就會喺度爆', () => {
    const sum = KINDS.reduce((n, k) => n + entriesOf(k).length, 0);
    expect(sum).toBe(LEXICON.length);
  });

  it('每條詞條嘅路徑都行得返去嗰一條', () => {
    for (const e of LEXICON) {
      expect(entryOf(e.kind, slugOf(e)), e.id).toBe(e);
      expect(hrefOf(e)).toBe(`/lexicon/${e.kind}/${slugOf(e)}`);
    }
  });

  /**
   * 中文 slug 會被瀏覽器 percent-encode。Next 通常已經解碼，
   * 但唔同嘅入口（middleware、rewrite、直接貼 URL）唔一定 ——
   * 所以兩邊都要食得。
   */
  it('encode 咗嘅中文 slug 一樣行得返', () => {
    const e = LEXICON.find((x) => x.id === 'star.紫微')!;
    expect(entryOf('star', encodeURIComponent('紫微'))).toBe(e);
    expect(entryOf('star', '紫微')).toBe(e);
  });

  it('唔存在嘅 kind／slug 回 null，唔會 throw', () => {
    expect(entryOf('star', '冇呢粒星')).toBeNull();
    expect(entryOf('planet', '紫微')).toBeNull();
    expect(isKind('planet')).toBe(false);
    expect(isKind('star')).toBe(true);
  });

  it('slug 唔會撞', () => {
    for (const k of KINDS) {
      const slugs = entriesOf(k).map(slugOf);
      expect(new Set(slugs).size, k).toBe(slugs.length);
    }
  });

  /** see_also 指去一個唔存在嘅 id，喺頁度只會靜靜雞消失 —— 所以喺度守住。 */
  it('相關條目全部指得到實物', () => {
    const ids = new Set(LEXICON.map((e) => e.id));
    for (const e of LEXICON) {
      for (const id of e.see_also) expect(ids.has(id), `${e.id} → ${id}`).toBe(true);
    }
  });
});

describe('⚠ 藏經閣只有繁中版', () => {
  /**
   * 全站 routing 係 `as-needed`，理論上會有 `/en/lexicon/...`。
   * 但詞條只有繁中 —— 出一個英文路由包住一模一樣嘅中文內容，
   * 對搜尋器係重複內容（而藏經閣係全站唯一嘅流量入口，唔可以自己踩自己），
   * 對讀者係一版打開嚟乜都睇唔明嘅嘢。
   *
   * 有英文詞條嗰日先開，唔係而家開定個空殼。
   */
  it('只出 zh-Hant 一個 locale', () => {
    expect(LEXICON_LOCALE).toBe('zh-Hant');
    const params = allEntryParams().map((p) => ({ ...p, locale: LEXICON_LOCALE }));
    expect(new Set(params.map((p) => p.locale))).toEqual(new Set(['zh-Hant']));
  });
});

describe('⚠ 呢一層冇個人資料', () => {
  /**
   * 藏經閣係全站唯一一層可索引嘅嘢（架構 §9），
   * 所以佢係唯一一個漏得出去嘅出口。
   *
   * 呢條係源頭檢查：詞條**資料本身**入面有冇一個值係由某一副盤嚟。
   * build 產出嗰邊仲有一次掃描（`check-lexicon-build.mjs`），
   * 兩處都要過 —— 一處守資料，一處守渲染。
   */
  it('詞條資料入面冇日期、冇盤 id、冇規則 id', () => {
    const leaks: [string, RegExp][] = [
      ['西曆日期', /(19|20)[0-9]{2}\s*[-/年]/],
      ['盤 id', /chart:\/\//],
      ['流派指紋', /zhongzhou-v1@/],
      ['規則 id', /\b(base|sihua|sanfang|geju|mod|sha)\.[^\s，。]+/],
    ];
    for (const e of LEXICON) {
      const text = `${e.label}${e.summary}${e.full}`;
      for (const [name, re] of leaks) {
        const m = text.match(re);
        expect(m, `${e.id} 漏咗${name}「${m?.[0]}」`).toBeNull();
      }
    }
  });
});

describe('⚠ 目錄嘅一行摘要唔可以夾硬截', () => {
  /**
   * 第一版係 `summary.slice(0, 28)`，出嚟係
   * 「紫微屬土，《全書》稱其為「中天之尊星」、帝座，主官祿。在…」——
   * 停喺一個「在」字度。讀者見到嘅唔係摘要，係一句斷咗嘅說話。
   *
   * 影完相先睇到。一個 `.slice()` 喺 code 度睇落完全正常。
   */
  it('永遠停喺標點，唔會停喺半個詞', () => {
    for (const e of LEXICON) {
      const t = teaser(e.summary);
      if (t === '') continue;
      const last = t.replace(/…$/, '').slice(-1);
      expect('。，；、」：'.includes(last), `${e.id}：「…${t.slice(-6)}」`).toBe(true);
    }
  });

  it('整句噉攞，攞到夠為止 —— 攞得到就唔使省略號', () => {
    expect(teaser('一二三四五。六七八九十。' + '後'.repeat(40))).toBe('一二三四五。六七八九十。');
    expect(teaser('短句。')).toBe('短句。');
  });

  /** 第一句自己都爆咗上限，先至退去標點截。 */
  it('第一句太長先至用省略號', () => {
    const long = '這一句好長好長，長到超過上限，所以要截。';
    expect(teaser(long, 12)).toBe('這一句好長好長，…');
  });

  it('三十五條全部有得出一行摘要，而且冇一條停喺半個詞', () => {
    for (const e of LEXICON) {
      const t = teaser(e.summary);
      expect(t.length, e.id).toBeGreaterThan(6);
    }
  });
});
