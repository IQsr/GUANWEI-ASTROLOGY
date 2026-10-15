import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Spine } from '@/lib/shelf';

/**
 * 書架（工單 E3 · 2026-10-15 改版）
 *
 * ── 由五條線變成書房入面一個真書櫃 ──
 *
 * 舊版係五條 1px 線（頂板、兩塊立板、兩塊層板），「零木紋、零陰影、零透視」。
 * 2026-10-15 Issac：書齋、藏經閣、設定成片黑底太過簡潔，要同閱讀頁嘅書桌係同一間書房。
 * 第一版個櫃係一張相（`/img/study/shelf.webp`，而家冇用；第二版見下面），
 * 書脊係同封面一樣嘅墨綠布面、燙金線、紙題簽。
 *
 * ── 成版就係間書房（2026-10-15 第二版）──
 *
 * 第一版個櫃係一張相擺喺黑底上面，似貼上去。第二版成版就係書房：一張闊景（橫屏，
 * /img/study/zhai-wide.webp）或者一張直景（直屏，zhai-tall.webp），書櫃喺正中，
 * 書櫃上面嗰幅暗牆寫標題（`head`）。
 *
 * ── 書點樣企得準層板 ──
 *
 * 個景鎖死張相嘅比例（aspect-ratio），相 100% 貼滿，所以層板位置用百分比就永遠對得上：
 * 闊景三塊層板面喺相高 40.2%、56.3%、71%，直景 40%、51.9%、62.5%（2026-10-15 量相素）。
 * 橫屏直屏用 `orientation` 換相同換位置（globals.css `.jia`）。
 *
 * ── 取書唔係跳版（舊規矩照留）──
 *
 * 攞咗書落嚟之後，個櫃**淡到 16%，但唔消失**。消失咗就變咗「跳去另一版」；
 * 留住就仲係「你企喺書齋度，手上攞住一本」。
 */

/** 每層最多幾本（手機一層大約放得落十本）。多過三層嘅擺喺個櫃下面。 */
const PER_ROW = 10;
const ROWS = 3;

export function Shelf({
  spines,
  taken,
  onTake,
  children,
  head,
}: {
  spines: Spine[];
  /** 寫喺書櫃上面暗牆嘅嘢（書齋標題、細 nav）。demo 冇。 */
  head?: ReactNode;
  /** 攞咗邊本落嚟。`null` = 仲喺架上。 */
  taken?: string | null;
  /** 冇傳就係連結（server component 行得）；有傳就係掣（demo 同客戶端流程）。 */
  onTake?: (key: string) => void;
  /** 攞咗落嚟嗰本書擺喺原本嗰格。 */
  children?: ReactNode;
}) {
  const dim = taken ? '1' : '0';
  const rows = Array.from({ length: ROWS }, (_, i) => spines.slice(i * PER_ROW, (i + 1) * PER_ROW));
  const rest = spines.slice(ROWS * PER_ROW);

  const el = (spine: Spine) =>
    spine.key === taken ? (
      <div key={spine.key} className="ji-kong">
        {children}
      </div>
    ) : (
      <SpineEl key={spine.key} spine={spine} onTake={onTake} />
    );

  return (
    <div className="jia-wai">
      {/* 成版底色：同張相地板一樣嘅暖黑，捲落去都唔會見到另一隻色 */}
      <div className="zhai-di" aria-hidden="true" />
      <div className="jia" data-dim={dim}>
        {/* 間房同個櫃：一張相。淡嗰陣淡呢層，書照企喺度 */}
        <div className="jia-tu" aria-hidden="true" />
        {head ? <div className="jia-tou">{head}</div> : null}
        {rows.map((row, i) =>
          row.length ? (
            <div key={i} className="jia-ceng" data-ceng={i}>
              {row.map(el)}
            </div>
          ) : null,
        )}
      </div>
      {rest.length ? <div className="jia-yu">{rest.map(el)}</div> : null}
    </div>
  );
}

function SpineEl({ spine, onTake }: { spine: Spine; onTake?: (key: string) => void }) {
  const t = useTranslations('shelf');
  /*
   * 英文書名（「+ New book」、英文名）唔好逐個字母疊起：成句打側，同西書書脊一樣由上讀落
   * （2026-10-09 英文手機 feedback）。中文名照舊逐個字直排。
   */
  const latin = /[A-Za-z]/.test(spine.label) && !/\p{Script=Han}/u.test(spine.label);
  const inner = (
    /* 紙題簽：書名寫喺一張貼喺書脊上面嘅紙度，同線裝書一樣 */
    <span className="ji-qian">
      {latin ? (
        <span className="ji-xi">{spine.label}</span>
      ) : (
        [...spine.label].map((zi, i) => <span key={`${zi}-${i}`}>{zi}</span>)
      )}
    </span>
  );

  const props = {
    className: 'ji',
    'data-kind': spine.kind,
    'data-reading': spine.reading ? '1' : '0',
    /* 直排書名要讀得返做一行字 —— 逐個字 render 之後讀屏會逐個字讀。 */
    'aria-label': spine.kind === 'new' ? t('newBookAria') : spine.label,
  };

  const body = (
    <span aria-hidden="true" className="contents">
      {inner}
      {/* 在讀嗰本：一條朱砂書簽帶由書底垂落層板 */}
      {spine.reading ? <span className="ji-dai" /> : null}
    </span>
  );

  if (onTake) {
    return (
      <button type="button" {...props} onClick={() => onTake(spine.key)}>
        {body}
      </button>
    );
  }

  return (
    <Link href={spine.href} {...props}>
      {body}
    </Link>
  );
}
