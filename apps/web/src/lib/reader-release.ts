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
/** v2（2026-10-27 盲評）：冲起句先講時期盤宮名、括號補本命；財帛見空劫時結論講錢順嘅半句加「只是錢進了也容易出」。 */
export const PERIOD_CHECKS_VERSION = 'period-checks-v2';
/** 2026-10-27 宮位章、命宮、骨架：判斷唔到嘅分支句同編輯筆記由正文搬去「據」（content `withRelocatedHedges`，只入新成書入口）。 */
/** v2：「一層…另一層」都搬；判斷句唔郁；先加判斷句再搬。 */
/** v3：編輯口吻、冇「你」嘅淨列分支直接刪（唔入「據」）；本宮三方四正冇火鈴就唔出火鈴句。 */
/** v4：「規勸你」唔當編輯筆記；疾厄判斷句（health.verdict）同其他判斷句一樣唔搬。 */
export const HEDGE_RELOCATION_VERSION = 'hedge-relocation-v4';
/** 2026-10-27 命宮同十一宮結論段：盤面事實後加一句有出處嘅「你…」判斷（content `withVerdictLead`，只入新成書入口）。 */
/** v2：命宮按六十星系揀判斷句（plain/ming-verdict.json）。 */
/** v3：細讀規則成立就用帶條件判斷句（准講事件、對方）；疾厄講要留意嘅身體系統（plain/health-verdict.json）。 */
/** v4：再加 89 條較少成立嘅規則判斷句（plain/verdict-variants.json 第二批）。 */
/** v5：命宮補太陰太陽坐丑未（按宮）、紫微獨坐子午；天機巳亥偏向未定用兩端共通句。 */
export const VERDICT_LEAD_VERSION = 'verdict-lead-v5';
/** 2026-10-27 年齡分段：讀書年代建議只畀虛歲十八或以下；十九至二十四用成人建議，這十年／這一年講「讀書和工作上」（content `isSchoolReader`，只入新成書入口）。 */
export const AGE_BANDS_VERSION = 'age-bands-v1';
