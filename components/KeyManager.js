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
            {k.request_count} requests · {k.last_used_at ? 'used ' + new Date(k.last_used_at).toLocaleDateString() : 'never used'}
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
          <label>Allowed IPs (optional)</label>
          <input value={ips} onChange={(e) => setIps(e.target.value)} placeholder="203.0.113.10, 203.0.113.11" />
          <label>Allowed origins (optional)</label>
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

// AI gateway keys (sk-gw-...). The captcha appears only after pressing "Create key".
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
    if (!siteKey) { setMsg('Verification is unavailable right now. Please try again later.'); return; }
    pending.current = name.trim();
    setStep('captcha');
  }

  async function onToken(token) {
    setStep('idle');
    setBusy(true);
    const r = await fetch('/api/keys', { method: 'POST', headers: authHeader(), body: JSON.stringify({ name: pending.current, captcha: token }) });
    const j = await r.json();
    if (!r.ok) setMsg(j.error || 'Something went wrong.');
    else { setFresh(j.key); setName(''); load(); }
    setBusy(false);
  }

  async function regen(id) {
    if (!confirm('Regenerate this key? The old key stops working immediately.')) return;
    setMsg(''); setCopied(false);
    const r = await fetch('/api/keys/' + id + '/regenerate', { method: 'POST', headers: authHeader() });
    const j = await r.json();
    if (!r.ok) setMsg(j.error || 'Something went wrong.');
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
    return (await r.json()).error || 'Something went wrong.';
  }

  return (
    <div>
      <form className="card" onSubmit={start}>
        <b>New key</b>
        <input required maxLength={60} placeholder="Key name" value={name} onChange={(e) => setName(e.target.value)} disabled={step === 'captcha'} style={{ marginTop: 10 }} />
        {step === 'idle' && <button disabled={busy || !session}>{busy ? 'Creating…' : 'Create key'}</button>}
        {step === 'captcha' && (
          <div>
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
        {keys.length === 0 ? <p className="mute">No keys yet.</p> : keys.map((k) => (
          <KeyRow key={k.id + (k.rotated_at || '')} k={k} regen={regen} revoke={revoke} save={save} />
        ))}
      </div>
    </div>
  );
}
