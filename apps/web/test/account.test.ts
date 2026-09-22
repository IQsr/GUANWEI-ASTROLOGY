import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  DELETE_COPY,
  DELETE_KEEPS,
  DELETE_PHRASE,
  DELETE_REMOVES,
  EXPORT_NOTE,
  RECAST_COPY,
  canDelete,
  exportFilename,
  recastHref,
  recastRows,
} from '@/lib/account';
import type { Pinned } from '@/lib/chongpai';

/**
 * 設定（工單 G4 · 架構 §10 · R-008）
 */

const SRC = fileURLToPath(new URL('../src', import.meta.url));

function walk(d: string): string[] {
  return readdirSync(d).flatMap((n) => {
    const full = join(d, n);
    return statSync(full).isDirectory() ? walk(full) : /\.tsx?$/.test(n) ? [full] : [];
  });
}

function bare(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const NOW: Pinned = { engine: '0.3.0', school: 'zhongzhou-v1@aaa', content: 'r1@bbb' };

describe('⚠ 匯出檔個名唔准帶生辰', () => {
  /**
   * 一個叫 `思協-1996-06-16.json` 嘅檔會出現喺下載夾、「最近檔案」、
   * 同埋佢下次分享嗰陣個檔案揀選器 —— 三個我哋控制唔到嘅地方。
   */
  it('得一個日期，冇名冇生辰', () => {
    expect(exportFilename(new Date('2026-09-22T10:00:00Z'))).toBe('guanwei-20260922.json');
  });

  it('個名冇任何一個位畀人塞嘢入去', () => {
    const name = exportFilename(new Date('2026-01-02T00:00:00Z'));
    expect(name).toMatch(/^guanwei-\d{8}\.json$/);
  });

  /** ⚠ 匯出檔要講得出自己入面冇乜 —— 否則 null 讀落似我哋整爛咗。 */
  it('講明未買嘅章點解係 null', () => {
    expect(EXPORT_NOTE).toContain('null');
    expect(EXPORT_NOTE).toContain('還沒有購買');
  });
});

describe('⚠ 重排：R-008 三條配套', () => {
  it('同而家一樣就冇差異', () => {
    const rows = recastRows([{ bookId: 'b1', title: '思協命書', pinned: NOW }], NOW);
    expect(rows[0]!.drift).toEqual([]);
    expect(rows[0]!.unknown).toBe(false);
  });

  it('差咗就逐樣列出嚟', () => {
    const old: Pinned = { engine: '0.2.0', school: 'zhongzhou-v1@old', content: 'r1@old' };
    const rows = recastRows([{ bookId: 'b1', title: '思協命書', pinned: old }], NOW);
    expect(rows[0]!.drift).toHaveLength(3);
  });

  /** 「冇差異」同「答唔到」唔同（`chongpai.ts` 嗰條規矩）。 */
  it('講唔出自己邊一版排嘅，標做 unknown，唔當佢一樣', () => {
    const rows = recastRows([{ bookId: 'b1', title: null, pinned: null }], NOW);
    expect(rows[0]!.unknown).toBe(true);
    expect(rows[0]!.title).toBe('未題名');
    expect(RECAST_COPY.unknown).not.toContain('和現在一樣。');
  });

  /**
   * ⚠ 重排係造一本**新書**，唔係改舊嗰本。
   *
   * 舊嗰本要仲喺度 —— 否則「唔自動改」只係將同一件事推遲咗一下。
   */
  it('重排去落款開新書，唔係去一個編輯畫面', () => {
    expect(recastHref('b1')).toBe('/cast?from=b1');
    expect(recastHref('b1')).not.toContain('/book/');
  });

  /** 嗰句要同時講三件事：舊嗰本唔變、新嗰本係另一本、兩本都留低。 */
  it('嗰句講齊三件事', () => {
    expect(RECAST_COPY.action).toContain('這一本不會變');
    expect(RECAST_COPY.action).toContain('再排一本');
    expect(RECAST_COPY.action).toContain('兩本都會留在書齋');
  });

  /**
   * ⚠ 呢一層唔識改嘢 —— 同 `chongpai.ts` 一樣。
   * 一個識改嘅 module，遲早會有人喺一個 loading 入面叫佢。
   */
  it('冇 recast / upgrade / sync 呢類 function', () => {
    const code = bare(join(SRC, 'lib', 'account.ts'));
    expect(code).not.toMatch(/function\s+(recast|upgrade|sync|apply|migrate)\s*\(/i);
  });

  it('全站冇任何地方改舊書嘅 engine_version', () => {
    const offenders = walk(SRC).filter((f) =>
      /update\s*\(\s*\{\s*engine_version|set\s+engine_version/i.test(bare(f)),
    );
    expect(offenders).toEqual([]);
  });
});

describe('⚠ 刪除要打字，唔係撳一下', () => {
  /**
   * 唔係為咗嚇人 —— 係因為呢個動作真係冇得返轉頭。
   * 一個「你確定嗎？」對話框，喺一個已經撳咗一下嘅人面前，
   * 基本上係一個要撳多一下嘅掣。
   */
  it('打啱兩個字先做得到', () => {
    expect(canDelete(DELETE_PHRASE)).toBe(true);
    expect(canDelete(' 刪除 ')).toBe(true);
    expect(canDelete('')).toBe(false);
    expect(canDelete('刪')).toBe(false);
    expect(canDelete('delete')).toBe(false);
    expect(canDelete('刪除我嘅資料')).toBe(false);
  });
});

describe('⚠ 刪之前要講清楚邊樣冇咗、邊樣留低', () => {
  /**
   * 一句「我哋會刪除你所有資料」而實際上留咗一行，就係一句大話。
   * 所以兩張表寫喺 code 度，唔係散喺版面文案入面。
   */
  it('兩張表都唔空', () => {
    expect(DELETE_REMOVES.length).toBeGreaterThanOrEqual(3);
    expect(DELETE_KEEPS.length).toBeGreaterThanOrEqual(1);
  });

  it('生辰、盤、書逐樣點名', () => {
    const joined = DELETE_REMOVES.join('｜');
    for (const word of ['生辰', '盤', '書']) {
      expect(joined, word).toContain(word);
    }
  });

  /** ⚠ 留低嗰行要講得出佢係乜、點解留、同埋佢認唔返邊個。 */
  it('留低嗰樣唔含糊', () => {
    const kept = DELETE_KEEPS.join('｜');
    expect(kept).toContain('付款記錄');
    expect(kept).toContain('不連到任何人');
    expect(kept).toContain('會計');
  });
});

describe('⚠ 「刪咗」同「刪咗一半」唔可以講同一句', () => {
  /**
   * 真刪係兩步：DB 嗰邊 cascade，auth 嗰邊 admin.deleteUser。
   * 第二步要 service_role，而佢可以仆街 —— 剩低個 email。
   *
   * 報「已經全部刪除」就係一句大話，而嗰句大話嘅代價係
   * 佢以為自己個 email 冇咗，實情係仲喺度。
   */
  it('三個結果三句唔同嘅嘢', () => {
    const lines = Object.values(DELETE_COPY);
    expect(new Set(lines).size).toBe(3);
  });

  it('partial 要明講個電郵仲喺度', () => {
    expect(DELETE_COPY.partial).toContain('電郵');
    expect(DELETE_COPY.partial).not.toContain('全部刪除');
  });

  /** failed 要講明「一樣嘢都冇刪」—— 否則佢會以為刪咗一半。 */
  it('failed 要講明冇刪過任何嘢', () => {
    expect(DELETE_COPY.failed).toContain('沒有任何東西被刪除');
  });
});

describe('⚠ 真刪唔准變成標記刪除', () => {
  /**
   * 架構 §10 特別寫明。標記刪除係最容易滑落去嗰個做法：
   * 佢一樣令個人見唔到自己啲嘢，而且「萬一佢想恢復呢」聽落好體貼。
   * 但一個標記咗刪除嘅生辰，仲係一個我哋揸住嘅生辰。
   *
   * DB 嗰邊有一條測試掃 `information_schema`（`packages/db`），
   * 呢條掃 source：冇人喺 app 層面自己整一個「軟刪除」出嚟。
   */
  it('全 src 冇 deleted_at / is_deleted / archived', () => {
    const offenders = walk(SRC).filter((f) =>
      /deleted_at|is_deleted|isDeleted|archived_at|soft.?delete/i.test(bare(f)),
    );
    expect(offenders).toEqual([]);
  });

  it('掃得到嘢', () => {
    expect(walk(SRC).length).toBeGreaterThan(30);
  });
});
