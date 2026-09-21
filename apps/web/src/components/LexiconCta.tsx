import { Link } from '@/i18n/navigation';

/**
 * 藏經閣頁尾 CTA（工單 D2）
 *
 * 架構 §7：「頁尾**唯一** CTA **一行細字** → `/cast`。」
 * 工單驗收：「CTA 係一行細字，唔係 banner 唔係彈窗。」
 *
 * ── 呢個元件最重要嘅係佢做唔到乜 ──
 *
 * 冇 `position: fixed`、冇 sticky、冇 `<dialog>`、冇 `role="dialog"`、
 * 冇倒數、冇「立即」、冇按鈕樣式、冇背景色塊。
 * 佢就係頁尾嗰段細字入面嘅一句，同旁邊嗰兩行語料庫註記同一個級數。
 *
 * 呢啲唔係風格偏好。架構 §1 寫住觀微**完全唔分享**，
 * 所以病毒系數係零，獲客只剩搜尋 —— 藏經閣係唯一嘅入口。
 * 而一個入口如果一打開就彈嘢，佢就唔再係一個可以安心讀嘅地方，
 * 亦都唔再係「市面上冇玄學站肯認真寫辭典」嗰個證據。
 *
 * **一行細字係一個立場，唔係一個克制。**
 * build 之後有掃描守住（`check-lexicon-build.mjs`）。
 */
export function LexiconCta() {
  return (
    <p className="font-sans text-sm leading-[1.9] text-ink-3">
      這些詞條，也用來寫一本屬於你的書。
      <Link
        href="/cast"
        className="ms-2 text-indigo transition-colors duration-[240ms] hover:text-ink"
      >
        起盤
      </Link>
    </p>
  );
}
