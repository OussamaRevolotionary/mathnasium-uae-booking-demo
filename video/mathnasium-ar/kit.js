/**
 * Shared scene kit for the Mathnasium explainer films (OpenFilm pages).
 * Every scene is a pure function of time: frame(t) sets styles from t only.
 */
const W = 1920;
const H = 1080;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const out = (x) => 1 - Math.pow(1 - clamp(x), 3);
/** 0→1 between a and b seconds, eased. */
const ramp = (t, a, b, fn = out) => fn(clamp((t - a) / (b - a)));
const lerp = (a, b, k) => a + (b - a) * k;

const el = (tag, cls, parent, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  parent?.appendChild(e);
  return e;
};
const img = (src, cls, parent) => {
  const i = el('img', cls, parent);
  i.src = src;
  i.decoding = 'sync';
  return i;
};
const lines = (s) => s.split('\n').map((l) => `<span class="line"><span>${l}</span></span>`).join('');

function backdrop(root) {
  const bg = el('div', 'bg', root);
  const a = el('div', 'blob red', bg);
  const b = el('div', 'blob gold', bg);
  const glyphs = el('div', 'glyphs', bg, ['+', '÷', '×', '−', '=', '%', '√', 'π', '∑', '½', '∞', 'x²'].map((g) => `<i>${g}</i>`).join(''));
  return (t) => {
    a.style.translate = `${Math.sin(t * 0.25) * 60}px ${Math.cos(t * 0.2) * 40}px`;
    b.style.translate = `${Math.cos(t * 0.22) * 70}px ${Math.sin(t * 0.18) * 50}px`;
    glyphs.style.translate = `0 ${-t * 6}px`;
  };
}

function ready() {
  const imgs = [...document.images].map((i) => (i.complete ? i.decode().catch(() => {}) : new Promise((r) => ((i.onload = () => i.decode().then(r, r)), (i.onerror = r)))));
  return Promise.all([document.fonts.ready, ...imgs]).then(() => document.fonts.ready);
}

function logo(parent, cls = '') {
  const box = el('div', `logo ${cls}`, parent);
  const word = img('../assets/brand/logo-wordmark-layer.png', 'word', box);
  const aplus = img('../assets/brand/logo-aplus-layer.png', 'aplus', box);
  /** p: 0→1 draw-in progress */
  return (p) => {
    const w = clamp(p / 0.6);
    word.style.clipPath = `inset(0 ${(1 - out(w)) * 100}% 0 0)`;
    word.style.opacity = clamp(w * 3);
    const a = clamp((p - 0.25) / 0.75);
    const k = out(a);
    aplus.style.opacity = clamp(a * 4);
    aplus.style.clipPath = `polygon(0 ${100 - k * 140}%, 140% ${100 - k * 140}%, 140% 100%, 0 100%)`;
    aplus.style.rotate = `${lerp(-12, 0, k) + Math.sin(k * Math.PI) * 4}deg`;
    aplus.style.scale = `${lerp(1.3, 1, k)}`;
  };
}

/** Brand card: intro / outro. */
function brand(cfg, root) {
  const drawBg = backdrop(root);
  const wrap = el('div', 'brand', root);
  const drawLogo = logo(wrap, 'big');
  const chip = el('div', 'chip', wrap, cfg.chip);
  const head = el('h1', cfg.outro ? 'head latin' : 'head', wrap, lines(cfg.head));
  const sub = el('p', 'sub', wrap, cfg.sub);
  const rule = el('div', 'rule', wrap);
  const D = cfg.duration;
  return (t) => {
    drawBg(t);
    drawLogo(ramp(t, 0.15, 1.7, (x) => x));
    chip.style.opacity = ramp(t, 1.0, 1.5);
    chip.style.translate = `0 ${(1 - ramp(t, 1.0, 1.5)) * 16}px`;
    [...head.querySelectorAll('.line > span')].forEach((s, i) => {
      const k = ramp(t, 1.25 + i * 0.16, 1.95 + i * 0.16);
      s.style.translate = `0 ${(1 - k) * 110}%`;
      s.style.opacity = k;
    });
    sub.style.opacity = ramp(t, 1.9, 2.5);
    rule.style.scale = `${ramp(t, 2.0, 2.8)} 1`;
    const exit = cfg.outro ? 1 : 1 - ramp(t, D - 0.45, D - 0.05, ease);
    wrap.style.opacity = exit;
    wrap.style.scale = `${lerp(0.97, 1, exit)}`;
  };
}

/** Screen scene: a framed screenshot the camera explores, with words beside it. */
function screen(cfg, root) {
  const drawBg = backdrop(root);
  const D = cfg.duration;
  const VW = 1184;
  const VH = 740;

  const top = el('div', 'top', root);
  const drawLogo = logo(top, 'small');
  drawLogo(1);
  el('div', 'count', top, `<b>${String(cfg.index).padStart(2, '0')}</b> / ${String(cfg.total).padStart(2, '0')}`);

  const card = el('div', 'card', root);
  const bar = el('div', 'bar', card, '<i></i><i></i><i></i>');
  el('span', 'url', bar, cfg.barLabel);
  const view = el('div', 'view', card);
  const shots = [cfg.shot, cfg.shot2].filter(Boolean).map((s) => img(`../assets/shots/${s}.jpg`, 'shot', view));
  const ring = el('div', 'ring', view);

  const text = el('div', 'text', root);
  const chip = el('div', 'chip', text, cfg.chip);
  const head = el('h1', 'head', text, lines(cfg.head));
  const sub = el('p', 'sub', text, cfg.sub);
  const prog = el('div', 'prog', text, Array.from({ length: cfg.total }, (_, i) => `<i class="${i < cfg.index ? 'on' : ''}"></i>`).join(''));

  // Camera plan per half: overview, then visit each focus rect.
  const halves = shots.map((_, h) => {
    const from = h === 0 ? 0 : D * 0.5;
    const to = shots.length === 1 || h === 1 ? D : D * 0.5;
    const rects = (h === 0 ? cfg.rects : cfg.rects2) ?? [];
    const overview = Math.min(1.3, (to - from) * 0.24);
    const each = rects.length ? (to - from - overview) / rects.length : 0;
    const keys = [{ t: from, z: 1, cx: 0.5, cy: 0.5, r: null }];
    rects.forEach((r, i) => {
      const z = clamp(0.78 * Math.min(1 / r[2], 1 / r[3]), 1.12, 2.3);
      keys.push({ t: from + overview + i * each, z, cx: r[0] + r[2] / 2, cy: r[1] + r[3] / 2, r });
    });
    return { from, to, keys };
  });

  const camAt = (half, t) => {
    const ks = half.keys;
    let i = 0;
    while (i < ks.length - 1 && t >= ks[i + 1].t) i++;
    const cur = ks[i];
    const prev = ks[Math.max(0, i - 1)];
    const k = i === 0 ? 1 : ramp(t, cur.t, cur.t + 0.95, ease);
    return { z: lerp(prev.z, cur.z, k), cx: lerp(prev.cx, cur.cx, k), cy: lerp(prev.cy, cur.cy, k), r: cur.r, since: t - cur.t, k };
  };

  return (t) => {
    drawBg(t);
    const enter = ramp(t, 0.0, 0.7);
    const exit = 1 - ramp(t, D - 0.4, D - 0.02, ease);
    card.style.opacity = enter * exit;
    card.style.translate = `0 ${(1 - enter) * 60 + (1 - exit) * -24}px`;
    card.style.scale = `${lerp(0.96, 1, enter)}`;

    const hIdx = shots.length > 1 && t >= D * 0.5 ? 1 : 0;
    const cam = camAt(halves[hIdx], t);
    const z = cam.z;
    const tx = clamp(VW / 2 - cam.cx * VW * z, VW - VW * z, 0);
    const ty = clamp(VH / 2 - cam.cy * VH * z, VH - VH * z, 0);
    shots.forEach((s, i) => {
      s.style.transform = `translate(${tx}px, ${ty}px) scale(${z})`;
      s.style.opacity = i === 0 ? 1 : ramp(t, D * 0.5 - 0.25, D * 0.5 + 0.25, ease);
    });
    if (cam.r) {
      const [x, y, w, h] = cam.r;
      const pad = 8;
      ring.style.left = `${tx + x * VW * z - pad}px`;
      ring.style.top = `${ty + y * VH * z - pad}px`;
      ring.style.width = `${w * VW * z + pad * 2}px`;
      ring.style.height = `${h * VH * z + pad * 2}px`;
      const show = ramp(cam.since, 0.7, 1.15);
      ring.style.opacity = show * (0.75 + 0.25 * Math.sin(cam.since * 3.2));
      ring.style.scale = `${lerp(1.06, 1, show)}`;
    } else ring.style.opacity = 0;

    const tin = (a) => ramp(t, a, a + 0.6) * exit;
    chip.style.opacity = tin(0.25);
    chip.style.translate = `0 ${(1 - ramp(t, 0.25, 0.85)) * 14}px`;
    [...head.querySelectorAll('.line > span')].forEach((s, i) => {
      const k = ramp(t, 0.4 + i * 0.14, 1.1 + i * 0.14);
      s.style.translate = `0 ${(1 - k) * 110}%`;
      s.style.opacity = k * exit;
    });
    sub.style.opacity = tin(0.95);
    sub.style.translate = `0 ${(1 - ramp(t, 0.95, 1.55)) * 14}px`;
    prog.style.opacity = tin(1.1);
    top.style.opacity = 1;
  };
}

export function scene(cfg) {
  document.documentElement.lang = cfg.lang;
  document.documentElement.dir = cfg.lang === 'ar' ? 'rtl' : 'ltr';
  const root = el('div', `stage ${cfg.lang}`, document.body);
  root.style.width = `${W}px`;
  root.style.height = `${H}px`;
  const draw = cfg.kind === 'brand' ? brand(cfg, root) : screen(cfg, root);
  window.film = { frame: (t) => draw(clamp(t, 0, cfg.duration)), duration: cfg.duration, ready: ready() };
  draw(0);
}
