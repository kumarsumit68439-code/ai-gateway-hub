'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sb } from '@/lib/supabase-browser';
import Turnstile from '@/components/Turnstile';

const split = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

function KeyRow({ k, regen, revoke, save }) {
  const [open, setOpen] = useState(false);
  const [ips, setIps] = useState((k.allowed_ips || []).join(', '));
  const [origins, setOrigins] = useState((k.allowed_origins || []).join(', '));
  const [note, setNote] = useState('');

  async function submit() {
    const e = await save(k.id, { allowed_ips: split(ips), allowed_origins: split(origins) });
    setNote(e || 'Saved');
  }

  return (
    <div style={{ borderTop: '1px solid var(--line)', padding: '14px 0' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <b>{k.name}</b> <code className="mute">{k.key_prefix}</code>
          <div className="mute" style={{ fontSize: 13 }}>
            {k.request_count} requests · last used {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'never'}
            {k.rotated_at ? ' · regenerated ' + new Date(k.rotated_at).toLocaleDateString() : ''}
          </div>
        </div>
        <div className="row">
          <button className="ghost small" onClick={() => setOpen(!open)}>Security</button>
          <button className="ghost small" onClick={() => regen(k.id)}>Regenerate</button>
          <button className="danger small" onClick={() => revoke(k.id)}>Revoke</button>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 12 }}>
          <label>Allowed server IPs (optional, comma separated). Empty = any IP.</label>
          <input value={ips} onChange={(e) => setIps(e.target.value)} placeholder="203.0.113.10, 203.0.113.11" />
          <label>Allowed browser origins (optional). Empty = backend-only, browser requests are blocked.</label>
          <input value={origins} onChange={(e) => setOrigins(e.target.value)} placeholder="https://mysite.com" />
          <div className="row">
            <button className="small" onClick={submit}>Save</button>
            {note && <span className={note === 'Saved' ? 'ok' : 'bad'}>{note}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// Create, regenerate, restrict and revoke AI gateway API keys (sk-gw-...).
// The Cloudflare captcha appears only after you press "Create key", once per new key.
export default function KeyManager() {
  const [session, setSession] = useState(null);
  const [keys, setKeys] = useState([]);
  const [name, setName] = useState('');
  const [fresh, setFresh] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [siteKey, setSiteKey] = useState(undefined);
  const [step, setStep] = useState('idle');
  const pending = useRef('');
  const sess = useRef(null);

  const load = useCallback(async () => {
    const k = await sb().from('api_keys').select('id,name,key_prefix,request_count,last_used_at,created_at,rotated_at,allowed_ips,allowed_origins').is('revoked_at', null).order('created_at', { ascending: false });
    setKeys(k.data || []);
  }, []);

  useEffect(() => {
    sb().auth.getSession().then(({ data }) => { sess.current = data.session; setSession(data.session); load(); });
    fetch('/api/captcha').then((r) => r.json()).then((j) => setSiteKey(j.siteKey || null)).catch(() => setSiteKey(null));
  }, [load]);

  const authHeader = () => ({ Authorization: 'Bearer ' + sess.current.access_token, 'Content-Type': 'application/json' });

  function start(e) {
    e.preventDefault();
    setMsg(''); setFresh(null); setCopied(false);
    if (!siteKey) { setMsg('Captcha is not configured on this server yet. The site owner must add the Cloudflare Turnstile keys.'); return; }
    pending.current = name.trim();
    setStep('captcha');
  }

  async function onToken(token) {
    setStep('idle');
    setBusy(true);
    const r = await fetch('/api/keys', { method: 'POST', headers: authHeader(), body: JSON.stringify({ name: pending.current, captcha: token }) });
    const j = await r.json();
    if (!r.ok) setMsg(j.error || 'Failed');
    else { setFresh(j.key); setName(''); load(); }
    setBusy(false);
  }

  async function regen(id) {
    if (!confirm('Regenerate this key? The old key stops working immediately, so update your server with the new one.')) return;
    setMsg(''); setCopied(false);
    const r = await fetch('/api/keys/' + id + '/regenerate', { method: 'POST', headers: authHeader() });
    const j = await r.json();
    if (!r.ok) setMsg(j.error || 'Failed');
    else { setFresh(j.key); load(); }
  }

  async function revoke(id) {
    if (!confirm('Revoke this key? Apps using it will stop working.')) return;
    await fetch('/api/keys/' + id, { method: 'DELETE', headers: authHeader() });
    load();
  }

  async function save(id, body) {
    const r = await fetch('/api/keys/' + id, { method: 'PATCH', headers: authHeader(), body: JSON.stringify(body) });
    if (r.ok) { load(); return ''; }
    return (await r.json()).error || 'Failed';
  }

  return (
    <div>
      <form className="card" onSubmit={start}>
        <b>Create a new AI Gateway API key</b>
        <p className="mute" style={{ margin: '4px 0' }}>Use the key only on your server. Never put it in frontend code.</p>
        <input required maxLength={60} placeholder="Key name, e.g. my-app-ai" value={name} onChange={(e) => setName(e.target.value)} disabled={step === 'captcha'} />
        {step === 'idle' && <button disabled={busy || !session}>{busy ? 'Creating…' : 'Create key'}</button>}
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
          <b className="ok">Copy your key now. It will not be shown again.</b>
          <pre><code>{fresh}</code></pre>
          <button onClick={() => { navigator.clipboard.writeText(fresh); setCopied(true); }}>{copied ? 'Copied' : 'Copy key'}</button>
        </div>
      )}

      <div className="card" style={{ paddingTop: 6 }}>
        {keys.length === 0 ? <p className="mute">No active keys yet.</p> : keys.map((k) => (
          <KeyRow key={k.id + (k.rotated_at || '')} k={k} regen={regen} revoke={revoke} save={save} />
        ))}
      </div>
    </div>
  );
}
