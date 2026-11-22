'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sb } from '@/lib/supabase-browser';
import Avatar from '@/components/Avatar';
import './discord.css';

const online = (b) => b.hosting === 'jilowa' || (b.last_seen_at && Date.now() - new Date(b.last_seen_at).getTime() < 70000);

export default function BotEditor({ id }) {
  const router = useRouter();
  const [bot, setBot] = useState(null);
  const [cmds, setCmds] = useState([]);
  const [f, setF] = useState({});
  const [models, setModels] = useState([]);
  const [msg, setMsg] = useState(null);
  const [token, setToken] = useState(null);
  const [cn, setCn] = useState('');
  const [cr, setCr] = useState('');
  const [copied, setCopied] = useState('');
  const [origin, setOrigin] = useState('');
  const fileA = useRef(null);
  const fileB = useRef(null);

  const authH = async () => ({ Authorization: 'Bearer ' + (await sb().auth.getSession()).data.session.access_token });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const load = useCallback(async () => {
    const r = await fetch('/api/bots/' + id, { headers: await authH() });
    const j = await r.json();
    if (!r.ok) { setMsg({ bad: j.error || 'Bot not found.' }); return; }
    setBot(j.bot);
    setCmds(j.commands);
    setF({ name: j.bot.name, description: j.bot.description || '', prefix: j.bot.prefix, hosting: j.bot.hosting, avatar_url: j.bot.avatar_url || '', banner_url: j.bot.banner_url || '', ai_model: j.bot.ai_model || '', ai_system: j.bot.ai_system || '' });
  }, [id]);

  useEffect(() => {
    setOrigin(window.location.origin);
    load();
    fetch('/api/v1/models').then((r) => r.json()).then((j) => setModels((j.data || []).map((m) => m.id))).catch(() => {});
  }, [load]);

  function copy(v, k) { navigator.clipboard.writeText(v); setCopied(k); setTimeout(() => setCopied(''), 1400); }

  async function save() {
    setMsg(null);
    const r = await fetch('/api/bots/' + id, { method: 'PATCH', headers: { ...(await authH()), 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    const j = await r.json();
    setMsg(r.ok ? { ok: 'Saved.' } : { bad: j.error || 'Could not save.' });
    if (r.ok) load();
  }

  async function upload(kind, file) {
    if (!file) return;
    setMsg(null);
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch(`/api/bots/${id}/upload?kind=${kind}`, { method: 'POST', headers: await authH(), body: fd });
    const j = await r.json();
    if (r.ok) { set(kind + '_url', j.url); setMsg({ ok: 'Image uploaded.' }); load(); } else setMsg({ bad: j.error || 'Upload failed.' });
  }

  async function resetToken() {
    if (!confirm('Reset the token? Your running bot will stop working until you update it.')) return;
    const r = await fetch(`/api/bots/${id}/token`, { method: 'POST', headers: await authH() });
    const j = await r.json();
    if (r.ok) setToken(j.token); else setMsg({ bad: j.error || 'Could not reset token.' });
  }

  async function addCmd(e) {
    e.preventDefault();
    const r = await fetch(`/api/bots/${id}/commands`, { method: 'POST', headers: { ...(await authH()), 'Content-Type': 'application/json' }, body: JSON.stringify({ name: cn, response: cr }) });
    const j = await r.json();
    if (r.ok) { setCn(''); setCr(''); load(); } else setMsg({ bad: j.error || 'Could not add command.' });
  }

  async function delCmd(name) {
    await fetch(`/api/bots/${id}/commands?name=${encodeURIComponent(name)}`, { method: 'DELETE', headers: await authH() });
    load();
  }

  async function del() {
    if (!confirm('Delete this bot permanently? It will be removed from every server.')) return;
    const r = await fetch('/api/bots/' + id, { method: 'DELETE', headers: await authH() });
    if (r.ok) router.push('/bots'); else setMsg({ bad: 'Could not delete bot.' });
  }

  if (!bot) return msg?.bad ? <p className="bad">{msg.bad} <Link href="/bots">Back to bots</Link></p> : <div className="skel" style={{ height: 200 }} />;

  const invite = origin + '/invite/bot/' + bot.id;

  return (
    <div>
      <div className="botcard">
        <div className="banner" style={f.banner_url ? { backgroundImage: `url(${f.banner_url})` } : undefined} />
        <div className="info">
          <span className="av"><Avatar src={f.avatar_url} name={f.name} size={78} /></span>
          <div style={{ marginTop: 8 }}>
            <b style={{ fontSize: 20 }}>{f.name}</b> <span className="tag">BOT</span>{' '}
            <span className={online(bot) ? 'ok' : 'mute'}>{online(bot) ? 'Online' : 'Offline'}</span>
          </div>
          {f.description && <p className="mute" style={{ marginBottom: 0 }}>{f.description}</p>}
        </div>
      </div>
      {msg?.ok && <p className="ok">{msg.ok}</p>}
      {msg?.bad && <p className="bad">{msg.bad}</p>}

      <h2>Profile</h2>
      <div className="card">
        <div className="row2">
          <div><label>Name</label><input value={f.name} maxLength={32} onChange={(e) => set('name', e.target.value)} /></div>
          <div><label>Prefix</label><input value={f.prefix} maxLength={3} onChange={(e) => set('prefix', e.target.value)} /></div>
        </div>
        <label>Description</label>
        <textarea value={f.description} maxLength={300} onChange={(e) => set('description', e.target.value)} style={{ minHeight: 70 }} />
        <div className="row2">
          <div>
            <label>Avatar</label>
            <input value={f.avatar_url} placeholder="https://... image URL" onChange={(e) => set('avatar_url', e.target.value)} />
            <input ref={fileA} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => upload('avatar', e.target.files[0])} />
            <button type="button" className="ghost small" onClick={() => fileA.current.click()}>Upload image</button>
          </div>
          <div>
            <label>Banner</label>
            <input value={f.banner_url} placeholder="https://... image URL" onChange={(e) => set('banner_url', e.target.value)} />
            <input ref={fileB} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => upload('banner', e.target.files[0])} />
            <button type="button" className="ghost small" onClick={() => fileB.current.click()}>Upload image</button>
          </div>
        </div>
        <div style={{ marginTop: 16 }}><button onClick={save}>Save profile</button></div>
      </div>

      <h2>Hosting</h2>
      <div className="card">
        <div className="radios">
          <button type="button" className={'radio' + (f.hosting === 'self' ? ' on' : '')} onClick={() => set('hosting', 'self')}>Self-hosted<small>Your code answers commands. <Link href="/docs/bots">See hosting guide</Link></small></button>
          <button type="button" className={'radio' + (f.hosting === 'jilowa' ? ' on' : '')} onClick={() => set('hosting', 'jilowa')}>Hosted by Jilowa<small>Built-in commands, AI chat, music and your custom commands</small></button>
        </div>
        <button onClick={save}>Save hosting</button>
      </div>

      {f.hosting === 'jilowa' && (
        <>
          <h2>AI chat</h2>
          <div className="card">
            <label>Model (optional)</label>
            <input list="models" value={f.ai_model} placeholder="Default: first available free model" onChange={(e) => set('ai_model', e.target.value)} />
            <datalist id="models">{models.slice(0, 400).map((m) => <option key={m} value={m} />)}</datalist>
            <label>Personality (optional)</label>
            <textarea value={f.ai_system} maxLength={1000} onChange={(e) => set('ai_system', e.target.value)} placeholder="You are a friendly assistant that..." style={{ minHeight: 80 }} />
            <button onClick={save}>Save AI settings</button>
            <p className="mute" style={{ marginBottom: 0 }}>Use it in a server with <code>{f.prefix}ai your question</code></p>
          </div>

          <h2>Custom commands</h2>
          <div className="card">
            {cmds.length === 0 ? <p className="mute">No custom commands yet.</p> : (
              <table>
                <thead><tr><th>Command</th><th>Response</th><th></th></tr></thead>
                <tbody>
                  {cmds.map((c) => (
                    <tr key={c.name}><td><code>{f.prefix}{c.name}</code></td><td>{c.response}</td><td style={{ textAlign: 'right' }}><button className="danger small" onClick={() => delCmd(c.name)}>Delete</button></td></tr>
                  ))}
                </tbody>
              </table>
            )}
            <form onSubmit={addCmd} style={{ marginTop: 14 }}>
              <div className="row2">
                <input required value={cn} maxLength={20} placeholder="command (e.g. rules)" onChange={(e) => setCn(e.target.value)} />
                <input required value={cr} maxLength={500} placeholder="Response. Use {user}, {server}, {args}" onChange={(e) => setCr(e.target.value)} />
              </div>
              <button>Add command</button>
            </form>
          </div>
        </>
      )}

      <h2>Credentials</h2>
      <div className="card">
        <label>Client ID</label>
        <pre><code>{bot.id}</code></pre>
        <label>Token</label>
        {token ? (
          <>
            <pre><code>{token}</code></pre>
            <p className="ok">Copy it now. It will not be shown again.</p>
            <button onClick={() => copy(token, 'token')}>{copied === 'token' ? 'Copied' : 'Copy token'}</button>
          </>
        ) : <p className="mute">{bot.token_prefix || 'Hidden'}</p>}
        <div className="row" style={{ marginTop: 8 }}>
          <button className="ghost small" onClick={() => copy(bot.id, 'id')}>{copied === 'id' ? 'Copied' : 'Copy client ID'}</button>
          <button className="ghost small" onClick={resetToken}>Reset token</button>
        </div>
      </div>

      <h2>Invite</h2>
      <div className="card">
        <pre><code>{invite}</code></pre>
        <div className="row">
          <button onClick={() => copy(invite, 'inv')}>{copied === 'inv' ? 'Copied' : 'Copy invite link'}</button>
          <Link className="btn" href={'/invite/bot/' + bot.id}>Open invite page</Link>
        </div>
      </div>

      <h2>Danger zone</h2>
      <div className="card"><button className="danger" onClick={del}>Delete bot</button></div>
    </div>
  );
}
