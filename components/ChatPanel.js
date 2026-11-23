'use client';
import { useEffect, useRef, useState } from 'react';
import { sb } from '@/lib/supabase-browser';
import { api } from '@/lib/client';
import Avatar from '@/components/Avatar';
import Ic from '@/components/Ic';
import './dx.css';

const COLS = 'id,author_type,author_id,author_name,author_avatar,content,created_at';
const EMOJI = ['\u{1F600}', '\u{1F602}', '\u{1F60D}', '\u{1F60E}', '\u{1F973}', '\u{1F62D}', '\u{1F621}', '\u{1F44D}', '\u{1F44E}', '\u{1F64F}', '\u{1F525}', '\u2764\uFE0F', '\u{1F389}', '\u2728', '\u{1F4AF}', '\u{1F440}', '\u{1F91D}', '\u{1F680}', '\u{1F3B5}', '\u2615'];
const time = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Live text chat: Supabase Realtime plus a light poll as a safety net.
export default function ChatPanel({ channel, roleColor, onProfile }) {
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [emoji, setEmoji] = useState(false);
  const end = useRef(null);
  const last = useRef(0);

  useEffect(() => {
    let alive = true;
    setMsgs([]); setLoading(true); last.current = 0;
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
      if (!alive) return;
      add((data || []).reverse());
      setLoading(false);
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

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs, loading]);

  async function send(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true); setErr(''); setText(''); setEmoji(false);
    const r = await api('POST', `/api/channels/${channel.id}/messages`, { content });
    if (!r.ok) { setErr(r.j.error || 'Message not sent.'); setText(content); }
    setBusy(false);
  }

  return (
    <>
      <div className='dx-msgs'>
        {loading && [0, 1, 2, 3, 4].map((i) => (
          <div className='dx-skel' key={i}><span className='c' /><div className='l'><i style={{ width: 90 + i * 20 }} /><i style={{ width: '80%' }} /><i style={{ width: i % 2 ? '55%' : '68%' }} /></div></div>
        ))}
        {!loading && msgs.length === 0 && <div className='dx-empty'>This is the start of #{channel.name}. Say hello!</div>}
        {msgs.map((m, i) => {
          const p = msgs[i - 1];
          const first = !p || p.author_id !== m.author_id || new Date(m.created_at) - new Date(p.created_at) > 300000;
          const color = m.author_type === 'user' ? roleColor(m.author_id) : undefined;
          return (
            <div key={m.id} className={'dx-m' + (first ? ' first' : '')}>
              {first ? (
                <span className='av' onClick={() => m.author_type === 'user' && onProfile(m.author_id)}><Avatar src={m.author_avatar} name={m.author_name} size={40} /></span>
              ) : <span className='gut' />}
              <div style={{ minWidth: 0 }}>
                {first && (
                  <div className='hd'>
                    <b style={color ? { color } : undefined} onClick={() => m.author_type === 'user' && onProfile(m.author_id)}>{m.author_name}</b>
                    {m.author_type === 'bot' && <span className='mtag'>BOT</span>}
                    <small>{time(m.created_at)}</small>
                  </div>
                )}
                <div className='bd'>{m.content}</div>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      {err && <p className='bad' style={{ margin: '0 16px' }}>{err}</p>}
      <form className='dx-compose' onSubmit={send}>
        {emoji && <div className='emoji'>{EMOJI.map((e) => <button type='button' className='flat' key={e} onClick={() => setText((t) => t + e)}>{e}</button>)}</div>}
        <button type='button' className='flat dx-sq' onClick={() => setEmoji(!emoji)} aria-label='Emoji'><Ic n='emoji' s={22} /></button>
        <input value={text} maxLength={2000} placeholder={`Message #${channel.name}`} onChange={(e) => setText(e.target.value)} autoComplete='off' />
        <button className='flat dx-send' disabled={busy || !text.trim()} aria-label='Send'><Ic n='send' s={19} /></button>
      </form>
    </>
  );
}
