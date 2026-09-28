'use client';

import { useEffect, useRef } from 'react';
import { HERO } from '@/lib/hero';

/**
 * 窗外會郁嘅星（重新設計第一期）
 *
 * 一塊 canvas 蓋住成幅書房相，但只喺窗入面嗰片天撒星：
 *
 *   一、撒星嘅範圍 = `HERO.sky`（窗嘅方框，由 `make-hero.mjs` 量出）
 *   二、真正嘅邊界 = CSS `mask-image: sky.png` —— 山脊、窗框、燈籠
 *       上面一粒都唔會出，近地平線自己淡走
 *
 * 所以呢度唔使知山喺邊，只要將相嘅座標換成畫面座標。換算要跟返
 * `background-size: cover` 同 `--ye-pos`，否則星同窗會錯開。
 *
 * ⚠ 郁得好慢：星閃（每粒自己嘅節奏）、成片天向右漂（一分鐘幾粒星位）、
 * 間中一粒流星。一個一直喺度郁嘅背景，快少少就會搶走前面啲字。
 *
 * reduced-motion：畫一次，唔郁、冇流星。
 * 唔喺畫面（捲走咗、切咗 tab）：停。
 */

type Star = { x: number; y: number; r: number; a: number; speed: number; phase: number };
type Meteor = { x: number; y: number; vx: number; vy: number; t: number; life: number };

/** 大約每幾多平方 pixel（相嘅座標）一粒星。 */
const DENSITY = 950;
const MAX_STARS = 320;
/** 成片天向右漂，每秒幾多 pixel（相嘅座標）。 */
const DRIFT = 1.2;

export function StarWindow() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    const cx = canvas?.getContext('2d');
    if (!canvas || !host || !cx) return;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const { x0, y0, x1, y1 } = HERO.sky;
    const sw = x1 - x0;
    const sh = y1 - y0;

    /*
     * 用一個固定種子，唔用 Math.random —— 每次入嚟個天都一樣，
     * server 同 client 冇分別，截圖亦都對得返。
     */
    let seed = 20260928;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };

    const stars: Star[] = [];
    const count = Math.min(MAX_STARS, Math.round((sw * sh) / DENSITY));
    for (let i = 0; i < count; i++) {
      /* 細星多、大星少：r 用平方分佈 */
      const k = rand();
      stars.push({
        x: rand() * sw,
        y: rand() * sh,
        r: 0.35 + k * k * 1.25,
        a: 0.35 + rand() * 0.6,
        speed: 0.4 + rand() * 1.4,
        phase: rand() * Math.PI * 2,
      });
    }

    let meteor: Meteor | null = null;
    let nextMeteor = 6 + rand() * 10;

    /* 相座標 → 畫面座標（跟 background-size: cover ＋ --ye-pos） */
    let scale = 1;
    let ox = 0;
    let oy = 0;
    let dpr = 1;

    function layout() {
      const w = host!.clientWidth;
      const h = host!.clientHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);

      scale = Math.max(w / HERO.width, h / HERO.height);
      const [px, py] = position(getComputedStyle(host!).getPropertyValue('--ye-pos'));
      ox = (w - HERO.width * scale) * px;
      oy = (h - HERO.height * scale) * py;
    }

    function draw(time: number) {
      const t = time / 1000;
      cx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx!.clearRect(0, 0, canvas!.width, canvas!.height);

      const drift = still ? 0 : (t * DRIFT) % sw;

      for (const s of stars) {
        const twinkle = still ? 1 : 0.55 + 0.45 * Math.sin(t * s.speed + s.phase);
        const x = ox + (x0 + ((s.x + drift) % sw)) * scale;
        const y = oy + (y0 + s.y) * scale;
        cx!.globalAlpha = s.a * twinkle;
        cx!.fillStyle = '#f4efe4';
        cx!.beginPath();
        cx!.arc(x, y, s.r * Math.max(1, scale * 0.9), 0, Math.PI * 2);
        cx!.fill();
      }

      if (meteor) {
        const m = meteor;
        const p = m.t / m.life;
        const hx = ox + m.x * scale;
        const hy = oy + m.y * scale;
        const tail = 70 * scale;
        const g = cx!.createLinearGradient(hx, hy, hx - m.vx * tail, hy - m.vy * tail);
        g.addColorStop(0, `rgba(244,239,228,${0.9 * (1 - p)})`);
        g.addColorStop(1, 'rgba(244,239,228,0)');
        cx!.globalAlpha = 1;
        cx!.strokeStyle = g;
        cx!.lineWidth = 1.2;
        cx!.beginPath();
        cx!.moveTo(hx, hy);
        cx!.lineTo(hx - m.vx * tail, hy - m.vy * tail);
        cx!.stroke();
      }
      cx!.globalAlpha = 1;
    }

    let raf = 0;
    let last = 0;
    let running = false;

    function frame(time: number) {
      const dt = last ? Math.min(0.1, (time - last) / 1000) : 0;
      last = time;

      nextMeteor -= dt;
      if (!meteor && nextMeteor <= 0) {
        meteor = {
          x: x0 + sw * (0.2 + rand() * 0.6),
          y: y0 + sh * (0.05 + rand() * 0.3),
          vx: 0.82,
          vy: 0.42,
          t: 0,
          life: 0.9,
        };
        nextMeteor = 14 + rand() * 18;
      }
      if (meteor) {
        meteor.t += dt;
        meteor.x += meteor.vx * 260 * dt;
        meteor.y += meteor.vy * 260 * dt;
        if (meteor.t >= meteor.life) meteor = null;
      }

      draw(time);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running || still) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    layout();
    draw(0);

    const onResize = () => {
      layout();
      if (!running) draw(performance.now());
    };
    window.addEventListener('resize', onResize);

    /* 捲走咗或者切咗 tab 就停 —— 冇人睇嘅星唔使閃。 */
    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      if (visible && !document.hidden) start();
      else stop();
    });
    io.observe(host);

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (visible) start();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="ye-xing" />;
}

/** "72% 30%" → [0.72, 0.3]。唔係百分比嘅（center、px）當置中。 */
function position(value: string): [number, number] {
  const parts = value.trim().split(/\s+/);
  const pct = (v: string | undefined) => (v?.endsWith('%') ? Number.parseFloat(v) / 100 : 0.5);
  return [pct(parts[0]), pct(parts[1] ?? parts[0])];
}
