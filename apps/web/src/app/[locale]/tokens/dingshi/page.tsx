import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { DingshiTrial } from './DingshiTrial';

/**
 * 定時辰驗證頁（2026-10-05 · 內部，noindex）
 *
 * 搵**知道自己準確時辰**嘅人試：入生日、大概時段，答十二條「某年某方面有冇事」，
 * 最後先填真時辰，即刻見系統揀啱定揀錯。每次結果經 `rectify_record()` 記低（0003，唔收個人資料）。
 * 用嚟決定定時辰值唔值得收錢：模擬淨係證到「問題分得開候選」，證唔到盤真係準。
 */
export const metadata: Metadata = { title: '定時辰驗證', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function DingshiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="juan tai">
      <div className="banxin">
        <h1 className="font-serif text-h2 tracking-[0.14em]">定時辰驗證</h1>
        <p className="mt-4 text-sm leading-[1.9] text-ink-2">
          請知道自己準確出生時間的人幫忙試。先不要填時間：答完十二條關於過去的問題，系統會猜你的時辰，最後才填真正的時間，看猜得對不對。
          不會記下你的生日、出生地或名字。
        </p>
      </div>
      <DingshiTrial />
    </main>
  );
}
