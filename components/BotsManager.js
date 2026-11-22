'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabase-browser';
import Turnstile from '@/components/Turnstile';
import Avatar from '@/components/Avatar';
import './discord.css';

const online = (b) => b.hosting === 'jilowa' || (b.last_seen_at && Date.now() - new Date(b.last_seen_at).getTime() < 70000);

export default function BotsManager() {
  const [bots, setBots] = useState(null);
  const [name, setName] = useState('');
  const [hosting, setHosting] = useState('self');
  const [msg, setMsg] = useState('');
  const [fresh, setFresh] = useState(null);
  const [busy, setBusy] = useState(false);
  const [siteKey, setSiteKey] = useState(undefined);
  const [step, setStep] = useState('idle');
  const [copied, setCopied] = useState('');
  const pending = useRef({});
  const sess = useRef(null);

  const load = useCallback(async () => {
    const u = (await sb().auth.getUser()).data.user;
    const r = await sb().from('bots').select('id,name,description,avatar_url,prefix,hosting,last_seen_at').eq('owner_id', u.id).order('created_at', { ascending: false });
    setBots(r.data || []);
  }, []);

  useEffect(() => {
    sb().auth.getSession().then(({ data }) => { sess.current = data.session; });
    load();
    fetch('/api/captcha').then((r) => r.json()).then((j) => setSiteKey(j.siteKey || null)).catch(() => setSiteKey(null));
  }, [load]);

  function start(e) {
    e.preventDefault();
    setMsg(''); setFresh(null);
    if (!siteKey) { setMsg('Verification is unavailable right now. Please try again later.'); return; }
    pending.current = { name: name.trim(), hosting };
    setStep('captcha');
  }

  async function onToken(token) {
    setStep('idle');
    setBusy(true);
    const r = await fetch('/api/bots', { method: 'POST', headers: { Authorization: 'Bearer ' + sess.current.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...pending.current, captcha: token }) });
    const j = await r.json();
    if (!r.ok) setMsg(j.error || 'Something went wrong.');
    else { setFresh(j); setName(''); load(); }
    setBusy(false);
  }

  function copy(v, k) { navigator.clipboard.writeText(v); setCopied(k); setTimeout(() => setCopied(''), 1400); }

  return (
    <div>
      <form className="card" onSubmit={start}>
        <b>Create a bot</b>
        <input required minLength={2} maxLength={32} placeholder="Bot name" value={name} onChange={(e) => setName(e.target.value)} disabled={step === 'captcha'} style={{ marginTop: 10 }} />
        <div className="radios">
          <button type="button" className={'radio' + (hosting === 'self' ? ' on' : '')} onClick={() => setHosting('self')} disabled={step === 'captcha'}>
            Self-hosted<small>Run it anywhere: VPS, Docker, Node.js, Python</small>
          </button>
          <button type="button" className={'radio' + (hosting === 'jilowa' ? ' on' : '')} onClick={() => setHosting('jilowa')} disabled={step === 'captcha'}>
            Hosted by Jilowa<small>Commands, AI chat and music run here, always online</small>
          </button>
        </div>
        {step === 'idle' && <button disabled={busy}>{busy ? 'Creating\u2026' : 'Create bot'}</button>}
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
          <b className="ok">{fresh.name} is ready. Copy the token now. It will not be shown again.</b>
          <label style={{ display: 'block', marginTop: 10 }}>Client ID</label>
          <pre><code>{fresh.id}</code></pre>
          <label>Token</label>
          <pre><code>{fresh.token}</code></pre>
          <div className="row">
            <button onClick={() => copy(fresh.token, 'token')}>{copied === 'token' ? 'Copied' : 'Copy token'}</button>
            <button className="ghost" onClick={() => copy(fresh.id, 'id')}>{copied === 'id' ? 'Copied' : 'Copy client ID'}</button>
            <Link className="btn" href={'/bots/' + fresh.id}>Set up bot</Link>
          </div>
        </div>
      )}

      <h2>Your bots</h2>
      {bots === null ? <div className="skel" style={{ height: 70 }} /> : bots.length === 0 ? <p className="mute">No bots yet.</p> : (
        <div className="grid">
          {bots.map((b) => (
            <Link key={b.id} href={'/bots/' + b.id} className="tile">
              <div className="botrow" style={{ marginBottom: 10 }}>
                <Avatar src={b.avatar_url} name={b.name} size={48} />
                <div>
                  <b style={{ display: 'inline' }}>{b.name}</b> <span className="tag">BOT</span>
                  <div className="mute" style={{ fontSize: 13 }}><span className={online(b) ? 'dot-on' : 'dot-off'} /> {online(b) ? 'Online' : 'Offline'}</div>
                </div>
              </div>
              <span>Prefix <code>{b.prefix}</code> \u00b7 {b.hosting === 'jilowa' ? 'Hosted by Jilowa' : 'Self-hosted'}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
