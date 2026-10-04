import { describe, expect, it } from 'vitest';
import {
  chapterHref,
  chapterParam,
  claimHref,
  contentsHref,
  SAMPLE_BOOK,
  cutHref,
  neighbours,
  parseReading,
  payHref,
  resumeFrom,
  safeNext,
  safeSlug,
} from '@/lib/journey';

/**
 * 路線（重新設計第二期）：頁與頁之間帶住「嗰一章」。
 */

describe('safeNext：只准站內路徑', () => {
  it.each(['/shelf', '/pay/b1?ch=%E5%91%BD%E5%AE%AE', '/book/b1/命宮'])('%s → 照用', (p) => {
    expect(safeNext(p)).toBe(p);
  });

  /** 開放轉址：一條由我哋 domain 開頭、但跳去第二度嘅連結。 */
  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/\t/evil.example',
    'javascript:alert(1)',
    'shelf',
    '',
  ])('%j → 唔要', (p) => {
    expect(safeNext(p)).toBeNull();
  });

  it('唔係字串 → 唔要', () => {
    expect(safeNext(['/shelf'])).toBeNull();
    expect(safeNext(undefined)).toBeNull();
  });
});

describe('safeSlug：似章名先收', () => {
  it('中文章名照收', () => {
    expect(safeSlug('命宮')).toBe('命宮');
  });

  it.each(['../x', 'a/b', 'a?b', 'a#b', '%2F', 'x'.repeat(41), '', '  '])('%j → 唔要', (s) => {
    expect(safeSlug(s)).toBeNull();
  });
});

describe('一章嘅網址', () => {
  /** 路徑唔 encode（<Link> 會做），query 先 encode。 */
  it('路徑入面嘅中文唔 encode', () => {
    expect(chapterHref('b1', '命宮')).toBe('/book/b1/命宮');
  });

  it('示範命書去 /sample，唔入 /book（2026-10-04）', () => {
    expect(chapterHref(SAMPLE_BOOK, '命宮')).toBe('/sample/命宮');
    expect(contentsHref(SAMPLE_BOOK)).toBe('/sample');
    expect(contentsHref('b1')).toBe('/book/b1');
  });

  it('query 入面嘅中文 encode', () => {
    expect(payHref('b1', '命宮')).toBe('/pay/b1?ch=%E5%91%BD%E5%AE%AE');
    expect(payHref('b1')).toBe('/pay/b1');
  });

  /** 交接文件嘅疑點：無論 Next 畀嘅係 encode 咗定未，都要對得返 slug。 */
  it('路由參數 encode 咗定未都解得返', () => {
    expect(chapterParam('%E5%91%BD%E5%AE%AE')).toBe('命宮');
    expect(chapterParam('命宮')).toBe('命宮');
    expect(chapterParam('%E5')).toBe('%E5');
  });
});

describe('裁開去邊：帶住嗰一章', () => {
  it('認領咗 → 直接去付款，記住章名', () => {
    expect(cutHref('b1', '命宮', false)).toBe('/pay/b1?ch=%E5%91%BD%E5%AE%AE');
  });

  /** 架構 §4 硬閘照舊：匿名先認領。認領完去付款，返回就返嗰一章。 */
  it('匿名 → 認領，next = 付款頁，from = 嗰一章', () => {
    const href = cutHref('b1', '命宮', true);
    const q = new URL(href, 'http://x').searchParams;
    expect(href.startsWith('/claim?')).toBe(true);
    expect(q.get('next')).toBe('/pay/b1?ch=%E5%91%BD%E5%AE%AE');
    expect(q.get('from')).toBe('/book/b1/命宮');
    expect(safeNext(q.get('next'))).not.toBeNull();
  });

  it('冇參數嘅認領頁就係 /claim', () => {
    expect(claimHref()).toBe('/claim');
  });
});

describe('上一章／下一章', () => {
  const chapters = [
    { slug: '兄弟', title: '二 · 兄弟', tier: 'deep', ord: 2 },
    { slug: '序', title: '序', tier: 'free', ord: 0 },
    { slug: '命宮', title: '一 · 命宮', tier: 'free', ord: 1 },
  ];

  it('按 ord 排，唔係按輸入次序', () => {
    const { prev, next } = neighbours(chapters, '命宮');
    expect(prev?.slug).toBe('序');
    expect(next?.slug).toBe('兄弟');
  });

  it('頭同尾冇嗰邊', () => {
    expect(neighbours(chapters, '序').prev).toBeNull();
    expect(neighbours(chapters, '兄弟').next).toBeNull();
  });

  /** 下一章係未裁章照出 —— 目次入面佢本來就喺度（架構 §6）。 */
  it('下一章係未裁章都照出', () => {
    expect(neighbours(chapters, '命宮').next?.tier).toBe('deep');
  });

  it('搵唔到呢章 → 兩邊都冇', () => {
    expect(neighbours(chapters, '冇呢章')).toEqual({ prev: null, next: null });
  });
});

describe('藏經閣「回到正文」：sessionStorage 讀返嚟要驗', () => {
  it('啱嘅照用', () => {
    expect(parseReading(JSON.stringify({ href: '/book/b1/命宮', title: '一 · 命宮' }))).toEqual({
      href: '/book/b1/命宮',
      title: '一 · 命宮',
    });
  });

  it.each([
    null,
    'not json',
    JSON.stringify({ href: 'https://evil.example', title: 'x' }),
    JSON.stringify({ href: '/shelf', title: 'x' }),
    JSON.stringify({ href: '/book/b1/x', title: '' }),
    JSON.stringify(['/book/b1/x']),
  ])('%j → 冇', (raw) => {
    expect(parseReading(raw)).toBeNull();
  });
});

describe('首頁「續讀」', () => {
  const spine = (over: Partial<{ href: string; label: string; kind: string; reading: boolean }>) => ({
    href: '/book/x',
    label: 'x',
    kind: 'titled',
    reading: false,
    ...over,
  });

  it('在讀嗰本行先', () => {
    expect(
      resumeFrom([spine({ label: '甲' }), spine({ label: '乙', reading: true }), spine({ kind: 'new', href: '/cast' })]),
    ).toEqual({ href: '/book/x', label: '乙' });
  });

  it('未讀過就攞第一本已成書嘅；待時辰嘅唔算', () => {
    expect(resumeFrom([spine({ label: '等', kind: 'awaiting' }), spine({ label: '成' })])?.label).toBe('成');
  });

  it('得「＋ 新書」→ 冇', () => {
    expect(resumeFrom([spine({ kind: 'new', href: '/cast' })])).toBeNull();
  });
});
