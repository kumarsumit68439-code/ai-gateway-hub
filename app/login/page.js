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
  const [googleBusy, setGoogleBusy] = useState(false);

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

  async function signInWithGoogle() {
    setGoogleBusy(true);
    setMsg('');
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await sb().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) {
      setMsg(error.message || 'Google sign-in failed');
      setGoogleBusy(false);
    }
    // On success the browser redirects to Google — no further action here.
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

      <div className="glass formcard fade d2">
        <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>

        {/* Google login */}
        <button
          type="button"
          className="google-btn wide"
          disabled={googleBusy || busy}
          onClick={signInWithGoogle}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8H6.3C9.7 35.7 16.3 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 36.3 44 31.5 44 24c0-1.3-.1-2.5-.4-3.5z" />
          </svg>
          {googleBusy ? 'Redirecting to Google…' : 'Continue with Google'}
        </button>

        <div className="or-line"><span>or</span></div>

        <form onSubmit={submit}>
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
          <label>Password</label>
          <div className="pw">
            <input type={show ? 'text' : 'password'} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Min. 8 characters" />
            <button type="button" className="ghost small" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
          </div>
          <button className="wide" disabled={busy || googleBusy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}</button>
        </form>

        {msg && <p className={msg.startsWith('Account') ? 'ok' : 'bad'}>{msg}</p>}
        <p className="mute" style={{ marginBottom: 0 }}>
          {mode === 'login' ? 'New here? ' : 'Have an account? '}
          <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'signup' : 'login'); setMsg(''); }}>
            {mode === 'login' ? 'Create an account' : 'Log in'}
          </a>
        </p>
      </div>

      <style jsx global>{`
        .google-btn {
          display: flex !important;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 11px 16px;
          margin: 4px 0 0;
          border-radius: 11px;
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.06);
          color: var(--text);
          font: inherit;
          font-weight: 600;
          cursor: pointer;
          box-shadow: none;
          transition: 0.2s;
        }
        .google-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.11);
          border-color: rgba(255, 255, 255, 0.25);
          transform: translateY(-1px);
        }
        .google-btn:disabled { opacity: 0.6; cursor: wait; }
        .or-line {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 16px 0 14px;
          color: var(--mute);
          font-size: 13px;
        }
        .or-line::before,
        .or-line::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--line);
        }
      `}</style>
    </div>
  );
}
