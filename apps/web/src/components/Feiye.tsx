import { getTranslations } from 'next-intl/server';
import { lunarDay, lunarMonth } from '@guanwei/content';
import type { Chart as ZChart } from '@guanwei/ziwei/contract';
import { Seal } from '@/components/Seal';
import { StarDial } from '@/components/StarDial';
import { branchPy, ganzhiPy } from '@/lib/chart-labels';
import { zhFor } from '@/lib/hans';
import { MARK } from '@/lib/site';

/**
 * 扉頁（2026-10-06 · 試讀回饋：開卷「似 PDF、好硬淨」，左頁成個命盤「好臃腫」）
 *
 * 開卷嗰一版嘅左頁：唔再一打開就係十二宮細字，改做實體書嘅扉頁 ——
 * 書名、題辭、金線星盤（亮命宮）、農曆生辰同時辰、朱砂印。命盤冇唔見：
 * 扉頁底「看命盤」切換（BookSpread），讀章嗰陣左頁照舊係命盤。
 *
 * ⚠ 生辰用盤上嘅農曆同干支（盤本身有），唔另外撈出生資料 —— 同一個元件真書、示範書都用得。
 */
function birthLine(chart: ZChart, en: boolean): string {
  const [ys, yb] = chart.ganzhi.year;
  const hour = chart.ganzhi.hour[1];
  if (en) {
    const nth = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
    const leap = chart.lunar.isLeapMonth ? 'leap ' : '';
    return `${ganzhiPy(`${ys}${yb}`)} year · ${nth(chart.lunar.d)} day of the ${leap}${nth(chart.lunar.m)} month · ${branchPy(hour)} hour`;
  }
  return `${ys}${yb}年　${lunarMonth(chart.lunar.m, chart.lunar.isLeapMonth)}${lunarDay(chart.lunar.d)}　${hour}時`;
}

function lifeStars(chart: ZChart): string[] {
  const p = chart.palaces.find((x) => x.branch === chart.mingGong);
  const majors = (q: typeof p) => (q?.stars ?? []).filter((s) => s.kind === 'major').map((s) => s.name);
  const own = majors(p);
  if (own.length) return own;
  const opp = p?.borrowsFrom ? chart.palaces.find((x) => x.branch === p.borrowsFrom) : undefined;
  return majors(opp);
}

export async function Feiye({ title, chart, locale }: { title: string; chart: ZChart | null; locale: string }) {
  const t = await getTranslations('brand');
  const en = locale === 'en';
  return (
    <div className="feiye">
      <p className="feiye-mu" aria-hidden="true">✦</p>
      <h1 className="feiye-ming">{zhFor(locale, title)}</h1>
      <p className="feiye-ci">{t('essence')}</p>
      {chart ? (
        <>
          <div className="feiye-pan" aria-hidden="true">
            <StarDial branch={chart.mingGong} stars={lifeStars(chart)} caption="" en={en} />
          </div>
          <p className="feiye-sheng">{zhFor(locale, birthLine(chart, en))}</p>
        </>
      ) : null}
      <Seal text={MARK} label="" className="feiye-yin" />
    </div>
  );
}
