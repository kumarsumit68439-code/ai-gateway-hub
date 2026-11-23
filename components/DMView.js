'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabase-browser';
import { api } from '@/lib/client';
import Avatar from '@/components/Avatar';
import Ic from '@/components/Ic';
import Rail from '@/components/Rail';
import './dx.css';

const COLS = 'id,sender_id,sender_name,sender_avatar,content,created_at';
const time = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Direct messages between members who share a server.
export default function DMView({ uid }) {
  const [me, setMe] = useState(null);
  const [threads, setThreads] = useState(null);
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef(null);
  const last = useRef(0);

  const loadList = useCallback(async () => {
    const r = await api('GET', '/api/dm');
    setThreads(r.ok ? r.j.threads : []);
  }, []);

  useEffect(() => {
    sb().auth.getUser().then(({ data }) => setMe(data.user));
    loadList();
    const t = setInterval(loadList, 15000);
    return () => clearInterval(t);
  }, [loadList]);

  useEffect(() => {
    setErr('');
    if (!uid) { setActive(null); return; }
    api('POST', '/api/dm/open', { uid }).then((r) => {
      if (r.ok) { setActive({ threadId: r.j.threadId, other: r.j.other }); loadList(); }
      else { setErr(r.j.error || 'Could not open the conversation.'); setActive(null); }
    });
  }, [uid, loadList]);

  const tid = active?.threadId;
  useEffect(() => {
    if (!tid) return;
    let alive = true;
    setMsgs([]); setLoading(true); last.current = 0;
    const add = (rows) => setMsgs((m) => {
      const seenIds = new Set(m.map((x) => x.id));
      const fresh = rows.filter((x) => !seenIds.has(x.id));
      if (!fresh.length) return m;
      const all = [...m, ...fresh].sort((a, b) => a.id - b.id).slice(-300);
      last.current = all[all.length - 1].id;
      return all;
    });
    (async () => {
      const { data } = await sb().from('dm_messages').select(COLS).eq('thread_id', tid).order('id', { ascending: false }).limit(60);
      if (!alive) return;
      add((data || []).reverse());
      setLoading(false);
    })();
    const rt = sb().channel('dm:' + tid)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `thread_id=eq.${tid}` }, (p) => add([p.new]))
      .subscribe();
    const poll = setInterval(async () => {
      const { data } = await sb().from('dm_messages').select(COLS).eq('thread_id', tid).gt('id', last.current).order('id').limit(50);
      if (alive && data?.length) add(data);
    }, 4000);
    return () => { alive = false; clearInterval(poll); sb().removeChannel(rt); };
  }, [tid]);

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs, loading]);

  async function send(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content || busy || !tid) return;
    setBusy(true); setErr(''); setText('');
    const r = await api('POST', `/api/dm/${tid}/send`, { content });
    if (!r.ok) { setErr(r.j.error || 'Message not sent.'); setText(content); } else loadList();
    setBusy(false);
  }

  return (
    <div className={'dx ' + (uid ? 'has-ch' : 'no-ch')}>
      <Rail dm />

      <section className='dx-list'>
        <div className='dx-lhead'><b>Messages</b></div>
        <div className='dx-chs'>
          {threads === null && <div className='skel' style={{ height: 56, margin: 8 }} />}
          {threads && threads.length === 0 && <p className='mute' style={{ padding: 14 }}>No conversations yet. Open a member profile in a server and press Message.</p>}
          {threads && threads.map((t) => (
            <Link key={t.threadId} href={'/dm/' + t.other.id} className={'flat dx-ch' + (uid === t.other.id ? ' on' : '')} style={{ padding: '10px 12px' }}>
              <Avatar src={t.other.avatar} name={t.other.name} size={40} />
              <span style={{ minWidth: 0 }}>
                <b style={{ display: 'block', fontSize: 16 }}>{t.other.name}</b>
                <small style={{ display: 'block', color: '#9a9ca3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.last ? t.last.content : 'No messages yet'}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className='dx-main'>
        {!uid && <div className='dx-empty'>Select a conversation.</div>}
        {uid && !active && <div className='dx-empty'>{err ? <span className='bad'>{err} <Link href='/dm'>Back</Link></span> : <div className='skel' style={{ width: 200, height: 24 }} />}</div>}
        {active && (
          <>
            <div className='dx-top'>
              <Link className='flat dx-sq dx-back' href='/dm' aria-label='Back'><Ic n='back' s={22} /></Link>
              <Avatar src={active.other.avatar} name={active.other.name} size={36} />
              <div className='tt'><div className='t'>{active.other.name}</div></div>
            </div>
            <div className='dx-msgs'>
              {loading && [0, 1, 2].map((i) => <div className='dx-skel' key={i}><span className='c' /><div className='l'><i style={{ width: 110 }} /><i style={{ width: '70%' }} /></div></div>)}
              {!loading && msgs.length === 0 && <div className='dx-empty'>This is the start of your conversation with {active.other.name}.</div>}
              {msgs.map((m, i) => {
                const p = msgs[i - 1];
                const first = !p || p.sender_id !== m.sender_id || new Date(m.created_at) - new Date(p.created_at) > 300000;
                return (
                  <div key={m.id} className={'dx-m' + (first ? ' first' : '')}>
                    {first ? <Avatar src={m.sender_avatar} name={m.sender_name} size={40} /> : <span className='gut' />}
                    <div style={{ minWidth: 0 }}>
                      {first && <div className='hd'><b>{m.sender_name}</b><small>{time(m.created_at)}</small></div>}
                      <div className='bd'>{m.content}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={end} />
            </div>
            {err && <p className='bad' style={{ margin: '0 16px' }}>{err}</p>}
            <form className='dx-compose' onSubmit={send}>
              <input value={text} maxLength={2000} placeholder={'Message ' + active.other.name} onChange={(e) => setText(e.target.value)} autoComplete='off' />
              <button className='flat dx-send' disabled={busy || !text.trim()} aria-label='Send'><Ic n='send' s={19} /></button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
