'use server';

import { ENGINE_VERSION, SCHOOL_PROFILE, cast, castPartial, type Chart, type PartialChart } from '@guanwei/ziwei';
import { RULE_REGISTRY } from '@guanwei/content';
import { parseCastRequest, type CastRequest } from '@/lib/luokuan';
import { bookDraft, keepBook, parseBookFields } from '@/lib/chengshu';
import { serverChengshu } from '@/lib/chengshu.server';
import { bookChapters } from '@/lib/mingshu';

/**
 * 排盤（工單 E4 · 架構 §9）
 *
 * ── ⚠ 排盤引擎唔准落 client bundle ──
 *
 * 架構 §9 寫住：「排盤引擎唔准落 client bundle —— 係資產，
 * 而且 **server 行先可以鎖 `engine_version`**、快取、重算。」
 *
 * E1 嗰個臨時原型係 client component，喺 `useMemo` 入面直接行 `cast()`，
 * 所以成個引擎（60KB）跟咗落瀏覽器 —— G1 嗰陣量到，記錄咗，等呢張工單。
 *
 * 呢個 server action 就係嗰個修正：引擎只喺 server 行，
 * client 收返嚟嘅係一個排好嘅盤物件，入面帶住 `meta.engineVersion`
 * 同 `meta.schoolProfile`（B13）—— 而嗰兩個值係邊個排嘅就係邊個，
 * 冇得由瀏覽器嗰邊講。
 *
 * `scripts/check-bundle.mjs` 而家會 fail build，如果引擎再出現喺 client。
 */

/**
 * ⚠ `bookId` 可以係 null，而成幕照行。
 *
 * 寫唔入 DB（接唔到 instance、session 開唔到）**唔可以擋住題名**：
 * 呢一刻個人啱啱寫完五步，個盤已經排好，而嗰一下係成個產品最貴嗰一下。
 *
 * 但 null 就係 null —— 冇 id 就冇書齋入口。唔好扮有（架構 §8）。
 */
export type CastOutcome =
  | { ok: true; kind: 'full'; chart: Chart; bookId: string | null }
  | { ok: true; kind: 'partial'; chart: PartialChart; bookId: string | null }
  | { ok: false; code: string; message: string };

/** 引擎嘅錯誤碼翻做人話。一個碼一句，唔共用 —— 共用即係等於冇分。 */
const MESSAGES: Record<string, string> = {
  BAD_REQUEST: '這份生辰資料有點不對，請回上一步再看一次。',
  OUT_OF_RANGE: '萬年曆只到一九〇〇至二一〇〇年。這個生辰暫時排不到。',
  BAD_PLACE: '這個出生地的經緯度不對，請再揀一次。',
  BAD_TIMEZONE: '這個時區認不出來，請再揀一次出生地。',
  UNKNOWN_HOUR: '沒有時辰就定不到命宮。請揀「不知道時辰」那一項。',
  NOT_IMPLEMENTED: '這一部分還未做好。',
};

/**
 * 生辰嗰幾格 → DB 嗰張 subjects。
 *
 * ⚠ `true_solar_corrected` 跟引擎嗰份 `meta.rules` 講，唔係跟我哋估。
 * 版權頁要寫明用咗乜（架構 §8），而一個估出嚟嘅值寫落版權頁
 * 就係一句冇根據嘅話。
 */
function subjectOf(req: CastRequest, corrected: boolean) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    birth_date: `${req.solar.y}-${pad(req.solar.m)}-${pad(req.solar.d)}`,
    birth_time: req.time ? `${pad(req.time.h)}:${pad(req.time.min)}` : null,
    birth_tz: req.tz,
    birth_place: req.place.label,
    lng: req.place.lng,
    lat: req.place.lat,
    sex: req.sex,
    true_solar_corrected: corrected,
  };
}

/**
 * 排盤 ＋ 成書（工單 E4 ＋ G5）
 *
 * ⚠ 排盤同寫入喺**同一個 action** 入面，唔係兩個。
 *
 * 分做兩個嘅話，個盤要行一轉瀏覽器先返到嚟寫落 DB ——
 * 即係話 `engine_version`、`school_profile_id`、連張盤本身
 * 都變成「client 話畀我哋聽嘅嘢」。E4 特登將排盤搬上 server
 * 就係為咗鎖住呢幾個值；經一次 client 就等於白搬。
 */
export async function castChart(raw: unknown): Promise<CastOutcome> {
  const req = parseCastRequest(raw);
  const fields = parseBookFields(raw);
  if (!req || !fields) return { ok: false, code: 'BAD_REQUEST', message: MESSAGES.BAD_REQUEST! };

  const base = { solar: req.solar, tz: req.tz, place: req.place, sex: req.sex };

  if (req.time) {
    const result = cast({ ...base, time: req.time });
    if (!result.ok) {
      return { ok: false, code: result.code, message: MESSAGES[result.code] ?? MESSAGES.NOT_IMPLEMENTED! };
    }
    const chart = result.value;

    /* 正文用本書個 token 做 seed —— 重生成出返嚟係同一本書（C8b 可重現）。 */
    const chapters = bookChapters(chart, {
      seed: fields.token,
      year: new Date().getFullYear(),
      solar: req.solar,
      place: req.place.label,
    });
    if (!chapters) {
      return { ok: false, code: 'NOT_IMPLEMENTED', message: MESSAGES.NOT_IMPLEMENTED! };
    }

    const bookId = await keepBook(
      serverChengshu(),
      bookDraft({
        token: fields.token,
        name: fields.name,
        subject: subjectOf(req, chart.meta.rules.trueSolarTime),
        chart: {
          engine_version: ENGINE_VERSION,
          school_profile_id: SCHOOL_PROFILE.ref,
          payload: chart,
        },
        chapters,
        contentVersion: RULE_REGISTRY.ref,
      }),
    );

    return { ok: true, kind: 'full', chart, bookId };
  }

  /* 唔知時辰：排得出年月日層，排唔出命宮 —— 所以係一本待時辰嘅書（架構 §8）。 */
  const result = castPartial(base);
  if (!result.ok) {
    return { ok: false, code: result.code, message: MESSAGES[result.code] ?? MESSAGES.NOT_IMPLEMENTED! };
  }

  /*
   * ⚠ 待時辰嗰本書一樣要留低。
   *
   * 架構 §8：「書架留虛線書脊『未題名』…補返時辰即成書 ——
   * 空書脊反而係最好嘅回訪理由。」唔寫低就冇空書脊，
   * 亦都冇咗嗰個回訪理由。
   */
  const bookId = await keepBook(
    serverChengshu(),
    bookDraft({
      token: fields.token,
      name: fields.name,
      subject: subjectOf(req, false),
      chart: null,
      chapters: [],
      contentVersion: RULE_REGISTRY.ref,
    }),
  );

  return { ok: true, kind: 'partial', chart: result.value, bookId };
}
