import fs from 'node:fs';
const key = fs.readFileSync(new URL('./.env', import.meta.url), 'utf8').match(/ELEVENLABS_API_KEY=(.+)/)[1].trim();
export const el = (p, init = {}) => fetch('https://api.elevenlabs.io' + p, { ...init, headers: { 'xi-api-key': key, 'Content-Type': 'application/json', ...(init.headers || {}) } });
if (process.argv[2] === 'info') {
  const sub = await (await el('/v1/user/subscription')).json();
  console.log('plan', sub.tier, 'chars', sub.character_count, '/', sub.character_limit, sub.detail?.message || '');
  const models = await (await el('/v1/models')).json();
  console.log('models', Array.isArray(models) ? models.filter((m) => m.can_do_text_to_speech).map((m) => m.model_id).join(', ') : JSON.stringify(models).slice(0, 200));
  const v = await (await el('/v2/voices?page_size=100')).json();
  for (const x of v.voices || []) console.log(x.voice_id, '|', x.name, '|', x.category, '|', x.labels?.gender, x.labels?.accent, x.labels?.language, x.labels?.use_case, x.labels?.descriptive);
}
