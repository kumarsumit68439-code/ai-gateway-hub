'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sb } from '@/lib/supabase-browser';

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
          <button className="ghost" onClick={() => setOpen(!open)}>Security</button>
          <button className="ghost" onClick={() => regen(k.id)}>Regenerate</button>
          <button className="danger" onClick={() => revoke(k.id)}>Revoke</button>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 12 }}>
          <label>Allowed server IPs (optional, comma separated). Empty = any IP.</label>
          <input value={ips} onChange={(e) => setIps(e.target.value)} placeholder="203.0.113.10, 203.0.113.11" />
          <label>Allowed browser origins (optional). Empty = backend-only, browser requests are blocked.</label>
          <input value={origins} onChange={(e) => setOrigins(e.target.value)} placeholder="https://mysite.com" />
          <div className="row">
            <button onClick={submit}>Save</button>
            {note && <span className={note === 'Saved' ? 'ok' : 'bad'}>{note}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [keys, setKeys] = useState([]);
  const [logs, setLogs] = useState([]);
  const [name, setName] = useState('');
  const [fresh, setFresh] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const k = await sb().from('api_keys').select('id,name,key_prefix,request_count,last_used_at,created_at,rotated_at,allowed_ips,allowed_origins').is('revoked_at', null).order('created_at', { ascending: false });
    setKeys(k.data || []);
    const l = await sb().from('usage_logs').select('id,provider,model,status,latency_ms,created_at').order('created_at', { ascending: false }).limit(15);
    setLogs(l.data || []);
  }, []);

  useEffect(() => {
    sb().auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return; }
      setSession(data.session);
      load();
    });
  }, [router, load]);

  const authHeader = () => ({ Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' });

  async function create(e) {
    e.preventDefault();
    setBusy(true); setMsg(''); setFresh(null); setCopied(false);
    const r = await fetch('/api/keys', { method: 'POST', headers: authHeader(), body: JSON.stringify({ name }) });
    const j = await r.json();
    if (!r.ok) setMsg(j.error || 'Failed');
    else { setFresh(j.key); setName(''); load(); }
    setBusy(false);
  }

  async function regen(id) {
    if (!confirm('Regenerate this key? The old key stops working immediately, so update your backend with the new one.')) return;
    setMsg(''); setCopied(false);
    const r = await fetch('/api/keys/' + id + '/regenerate', { method: 'POST', headers: authHeader() });
    const j = await r.json();
    if (!r.ok) setMsg(j.error || 'Failed');
    else { setFresh(j.key); load(); window.scrollTo(0, 0); }
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

  async function logout() {
    await sb().auth.signOut();
    router.replace('/login');
  }

  if (!session) return <div className="wrap"><p className="mute">Loading…</p></div>;

  return (
    <div className="wrap">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>API Keys</h1>
        <div className="row"><span className="mute">{session.user.email}</span><button className="ghost" onClick={logout}>Log out</button></div>
      </div>

      <form className="card" onSubmit={create}>
        <b>Create a new API key</b>
        <p className="mute" style={{ margin: '4px 0' }}>Use the key only on your backend (server). Never put it in frontend code.</p>
        <input required maxLength={60} placeholder="Key name, e.g. my-app-backend" value={name} onChange={(e) => setName(e.target.value)} />
        <button disabled={busy}>Create key</button>
        {msg && <p className="bad">{msg}</p>}
      </form>

      {fresh && (
        <div className="card" style={{ borderColor: 'var(--ok)' }}>
          <b className="ok">Copy your key now. It will not be shown again.</b>
          <pre><code>{fresh}</code></pre>
          <button onClick={() => { navigator.clipboard.writeText(fresh); setCopied(true); }}>{copied ? 'Copied' : 'Copy key'}</button>
        </div>
      )}

      <h2>Your keys</h2>
      <div className="card" style={{ paddingTop: 4 }}>
        {keys.length === 0 ? <span className="mute">No active keys yet.</span> : keys.map((k) => (
          <KeyRow key={k.id + (k.rotated_at || '')} k={k} regen={regen} revoke={revoke} save={save} />
        ))}
      </div>

      <h2>Recent requests</h2>
      <div className="card">
        {logs.length === 0 ? <span className="mute">No requests yet. See the API Docs page to make your first call.</span> : (
          <table>
            <thead><tr><th>Time</th><th>Provider</th><th>Model</th><th>Status</th><th>ms</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.created_at).toLocaleString()}</td>
                  <td>{l.provider}</td>
                  <td>{l.model}</td>
                  <td className={l.status < 400 ? 'ok' : 'bad'}>{l.status}</td>
                  <td>{l.latency_ms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
