import { describe, expect, it } from 'vitest';
import { claim, normaliseEmail, type IdentityPort, type Reader } from '@/lib/identity';

/**
 * 認領邏輯（工單 G2）
 *
 * 真嘅 adapter（`identity.server.ts`）冇跑過 —— 呢個環境接唔到
 * 一個真 Supabase instance。所以判斷同文案全部搬咗出嚟，
 * 用一個假 port 測；adapter 嗰邊淨低十幾行冇判斷嘅嘢。
 */

function fakePort(reader: Reader | null, link: Awaited<ReturnType<IdentityPort['linkEmail']>> = { ok: true }) {
  const calls: string[] = [];
  const port: IdentityPort = {
    currentReader: async () => reader,
    linkEmail: async (email) => {
      calls.push(email);
      return link;
    },
  };
  return { port, calls };
}

const anon: Reader = { id: 'r1', isAnonymous: true, email: null };

describe('email 先執乾淨', () => {
  it('去空格、轉細楷', () => {
    expect(normaliseEmail('  Issac@Example.COM ')).toBe('issac@example.com');
  });

  it('唔係字串就當空', () => {
    expect(normaliseEmail(undefined)).toBe('');
    expect(normaliseEmail(42)).toBe('');
  });

  it('認領嗰陣用執乾淨嗰個', async () => {
    const { port, calls } = fakePort(anon);
    const r = await claim(port, ' Issac@Example.com ');
    expect(r).toEqual({ ok: true, email: 'issac@example.com' });
    expect(calls).toEqual(['issac@example.com']);
  });
});

describe('⚠ 打錯字唔會寄信', () => {
  it.each(['', '  ', 'issac', 'issac@', '@example.com', 'issac@example', 'a b@example.com'])(
    '「%s」→ 擋，而且冇叫過 linkEmail',
    async (bad) => {
      const { port, calls } = fakePort(anon);
      const r = await claim(port, bad);
      expect(r.ok).toBe(false);
      expect(calls).toEqual([]);
    },
  );

  /**
   * 反面：唔好寫到太緊。
   * 一個合法但奇怪嘅地址被我哋拒絕，個人就冇第二個方法認領。
   */
  it.each(['a+b@example.co.uk', "o'hara@mail.example.org", 'x@a.b.c.example.com'])(
    '「%s」→ 收',
    async (good) => {
      const { port } = fakePort(anon);
      expect((await claim(port, good)).ok).toBe(true);
    },
  );
});

describe('⚠ 冇 session 唔可以扮成功', () => {
  /**
   * 扮咗成功，個人會以為本書救返 —— 而佢實際上認領緊一個唔存在嘅人。
   * 佢要等到下次清 cookie 之後先發現，嗰陣已經冇得補救。
   */
  it('冇 reader → 講明呢部機冇書，而且唔寄信', async () => {
    const { port, calls } = fakePort(null);
    const r = await claim(port, 'issac@example.com');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('這個瀏覽器沒有書');
    expect(calls).toEqual([]);
  });
});

describe('⚠ 認咗領就唔好再寄信', () => {
  it('已認領 → 講返個 email，而且唔叫 linkEmail', async () => {
    const { port, calls } = fakePort({ id: 'r1', isAnonymous: false, email: 'old@example.com' });
    const r = await claim(port, 'new@example.com');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('old@example.com');
    expect(calls).toEqual([]);
  });
});

describe('寄唔到嗰陣講人話', () => {
  it.each([
    ['taken', '另一個帳號'],
    ['rate_limited', '等幾分鐘'],
    ['invalid', '不完整'],
    ['unknown', '稍後再試'],
  ] as const)('%s → 有一句講得明點算嘅說話', async (code, expected) => {
    const { port } = fakePort(anon, { ok: false, code });
    const r = await claim(port, 'issac@example.com');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain(expected);
  });

  /** 四個錯誤碼唔可以出同一句 —— 出同一句即係等於冇分。 */
  it('四句唔同', async () => {
    const codes = ['taken', 'rate_limited', 'invalid', 'unknown'] as const;
    const messages = new Set<string>();
    for (const code of codes) {
      const { port } = fakePort(anon, { ok: false, code });
      const r = await claim(port, 'issac@example.com');
      if (!r.ok) messages.add(r.message);
    }
    expect(messages.size).toBe(codes.length);
  });
});
