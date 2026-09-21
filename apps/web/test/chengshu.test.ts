import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  FREE_SLUGS,
  bookDraft,
  bookTitle,
  chapterDrafts,
  chapterNumeral,
  keepBook,
  parseBookFields,
  tierOf,
  type BookDraft,
  type ChengshuPort,
} from '@/lib/chengshu';

/**
 * 成書（工單 G5）
 *
 * ⚠ 真正嘅寫入唔喺呢度測 —— 佢係一句 SQL（`create_book`），
 * 而 `packages/db/test/chengshu.test.ts` 喺 PGlite 連 RLS 一齊跑過 18 條。
 *
 * 呢度測嘅係決定：邊幾章免費、章名點寫、寫唔到嗰陣做乜。
 */

const TOKEN = '11111111-1111-4111-8111-111111111111';

const SUBJECT = {
  birth_date: '1996-06-16',
  birth_time: '08:30',
  birth_tz: 'Asia/Hong_Kong',
  birth_place: '香港',
  lng: 114.17,
  lat: 22.32,
  sex: 'male' as const,
  true_solar_corrected: true,
};

const CHART = { engine_version: '0.3.0', school_profile_id: 'zhongzhou-v1@abc', payload: {} };

/**
 * 十二宮，目錄次序（命宮行先）。
 *
 * ⚠ 特登唔由 `mingshu.ts` import —— 嗰個檔係 `server-only`，
 * 而且一 import 就會拉埋成個規則庫入嚟。呢度要嘅係一串名。
 */
const PALACES = [
  '命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄',
  '遷移', '僕役', '官祿', '田宅', '福德', '父母',
] as const;

const TWELVE = PALACES.map((p) => ({ slug: p, text: `${p}嘅正文。` }));

/** 一本真書：序行先，然後十二宮。 */
const BOOK = [{ slug: '序', title: '序 · 你的命盤', text: '版權頁。' }, ...TWELVE];

describe('邊幾章免費', () => {
  /**
   * ⚠ 名單喺架構 §6，唔喺呢度發明。
   * 五章入面得「命宮」而家生成得到 —— 另外四章唔係逐宮章，仲未寫。
   */
  it('命宮免費，其餘十一宮未裁', () => {
    expect(tierOf('命宮')).toBe('free');
    for (const p of PALACES.filter((x) => x !== '命宮')) {
      expect(tierOf(p), p).toBe('deep');
    }
  });

  it('序都係免費 —— 版權頁收錢就唔叫標出處', () => {
    expect(tierOf('序')).toBe('free');
  });

  it('免費名單係一個表，唔係散落喺各處嘅 if', () => {
    expect([...FREE_SLUGS]).toEqual(['序', '命宮', '身宮與五行局']);
  });

  it('一本書一定至少有一章免費 —— 否則免費書等於冇', () => {
    const drafts = chapterDrafts(BOOK, 'r1@x');
    expect(drafts.filter((c) => c.tier === 'free').map((c) => c.slug)).toEqual(['序', '命宮']);
  });
});

describe('章序同章名', () => {
  it('中文數字一到十二', () => {
    expect([1, 2, 9, 10, 11, 12].map(chapterNumeral)).toEqual(['一', '二', '九', '十', '十一', '十二']);
  });

  it('ord 由一開始，順住目錄行', () => {
    const drafts = chapterDrafts(BOOK, 'r1@x');
    expect(drafts.map((c) => c.ord)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  /** ⚠ 序唔跟號 —— 「序 · 一」讀落唔係一本書。數字由佢後面第一章起。 */
  it('序唔入數，命宮係第一章', () => {
    const drafts = chapterDrafts(BOOK, 'r1@x');
    expect(drafts[0]!.title).toBe('序 · 你的命盤');
    expect(drafts[1]!.title).toBe('一 · 命宮');
    expect(drafts[12]!.title).toBe('十二 · 父母');
  });

  /** slug 係路由嘅一部分（F1 個 `/book/[id]/[chapter]`）—— 唔可以係章名。 */
  it('slug 係宮名本身，唔係章名', () => {
    const drafts = chapterDrafts(TWELVE, 'r1@x');
    expect(drafts[0]!.slug).toBe('命宮');
    expect(drafts[0]!.slug).not.toBe(drafts[0]!.title);
  });

  it('本書個名同封面上面嗰兩行一樣', () => {
    expect(bookTitle('思協')).toBe('思協命書');
  });
});

describe('⚠ 有盤先有名', () => {
  it('有盤：有名、有印、十二章', () => {
    const draft = bookDraft({
      token: TOKEN,
      name: ' 思協 ',
      subject: SUBJECT,
      chart: CHART,
      chapters: BOOK,
      contentVersion: 'r1@x',
    });
    expect(draft.title).toBe('思協命書');
    expect(draft.seal).not.toBeNull();
    expect(draft.chapters).toHaveLength(13);
    expect(draft.subject.name).toBe('思協');
  });

  /**
   * 待時辰（架構 §8）：一本排唔到盤嘅書唔應該有封面。
   * 「唔好扮有」唔止係文案 —— 係連印都冇。
   */
  it('冇盤：冇名、冇印、零章，但生辰留低咗', () => {
    const draft = bookDraft({
      token: TOKEN,
      name: '思協',
      subject: { ...SUBJECT, birth_time: null },
      chart: null,
      chapters: BOOK,
      contentVersion: 'r1@x',
    });
    expect(draft.title).toBeNull();
    expect(draft.seal).toBeNull();
    expect(draft.chapters).toEqual([]);
    expect(draft.subject.birth_date).toBe('1996-06-16');
    expect(draft.subject.birth_time).toBeNull();
  });
});

describe('⚠ server action 係一個公開 endpoint', () => {
  it('名要有，而且唔可以長過 DB 嗰條 CHECK', () => {
    expect(parseBookFields({ name: '思協', token: TOKEN })).toEqual({ name: '思協', token: TOKEN });
    expect(parseBookFields({ name: '   ', token: TOKEN })).toBeNull();
    expect(parseBookFields({ name: '字'.repeat(41), token: TOKEN })).toBeNull();
    expect(parseBookFields({ name: '字'.repeat(40), token: TOKEN })).not.toBeNull();
  });

  it('token 要似個 uuid', () => {
    expect(parseBookFields({ name: '思協', token: 'abc' })).toBeNull();
    expect(parseBookFields({ name: '思協' })).toBeNull();
    expect(parseBookFields(null)).toBeNull();
  });

  it('名前後嘅空白剷走 —— 書脊上面唔可以有空白', () => {
    expect(parseBookFields({ name: '  思協  ', token: TOKEN })!.name).toBe('思協');
  });
});

describe('⚠ 寫唔到唔可以擋住題名', () => {
  const draft = { token: TOKEN } as BookDraft;

  it('寫得到就回個 id', async () => {
    const port: ChengshuPort = { create: async () => 'book-1' };
    expect(await keepBook(port, draft)).toBe('book-1');
  });

  /**
   * 呢一刻個人啱啱寫完五步，個盤已經排好。因為 DB 接唔上就出錯誤頁，
   * 佢損失嘅係嗰一下 —— 而嗰一下係成個產品最貴嗰一下。
   */
  it('寫唔到就回 null，唔會掟出去', async () => {
    const port: ChengshuPort = {
      create: () => Promise.reject(new Error('冇 instance')),
    };
    await expect(keepBook(port, draft)).resolves.toBeNull();
  });

  it('掟出去嗰個錯唔會變成一版死機', async () => {
    const boom = vi.fn(() => {
      throw new Error('env 冇嘢');
    });
    await expect(keepBook({ create: boom as never }, draft)).resolves.toBeNull();
    expect(boom).toHaveBeenCalledOnce();
  });
});

describe('⚠ 落款嗰張目次唔准承諾生成唔到嘅章', () => {
  /**
   * 第一版照抄架構 §6 個免費五章名單，但入面三章生成唔到 ——
   * 即係話落款嗰陣本書答應咗五章，成書之後得兩章有字。
   *
   * 呢條測試掃返 `Luokuan.tsx` 嗰張表：入面每一個章名，
   * 都要係我哋而家真係出得到嗰啲。
   */
  const SRC = readFileSync(new URL('../src/components/Luokuan.tsx', import.meta.url), 'utf8');
  const MULU = SRC.match(/const MULU = \[([^\]]*)\]/s)?.[1] ?? '';

  it('搵到張表', () => {
    expect(MULU).not.toBe('');
  });

  it('列出嘅章名，全部生成得到', () => {
    const named = [...MULU.matchAll(/'([^']+)'/g)]
      .map((m) => m[1]!)
      .map((line) => line.split('·').at(-1)!.trim())
      .filter((name) => /^[一-鿿]+$/.test(name));

    /* 由真名單砌，唔好手抄 —— 手抄就會再走音一次。 */
    const buildable = new Set(['你的命盤', ...FREE_SLUGS, ...PALACES]);
    expect(named.filter((n) => !buildable.has(n))).toEqual([]);
  });
});
