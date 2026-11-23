'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabase-browser';
import Ic from '@/components/Ic';
import './dx.css';

// Left rail: dashboard, direct messages and your servers.
export default function Rail({ activeId, dm }) {
  const [servers, setServers] = useState([]);

  useEffect(() => {
    (async () => {
      const u = (await sb().auth.getUser()).data.user;
      const r = await sb().from('server_members').select('servers(id,name,icon_url)').eq('user_id', u.id);
      setServers((r.data || []).map((x) => x.servers).filter(Boolean));
    })();
  }, []);

  return (
    <aside className='dx-rail'>
      <Link className='flat dx-ico' href='/dashboard' title='Dashboard'><Ic n='grid' s={22} /></Link>
      <Link className={'flat dx-ico' + (dm ? ' on' : '')} href='/dm' title='Direct messages'><span className='pill' /><Ic n='chat' s={22} /></Link>
      <span className='dx-sep' />
      {servers.map((s) => (
        <Link key={s.id} href={'/servers/' + s.id} title={s.name} className={'flat dx-ico' + (activeId === s.id ? ' on' : '')}>
          <span className='pill' />
          {s.icon_url ? <img src={s.icon_url} alt='' referrerPolicy='no-referrer' /> : s.name.slice(0, 2).toUpperCase()}
        </Link>
      ))}
      <Link className='flat dx-ico' href='/servers' title='Create or join a server'><Ic n='plus' s={22} /></Link>
    </aside>
  );
}
