'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabase-browser';
import Ic from '@/components/Ic';
import './dx.css';
import './dx2.css';

// Left rail: direct messages first, then your servers (with unread badges), then create or join.
export default function Rail({ activeId, dm }) {
  const [servers, setServers] = useState([]);
  const [unread, setUnread] = useState({});

  const loadUnread = useCallback(async () => {
    const r = await sb().rpc('unread_counts');
    const m = {};
    (r.data || []).forEach((x) => { m[x.server_id] = (m[x.server_id] || 0) + Number(x.cnt); });
    setUnread(m);
  }, []);

  useEffect(() => {
    (async () => {
      const u = (await sb().auth.getUser()).data.user;
      const r = await sb().from('server_members').select('servers(id,name,icon_url)').eq('user_id', u.id);
      setServers((r.data || []).map((x) => x.servers).filter(Boolean));
    })();
    loadUnread();
    const t = setInterval(loadUnread, 15000);
    window.addEventListener('unread-refresh', loadUnread);
    return () => { clearInterval(t); window.removeEventListener('unread-refresh', loadUnread); };
  }, [loadUnread]);

  return (
    <aside className='dx-rail'>
      <Link className={'flat dx-ico' + (dm ? ' on' : '')} href='/dm' title='Direct messages'><span className='pill' /><Ic n='chat' s={26} /></Link>
      <span className='dx-sep' />
      {servers.map((s) => (
        <Link key={s.id} href={'/servers/' + s.id} title={s.name} className={'flat dx-ico' + (activeId === s.id ? ' on' : '')}>
          <span className='pill' />
          {s.icon_url ? <img src={s.icon_url} alt='' referrerPolicy='no-referrer' /> : s.name.slice(0, 2).toUpperCase()}
          {unread[s.id] > 0 && activeId !== s.id && <span className='ubadge'>{unread[s.id] > 99 ? '99+' : unread[s.id]}</span>}
        </Link>
      ))}
      <Link className='flat dx-ico' href='/servers' title='Create or join a server'><Ic n='plus' s={26} /></Link>
    </aside>
  );
}
