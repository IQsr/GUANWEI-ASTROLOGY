/** New-book release only. This module contains no engine or server dependencies. */
export const CURRENT_READER_RELEASE = 'cross-palace-production-v1';
export const BOOK_P1_READER_VERSION = 'book-p1-conditions-v1+book-p1-reading-v2';
export const EPILOGUE_READER_VERSION = 'epilogue-reader-v1';
/** 2026-10-25 命宮／骨架：條件唔成立嘅四化分支句唔出（content `systemMingReading` conditionalBranches）。 */
export const MING_BRANCH_FILTER_VERSION = 'ming-branch-filter-v2';
/** 2026-10-26 十一宮：同一揀句規則擴到宮位章（content `withConditionalBranches` palace）。
 * v2（同日）：句中點名幾個四化、只有部分喺本盤，用只講本盤有嗰幾個嘅已核版本，冇就成句唔出（branch-rewrites.json partial）。 */
export const PALACE_BRANCH_FILTER_VERSION = 'palace-branch-filter-v2';
/** 2026-10-26 十二宮編輯建議：主題跟正文改配、疾厄跟結論取象，並按本宮實際星曜加一句（content `withPalaceAdvice` focused）。 */
export const FOCUSED_ADVICE_VERSION = 'palace-advice-focus-v1';
/** 2026-10-26 宮位規則卡加日生／夜生同天刑、天姚（content `palace-conditions-v2`，只入新成書入口）。 */
export const PALACE_CONDITIONS_VERSION = 'palace-conditions-v2';
/** 2026-10-26 時間章：魁鉞講明落宮、冲起本命化曜唔只核同一粒星、大限流年財帛天府見空劫（content `periodChecks`，只入新成書入口）。 */
export const PERIOD_CHECKS_VERSION = 'period-checks-v1';
/** 2026-10-27 宮位章、命宮、骨架：判斷唔到嘅分支句同編輯筆記由正文搬去「據」（content `withRelocatedHedges`，只入新成書入口）。 */
export const HEDGE_RELOCATION_VERSION = 'hedge-relocation-v1';
