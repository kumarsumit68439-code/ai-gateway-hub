'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabase-browser';
import Turnstile from '@/components/Turnstile';
import { Icon, NAMES } from '@/components/Icons';

const split = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
const ENGINES = [
  ['supabase', 'Postgres'],
  ['mongodb', 'Documents'],
  ['firebase', 'Firestore'],
];
const badge = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 10px 2px 4px', borderRadius: 99, border: '1px solid rgba(124,92,255,.5)', background: 'rgba(124,92,255,.14)', color: '#c4b5fd', fontSize: 12, marginLeft: 8 };
const tile = { display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: 12, borderRadius: 14, background: 'rgba(255,255,255,.05)', color: 'var(--text)', border: '1px solid var(--line)', boxShadow: 'none', fontWeight: 400, cursor: 'pointer' };

function Row({ k, regen, del, save }) {
  const [open, setOpen] = useState(false);
  const [ips, setIps] = useState((k.allowed_ips || []).join(', '));
  const [note, setNote] = useState('');

  async function submit() {
    const e = await save(k.id, { allowed_ips: split(ips) });
    setNote(e || 'Saved');
  }

  return (
    <div style={{ borderTop: '1px solid var(--line)', padding: '14px 0' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <Icon id={k.engine} size={26} /> <b style={{ verticalAlign: 'middle' }}>{k.name}</b>
          <span style={badge}><Icon id={k.engine} size={16} />{NAMES[k.engine]}</span> <code className="mute">{k.key_prefix}</code>
          <div className="mute" style={{ fontSize: 13 }}>
            {k.request_count} requests · last used {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'never'}
            {k.rotated_at ? ' · regenerated ' + new Date(k.rotated_at).toLocaleDateString() : ''}
          </div>
        </div>
        <div className="row">
          <button className="ghost small" onClick={() => setOpen(!open)}>Security</button>
          <button className="ghost small" onClick={() => regen(k.id)}>Regenerate</button>
          <button className="danger small" onClick={() => del(k.id)}>Delete</button>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 12 }}>
          <label>Allowed server IPs (optional, comma separated). Empty = any IP. Browser requests are always blocked.</label>
          <input value={ips} onChange={(e) => setIps(e.target.value)} placeholder="203.0.113.10" />
          <div className="row">
            <button className="small" onClick={submit}>Save</button>
            {note && <span className={note === 'Saved' ? 'ok' : 'bad'}>{note}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// Create, regenerate, restrict and delete backend (data storage) keys: bk-live-...
// The Cloudflare captcha appears only after you press "Create backend key", once per new key.
export default function BackendKeyManager() {
  const [session, setSession] = useState(null);
  const [keys, setKeys] = useState([]);
  const [info, setInfo] = useState({ engines: { supabase: true, mongodb: false, firebase: false }, verified: true });
  const [name, setName] = useState('');
  const [engine, setEngine] = useState('supabase');
  const [fresh, setFresh] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [siteKey, setSiteKey] = useState(undefined);
  const [step, setStep] = useState('idle');
  const pending = useRef({ name: '', engine: 'supabase' });
  const sess = useRef(null);

  const load = useCallback(async () => {
    const k = await sb().from('backend_keys').select('id,name,engine,key_prefix,request_count,last_used_at,rotated_at,allowed_ips,created_at').is('revoked_at', null).order('created_at', { ascending: false });
    setKeys(k.data || []);
  }, []);

  useEffect(() => {
    sb().auth.getSession().then(async ({ data }) => {
      sess.current = data.session;
      setSession(data.session);
      load();
      if (data.session) {
        const r = await fetch('/api/backend-keys', { headers: { Authorization: 'Bearer ' + data.session.access_token } });
        if (r.ok) setInfo(await r.json());
      }
    });
    fetch('/api/captcha').then((r) => r.json()).then((j) => setSiteKey(j.siteKey || null)).catch(() => setSiteKey(null));
  }, [load]);

  const authHeader = () => ({ Authorization: 'Bearer ' + sess.current.access_token, 'Content-Type': 'application/json' });

  function start(e) {
    e.preventDefault();
    setMsg(''); setFresh(null); setCopied(false);
    if (!siteKey) { setMsg('Captcha is not configured on this server yet. The site owner must add the Cloudflare Turnstile keys.'); return; }
    pending.current = { name: name.trim(), engine };
    setStep('captcha');
  }

  async function onToken(token) {
    setStep('idle');
    setBusy(true);
    const r = await fetch('/api/backend-keys', { method: 'POST', headers: authHeader(), body: JSON.stringify({ ...pending.current, captcha: token }) });
    const j = await r.json();
    if (!r.ok) setMsg(j.error || 'Failed');
    else { setFresh(j.key); setName(''); load(); }
    setBusy(false);
  }

  async function regen(id) {
    if (!confirm('Regenerate this key? The old key stops working immediately. Your stored data is kept.')) return;
    setMsg(''); setCopied(false);
    const r = await fetch('/api/backend-keys/' + id + '/regenerate', { method: 'POST', headers: authHeader() });
    const j = await r.json();
    if (!r.ok) setMsg(j.error || 'Failed');
    else { setFresh(j.key); load(); }
  }

  async function del(id) {
    if (!confirm('Delete this backend project? The key stops working and ALL data stored under it is permanently deleted.')) return;
    await fetch('/api/backend-keys/' + id, { method: 'DELETE', headers: authHeader() });
    load();
  }

  async function save(id, body) {
    const r = await fetch('/api/backend-keys/' + id, { method: 'PATCH', headers: authHeader(), body: JSON.stringify(body) });
    if (r.ok) { load(); return ''; }
    return (await r.json()).error || 'Failed';
  }

  return (
    <div>
      {!info.verified && (
        <div className="card" style={{ borderColor: '#fbbf24' }}>
          <b>Verify your email to create keys.</b> <Link href="/account">Open Account verification</Link>
        </div>
      )}

      <form className="card" onSubmit={start}>
        <b>Create a new backend API key</b>
        <p className="mute" style={{ margin: '4px 0' }}>Each key is its own private data store for your website. Choose where the data lives.</p>
        <label>Key name</label>
        <input required maxLength={60} placeholder="e.g. my-shop-backend" value={name} onChange={(e) => setName(e.target.value)} disabled={step === 'captcha'} />
        <label>Storage engine</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, margin: '6px 0 14px' }}>
          {ENGINES.map(([id, sub]) => {
            const on = !!info.engines[id];
            const sel = engine === id;
            return (
              <button type="button" key={id} disabled={!on || step === 'captcha'} onClick={() => setEngine(id)}
                style={{ ...tile, borderColor: sel ? 'var(--accent)' : 'var(--line)', boxShadow: sel ? '0 0 0 3px rgba(124,92,255,.25)' : 'none', opacity: on ? 1 : 0.5, cursor: on ? 'pointer' : 'not-allowed' }}>
                <Icon id={id} size={36} />
                <span>
                  <b style={{ display: 'block' }}>{NAMES[id]}</b>
                  <span className="mute" style={{ fontSize: 12 }}>{on ? sub : 'Not connected yet'}</span>
                </span>
              </button>
            );
          })}
        </div>
        {step === 'idle' && <button disabled={busy || !session}>{busy ? 'Creating…' : 'Create backend key'}</button>}
        {step === 'captcha' && (
          <div>
            <b>Verify you are human to create this key</b>
            <Turnstile siteKey={siteKey} onToken={onToken} onError={(m) => { setMsg(m); setStep('idle'); }} />
            <button type="button" className="ghost small" onClick={() => setStep('idle')}>Cancel</button>
          </div>
        )}
        {msg && <p className="bad">{msg}</p>}
      </form>

      {fresh && (
        <div className="card" style={{ borderColor: 'var(--ok)' }}>
          <b className="ok">Copy your backend key now. It will not be shown again.</b>
          <pre><code>{fresh}</code></pre>
          <button onClick={() => { navigator.clipboard.writeText(fresh); setCopied(true); }}>{copied ? 'Copied' : 'Copy key'}</button>
          <p className="mute" style={{ marginBottom: 0 }}>Save it in your server's environment variables (for example <code>BACKEND_API_KEY</code>). See the <Link href="/docs/backend">Backend docs</Link>.</p>
        </div>
      )}

      <div className="card" style={{ paddingTop: 6 }}>
        {keys.length === 0 ? <p className="mute">No backend keys yet.</p> : keys.map((k) => (
          <Row key={k.id + (k.rotated_at || '')} k={k} regen={regen} del={del} save={save} />
        ))}
      </div>
    </div>
  );
}
