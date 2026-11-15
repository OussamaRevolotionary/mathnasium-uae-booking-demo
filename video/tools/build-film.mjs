/**
 * Builds an OpenFilm project per language from scenes.mjs, the captured screens and the narration.
 * Usage: node build-film.mjs [en|ar]      → ../mathnasium-en, ../mathnasium-ar
 * Scene lengths follow the narration, so swapping a voice clip re-times the film.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { SCENES } from './scenes.mjs';

const here = import.meta.dirname;
const root = path.resolve(here, '..');
const repo = path.resolve(root, '..');
const ffprobe = path.join(here, 'node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe');
const ffmpeg = path.join(here, 'node_modules/ffmpeg-static/ffmpeg.exe');
const dur = (f) => Number(execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());
const cp = (a, b) => (fs.mkdirSync(path.dirname(b), { recursive: true }), fs.copyFileSync(a, b));
const r3 = (n) => Math.round(n * 1000) / 1000;

const VO_LEAD = 0.5; // narration starts this long into its scene
const TAIL = 0.75; // breathing room after the last word

for (const lang of ['en', 'ar']) {
  if (process.argv[2] && process.argv[2] !== lang) continue;
  const out = path.join(root, `mathnasium-${lang}`);
  const rects = JSON.parse(fs.readFileSync(path.join(root, 'shots', lang, 'rects.json'), 'utf8'));
  fs.mkdirSync(path.join(out, 'scenes'), { recursive: true });

  // shared files
  cp(path.join(here, 'kit/kit.js'), path.join(out, 'kit.js'));
  cp(path.join(here, 'kit/kit.css'), path.join(out, 'kit.css'));
  for (const f of ['logo-wordmark-layer.png', 'logo-aplus-layer.png']) cp(path.join(repo, 'public/brand', f), path.join(out, 'assets/brand', f));
  for (const [pkg, sub, ws] of [['poppins', 'latin', [500, 600, 700]], ['tajawal', 'arabic', [500, 700, 800]]])
    for (const w of ws) cp(path.join(here, `node_modules/@fontsource/${pkg}/files/${pkg}-${sub}-${w}-normal.woff2`), path.join(out, `assets/fonts/${pkg}-${w}.woff2`));
  const music = path.join(root, 'music.mp3');
  if (fs.existsSync(music)) cp(music, path.join(out, 'assets/music.mp3'));

  // screens → jpg (keeps the project light)
  const used = new Set(SCENES.flatMap((s) => [s.shot, s.shot2]).filter(Boolean));
  for (const s of used) {
    const dst = path.join(out, 'assets/shots', `${s}.jpg`);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    execFileSync(ffmpeg, ['-y', '-v', 'error', '-i', path.join(root, 'shots', lang, `${s}.png`), '-q:v', '2', dst]);
  }

  let at = 0;
  const clips = [];
  const audio = [];
  const total = SCENES.length;
  SCENES.forEach((s, i) => {
    const voSrc = path.join(root, 'vo', lang, `${s.id}.mp3`);
    const hasVo = fs.existsSync(voSrc);
    const voLen = hasVo ? dur(voSrc) : 0;
    const duration = r3(Math.max(hasVo ? VO_LEAD + voLen + TAIL : 0, s.kind === 'brand' ? 5 : 6.5) + (s.outro ? 1.2 : 0));
    if (hasVo) {
      cp(voSrc, path.join(out, 'assets/vo', `${s.id}.mp3`));
      audio.push(`  <audio id="vo-${s.id}" src="assets/vo/${s.id}.mp3" at="${r3(at + VO_LEAD)}"></audio>`);
    }
    const pick = (keys, shot) => (keys ?? []).map((k) => rects[shot]?.[k]).filter(Boolean);
    const cfg = {
      lang,
      kind: s.kind ?? 'screen',
      outro: !!s.outro,
      duration,
      index: i + 1,
      total,
      chip: s.chip[lang],
      head: s.head[lang],
      sub: s.sub[lang],
      shot: s.shot,
      shot2: s.shot2,
      rects: pick(s.focus, s.shot),
      rects2: pick(s.focus2, s.shot2),
      barLabel: /dash|roster|centers/.test(s.id) ? (lang === 'ar' ? 'ماثنيزيوم · لوحة المركز' : 'Mathnasium · Center dashboard') : lang === 'ar' ? 'ماثنيزيوم · بوابة أولياء الأمور' : 'Mathnasium · Parent portal',
    };
    fs.writeFileSync(
      path.join(out, 'scenes', `${s.id}.html`),
      `<!doctype html>
<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="../kit.css">
</head>
<body>
<script type="module">
import { scene } from '../kit.js';
scene(${JSON.stringify(cfg, null, 1)});
</script>
</body>
</html>
`,
    );
    clips.push(`  <iframe id="s-${s.id}" src="scenes/${s.id}.html" at="${r3(at)}"></iframe>`);
    at = r3(at + duration);
  });

  const hasMusic = fs.existsSync(path.join(out, 'assets/music.mp3'));
  // The music is a loop: lay it end to end under the whole film, fading in and out.
  const bed = [];
  if (hasMusic) {
    const loop = Math.floor(dur(path.join(out, 'assets/music.mp3')) * 1000) / 1000;
    for (let t = 0, i = 0; t < at - 0.05; t = r3(t + loop), i++) {
      const len = Math.min(loop, r3(at - t));
      const last = t + loop >= at - 0.05;
      const fade = i === 0 ? (last ? [1.2, 2.5] : [1.2, 0]) : last ? [0, Math.min(2.5, len)] : null;
      bed.push(`  <audio id="music-${i + 1}" src="assets/music.mp3#t=0,${len}" at="${t}" volume="0.2"${fade ? ` overrides='[{"fade":[${fade}]}]'` : ''}></audio>`);
    }
  }
  fs.writeFileSync(
    path.join(out, 'film.html'),
    `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1920, height=1080">
</head>
<body>
<section>
${clips.join('\n')}
</section>
<section>
${audio.join('\n')}
</section>${hasMusic ? `\n<section>\n${bed.join('\n')}\n</section>` : ''}
</body>
</html>
`,
  );
  console.log(lang, 'film length', at, 's ·', clips.length, 'scenes ·', audio.length, 'voice clips', hasMusic ? '· music' : '· no music yet');
}
