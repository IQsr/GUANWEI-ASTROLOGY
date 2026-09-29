import { describe, expect, it } from 'vitest';
import { refundVerdict } from '@/lib/pay';

describe('退款 webhook（0009）', () => {
  it('全數退款：收票', () => {
    expect(refundVerdict({ type: 'charge.refunded', refunded: true, paymentIntent: 'pi_1' })).toEqual({ act: 'revoke', paymentIntent: 'pi_1' });
  });
  it('部分退款：張票照留', () => {
    expect(refundVerdict({ type: 'charge.refunded', refunded: false, paymentIntent: 'pi_1' }).act).toBe('ignore');
  });
  it('冇 payment_intent：要嘈（500），唔係靜靜雞過', () => {
    expect(refundVerdict({ type: 'charge.refunded', refunded: true, paymentIntent: null }).act).toBe('broken');
  });
  it('其他事件唔關事', () => {
    expect(refundVerdict({ type: 'checkout.session.completed' }).act).toBe('ignore');
  });
});
