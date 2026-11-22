'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { sb } from '@/lib/supabase-browser';
import { Icon, ModelIcon, NAMES } from '@/components/Icons';
import './playground.css';

function ModelPicker({ models, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const providers = useMemo(() => [...new Set(models.map((m) => m.owned_by))], [models]);
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return models.filter((m) => (tab === 'all' || m.owned_by === tab) && m.id.toLowerCase().includes(n)).slice(0, 200);
  }, [models, tab, q]);
  const cur = models.find((m) => m.id === value);

  return (
    <div className="picker">
      <button type="button" className="picker-btn" onClick={() => setOpen(!open)}>
        {cur ? <><Icon id={cur.owned_by} size={24} /><ModelIcon model={cur.id} size={24} /><code>{cur.id}</code></> : <span className="mute">Select a model</span>}
        <span className="mute">{open ? '\u25b4' : '\u25be'}</span>
      </button>
      {open && (
        <div className="picker-panel">
          <div className="chips2">
            <button type="button" className={'tab' + (tab === 'all' ? ' on' : '')} onClick={() => setTab('all')}>All</button>
            {providers.map((p) => (
              <button type="button" key={p} className={'tab' + (tab === p ? ' on' : '')} onClick={() => setTab(p)}><Icon id={p} size={18} />{NAMES[p] || p}</button>
            ))}
          </div>
          <input autoFocus placeholder="Search models" value={q} onChange={(e) => setQ(e.target.value)} style={{ margin: 0 }} />
          <div className="picker-list">
            {list.length === 0 && <div className="mute" style={{ padding: 10 }}>No models found.</div>}
            {list.map((m) => (
              <button type="button" key={m.id} className={'picker-item' + (m.id === value ? ' on' : '')} onClick={() => { onChange(m.id); setOpen(false); }}>
                <Icon id={m.owned_by} size={22} /><ModelIcon model={m.id} size={22} /><code>{m.id}</code>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Real playground: sends real requests to the live gateway with your own key.
export default function AIPlayground() {
  const [models, setModels] = useState(null);
  const [model, setModel] = useState('');
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [system, setSystem] = useState('');
  const [temp, setTemp] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(512);
  const [stream, setStream] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);
  const end = useRef(null);

  useEffect(() => {
    fetch('/api/v1/models').then((r) => r.json()).then((j) => {
      const d = j.data || [];
      setModels(d);
      if (d.length) setModel((d.find((m) => m.owned_by === 'groq') || d[0]).id);
    }).catch(() => setModels([]));
  }, []);

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [messages]);

  function fail(m, status, t0) {
    setMessages((x) => (x.length && x[x.length - 1].role === 'assistant' && !x[x.length - 1].content ? x.slice(0, -1) : x));
    setError(m);
    setStats({ status: status || 0, ms: t0 ? Math.round(performance.now() - t0) : 0 });
    setBusy(false);
  }

  async function send() {
    if (busy) return;
    if (!key.trim()) { setError('Paste your API key first.'); return; }
    if (!input.trim()) return;
    setError(''); setStats(null);
    const history = [...messages, { role: 'user', content: input.trim() }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput(''); setBusy(true);

    const request = {
      model,
      messages: [...(system.trim() ? [{ role: 'system', content: system.trim() }] : []), ...history],
      temperature: Number(temp),
      max_tokens: Number(maxTokens),
      stream,
    };
    const session = (await sb().auth.getSession()).data.session;
    const t0 = performance.now();
    let res;
    try {
      res = await fetch('/api/playground/ai', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key.trim(), request }),
      });
    } catch { fail('Network error. Please try again.'); return; }

    if (!res.ok) {
      let m = 'Request failed.';
      try { const j = await res.json(); m = j.error?.message || j.error || m; } catch {}
      fail(m, res.status, t0);
      return;
    }

    let usage = null;
    if (stream && res.body) {
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '', acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const ln of lines) {
          const s = ln.trim();
          if (!s.startsWith('data:')) continue;
          const d = s.slice(5).trim();
          if (d === '[DONE]') continue;
          try {
            const j = JSON.parse(d);
            const c = j.choices?.[0]?.delta?.content;
            if (c) { acc += c; setMessages((m) => { const n = [...m]; n[n.length - 1] = { role: 'assistant', content: acc }; return n; }); }
            if (j.usage) usage = j.usage;
          } catch {}
        }
      }
      if (!acc) setMessages((m) => { const n = [...m]; n[n.length - 1] = { role: 'assistant', content: '(empty response)' }; return n; });
    } else {
      const j = await res.json();
      const text = j.choices?.[0]?.message?.content ?? '(empty response)';
      usage = j.usage || null;
      setMessages((m) => { const n = [...m]; n[n.length - 1] = { role: 'assistant', content: text }; return n; });
    }
    setStats({ status: res.status, ms: Math.round(performance.now() - t0), usage });
    setBusy(false);
  }

  function clear() { setMessages([]); setStats(null); setError(''); }

  function copyCurl() {
    const body = { model, messages: [{ role: 'user', content: 'Hello' }], temperature: Number(temp), max_tokens: Number(maxTokens) };
    const cmd = `curl ${window.location.origin}/api/v1/chat/completions \\\n  -H "Authorization: Bearer $GATEWAY_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(body)}'`;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="pg">
      <div className="card">
        <div className="chat">
          {messages.length === 0 && <div className="empty">Send a message to see a real response.</div>}
          {messages.map((m, i) => (
            <div key={i} className={'msg ' + (m.role === 'user' ? 'user' : '')}>
              {m.role === 'assistant' && <ModelIcon model={model} size={28} />}
              <div className={'bubble' + (busy && i === messages.length - 1 && m.role === 'assistant' ? ' cursor' : '')}>{m.content}</div>
            </div>
          ))}
          <div ref={end} />
        </div>

        {(stats || error) && (
          <div className="statbar">
            {stats && <span className={'pill ' + (stats.status && stats.status < 400 ? 'ok' : 'bad')}>{stats.status || 'error'}</span>}
            {stats && <span className="pill">{stats.ms} ms</span>}
            {stats?.usage?.prompt_tokens != null && <span className="pill">in {stats.usage.prompt_tokens}</span>}
            {stats?.usage?.completion_tokens != null && <span className="pill">out {stats.usage.completion_tokens}</span>}
          </div>
        )}
        {error && <p className="bad" style={{ marginBottom: 0 }}>{error}</p>}

        <div className="composer">
          <textarea placeholder="Type your message" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <button onClick={send} disabled={busy || !model}>{busy ? 'Sending\u2026' : 'Send'}</button>
        </div>
      </div>

      <div className="card pgcard">
        <label>API key</label>
        <div className="pw">
          <input type={showKey ? 'text' : 'password'} value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-gw-..." autoComplete="off" spellCheck={false} />
          <button type="button" className="ghost small" onClick={() => setShowKey(!showKey)}>{showKey ? 'Hide' : 'Show'}</button>
        </div>

        <label>Model</label>
        <div style={{ margin: '6px 0 14px' }}>
          {models === null ? <div className="skel" style={{ height: 44 }} /> : models.length === 0 ? <span className="mute">No models available right now.</span> : <ModelPicker models={models} value={model} onChange={setModel} />}
        </div>

        <label>System prompt (optional)</label>
        <textarea value={system} onChange={(e) => setSystem(e.target.value)} style={{ minHeight: 60 }} />

        <label>Temperature: {temp}</label>
        <input type="range" min="0" max="2" step="0.1" value={temp} onChange={(e) => setTemp(e.target.value)} />

        <label>Max tokens</label>
        <input type="number" min="1" max="4096" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} />

        <label className="chk"><input type="checkbox" checked={stream} onChange={(e) => setStream(e.target.checked)} />Stream response</label>

        <div className="row">
          <button className="ghost small" onClick={clear}>Clear chat</button>
          <button className="ghost small" onClick={copyCurl}>{copied ? 'Copied' : 'Copy as curl'}</button>
        </div>
      </div>
    </div>
  );
}
