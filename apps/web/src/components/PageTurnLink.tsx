'use client';

import { type ComponentProps, type MouseEvent } from 'react';
import { Link, useRouter } from '@/i18n/navigation';

/**
 * 翻頁連結（書桌閱讀）
 *
 * 喺本書入面由一頁去另一頁（上一章、下一章、目次入面嘅一章、展卷嘅「讀下去」），
 * 唔好一下跳咗過去 —— 一頁紙繞住書脊翻過去。
 *
 *   `next`　右頁向左翻（向前讀）
 *   `prev`　左頁向右翻（翻返轉頭）
 *
 * ── 2026-09 重做（Issac：翻頁「lag 一 lag、彈一彈」）──
 *
 * 舊做法係喺本書加 `data-fanye`，用 `::after` 畫一張**白紙**翻過去，翻完（650ms）先 `router.push`。
 * 量出嚟嘅問題全部喺動畫本身，唔喺網絡（server 70ms 就回，唔使等）：
 *   一、翻嗰張係白紙，一撳落去右頁啲字即刻冇咗；紙揭起之後，下面見返**舊**嗰章
 *   二、透視令張紙凸出本書上下各約一百 px —— 睇落好似彈出嚟
 *   三、紙落地冚住成個左頁，命盤閃走一下
 *   四、650ms 之後新章先一次過換晒
 *
 * 而家：
 *   · 翻嗰頁係**真嗰頁嘅複製**：正面係而家嗰頁（字喺上面），背面係佢落地之後應該見到嘅嗰頁
 *   · **一撳就轉頁**：新章喺紙下面砌好，紙揭起就見到新嘢
 *   · 張紙喺一個同本書一樣大、`overflow: hidden` 嘅框入面翻，透視拉遠 —— 唔會凸出本書
 *   · 被翻嗰邊嘅舊字（仲未換走嗰陣）收起，唔會喺紙下面閃返出嚟
 *
 * 照舊係一條真嘅 `<a>`：新分頁開、右鍵、鍵盤、冇 JS 都照行。
 * reduced-motion：唔翻，即刻去。
 */
export const TURN_MS = 700;

/** 翻緊頁嗰陣，本書身上嘅標記。新一頁砌好（`BookSpread`）就拎走，被遮住嘅舊字先會再出。 */
export const TURNING_ATTR = 'data-turning';

function clonePage(page: Element): HTMLElement {
  const copy = page.cloneNode(true) as HTMLElement;
  copy.removeAttribute('id');
  copy.setAttribute('aria-hidden', 'true');
  copy.setAttribute('inert', '');
  copy.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  return copy;
}

/**
 * 喺 `document.body` 度砌一頁紙，蓋喺本書上面翻。
 *
 * ⚠ 唔放喺本書入面：轉頁嗰陣 React 會重畫本書，一個由我哋手動加落去嘅節點
 * 唔應該同佢爭。放喺 body，同本書對齊，翻完自己拆。
 */
function turnLeaf(book: HTMLElement, direction: 'next' | 'prev') {
  const left = book.querySelector<HTMLElement>('.shuzhuo-zuo');
  const right = book.querySelector<HTMLElement>('.shuzhuo-you');
  if (!right) return;
  const single = !left || getComputedStyle(left).display === 'none';
  const box = book.getBoundingClientRect();

  const stage = document.createElement('div');
  stage.className = 'fanye-tai';
  Object.assign(stage.style, {
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
  });

  const leaf = document.createElement('div');
  leaf.className = 'fanye-ye';
  leaf.dataset.dir = single ? 'single' : direction;

  const face = (cls: string, page: HTMLElement | null) => {
    const f = document.createElement('div');
    f.className = `fanye-mian ${cls}`;
    if (page) {
      const copy = clonePage(page);
      f.appendChild(copy);
      /* 複製品要停喺同一個捲動位，唔係由頂讀起 */
      queueMicrotask(() => (copy.scrollTop = page.scrollTop));
    }
    return f;
  };

  /*
   * 正面：被揭起嗰頁（向前 = 右頁、翻返轉頭 = 左頁、手機 = 唯一嗰頁）。
   * 背面：佢落地之後應該見到嘅嗰頁。向前翻，落地喺左頁 —— 左頁係命盤，同一本書一樣，
   * 所以用左頁嘅複製；翻返轉頭落地喺右頁，而新嗰頁未知，用白紙，落地前淡走。
   */
  const front = direction === 'prev' && !single ? left : right;
  const back = direction === 'next' && !single ? left : null;
  leaf.appendChild(face('fanye-zheng', front));
  leaf.appendChild(face('fanye-bei', back));
  stage.appendChild(leaf);
  document.body.appendChild(stage);

  /* 被翻嗰邊嘅舊字收起：紙揭起之後，下面只會見到新嘢（或者白紙，等新嘢到） */
  book.setAttribute(TURNING_ATTR, single ? 'single' : direction);
  /* 保險：新一頁一直唔到（斷線、撳錯），幾秒之後放返舊字出嚟，本書唔會一直卡住 */
  window.setTimeout(() => book.removeAttribute(TURNING_ATTR), 4000);

  const done = () => {
    stage.remove();
    window.clearTimeout(guard);
  };
  leaf.addEventListener('animationend', done, { once: true });
  const guard = window.setTimeout(done, TURN_MS + 400);
}

export function PageTurnLink({
  direction = 'next',
  href,
  onClick,
  ...rest
}: ComponentProps<typeof Link> & { direction?: 'next' | 'prev'; href: string }) {
  const router = useRouter();

  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    /* 新分頁、新視窗、中鍵：交返畀瀏覽器 */
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const book =
      e.currentTarget.closest<HTMLElement>('.shuzhuo-shu') ?? document.querySelector<HTMLElement>('.shuzhuo-shu');
    if (!book || book.hasAttribute(TURNING_ATTR)) {
      if (book) e.preventDefault();
      return;
    }

    e.preventDefault();
    turnLeaf(book, direction);
    /* 一撳就轉：新一頁喺張紙下面砌，紙揭起就見到 */
    router.push(href);
  };

  return <Link href={href} onClick={handle} {...rest} />;
}
