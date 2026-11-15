import { useEffect, useRef, useState } from 'react';
import { cx } from './ui.tsx';

const SYMBOLS = ['+', '−', '×', '÷', '=', '%', '√', 'π', '∑', '∞', '½', 'x²', '<', '>'];
const EQUATIONS = ['3 × 4 = 12', '9 + 1 = 10', 'a² + b² = c²', 'π ≈ 3.14', '½ + ½ = 1', '12 ÷ 4 = 3', '√16 = 4', 'y = mx + b', '7 × 8 = 56', '2³ = 8', 'x = 7', '10 − 1 = 9'];

interface Particle {
  text: string;
  x: number;
  y: number;
  size: number;
  speed: number;
  sway: number;
  phase: number;
  rot: number;
  spin: number;
  alpha: number;
  color: string;
  hand: boolean;
}

/**
 * Drifting math symbols and equations on a canvas.
 * tone="dark"  → chalk on the charcoal hero.   tone="light" → faint ink behind the page.
 * Fills its nearest positioned parent, or the whole window when `fixed`.
 */
export function MathField({ tone, fixed, density = 1 }: { tone: 'dark' | 'light'; fixed?: boolean; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let particles: Particle[] = [];
    let raf = 0;
    let mouseX = 0;
    let mouseY = 0;
    const dark = tone === 'dark';
    const palette = dark
      ? ['rgba(255,255,255,A)', 'rgba(255,255,255,A)', 'rgba(244,41,65,A)', 'rgba(255,199,38,A)']
      : ['rgba(35,44,51,A)', 'rgba(35,44,51,A)', 'rgba(244,41,65,A)'];

    const make = (anywhere: boolean): Particle => {
      const eq = Math.random() < 0.38;
      const colour = palette[Math.floor(Math.random() * palette.length)];
      const red = colour.includes('244');
      const base = dark ? (eq ? 0.2 : 0.13) : eq ? 0.075 : 0.05;
      return {
        text: eq ? EQUATIONS[Math.floor(Math.random() * EQUATIONS.length)] : SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : h + 40,
        size: eq ? 20 + Math.random() * 16 : 22 + Math.random() * 46,
        speed: 6 + Math.random() * 14,
        sway: 8 + Math.random() * 22,
        phase: Math.random() * Math.PI * 2,
        rot: (Math.random() - 0.5) * 0.5,
        spin: (Math.random() - 0.5) * 0.12,
        alpha: base * (red ? (dark ? 2.2 : 1.6) : 1) * (0.7 + Math.random() * 0.6),
        color: colour,
        hand: eq,
      };
    };

    const resize = () => {
      const r = fixed ? { width: window.innerWidth, height: window.innerHeight } : canvas.parentElement!.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(46, Math.max(8, (w * h) / 26000)) * density);
      particles = Array.from({ length: count }, () => make(true));
      if (reduce) draw(0, 0);
    };

    const draw = (time: number, dt: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y -= p.speed * dt;
        p.rot += p.spin * dt;
        if (p.y < -50) particles[i] = { ...make(false), x: Math.random() * w };
        const depth = p.size / 60;
        const x = p.x + Math.sin(time * 0.4 + p.phase) * p.sway + mouseX * depth * 14;
        const y = p.y + mouseY * depth * 10;
        const twinkle = 0.75 + 0.25 * Math.sin(time * 0.9 + p.phase * 2);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.rot);
        ctx.font = p.hand ? `700 ${p.size}px "Caveat", "Poppins", cursive` : `700 ${p.size}px "Poppins", sans-serif`;
        ctx.fillStyle = p.color.replace('A', (p.alpha * twinkle).toFixed(3));
        ctx.fillText(p.text, 0, 0);
        ctx.restore();
      }
    };

    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      draw(now / 1000, dt);
      raf = requestAnimationFrame(loop);
    };
    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX / window.innerWidth - 0.5;
      mouseY = e.clientY / window.innerHeight - 0.5;
    };
    const onVisible = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(fixed ? document.documentElement : canvas.parentElement!);
    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVisible);
    document.fonts?.ready.then(() => reduce && draw(0, 0));
    if (!reduce) raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [tone, fixed, density]);

  return <canvas ref={ref} aria-hidden className={cx('pointer-events-none', fixed ? 'fixed inset-0 z-0' : 'absolute inset-0 h-full w-full')} />;
}

/** The charcoal "chalkboard" band at the top of a screen. */
export function Hero({ children }: { children: React.ReactNode }) {
  return (
    <section className="hero relative z-10">
      <div className="absolute inset-0 overflow-hidden">
        <div className="hero-grid absolute inset-0" />
        <div className="hero-glow absolute inset-0" />
        <MathField tone="dark" />
      </div>
      <div className="relative mx-auto max-w-6xl px-4 pt-7 pb-8">{children}</div>
      <svg className="hero-edge" viewBox="0 0 1200 14" preserveAspectRatio="none" aria-hidden>
        <path d="M0 7 C 150 1, 300 13, 450 7 S 750 1, 900 7 S 1100 12, 1200 6" />
      </svg>
    </section>
  );
}

/** A number that counts up to its value whenever it changes. */
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setShown(value);
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / duration);
      const v = Math.round(a + (value - a) * (1 - Math.pow(1 - k, 3)));
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{shown}</>;
}

/** Hand-drawn marker underline that draws itself under its children. */
export function Scribble({ children, color = '#f42941' }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      {children}
      <svg className="scribble" viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden>
        <path d="M3 9 C 40 2, 80 12, 120 6 S 180 3, 197 8" stroke={color} />
      </svg>
    </span>
  );
}

/** Product rules written as sums, typed out one after another in marker handwriting. */
export function ProductEquations({ lang }: { lang: 'en' | 'ar' }) {
  const lines =
    lang === 'ar'
      ? ['3 مجموعات × 4 مقاعد = 12', '9 + 1 = 10 ✓', '10 حصص ÷ شهر', 'نوفمبر 10/10 ← ديسمبر 0/10']
      : ['3 pods × 4 seats = 12', '9 + 1 = 10 ✓', '10 lessons ÷ month', 'Nov 10/10 → Dec 0/10'];
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  useEffect(() => {
    const full = lines[i].length;
    const id = setTimeout(
      () => {
        if (n < full) setN(n + 1);
        else {
          setN(0);
          setI((i + 1) % lines.length);
        }
      },
      n < full ? 70 : 1700,
    );
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, n, lang]);
  return (
    <div className="chalk text-5xl text-white/90" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {lines[i].slice(0, n)}
      <span className="chalk-caret" />
    </div>
  );
}
