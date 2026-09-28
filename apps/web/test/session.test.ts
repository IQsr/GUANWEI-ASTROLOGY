import { describe, expect, it } from 'vitest';
import { sessionPlan } from '@/lib/chengshu';

/**
 * 有 session 但冇 readers 行 → 之前本書靜靜雞寫唔入（create_book 撞 foreign key）。
 * 而家換一個新匿名 session；唔補 readers 行（刪咗一半嘅帳戶唔可以復活）。
 */
describe('sessionPlan', () => {
  it('冇 session → 開匿名', () => expect(sessionPlan(false, false)).toBe('sign-in'));
  it('有 session 有讀者 → 照用', () => expect(sessionPlan(true, true)).toBe('use'));
  it('有 session 冇讀者 → 換一個', () => expect(sessionPlan(true, false)).toBe('replace'));
});
