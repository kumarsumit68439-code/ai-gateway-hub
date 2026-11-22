'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sb } from '@/lib/supabase-browser';
import Avatar from '@/components/Avatar';
import './discord.css';

const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];

function ytId(u) {
  try {
    const x = new URL(u);
    const h = x.hostname.replace(/^www\./, '');
    if (h === 'youtu.be') return x.pathname.slice(1, 12);
    if (h.endsWith('youtube.com')) {
      const v = x.searchParams.get('v');
      if (v) return v.slice(0, 11);
      const m = x.pathname.match(/^\/(shorts|embed)\/([\w-]{11})/);
      if (m) return m[2];
    }
  } catch {}
  return null;
}

// Plays what the bot is playing, starting at the same point for everyone.
function MusicPlayer({ music }) {
  const off = Math.max(0, Math.floor((Date.now() - new Date(music.started_at).getTime()) / 1000));
  const yt = ytId(music.url);
  return (
    <div className="music" key={music.started_at}>
      <span className="eq"><i /><i /><i /></span>
      <div style={{ flex: 1, minWidth: 180 }}>
        <b>{music.title || 'Now playing'}</b>
        <div className="mute" style={{ fontSize: 13 }}>Requested by {music.requested_by || 'a bot'}</div>
      </div>
      {yt ? (
        <iframe src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&start=${off}&rel=0`} allow="autoplay; encrypted-media" title="Now playing" />
      ) : (
        <audio src={music.url} autoPlay controls onLoadedMetadata={(e) => { const d = e.target.duration; if (Number.isFinite(d) && off > 2 && off < d - 1) e.target.currentTime = off; }} />
      )}
    </div>
  );
}

// Voice channel: peer-to-peer audio (WebRTC) with signaling over Supabase Realtime.
export default function VoiceRoom({ channel, me }) {
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [people, setPeople] = useState([]);
  const [bots, setBots] = useState([]);
  const [music, setMusic] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const pcs = useRef(new Map());
  const local = useRef(null);
  const rt = useRef(null);
  const box = useRef(null);
  const hb = useRef(null);
  const joinedRef = useRef(false);

  const api = async (action) => {
    const s = (await sb().auth.getSession()).data.session;
    return fetch(`/api/channels/${channel.id}/voice`, { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
  };

  const refresh = useCallback(async () => {
    const [v, b, m] = await Promise.all([
      sb().from('voice_members').select('user_id,user_name,updated_at').eq('channel_id', channel.id),
      sb().from('voice_bots').select('bots(id,name,avatar_url)').eq('channel_id', channel.id),
      sb().from('voice_music').select('url,title,requested_by,started_at').eq('channel_id', channel.id).maybeSingle(),
    ]);
    setPeople((v.data || []).filter((x) => Date.now() - new Date(x.updated_at).getTime() < 90000));
    setBots((b.data || []).map((x) => x.bots).filter(Boolean));
    setMusic(m.data || null);
  }, [channel.id]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    const ch = sb().channel('vs:' + channel.id);
    ['voice_members', 'voice_bots', 'voice_music'].forEach((table) => {
      ch.on('postgres_changes', { event: '*', schema: 'public', table, filter: `channel_id=eq.${channel.id}` }, refresh);
    });
    ch.subscribe();
    return () => { clearInterval(t); sb().removeChannel(ch); };
  }, [channel.id, refresh]);

  function sig(to, payload) {
    rt.current?.send({ type: 'broadcast', event: 'sig', payload: { from: me.id, to, ...payload } });
  }

  function closePc(pid) {
    const pc = pcs.current.get(pid);
    if (pc) { pcs.current.delete(pid); pc.close(); }
    box.current?.querySelector(`[data-p="${pid}"]`)?.remove();
  }

  function makePc(pid) {
    const pc = new RTCPeerConnection({ iceServers: ICE });
    pc._q = [];
    if (local.current) local.current.getTracks().forEach((t) => pc.addTrack(t, local.current));
    else pc.addTransceiver('audio', { direction: 'recvonly' });
    pc.onicecandidate = (e) => { if (e.candidate) sig(pid, { type: 'ice', candidate: e.candidate }); };
    pc.ontrack = (e) => {
      let a = box.current?.querySelector(`[data-p="${pid}"]`);
      if (!a && box.current) { a = document.createElement('audio'); a.dataset.p = pid; a.autoplay = true; box.current.appendChild(a); }
      if (a) a.srcObject = e.streams[0];
    };
    pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState)) closePc(pid); };
    pcs.current.set(pid, pc);
    return pc;
  }

  async function call(pid) {
    const pc = makePc(pid);
    await pc.setLocalDescription(await pc.createOffer());
    sig(pid, { type: 'offer', sdp: pc.localDescription });
  }

  async function onSig(p) {
    if (!p || p.to !== me.id) return;
    let pc = pcs.current.get(p.from);
    try {
      if (p.type === 'offer') {
        if (pc) closePc(p.from);
        pc = makePc(p.from);
        await pc.setRemoteDescription(p.sdp);
        while (pc._q.length) await pc.addIceCandidate(pc._q.shift());
        await pc.setLocalDescription(await pc.createAnswer());
        sig(p.from, { type: 'answer', sdp: pc.localDescription });
      } else if (!pc) {
        return;
      } else if (p.type === 'answer') {
        await pc.setRemoteDescription(p.sdp);
        while (pc._q.length) await pc.addIceCandidate(pc._q.shift());
      } else if (p.type === 'ice') {
        if (pc.remoteDescription) await pc.addIceCandidate(p.candidate); else pc._q.push(p.candidate);
      }
    } catch {}
  }

  function cleanup() {
    clearInterval(hb.current);
    pcs.current.forEach((pc) => pc.close());
    pcs.current.clear();
    local.current?.getTracks().forEach((t) => t.stop());
    local.current = null;
    if (rt.current) { sb().removeChannel(rt.current); rt.current = null; }
    if (box.current) box.current.innerHTML = '';
  }

  async function join() {
    setErr(''); setBusy(true);
    try {
      try {
        local.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      } catch {
        local.current = null;
        setErr('Microphone is not available. You can still listen.');
      }
      const r = await api('join');
      if (!r.ok) throw new Error('join');
      const ch = sb().channel('vc:' + channel.id, { config: { presence: { key: me.id }, broadcast: { self: false } } });
      ch.on('broadcast', { event: 'sig' }, ({ payload }) => onSig(payload));
      ch.on('presence', { event: 'sync' }, () => {
        Object.keys(ch.presenceState()).forEach((pid) => {
          if (pid !== me.id && me.id > pid && !pcs.current.has(pid)) call(pid);
        });
      });
      ch.on('presence', { event: 'leave' }, ({ key }) => closePc(key));
      rt.current = ch;
      ch.subscribe(async (s) => { if (s === 'SUBSCRIBED') await ch.track({ name: me.name }); });
      hb.current = setInterval(() => api('ping'), 25000);
      joinedRef.current = true;
      setJoined(true);
      refresh();
    } catch {
      setErr('Could not join voice. Please try again.');
      cleanup();
    }
    setBusy(false);
  }

  async function leave() {
    cleanup();
    joinedRef.current = false;
    setJoined(false); setMuted(false);
    await api('leave');
    refresh();
  }

  function toggleMute() {
    local.current?.getAudioTracks().forEach((t) => { t.enabled = muted; });
    setMuted(!muted);
  }

  useEffect(() => () => {
    const was = joinedRef.current;
    cleanup();
    if (was) api('leave');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="dc-head">
        <b>Voice: {channel.name}</b>
        <div className="row">
          {joined && <button className="ghost small" onClick={toggleMute}>{muted ? 'Unmute' : 'Mute'}</button>}
          {joined ? <button className="danger small" onClick={leave}>Leave</button> : <button className="small" onClick={join} disabled={busy}>{busy ? 'Joining\u2026' : 'Join voice'}</button>}
        </div>
      </div>
      <div className="vroom">
        {err && <p className="bad">{err}</p>}
        <div className="vgrid">
          {people.map((p) => (
            <div className="vtile" key={p.user_id}><Avatar name={p.user_name} size={56} /><b>{p.user_name}</b></div>
          ))}
          {bots.map((b) => (
            <div className="vtile bot" key={b.id}><Avatar src={b.avatar_url} name={b.name} size={56} /><b>{b.name}</b><span className="tag">BOT</span></div>
          ))}
        </div>
        {people.length === 0 && bots.length === 0 && <p className="mute">Nobody is in this voice channel yet.</p>}
        {music && (joined ? <MusicPlayer music={music} /> : <p className="mute">Now playing: {music.title}. Join voice to listen.</p>)}
        {joined && music && <div style={{ marginTop: 10 }}><button className="ghost small" onClick={async () => { await api('stop'); refresh(); }}>Stop music</button></div>}
        <div ref={box} style={{ display: 'none' }} />
      </div>
    </>
  );
}
