import { spawn, execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

/**
 * 驗收腳本用嘅 server（工單 G6）
 *
 * ⚠ 呢個檔存在嘅原因係一個真 bug：九個驗收腳本喺 Windows 上面
 * **一個都行唔到**。
 *
 * 每個腳本本來都係自己寫一次：
 *
 *   spawn('npx', ['next', 'start', …], { detached: true })
 *   …
 *   process.kill(-server.pid)
 *
 * 兩句喺 Windows 都唔得：
 *
 * 一、`npx` 喺 Windows 係 `npx.cmd`。Node 由 v18.20 / v20.12 起
 *     唔准喺冇 shell 之下 spawn 一個 `.cmd`（CVE-2024-27980），
 *     所以掟 `spawn npx ENOENT` —— 個訊息一個字都冇提 Windows。
 *
 * 二、`process.kill(-pid)` 係 POSIX 嘅「殺成個 process group」。
 *     Windows 冇 process group，而且經 shell 起嘅話 `server.pid`
 *     係 cmd.exe，殺咗佢個 node 會變孤兒 —— 下次跑就會撞到
 *     「port 已經有人用」，而嗰個錯同今次呢個完全唔似。
 *
 * ⚠ 老實講：**Windows 嗰條路我跑唔到。** 呢個容器係 Linux。
 * POSIX 嗰邊同以前一模一樣（九層照樣綠），Windows 嗰邊係照住
 * 上面兩條寫嘅，未驗過。
 */

const WIN = process.platform === 'win32';

/** 起一個 production server，回一個 handle。 */
export function startServer(port) {
  const child = spawn('npx', ['next', 'start', '-p', String(port)], {
    stdio: 'ignore',
    /* POSIX：自成一個 group，收工嗰陣一次過殺埋啲仔。 */
    detached: !WIN,
    /* Windows：要行過 shell 先搵得到 npx.cmd。 */
    shell: WIN,
  });

  /*
   * ⚠ 接住 spawn 自己嘅 error。
   *
   * 唔接嘅話佢係一個 unhandled 'error' event —— 成個 process 即刻死，
   * 掟一段 stack trace 出嚟，而**前面幾層掃描嘅結果一條都唔會印**。
   * 一個一撞到就 crash 嘅驗收腳本，報唔到佢捉到乜（E5 嗰次已經學過一次）。
   */
  child.on('error', (err) => {
    console.error(`✗ 起唔到 server（${process.platform}）：${err.message}`);
    process.exit(1);
  });

  return child;
}

/** 收工。⚠ 要連埋啲仔一齊殺，否則下次撞到「port 有人用」。 */
export function stopServer(child) {
  if (!child?.pid) return;
  try {
    if (WIN) {
      execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      process.kill(-child.pid);
    }
  } catch {
    /* 已經死咗就算數 —— 收工嗰陣唔應該再掟嘢。 */
  }
}

/**
 * 開一個 Chromium（工單 G6）
 *
 * ⚠ 呢一段之前係七個檔各自寫一次：
 *
 *     chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
 *
 * 嗰條路淨係喺開發用嗰個容器度存在。即係話**九層驗收掃描由第一日起
 * 就只喺一部機上面行得到** —— 唔係 Windows 行唔到，係除咗嗰個容器
 * 邊度都行唔到，連 CI 都係。而冇人發現，因為冇人喺第二度跑過。
 *
 * 而家預設交返畀 Playwright 自己搵（`playwright install chromium`
 * 之後就搵得到）。要指定就設 `GUANWEI_CHROMIUM`。
 */
export async function launchBrowser() {
  const exe = process.env.GUANWEI_CHROMIUM;
  try {
    return await chromium.launch(exe ? { executablePath: exe } : {});
  } catch (err) {
    console.error('✗ 開唔到 Chromium：' + String(err).split('\n')[0]);
    console.error('  裝一個：pnpm --filter @guanwei/web exec playwright install chromium');
    console.error('  或者指定一個：GUANWEI_CHROMIUM=<路徑>');
    process.exit(1);
  }
}
