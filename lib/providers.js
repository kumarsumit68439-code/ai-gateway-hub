export const PROVIDERS = {
  groq: { label: 'Groq', base: 'https://api.groq.com/openai/v1', env: 'GROQ_API_KEY', tier: 'free tier (rate-limited)' },
  openrouter: { label: 'OpenRouter', base: 'https://openrouter.ai/api/v1', env: 'OPENROUTER_API_KEY', tier: 'free models only ($0 pricing)' },
  gemini: { label: 'Gemini', base: 'https://generativelanguage.googleapis.com/v1beta/openai', env: 'GEMINI_API_KEY', tier: 'free tier (rate-limited; some models may need billing)' },
  openai: { label: 'OpenAI (ChatGPT)', base: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1', env: 'OPENAI_API_KEY', tier: 'depends on the server key (OpenAI has no permanent free tier)' },
};

export const providerKey = (p) => process.env[PROVIDERS[p].env];

const TTL = 10 * 60 * 1000;
const cache = new Map();

async function getJson(url, headers = {}) {
  const r = await fetch(url, { headers, cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

const fetchers = {
  async openrouter() {
    const j = await getJson('https://openrouter.ai/api/v1/models');
    return j.data
      .filter((m) => {
        const p = m.pricing || {};
        const inp = m.architecture?.input_modalities || ['text'];
        const out = m.architecture?.output_modalities || ['text'];
        return Number(p.prompt) === 0 && Number(p.completion) === 0 && inp.includes('text') && out.includes('text');
      })
      .map((m) => ({ raw: m.id, name: m.name, context: m.context_length }));
  },
  async groq() {
    const j = await getJson(PROVIDERS.groq.base + '/models', { Authorization: 'Bearer ' + providerKey('groq') });
    return j.data
      .filter((m) => m.active !== false && !/whisper|tts|guard|orpheus|playai|embed/i.test(m.id))
      .map((m) => ({ raw: m.id, name: m.id, context: m.context_window }));
  },
  async gemini() {
    const j = await getJson('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { 'x-goog-api-key': providerKey('gemini') });
    return (j.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent') && /gemini|gemma/i.test(m.name) && !/tts|image|embedding|live|audio|robotics|computer-use|learnlm|veo|imagen/i.test(m.name))
      .map((m) => ({ raw: m.name.replace('models/', ''), name: m.displayName || m.name, context: m.inputTokenLimit }));
  },
  async openai() {
    const j = await getJson(PROVIDERS.openai.base + '/models', { Authorization: 'Bearer ' + providerKey('openai') });
    return j.data
      .filter((m) => /^(gpt-|o\d|chatgpt-)/.test(m.id) && !/audio|realtime|transcribe|tts|image|search|instruct|embedding|moderation/i.test(m.id))
      .map((m) => ({ raw: m.id, name: m.id, context: null }));
  },
};

// Returns the live model list of one provider (cached 10 min per server instance).
export async function getModels(provider) {
  const meta = PROVIDERS[provider];
  const base = { provider, label: meta.label, tier: meta.tier, configured: !!providerKey(provider), models: [] };
  if (!base.configured) return base;

  const hit = cache.get(provider);
  if (hit && Date.now() - hit.t < TTL) return hit.data;

  try {
    const list = await fetchers[provider]();
    const data = {
      ...base,
      models: list
        .map((m) => ({ id: provider + '/' + m.raw, name: m.name, context: m.context, provider }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    };
    cache.set(provider, { t: Date.now(), data });
    return data;
  } catch (e) {
    if (hit) return hit.data;
    return { ...base, error: 'Could not load models from provider right now.' };
  }
}

export async function getAllModels() {
  return Promise.all(Object.keys(PROVIDERS).map(getModels));
}
