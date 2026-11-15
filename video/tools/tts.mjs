// Generates one narration clip per scene. Skips clips that already exist, so re-running costs nothing.
import fs from 'node:fs';
import path from 'node:path';
import { el } from './el.mjs';
import { SCENES } from './scenes.mjs';

const VOICE = { en: ['Xb7hH8MSUJpSbSDYk0k2', 'eleven_multilingual_v2'], ar: ['EXAVITQu4vr4xnSDxMaL', 'eleven_v3'] };
const only = process.argv[2]; // optional: en | ar
let chars = 0;
for (const lang of ['en', 'ar']) {
  if (only && only !== lang) continue;
  const dir = path.resolve(import.meta.dirname, '..', 'vo', lang);
  fs.mkdirSync(dir, { recursive: true });
  const [voice, model] = VOICE[lang];
  for (const s of SCENES) {
    const out = path.join(dir, `${s.id}.mp3`);
    if (fs.existsSync(out)) continue;
    const body = { text: s.say[lang], model_id: model, voice_settings: { stability: 0.5, similarity_boost: 0.75 } };
    if (lang === 'ar') body.language_code = 'ar';
    const r = await el(`/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, { method: 'POST', body: JSON.stringify(body) });
    if (!r.ok) { console.log(lang, s.id, 'FAILED', r.status, (await r.text()).slice(0, 240)); process.exit(1); }
    fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
    chars += s.say[lang].length;
    console.log(lang, s.id, 'ok', s.say[lang].length, 'chars');
  }
}
console.log('characters used this run:', chars);
