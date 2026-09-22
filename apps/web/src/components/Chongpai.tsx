import { DRIFT_LABEL, DRIFT_MEANS, drift, type Pinned } from '@/lib/chongpai';

/**
 * 並列新舊（工單 B16 第三條 AC · docs/rules.md R-008）
 *
 * ── ⚠ 呢一版唔係一個「有更新」提示 ──
 *
 * 工單寫住：「`/account` 嘅『以新版引擎重排』並列新舊差異，由用戶揀 ——
 * 唔自動改」。三個字最重要：**並列**、**揀**、**唔自動**。
 *
 * 所以呢個 component：
 *
 * 一、冇「更新」掣。佢淨係畫張對照表。撳嘅嗰一步屬於 `/account`（工單 G4），
 *     而嗰一步要造一本**新書**，唔係改舊嗰本 —— 見 `chongpai.ts` 開頭。
 * 二、三行分開講。合成一句「有新版本」嘅話，用戶唯一做得到嘅反應
 *     就係撳「更新」，而佢唔知自己換緊乜。
 * 三、冇差異就乜都唔出。一本冇變過嘅書唔應該喺書齋度亮住一個點。
 *
 * ⚠ 而且佢**唔擺喺命書入面**。
 *
 * F4 嗰陣學過一次：喺閱讀中間插一個要人做決定嘅 UI，無論包裝成
 * modal、倒數定係一段虛化預覽，本質都係同一件事。
 * 「你本書有新版」擺喺正文上面，就係喺人讀緊嘅時候問佢買唔買新嗰本。
 * 呢一版嘅位置係 `/account`，唔係 `/book/[id]`。
 */
export function Chongpai({ pinned, current }: { pinned: Pinned; current: Pinned }) {
  const rows = drift(pinned, current);

  /*
   * ⚠ 冇差異 = 唔出嘢，唔係出一句「已是最新版本」。
   *
   * 「已是最新版本」係一句工具嘅說話 —— 佢預設咗最新就係最好。
   * R-008 嘅立場相反：你收到嗰本應該一直係嗰本。
   */
  if (rows.length === 0) return null;

  return (
    <section className="border-t jielan pt-6">
      <h2 className="font-sans text-cap tracking-[0.16em] text-ink-3">這本書成書之後，這些改過</h2>

      <dl className="mt-5 space-y-5">
        {rows.map((r) => (
          <div key={r.field} className="grid gap-x-8 gap-y-1 sm:grid-cols-[10rem_1fr]">
            <dt className="text-body">{DRIFT_LABEL[r.field]}</dt>
            <dd>
              {/*
                ⚠ 兩個版本號並排，舊嗰個唔劃走。
                劃走就係話佢作廢咗 —— 而佢冇，佢係你手上嗰本。
              */}
              <p className="font-sans text-sm leading-[1.9] text-ink-2">
                <span className="text-ink">{r.was}</span>
                <span className="mx-2 text-ink-3">→</span>
                <span className="text-ink">{r.now}</span>
              </p>
              <p className="mt-1 font-sans text-cap leading-[1.9] text-ink-3">
                {DRIFT_MEANS[r.field]}
              </p>
            </dd>
          </div>
        ))}
      </dl>

      {/*
        ⚠ 呢一句係政策本身，唔係一句安撫。
        佢要講清楚兩件事：你本書冇變過；要新嗰版係另外造一本。
      */}
      <p className="mt-6 max-w-banxin text-sm leading-[1.9] text-ink-2">
        你手上這本沒有變過，往後也不會自己變。想看新版本排出來是甚麼樣子，
        可以另外排一本；兩本都會留在書齋，由你對照。
      </p>
    </section>
  );
}
