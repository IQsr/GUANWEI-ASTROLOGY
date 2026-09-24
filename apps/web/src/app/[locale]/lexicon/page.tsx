import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { lexiconCoverage, singleBookEntries } from '@guanwei/content';
import { Link } from '@/i18n/navigation';
import { Juanshou } from '@/components/Juanshou';
import { MARK, OG_LEXICON } from '@/lib/site';
import { KINDS, LEXICON_LOCALE, entriesOf, hrefOf, teaser, type LexiconKind } from '@/lib/lexicon';
import { LexiconCta } from '@/components/LexiconCta';

export function generateStaticParams() {
  return [{ locale: LEXICON_LOCALE }];
}

const KIND_LABEL: Record<LexiconKind, string> = {
  star: '主星',
  palace: '宮位',
  sihua: '四化',
  ju: '五行局',
};

const DESCRIPTION =
  '紫微斗數詞條：十四主星、十二宮、四化、五行局。每條列明出處，引文逐字可核。';

export const metadata: Metadata = {
  title: '藏經閣',
  description: DESCRIPTION,
  alternates: { canonical: '/lexicon' },
  openGraph: {
    title: `藏經閣 · ${MARK}`,
    description: DESCRIPTION,
    type: 'website',
    url: '/lexicon',
    images: [{ url: OG_LEXICON, width: 1200, height: 630, alt: '觀微 藏經閣' }],
  },
  /**
   * 全站得兩版可索引：入齋（/）同呢度（架構 §9）。
   *
   * ⚠ 呢一層冇任何個人資料 —— 冇命盤、冇生辰、冇帳號。
   * 佢係唯一一層**應該**被索引嘅內容，亦都係唯一一層索引得起。
   */
  robots: { index: true, follow: true },
};

export default async function LexiconIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== LEXICON_LOCALE) notFound();
  setRequestLocale(locale);

  const cov = lexiconCoverage();
  const single = singleBookEntries().length;

  return (
    <main className="juan tai">
      <Juanshou title="藏經閣" theme />

      <div className="banxin">
        <p className="text-lead text-ink-2">
          紫微斗數的詞條。每一條都列明出處，引文逐字抄自原書，可以自己核。
        </p>

        {/*
          ⚠ 覆蓋率同單一來源嘅數字擺喺**公開頁**，唔係收喺 repo 入面。

          `lexiconCoverage()` 個註釋寫住「呢個數應該公開，唔應該收埋」。
          一個講出處嘅網站，最唔誠實嘅做法就係列出處而唔講啲出處有幾薄。
        */}
        <dl className="mt-10 border-t border-rule pt-4 font-sans text-sm text-ink-2" data-nums>
          <div className="flex justify-between border-b border-rule-2 py-2">
            <dt>詞條</dt>
            <dd>
              {cov.done} / {cov.target}
            </dd>
          </div>
          <div className="flex justify-between py-2">
            <dt>其中只靠一本書</dt>
            <dd className="em-zhu">{single}</dd>
          </div>
        </dl>

        <p className="mt-4 font-sans text-sm leading-[1.9] text-ink-3">
          「兩個來源」目前全部出自《紫微斗數全書》的不同篇章 ——
          是兩個文本位置，一個證人。第二本書到手之前，這個數字不會變。
        </p>

        {KINDS.map((kind) => {
          const rows = entriesOf(kind);
          if (rows.length === 0) return null;
          return (
            <section key={kind} className="mt-16">
              <h2 className="font-sans text-cap tracking-[0.24em] text-ink-3">
                {KIND_LABEL[kind]}
                <span className="ml-3" data-nums>
                  {rows.length}
                </span>
              </h2>
              <ul className="mt-4 border-t border-rule">
                {rows.map((e) => (
                  <li key={e.id} className="border-b border-rule-2">
                    {/*
                      ⚠ 摘要要**左對齊**。
                      第一版寫咗 `text-end` ＋ `truncate`：右對齊之下，
                      overflow 係由**頭**度剪走嘅，而且冇省略號 ——
                      即係讀者見到一句冇頭嘅說話，而 `teaser()` 特登整咗一句
                      完整嘅話出嚟，完全白費。

                      左對齊之後兩樣嘢先夾得返：`teaser()` 保證句子完整，
                      `truncate` 淨係做闊度唔夠嗰陣嘅保險，而且省略號出喺尾。
                    */}
                    <Link
                      href={hrefOf(e)}
                      className="flex items-baseline gap-6 py-3 transition-colors duration-[240ms] hover:text-indigo"
                    >
                      <span className="w-[6.5em] shrink-0 text-h3">{e.label}</span>
                      <span className="min-w-0 flex-1 truncate font-sans text-sm text-ink-3">
                        {teaser(e.summary)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <footer className="mt-tiantou border-t border-rule pt-4">
          <LexiconCta />
          <p className="mt-6 font-sans text-cap leading-[2] text-ink-3">
            體系依三合派 · 中州派（王亭之系統）。
            <br />
            這一層不涉及任何人的命盤 —— 沒有生辰、沒有排盤、沒有帳號。
          </p>
        </footer>
    
      </div>
    </main>
  );
}

export const dynamic = 'force-static';
