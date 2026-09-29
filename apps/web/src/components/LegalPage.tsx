import { Juanshou } from '@/components/Juanshou';
import type { LegalDoc } from '@/lib/legal-text';

/** 條款／私隱政策（2026-09-29）。一版純文字，冇互動。 */
export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <main className="juan tai">
      <Juanshou title={doc.title} />
      <article className="banxin flex flex-col gap-8 text-body leading-[1.95]">
        <p className="font-sans text-cap tracking-[0.16em] text-ink-3">{doc.updated}</p>
        {doc.sections.map((s) => (
          <section key={s.h} className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold tracking-[0.08em]">{s.h}</h2>
            {s.p.map((t) => (
              <p key={t} className="text-ink-2">
                {t}
              </p>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
