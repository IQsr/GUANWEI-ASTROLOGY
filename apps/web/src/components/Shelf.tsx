import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import type { Spine } from '@/lib/shelf';

/**
 * 書架（工單 E3 · 視覺系統 §8）
 *
 * 五條線：頂板、兩塊立板、兩塊層板。冇第六條，亦都冇任何一張圖。
 *
 * ── 取書唔係跳版 ──
 *
 * 攞咗書落嚟之後，個櫃**淡到 16%，但唔消失**（驗收標準第四條）。
 * 消失咗就變咗「跳去另一版」；留住就仲係「你企喺書齋度，手上攞住一本」。
 * 呢個分別就係六幕流程同五個頁嘅分別。
 */
export function Shelf({
  spines,
  taken,
  onTake,
  children,
}: {
  spines: Spine[];
  /** 攞咗邊本落嚟。`null` = 仲喺架上。 */
  taken?: string | null;
  /** 冇傳就係連結（server component 行得）；有傳就係掣（demo 同客戶端流程）。 */
  onTake?: (key: string) => void;
  /** 攞咗落嚟嗰本書擺喺原本嗰格。 */
  children?: ReactNode;
}) {
  const dim = taken ? '1' : '0';

  return (
    <div className="jia" data-dim={dim}>
      {/* 頂板 */}
      <div className="jia-ban" />
      <div className="jia-ding-dai" />
      {/* 層板一 */}
      <div className="jia-ban" />

      <div className="jia-ge">
        {spines.map((spine) =>
          spine.key === taken ? (
            <div key={spine.key} className="ji-kong">
              {children}
            </div>
          ) : (
            <SpineEl key={spine.key} spine={spine} onTake={onTake} />
          ),
        )}
      </div>

      {/* 層板二 —— 書企喺呢塊上面 */}
      <div className="jia-ban" />
    </div>
  );
}

function SpineEl({ spine, onTake }: { spine: Spine; onTake?: (key: string) => void }) {
  const inner = (
    <>
      {[...spine.label].map((zi, i) => (
        <span key={`${zi}-${i}`}>{zi}</span>
      ))}
    </>
  );

  const props = {
    className: 'ji',
    'data-kind': spine.kind,
    'data-reading': spine.reading ? '1' : '0',
    /* 直排書名要讀得返做一行字 —— 逐個字 render 之後讀屏會逐個字讀。 */
    'aria-label': spine.kind === 'new' ? '新書' : spine.label,
  };

  if (onTake) {
    return (
      <button type="button" {...props} onClick={() => onTake(spine.key)}>
        <span aria-hidden="true" className="contents">
          {inner}
        </span>
      </button>
    );
  }

  return (
    <Link href={spine.href} {...props}>
      <span aria-hidden="true" className="contents">
        {inner}
      </span>
    </Link>
  );
}
