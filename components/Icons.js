'use client';
import { useState } from 'react';

// Official brand logos (Lobe Icons for AI brands, Simple Icons for databases).
// If a logo cannot load, a simple colored badge is shown instead.

export const NAMES = {
  groq: 'Groq',
  openrouter: 'OpenRouter',
  gemini: 'Gemini',
  openai: 'OpenAI (ChatGPT)',
  supabase: 'Supabase',
  mongodb: 'MongoDB',
  firebase: 'Firebase',
};

const lobe = (slug) => `https://unpkg.com/@lobehub/icons-static-svg@latest/icons/${slug}.svg`;
const si = (slug, color) => `https://cdn.simpleicons.org/${slug}/${color}`;

const LOGOS = {
  groq: [lobe('groq')],
  openrouter: [lobe('openrouter')],
  gemini: [lobe('gemini-color'), lobe('gemini')],
  openai: [lobe('openai')],
  supabase: [si('supabase', '3ECF8E')],
  mongodb: [si('mongodb', '47A248')],
  firebase: [si('firebase', 'FFA000')],
  meta: [lobe('meta-color'), lobe('meta')],
  mistral: [lobe('mistral-color'), lobe('mistral')],
  qwen: [lobe('qwen-color'), lobe('qwen')],
  deepseek: [lobe('deepseek-color'), lobe('deepseek')],
  nvidia: [lobe('nvidia-color'), lobe('nvidia')],
  microsoft: [lobe('microsoft-color'), lobe('microsoft')],
  moonshot: [lobe('kimi-color'), lobe('moonshot')],
  zhipu: [lobe('zhipu-color'), lobe('zhipu')],
  grok: [lobe('grok')],
  nous: [lobe('nousresearch')],
  gemma: [lobe('gemma-color'), lobe('gemma')],
};

const W = '#fff';
const FALLBACK = {
  groq: { bg: '#f55036', svg: (<><path d="M19 12a7 7 0 1 1-2.1-5" fill="none" stroke={W} strokeWidth="2.4" strokeLinecap="round" /><path d="M12.5 12H19" stroke={W} strokeWidth="2.4" strokeLinecap="round" /></>) },
  openrouter: { bg: '#6467f2', svg: (<><path d="M3.5 15h5c3.2 0 3.2-6 6.5-6h5" fill="none" stroke={W} strokeWidth="2.2" strokeLinecap="round" /><path d="M17 5.8L20.2 9 17 12.2" fill="none" stroke={W} strokeWidth="2.2" strokeLinecap="round" /></>) },
  gemini: { bg: 'linear-gradient(135deg,#4285f4,#9b72cb 55%,#d96570)', svg: <path d="M12 2c.6 5.4 4.6 9.4 10 10-5.4.6-9.4 4.6-10 10-.6-5.4-4.6-9.4-10-10 5.4-.6 9.4-4.6 10-10z" fill={W} /> },
  openai: { bg: '#10a37f', svg: (<><path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z" fill="none" stroke={W} strokeWidth="2" strokeLinejoin="round" /><circle cx="12" cy="12" r="2.6" fill={W} /></>) },
  supabase: { bg: '#1c1c1c', border: '#3ecf8e', svg: <path d="M13.5 2L4 14h7l-1 8 10-13h-7z" fill="#3ecf8e" /> },
  mongodb: { bg: '#13aa52', svg: <path d="M12 2c3 4 5 7 5 11a5 5 0 0 1-3.8 4.9V22h-2.4v-4.1A5 5 0 0 1 7 13c0-4 2-7 5-11z" fill={W} /> },
  firebase: { bg: 'linear-gradient(135deg,#ffca28,#ff8f00)', svg: <path d="M6 19L8.2 5.5c.1-.5.8-.6 1-.1L11 9l1.7-3.3c.2-.4.8-.4 1 0L18 19l-6 3z" fill={W} /> },
  generic: { bg: '#394155', svg: (<><rect x="6" y="6" width="12" height="12" rx="3" fill="none" stroke={W} strokeWidth="2" /><circle cx="12" cy="12" r="2" fill={W} /></>) },
};

const box = (size, bg, border) => ({
  display: 'inline-grid',
  placeItems: 'center',
  width: size,
  height: size,
  borderRadius: Math.round(size * 0.28),
  background: bg,
  border: border ? '1px solid ' + border : 'none',
  flex: 'none',
  boxShadow: '0 2px 10px rgba(0,0,0,.35)',
  verticalAlign: 'middle',
  color: '#fff',
  fontWeight: 700,
  fontSize: Math.round(size * 0.5),
  lineHeight: 1,
});

function Badge({ id, size }) {
  const g = FALLBACK[id] || FALLBACK.generic;
  return (
    <span title={NAMES[id] || id} aria-hidden="true" style={box(size, g.bg, g.border)}>
      <svg viewBox="0 0 24 24" width={Math.round(size * 0.62)} height={Math.round(size * 0.62)}>{g.svg}</svg>
    </span>
  );
}

// Tries each logo URL in order, then falls back.
function Logo({ urls, size, title, fallback }) {
  const [i, setI] = useState(0);
  if (i >= urls.length) return fallback;
  const s = Math.round(size * 0.64);
  return (
    <span title={title} style={box(size, '#f6f7fb')}>
      <img src={urls[i]} alt="" width={s} height={s} loading="lazy" referrerPolicy="no-referrer" onError={() => setI(i + 1)} style={{ display: 'block', objectFit: 'contain' }} />
    </span>
  );
}

// Provider or database logo: groq, openrouter, gemini, openai, supabase, mongodb, firebase.
export function Icon({ id, size = 28 }) {
  const fb = <Badge id={id} size={size} />;
  return LOGOS[id] ? <Logo urls={LOGOS[id]} size={size} title={NAMES[id] || id} fallback={fb} /> : fb;
}

// Model family rules, checked in order against the model id.
const FAMILIES = [
  { re: /gpt-oss|openai|gpt|chatgpt|\bo\d/, logo: 'openai', label: 'OpenAI' },
  { re: /compound/, logo: 'groq', label: 'Groq' },
  { re: /nvidia|nemotron/, logo: 'nvidia', label: 'NVIDIA' },
  { re: /deepseek/, logo: 'deepseek', label: 'DeepSeek' },
  { re: /qwen|qwq/, logo: 'qwen', label: 'Qwen' },
  { re: /mistral|mixtral|codestral|devstral|magistral/, logo: 'mistral', label: 'Mistral' },
  { re: /gemma/, logo: 'gemma', label: 'Gemma' },
  { re: /gemini|google/, logo: 'gemini', label: 'Gemini' },
  { re: /llama|meta/, logo: 'meta', label: 'Meta' },
  { re: /phi-|microsoft/, logo: 'microsoft', label: 'Microsoft' },
  { re: /kimi|moonshot/, logo: 'moonshot', label: 'Moonshot' },
  { re: /glm|zhipu|z-ai/, logo: 'zhipu', label: 'Zhipu' },
  { re: /grok|x-ai/, logo: 'grok', label: 'xAI' },
  { re: /hermes|nous/, logo: 'nous', label: 'Nous Research' },
];

// Logo of the model family (Llama, Gemma, Mistral, Qwen, DeepSeek, ...).
export function ModelIcon({ model, size = 22 }) {
  const raw = String(model || '').toLowerCase().replace(/^(groq|openrouter|gemini|openai)\//, '');
  const hit = FAMILIES.find((f) => f.re.test(raw));
  const letter = (raw.replace(/^[^a-z0-9]+/, '')[0] || '?').toUpperCase();
  const fb = <span aria-hidden="true" style={box(size, '#394155')}>{letter}</span>;
  if (!hit) return fb;
  const urls = LOGOS[hit.logo];
  const fallback = FALLBACK[hit.logo] ? <Badge id={hit.logo} size={size} /> : fb;
  return <Logo urls={urls} size={size} title={hit.label} fallback={fallback} />;
}

// A row of logo + name chips.
export function ProviderStrip({ ids }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
      {ids.map((id) => (
        <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px 5px 6px', borderRadius: 99, border: '1px solid var(--line)', background: 'rgba(255,255,255,.05)', fontSize: 14 }}>
          <Icon id={id} size={22} />{NAMES[id] || id}
        </span>
      ))}
    </div>
  );
}
