import { expect, it, vi } from 'vitest';
import { createElement, type ReactElement } from 'react';
import { sampleBook } from '@/lib/sample-book';
import { leadsFromBodies } from '@/lib/wenmu';
import { internationalMing } from '@/lib/ming-international';
import type { JuanPort } from '@/lib/juan-view';
import type { AskItem } from '@/lib/wenmu';

vi.mock('next-intl/server', () => ({ setRequestLocale: vi.fn(), getTranslations: async () => (key: string) => key }));
vi.mock('@/lib/juan.server', () => ({ serverJuan: vi.fn() }));
vi.mock('@/components/BookContents', () => ({ BookContents: () => null }));
vi.mock('@/components/BookSpread', () => ({ BookSpread: () => null }));
vi.mock('@/components/NightScene', () => ({ NightScene: () => null }));
vi.mock('@/components/Juanshou', () => ({ Juanshou: () => null }));
vi.mock('@/components/FontWarm', () => ({ FontWarm: () => null }));
vi.mock('@/components/Feiye', () => ({ Feiye: () => null }));

import BookPage from '@/app/[locale]/book/[bookId]/page';
import { serverJuan } from '@/lib/juan.server';
import { BookContents } from '@/components/BookContents';

// Execute the real server page: the previous locale gate never reached the
// localized-summary helper, despite that helper's own tests passing.
function asksIn(node: ReactElement): AskItem[] | undefined {
  if (node.type === BookContents) return (node.props as { asks: AskItem[] }).asks;
  const children = (node.props as { children?: unknown }).children;
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child && typeof child === 'object' && 'props' in child) {
      const found = asksIn(child as ReactElement);
      if (found) return found;
    }
  }
}

it('saved-book contents use the chapter snapshot in every locale, without reading paid bodies or mutating Chinese', async () => {
  vi.stubGlobal('React', { createElement });
  try {
    const draft = sampleBook()!.drafts.find((d) => d.slug === '命宮')!;
    const snapshot = { text: draft.body, slots: [], reading: draft.reading };
    const before = JSON.stringify(snapshot);
    const lead = leadsFromBodies([draft])[0]!;
    // DB leads do not contain the helper's derived localized/detail fields.
    const storedLead = { slug: lead.slug, lead: lead.lead, quote: lead.quote, internationalLead: lead.internationalLead };
    for (const locale of ['zh-Hant', 'zh-Hans', 'en', 'ja']) {
      const body = vi.fn(async (_id: string, slug: string) => slug === '命宮' ? snapshot : { text: '序', slots: [] });
      const port: JuanPort = {
        contents: async () => ({ title: 'test', chapters: [{ id: 'preface', slug: '序', title: '序', ord: 0, tier: 'free' }] }),
        chart: async () => null,
        leads: async () => [storedLead],
        body,
      };
      vi.mocked(serverJuan).mockReturnValue(port);
      const page = await BookPage({ params: Promise.resolve({ locale, bookId: 'saved' }) });
      const ming = asksIn(page)!.find((a) => a.slug === '命宮')!;
      expect(body.mock.calls.map(([, slug]) => slug), locale).toEqual(['序', '命宮']);
      expect(ming.sources.length, locale).toBeGreaterThan(0);
      if (locale === 'en' || locale === 'ja') {
        const segments = internationalMing(snapshot, locale)!;
        expect(ming.answer, locale).toBe(segments[0]!.text);
        expect(ming.detail, locale).toBe(segments[1]!.text);
        expect(ming.sources.map((s) => s.id), locale).toEqual([...new Set(segments.slice(0, 2).flatMap((s) => s.statements?.flatMap((l) => l.citations) ?? []))]);
      }
      expect(JSON.stringify(snapshot), locale).toBe(before);
    }
  } finally {
    vi.unstubAllGlobals();
  }
});
