import { Link } from '@/i18n/navigation';
import { cutTarget, deckle, notches } from '@/lib/weicai';

/**
 * 未裁之頁（工單 F4 · 架構 §6）
 *
 * ⚠ 呢個 component 冇 state、冇 effect、冇 JS。
 *
 * 佢係一版紙。一版紙唔需要 hydrate —— 而且呢一版正正係
 * 「唔准喺讀嘅過程入面插一個銷售動作」嗰條規矩嘅落腳點：
 * 冇 modal、冇糊咗嘅正文、冇倒數，所以佢冇任何嘢要郁。
 */
export function Weicai({
  title,
  slots,
  bookId,
  isAnonymous,
}: {
  title: string;
  /** 呢一版有幾多格、係乜嘢格。⚠ 格嘅名唔係內容（0006）。 */
  slots: readonly string[];
  bookId: string;
  isAnonymous: boolean;
}) {
  const target = cutTarget(bookId, isAnonymous);

  return (
    <div className="weicai">
      <div className="weicai-zhi" style={{ ['--mao' as string]: deckle(notches(slots.length)) }}>
        <p className="font-sans text-cap tracking-[0.2em] text-ink-3">{title}</p>

        <p className="mt-5 max-w-banxin text-body leading-[1.95] text-ink-2">
          這一頁還沒有裁開。
        </p>

        {slots.length > 0 ? (
          <ul className="weicai-ge mt-8">
            {slots.map((slot, i) => (
              <li key={`${slot}-${i}`}>
                <span>{slot}</span>
                <i aria-hidden="true" />
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/*
        * ⚠ 一行細字，唔係一粒掣。
        *
        * 「裁開」係一個動作嘅名，唔係「升級」「解鎖」「立即購買」。
        * 而且佢喺紙外面 —— 一版未裁開嘅紙上面唔會印住點樣買佢。
        */}
      <p className="mt-6">
        <Link
          href={target.href}
          className="font-sans text-cap tracking-[0.16em] text-indigo transition-colors duration-[240ms] ease-ink hover:text-ink"
        >
          {target.label}
        </Link>
      </p>
    </div>
  );
}
