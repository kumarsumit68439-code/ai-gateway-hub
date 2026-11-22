'use client';
import { useState } from 'react';
import { sb } from '@/lib/supabase-browser';
import { Icon, NAMES } from '@/components/Icons';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const auth = sb().auth;
    if (mode === 'login') {
      const { error } = await auth.signInWithPassword({ email, password });
      if (error) { setMsg(error.message); setBusy(false); return; }
      window.location.href = '/dashboard';
      return;
    }
    const { data, error } = await auth.signUp({ email, password });
    if (error) setMsg(error.message);
    else if (data.session) { window.location.href = '/dashboard'; return; }
    else setMsg('Account created. Check your email to confirm it, then log in.');
    setBusy(false);
  }

  return (
    <div className="auth">
      <section className="hero fade">
        <span className="badge">Jilowa AI Gateway</span>
        <h1 className="big">One key.<br /><span className="grad">Every AI model.</span></h1>
        <p className="lead">Sign in to get your API key.</p>
        <div className="chips">
          {['groq', 'openrouter', 'gemini', 'openai'].map((id) => (
            <span key={id}><Icon id={id} size={24} />{NAMES[id]}</span>
          ))}
        </div>
      </section>

      <form className="glass formcard fade d2" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
        <label>Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
        <label>Password</label>
        <div className="pw">
          <input type={show ? 'text' : 'password'} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Min. 8 characters" />
          <button type="button" className="ghost small" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
        </div>
        <button className="wide" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}</button>
        {msg && <p className={msg.startsWith('Account') ? 'ok' : 'bad'}>{msg}</p>}
        <p className="mute" style={{ marginBottom: 0 }}>
          {mode === 'login' ? 'New here? ' : 'Have an account? '}
          <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'signup' : 'login'); setMsg(''); }}>
            {mode === 'login' ? 'Create an account' : 'Log in'}
          </a>
        </p>
      </form>
    </div>
  );
}
