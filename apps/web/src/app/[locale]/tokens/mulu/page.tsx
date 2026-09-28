import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Juanshou } from '@/components/Juanshou';
import { BookContents } from '@/components/BookContents';
import { tierOf } from '@/lib/chengshu';
import type { ChapterMeta } from '@/lib/juan-view';

/**
 * 樣板：呢本書（重新設計第三期）
 *
 * 真嘅 `/book/[id]` 要接到 Supabase 先 render 得到，所以呢度用假資料
 * 行同一個 `<BookContents>`，同一個卷首 —— 睇到嘅就係真頁嘅樣。
 *
 *   ?read=兄弟   扮上次讀到兄弟
 *   ?cut=1       扮已經裁開
 *
 * noindex：樣板唔係產品。
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: '樣板 · 呢本書',
  robots: { index: false, follow: false },
};

const SLUGS = ['序', '命宮', '身宮與五行局', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];
const NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三'];

const CHAPTERS: ChapterMeta[] = SLUGS.map((slug, i) => ({
  id: `demo-${i}`,
  slug,
  ord: i + 1,
  tier: tierOf(slug),
  title: slug === '序' ? '序 · 你的命盤' : `${NUM[i - 1]} · ${slug}`,
}));

export default async function MuluDemo({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  const read = typeof q.read === 'string' ? q.read : null;

  return (
    <main className="juan tai">
      <Juanshou back="shelf" title="陳觀微命書" nav="book" step={3} />
      <BookContents bookId="demo" chapters={CHAPTERS} lastRead={read} cut={q.cut === '1'} />
    </main>
  );
}
