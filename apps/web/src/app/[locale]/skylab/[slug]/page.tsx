import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { zhFor } from '@/lib/hans';
import { localePath } from '@/lib/lexicon';
import { SITE_URL } from '@/lib/site';
import { LAB_BYLINE, LAB_LOCALES, LAB_PATH, LAB_UI, PAPERS, citeOf, isLabLocale, paperHref, paperOf, type Block } from '@/lib/skylab';
import { Rich } from '../rich';

/**
 * Sky Lab 論文頁（2026-11-16）
 *
 * 次序固定：刊頭 → 題（中、英）→ 署名、編號、版本 →（稿本說明）→ 摘要、Abstract、關鍵詞
 * → 正文（編號章節）→ 註 → 參考文獻 → 引用格式。
 * ⚠ 冇起盤掣、冇相關詞條 —— 刻意同命書、藏經閣分開。規矩喺 `lib/skylab.ts` 頂。
 */

export function generateStaticParams() {
  return LAB_LOCALES.flatMap((locale) => PAPERS.map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = paperOf(slug);
  if (!isLabLocale(locale) || !p) return {};
  const z = (s: string) => zhFor(locale, s);
  const zhPath = paperHref(p);
  const path = localePath(zhPath, locale);
  /* description 唔好成段摘要：攞第一、二句 */
  const description = z(p.abstract.split('。').slice(0, 2).join('。') + '。');
  return {
    title: `${z(p.title)} · Sky Lab`,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: path, languages: { 'zh-Hant': zhPath, 'zh-Hans': localePath(zhPath, 'zh-Hans') } },
    openGraph: { title: `${z(p.title)} · Sky Lab`, description, type: 'article', url: path },
  };
}

export default async function SkyLabPaper({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLabLocale(locale)) notFound();
  setRequestLocale(locale);
  const p = paperOf(slug);
  if (!p) notFound();
  const z = (s: string) => zhFor(locale, s);
  const lang = locale === 'zh-Hans' ? 'zh-Hans' : 'zh-Hant';

  const block = (b: Block, i: number) => {
    switch (b.k) {
      case 'h':
        return (
          <h3 key={i} className="lab-h3" data-nums>
            {z(b.t)}
          </h3>
        );
      case 'p':
        return (
          <p key={i} className="lab-p">
            <Rich text={z(b.t)} />
          </p>
        );
      case 'ul':
        return (
          <ul key={i} className="lab-ul">
            {b.items.map((it) => (
              <li key={it}>{z(it)}</li>
            ))}
          </ul>
        );
      case 'q':
        return (
          <blockquote key={i} lang={lang} className="lab-q">
            {z(b.t)}
            <cite>{z(`${LAB_UI.book}${b.src}`)}</cite>
          </blockquote>
        );
      case 'table':
        return (
          <div key={i}>
            <div className="lab-tbl-wrap">
              <table className="lab-tbl">
                <caption>{z(b.caption)}</caption>
                <thead>
                  <tr>
                    {b.head.map((h) => (
                      <th key={h} scope="col">
                        {z(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody data-nums>
                  {b.rows.map((r) => (
                    <tr key={r.join('|')}>
                      {r.map((c, j) => (
                        <td key={j}>{z(c)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {b.note ? <p className="lab-tbl-note">{z(b.note)}</p> : null}
          </div>
        );
    }
  };

  return (
    <main className="juan tai">
      <article className="lab">
        <div className="lab-mast">
          <Link href={LAB_PATH}>
            <span aria-hidden="true">← </span>Sky Lab
          </Link>
          <span data-nums>{p.id}</span>
        </div>

        <h1 className="lab-title">{z(p.title)}</h1>
        <p className="lab-title-en" lang="en">
          {p.titleEn}
        </p>
        <p className="lab-meta">
          {z(LAB_BYLINE)}
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          {z(p.version)}
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          <span data-nums>{p.date}</span>
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          {z(LAB_UI.topic)} <span data-nums>{p.topics.join('、')}</span>
        </p>

        {p.draftNote ? <p className="lab-draft">{z(p.draftNote)}</p> : null}

        <section className="lab-abs">
          <h2>{z(LAB_UI.abstract)}</h2>
          <p>{z(p.abstract)}</p>
          <h2>Abstract</h2>
          <p lang="en">{p.abstractEn}</p>
          <h2>{z(LAB_UI.keywords)}</h2>
          <p>{z(p.keywords.join('；'))}</p>
        </section>

        {p.sections.map((s) => (
          <section key={s.no}>
            <h2 className="lab-h2">{z(`${s.no}、${s.title}`)}</h2>
            {s.blocks.map(block)}
          </section>
        ))}

        <h2 className="lab-h2">{z(LAB_UI.notes)}</h2>
        <ul className="lab-small">
          {p.notes.map((n) => (
            <li key={n}>{z(n)}</li>
          ))}
        </ul>

        <h2 className="lab-h2">{z(LAB_UI.refs)}</h2>
        <ul className="lab-small" data-nums>
          {p.refs.map((r) => (
            <li key={r}>{z(r)}</li>
          ))}
        </ul>

        <h2 className="lab-h2">{z(LAB_UI.cite)}</h2>
        <p className="lab-small" data-nums>
          {z(citeOf(p, `${SITE_URL}${paperHref(p)}`))}
        </p>
      </article>
    </main>
  );
}

export const dynamic = 'force-static';
export const dynamicParams = false;
