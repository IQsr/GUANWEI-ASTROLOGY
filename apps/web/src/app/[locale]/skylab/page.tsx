import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { zhFor } from '@/lib/hans';
import { localePath } from '@/lib/lexicon';
import { ALL_TOPICS, LAB_BYLINE, LAB_LOCALES, LAB_PATH, LAB_UI, LINES, OVERVIEW, PAPERS, STATUS_LABEL, isLabLocale, paperHref, paperOf } from '@/lib/skylab';
import { Rich } from './rich';

/**
 * Sky Lab 總覽（2026-11-16）
 *
 * 一頁列晒所有專題同狀態，已成文嘅連去論文。規矩喺 `lib/skylab.ts` 頂。
 * ⚠ 呢度冇起盤掣、冇去命書嘅連結 —— 係刻意嘅（Issac：只喺頁尾入，同命書保持距離）。
 */

export function generateStaticParams() {
  return LAB_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLabLocale(locale)) return {};
  const z = (s: string) => zhFor(locale, s);
  const path = localePath(LAB_PATH, locale);
  const description = z(OVERVIEW.abstract[0]!);
  return {
    title: `Sky Lab · ${z(OVERVIEW.title)}`,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: path, languages: { 'zh-Hant': LAB_PATH, 'zh-Hans': localePath(LAB_PATH, 'zh-Hans') } },
    openGraph: { title: `Sky Lab · ${z(OVERVIEW.title)}`, description, type: 'article', url: path },
  };
}

export default async function SkyLabIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLabLocale(locale)) notFound();
  setRequestLocale(locale);
  const z = (s: string) => zhFor(locale, s);
  const count = (st: string) => ALL_TOPICS.filter((t) => t.status === st).length;

  return (
    <main className="juan tai">
      <div className="lab lab-wide">
        <div className="lab-mast">
          <span>Sky Lab</span>
          <span>Research Reports</span>
        </div>

        <h1 className="lab-title">{z(OVERVIEW.title)}</h1>
        <p className="lab-meta">
          {z(LAB_BYLINE)}
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          <span data-nums>{OVERVIEW.date}</span>
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          {z(LAB_UI.dataAsOf)} <span data-nums>{OVERVIEW.dataDate}</span>
        </p>

        <section className="lab-abs">
          <h2>{z(LAB_UI.summary)}</h2>
          {OVERVIEW.abstract.map((p) => (
            <p key={p}>
              <Rich text={z(p)} />
            </p>
          ))}
          <h2>Abstract</h2>
          <p lang="en">{OVERVIEW.abstractEn}</p>
        </section>

        <h2 className="lab-h2">{z(LAB_UI.path)}</h2>
        {OVERVIEW.path.map((st) => (
          <section key={st.no}>
            <h3 className="lab-h3" data-nums>
              {z(`${st.no}　${st.title}`)}
            </h3>
            {st.lines ? <p className="lab-small" data-nums>{z(`${LAB_UI.involves}${st.lines}`)}</p> : null}
            {st.paras.map((para) => (
              <p key={para} className="lab-p">
                <Rich text={z(para)} />
              </p>
            ))}
            {'table' in st && st.table ? (
              <div>
                <div className="lab-tbl-wrap">
                  <table className="lab-tbl">
                    <caption>{z(st.table.caption)}</caption>
                    <thead>
                      <tr>
                        {st.table.head.map((h) => (
                          <th key={h} scope="col">
                            {z(h)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {st.table.rows.map((r) => (
                        <tr key={r[0]}>
                          {r.map((c, j) => (
                            <td key={j}>{z(c)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="lab-tbl-note">{z(st.table.note)}</p>
              </div>
            ) : null}
          </section>
        ))}

        <h2 className="lab-h2">{z(LAB_UI.papers)}</h2>
        <ul className="lab-small">
          {PAPERS.map((p) => (
            <li key={p.slug}>
              <span data-nums>{p.id}</span>
              <span className="mx-2" aria-hidden="true">
                ·
              </span>
              <Link href={paperHref(p)} className="lab-link">
                {z(p.title)}
              </Link>
              <span className="mx-2" aria-hidden="true">
                ·
              </span>
              {z(p.version)}，<span data-nums>{p.date}</span>
            </li>
          ))}
        </ul>

        <h2 className="lab-h2">{z(LAB_UI.topics)}</h2>
        <p className="lab-small" data-nums>
          {z(LAB_UI.total(ALL_TOPICS.length, `${STATUS_LABEL.done} ${count('done')}，${STATUS_LABEL.neg} ${count('neg')}，${STATUS_LABEL.open} ${count('open')}`))}
        </p>
        <ul className="lab-small">
          {OVERVIEW.kinds.map(([k, d]) => (
            <li key={k}>
              <strong>{z(k)}</strong>　{z(d)}
            </li>
          ))}
        </ul>

        {LINES.map((line) => (
          <section key={line.no} aria-labelledby={`lab-line-${line.no}`}>
            <h3 id={`lab-line-${line.no}`} className="lab-h3">
              {z(`${line.no}、${line.title}`)}
            </h3>
            <p className="lab-small">{z(line.question)}</p>
            <ol className="lab-topics">
              {line.topics.map((t) => {
                const paper = t.paper ? paperOf(t.paper) : null;
                return (
                  <li key={t.no} className="lab-topic">
                    <span className="lab-topic-no" data-nums>
                      {t.no}
                    </span>
                    <span className="lab-topic-t">{z(t.title)}</span>
                    <span className="lab-topic-tags">
                      <span className="lab-st" data-st={t.status}>
                        {z(STATUS_LABEL[t.status])}
                      </span>
                      <span>{z(t.kind)}</span>
                      {paper ? (
                        <Link href={paperHref(paper)} className="lab-link">
                          {z(LAB_UI.paper)} {paper.id}
                        </Link>
                      ) : null}
                    </span>
                    <span className="lab-topic-n">
                      {t.status === 'open' ? z(LAB_UI.owed) : null}
                      {z(t.note)}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}

        <h2 className="lab-h2">{z(LAB_UI.counting)}</h2>
        <ul className="lab-ul">
          {OVERVIEW.counting.map((c) => (
            <li key={c}>{z(c)}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}

export const dynamic = 'force-static';
