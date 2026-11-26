'use client';
import { useEffect, useRef, useState } from 'react';
import { sb } from '@/lib/supabase-browser';
import { api } from '@/lib/client';
import Avatar from '@/components/Avatar';
import Ic from '@/components/Ic';
import { GiftSheet } from '@/components/Sheets';
import './dx.css';
import './dx2.css';

const COLS = 'id,author_type,author_id,author_name,author_avatar,content,created_at,attachment_url,attachment_type';
const EMOJI = ['\u{1F600}', '\u{1F602}', '\u{1F60D}', '\u{1F60E}', '\u{1F973}', '\u{1F62D}', '\u{1F621}', '\u{1F44D}', '\u{1F44E}', '\u{1F64F}', '\u{1F525}', '\u2764\uFE0F', '\u{1F389}', '\u2728', '\u{1F4AF}', '\u{1F440}', '\u{1F91D}', '\u{1F680}', '\u{1F3B5}', '\u2615'];
const time = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Live text chat: Supabase Realtime plus a light poll as a safety net.
// + sends an image, the mic records a voice message, the gift opens Gift Nitro.
export default function ChatPanel({ channel, roleColor, onProfile }) {
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [emoji, setEmoji] = useState(false);
  const [gift, setGift] = useState(false);
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const end = useRef(null);
  const last = useRef(0);
  const file = useRef(null);
  const rec = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);
  const readTimer = useRef(null);

  const markRead = () => {
    clearTimeout(readTimer.current);
    readTimer.current = setTimeout(async () => {
      await api('POST', `/api/channels/${channel.id}/read`);
      window.dispatchEvent(new Event('unread-refresh'));
    }, 700);
  };

  useEffect(() => {
    let alive = true;
    setMsgs([]); setLoading(true); last.current = 0;
    const add = (rows) => setMsgs((m) => {
      const seen = new Set(m.map((x) => x.id));
      const fresh = rows.filter((x) => !seen.has(x.id));
      if (!fresh.length) return m;
      const all = [...m, ...fresh].sort((a, b) => a.id - b.id).slice(-300);
      last.current = all[all.length - 1].id;
      markRead();
      return all;
    });

    (async () => {
      const { data } = await sb().from('messages').select(COLS).eq('channel_id', channel.id).order('id', { ascending: false }).limit(60);
      if (!alive) return;
      add((data || []).reverse());
      setLoading(false);
      markRead();
    })();

    const rt = sb().channel('msgs:' + channel.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channel.id}` }, (p) => add([p.new]))
      .subscribe();

    const poll = setInterval(async () => {
      const { data } = await sb().from('messages').select(COLS).eq('channel_id', channel.id).gt('id', last.current).order('id').limit(50);
      if (alive && data?.length) add(data);
    }, 4000);

    return () => { alive = false; clearInterval(poll); clearTimeout(readTimer.current); sb().removeChannel(rt); stopStream(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id]);

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs, loading]);

  function stopStream() {
    clearInterval(timer.current);
    if (rec.current) { try { rec.current.r.stop(); } catch {} rec.current.stream.getTracks().forEach((t) => t.stop()); rec.current = null; }
  }

  async function send(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content || busy) return;
    await post(content);
  }

  async function post(content) {
    setBusy(true); setErr(''); setText(''); setEmoji(false);
    const r = await api('POST', `/api/channels/${channel.id}/messages`, { content });
    if (!r.ok) { setErr(r.j.error || 'Message not sent.'); setText(content); }
    setBusy(false);
  }

  async function upload(f) {
    if (!f) return;
    setBusy(true); setErr('');
    const s = (await sb().auth.getSession()).data.session;
    const fd = new FormData();
    fd.append('file', f);
    const r = await fetch(`/api/channels/${channel.id}/attach`, { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token }, body: fd });
    if (!r.ok) { let j = {}; try { j = await r.json(); } catch {} setErr(j.error || 'Upload failed.'); }
    setBusy(false);
  }

  async function startRec() {
    setErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      r.start();
      rec.current = { r, stream, mime: r.mimeType };
      setRecording(true); setSecs(0);
      timer.current = setInterval(() => setSecs((s) => s + 1), 1000);
    } catch {
      setErr('Microphone is blocked or not available.');
    }
  }

  function finishRec(sendIt) {
    const m = rec.current;
    clearInterval(timer.current);
    if (!m) return;
    rec.current = null;
    setRecording(false);
    m.r.onstop = async () => {
      m.stream.getTracks().forEach((t) => t.stop());
      if (!sendIt) return;
      const type = (m.mime || 'audio/webm').split(';')[0];
      const blob = new Blob(chunks.current, { type });
      if (blob.size > 0) await upload(new File([blob], 'voice.' + (type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'), { type }));
    };
    m.r.stop();
  }

  useEffect(() => { if (recording && secs >= 60) finishRec(true); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secs, recording]);

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
                {m.content && <div className='bd'>{m.content}</div>}
                {m.attachment_type === 'image' && <div className='att'><a href={m.attachment_url} target='_blank' rel='noreferrer'><img src={m.attachment_url} alt='attachment' loading='lazy' /></a></div>}
                {m.attachment_type === 'audio' && <div className='att'><audio controls preload='none' src={m.attachment_url} /></div>}
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      {err && <p className='bad' style={{ margin: '0 16px' }}>{err}</p>}
      <form className='dx-compose' onSubmit={send}>
        {emoji && <div className='emoji'>{EMOJI.map((e) => <button type='button' className='flat' key={e} onClick={() => setText((t) => t + e)}>{e}</button>)}</div>}
        {recording ? (
          <>
            <div className='rec'><i />Recording {secs}s</div>
            <button type='button' className='flat dx-sq' style={{ borderRadius: '50%' }} onClick={() => finishRec(false)} aria-label='Cancel'><Ic n='x' s={20} /></button>
            <button type='button' className='flat dx-send' onClick={() => finishRec(true)} aria-label='Send voice message'><Ic n='send' s={19} /></button>
          </>
        ) : (
          <>
            <input ref={file} type='file' hidden accept='image/png,image/jpeg,image/webp,image/gif' onChange={(e) => { upload(e.target.files[0]); e.target.value = ''; }} />
            <button type='button' className='flat dx-sq' style={{ borderRadius: '50%', background: 'none' }} onClick={() => file.current.click()} aria-label='Attach image'><Ic n='plus' s={22} /></button>
            <input value={text} maxLength={2000} placeholder={`Message #${channel.name}`} onChange={(e) => setText(e.target.value)} autoComplete='off' />
            <button type='button' className='flat dx-sq' style={{ borderRadius: '50%', background: 'none' }} onClick={() => setGift(true)} aria-label='Gift Nitro'><Ic n='gift' s={21} /></button>
            <button type='button' className='flat dx-sq' style={{ borderRadius: '50%', background: 'none' }} onClick={() => setEmoji(!emoji)} aria-label='Emoji'><Ic n='emoji' s={22} /></button>
            {text.trim() ? (
              <button className='flat dx-send' disabled={busy} aria-label='Send'><Ic n='send' s={19} /></button>
            ) : (
              <button type='button' className='flat dx-sq' style={{ borderRadius: '50%', background: 'none' }} onClick={startRec} aria-label='Record voice message'><Ic n='mic' s={22} /></button>
            )}
          </>
        )}
      </form>
      {gift && <GiftSheet onClose={() => setGift(false)} onSend={(link) => post('A Nitro gift for you: ' + link)} />}
    </>
  );
}
