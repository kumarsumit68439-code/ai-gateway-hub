'use client';
import { useEffect, useRef, useState } from 'react';
import { sb } from '@/lib/supabase-browser';
import Avatar from '@/components/Avatar';
import './discord.css';

const COLS = 'id,author_type,author_id,author_name,author_avatar,content,created_at';
const time = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Live text chat: Supabase Realtime plus a light poll as a safety net.
export default function ChatPanel({ channel }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const end = useRef(null);
  const last = useRef(0);

  useEffect(() => {
    let alive = true;
    setMsgs([]); last.current = 0;
    const add = (rows) => setMsgs((m) => {
      const seen = new Set(m.map((x) => x.id));
      const fresh = rows.filter((x) => !seen.has(x.id));
      if (!fresh.length) return m;
      const all = [...m, ...fresh].sort((a, b) => a.id - b.id).slice(-300);
      last.current = all[all.length - 1].id;
      return all;
    });

    (async () => {
      const { data } = await sb().from('messages').select(COLS).eq('channel_id', channel.id).order('id', { ascending: false }).limit(60);
      if (alive) add((data || []).reverse());
    })();

    const rt = sb().channel('msgs:' + channel.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channel.id}` }, (p) => add([p.new]))
      .subscribe();

    const poll = setInterval(async () => {
      const { data } = await sb().from('messages').select(COLS).eq('channel_id', channel.id).gt('id', last.current).order('id').limit(50);
      if (alive && data?.length) add(data);
    }, 4000);

    return () => { alive = false; clearInterval(poll); sb().removeChannel(rt); };
  }, [channel.id]);

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs]);

  async function send(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true); setErr(''); setText('');
    const s = (await sb().auth.getSession()).data.session;
    const r = await fetch(`/api/channels/${channel.id}/messages`, { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
    if (!r.ok) { setErr((await r.json()).error || 'Message not sent.'); setText(content); }
    setBusy(false);
  }

  return (
    <>
      <div className="dc-head"><b># {channel.name}</b></div>
      <div className="dc-msgs">
        {msgs.length === 0 && <div className="dc-empty">This is the start of #{channel.name}. Say hello!</div>}
        {msgs.map((m, i) => {
          const p = msgs[i - 1];
          const first = !p || p.author_id !== m.author_id || new Date(m.created_at) - new Date(p.created_at) > 300000;
          return (
            <div key={m.id} className={'dc-msg' + (first ? ' first' : '')}>
              {first ? <Avatar src={m.author_avatar} name={m.author_name} size={40} /> : <span className="gut" />}
              <div style={{ minWidth: 0 }}>
                {first && <div className="meta"><b>{m.author_name}</b>{m.author_type === 'bot' && <span className="tag">BOT</span>}<small>{time(m.created_at)}</small></div>}
                <div className="body">{m.content}</div>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      {err && <p className="bad" style={{ margin: '0 16px' }}>{err}</p>}
      <form className="dc-compose" onSubmit={send}>
        <input value={text} maxLength={2000} placeholder={`Message #${channel.name}`} onChange={(e) => setText(e.target.value)} autoComplete="off" />
        <button disabled={busy || !text.trim()}>Send</button>
      </form>
    </>
  );
}
