'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sb } from '@/lib/supabase-browser';

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const auth = sb().auth;
    if (mode === 'login') {
      const { error } = await auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
      else router.push('/dashboard');
    } else {
      const { data, error } = await auth.signUp({ email, password });
      if (error) setMsg(error.message);
      else if (data.session) router.push('/dashboard');
      else setMsg('Account created. Check your email and confirm it, then log in.');
    }
    setBusy(false);
  }

  return (
    <div className="wrap" style={{ maxWidth: 420 }}>
      <h1>{mode === 'login' ? 'Log in' : 'Create account'}</h1>
      <form className="card" onSubmit={submit}>
        <label>Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <label>Password (min 8 characters)</label>
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        <button disabled={busy}>{mode === 'login' ? 'Log in' : 'Sign up'}</button>
        {msg && <p className={msg.startsWith('Account') ? 'ok' : 'bad'}>{msg}</p>}
      </form>
      <p className="mute">
        {mode === 'login' ? 'New here? ' : 'Already have an account? '}
        <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'signup' : 'login'); setMsg(''); }}>
          {mode === 'login' ? 'Create an account' : 'Log in'}
        </a>
      </p>
    </div>
  );
}
