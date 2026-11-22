'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function FloatingWindowPage() {
  const windowRef = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [minimized, setMinimized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [slide, setSlide] = useState(0);

  // Auto-advance product demo slides
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % 4), 3200);
    return () => clearInterval(t);
  }, []);

  // Center floating window
  useEffect(() => {
    const center = () => {
      if (!windowRef.current) return;
      const w = windowRef.current.offsetWidth;
      const h = windowRef.current.offsetHeight;
      setPos({
        x: Math.max(16, (window.innerWidth - w) / 2 + (sidebarOpen ? 40 : 0)),
        y: Math.max(70, (window.innerHeight - h) / 2 - 30),
      });
    };
    center();
    window.addEventListener('resize', center);
    return () => window.removeEventListener('resize', center);
  }, [sidebarOpen]);

  // Drag
  useEffect(() => {
    const onMove = (e) => {
      if (!dragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      setPos({
        x: clientX - dragOffset.current.x,
        y: clientY - dragOffset.current.y,
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging]);

  const startDrag = (e) => {
    if (e.target.closest('.win-btn') || e.target.closest('.win-content')) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = windowRef.current.getBoundingClientRect();
    dragOffset.current = { x: clientX - rect.left, y: clientY - rect.top };
    setDragging(true);
  };

  const slides = [
    {
      title: 'AI Gateway Hub',
      sub: 'One API key for every AI model',
      body: 'Groq · OpenRouter · Gemini · OpenAI',
      tag: 'PRODUCT',
    },
    {
      title: 'Gateway Keys',
      sub: 'sk-gw-…',
      body: 'Create your key once. Call any supported model through a single OpenAI-compatible endpoint.',
      tag: 'KEYS',
    },
    {
      title: 'Endpoints',
      sub: 'OpenAI compatible',
      body: 'POST /api/v1/chat/completions\nGET /api/v1/models\nGET /api/v1/providers',
      tag: 'API',
    },
    {
      title: 'Security & Limits',
      sub: 'Built for production',
      body: 'Supabase RLS · Hashed keys\n30 req/min · 1000/day\nStreaming supported',
      tag: 'SECURE',
    },
  ];

  return (
    <div className={`float-page ${sidebarOpen ? 'sb-open' : 'sb-closed'}`}>
      {/* ===== SIDEBAR ===== */}
      <aside className={`float-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sb-head">
          <span className="dot" />
          <b>AI Gateway</b>
        </div>

        <nav className="sb-nav">
          <p className="sb-label">Explore</p>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/models">Live Models</Link>
          <Link href="/docs">API Docs</Link>
          <Link href="/docs/backend">Backend Docs</Link>
          <Link href="/floating" className="active-link">Floating Window</Link>
          <p className="sb-label">Keys</p>
          <Link href="/gateway-keys">AI Gateway keys</Link>
          <Link href="/backend-keys">Backend keys</Link>
          <p className="sb-label">Account</p>
          <Link href="/account">Verification</Link>
          <Link href="/profile">Profile</Link>
          <Link href="/settings">Settings</Link>
          <Link href="/menu">All pages</Link>
        </nav>

        <div className="sb-foot">
          <p>Provided by <span className="grad">Jilowa</span></p>
          <small>One key → every model</small>
        </div>

        {/* BIG clear HIDE button at bottom of sidebar */}
        <button
          type="button"
          className="sb-hide-btn"
          onClick={() => setSidebarOpen(false)}
        >
          ← Hide sidebar
        </button>
      </aside>

      {/* ===== UNHIDE BUTTON (visible only when sidebar is closed) ===== */}
      <button
        type="button"
        className={`sb-unhide-btn ${sidebarOpen ? 'hidden' : ''}`}
        onClick={() => setSidebarOpen(true)}
        aria-label="Show sidebar"
      >
        ☰ Show sidebar
      </button>

      {/* ===== SCENE + FLOATING WINDOW ===== */}
      <div className="float-scene">
        <div className="scene-floor" />
        <div className="scene-particles" aria-hidden="true">
          {[...Array(10)].map((_, i) => (
            <span key={i} className="particle" style={{ '--i': i }} />
          ))}
        </div>

        <div
          ref={windowRef}
          className={`float-window ${dragging ? 'dragging' : ''} ${minimized ? 'minimized' : ''}`}
          style={{
            left: pos.x,
            top: pos.y,
          }}
          onMouseDown={startDrag}
          onTouchStart={startDrag}
        >
          <div className="win-titlebar">
            <div className="win-dots">
              <button type="button" className="win-btn close" onClick={() => setMinimized(true)} title="Minimize" />
              <button type="button" className="win-btn min" onClick={() => setMinimized(true)} title="Minimize" />
              <button type="button" className="win-btn max" onClick={() => setMinimized(false)} title="Restore" />
            </div>
            <span className="win-title">AI Gateway Hub · Product Demo</span>
            <div className="win-spacer" />
          </div>

          {!minimized && (
            <div className="win-content">
              {/* ===== CUSTOM PRODUCT DEMO (no external cartoon video) ===== */}
              <div className="demo-3d">
                <div className="demo-screen">
                  <div className="demo-topbar">
                    <span className="demo-dot red" />
                    <span className="demo-dot yellow" />
                    <span className="demo-dot green" />
                    <span className="demo-url">aigateway.jilowa · live</span>
                  </div>

                  <div className="demo-body">
                    {slides.map((s, i) => (
                      <div
                        key={i}
                        className={`demo-slide ${slide === i ? 'active' : ''}`}
                      >
                        <span className="demo-tag">{s.tag}</span>
                        <h2>{s.title}</h2>
                        <p className="demo-sub">{s.sub}</p>
                        <pre className="demo-body-text">{s.body}</pre>
                      </div>
                    ))}

                    {/* Animated code / key visual */}
                    <div className="demo-code">
                      <code>
                        <span className="c-key">Authorization</span>:
                        <span className="c-val"> Bearer sk-gw-••••••••</span>
                      </code>
                      <code>
                        <span className="c-key">POST</span>
                        <span className="c-val"> /api/v1/chat/completions</span>
                      </code>
                    </div>
                  </div>

                  <div className="demo-progress">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`demo-dot-btn ${slide === i ? 'on' : ''}`}
                        onClick={() => setSlide(i)}
                        aria-label={`Slide ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="demo-glow" />
              </div>

              {/* Feature cards */}
              <div className="details-grid">
                <div className="detail-card">
                  <span className="detail-icon">🔑</span>
                  <h3>Gateway Keys</h3>
                  <p>Create <code>sk-gw-...</code> keys and call real models through one endpoint.</p>
                </div>
                <div className="detail-card">
                  <span className="detail-icon">📡</span>
                  <h3>Endpoints</h3>
                  <p><code>POST /api/v1/chat/completions</code><br /><code>GET /api/v1/models</code></p>
                </div>
                <div className="detail-card">
                  <span className="detail-icon">🛡️</span>
                  <h3>Security</h3>
                  <p>RLS · hashed keys · 30/min · 1000/day · free models only.</p>
                </div>
                <div className="detail-card">
                  <span className="detail-icon">🚀</span>
                  <h3>Streaming</h3>
                  <p>Full streaming support. Live model list. Backend data keys.</p>
                </div>
              </div>

              <div className="win-cta">
                <Link href="/login" className="btn">Get started</Link>
                <Link href="/docs" className="btn ghost">Read the docs</Link>
              </div>

              <p className="win-footer">Provided by <span className="grad">Jilowa</span> · AI Gateway Hub</p>
            </div>
          )}
        </div>

        {minimized && (
          <button type="button" className="float-dock" onClick={() => setMinimized(false)}>
            <span className="dot" /> Restore Floating Window
          </button>
        )}
      </div>

      <style jsx global>{`
        .float-page {
          position: relative;
          min-height: calc(100vh - 58px);
          display: flex;
          overflow: hidden;
        }

        /* ---------- SIDEBAR ---------- */
        .float-sidebar {
          position: relative;
          width: 250px;
          flex-shrink: 0;
          background: rgba(8, 9, 18, 0.97);
          border-right: 1px solid var(--line);
          display: flex;
          flex-direction: column;
          z-index: 30;
          transition: transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1), margin 0.32s;
          height: calc(100vh - 58px);
        }
        .float-sidebar.closed {
          transform: translateX(-100%);
          margin-right: -250px;
          pointer-events: none;
        }

        .sb-head {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px 16px 12px;
          font-family: var(--f-head), sans-serif;
          font-weight: 700;
          font-size: 15px;
        }

        .sb-nav {
          flex: 1;
          padding: 4px 10px 12px;
          overflow-y: auto;
        }
        .sb-nav a {
          display: block;
          padding: 9px 12px;
          border-radius: 9px;
          color: var(--text);
          font-size: 14px;
          transition: 0.15s;
        }
        .sb-nav a:hover,
        .sb-nav a.active-link {
          background: rgba(124, 92, 255, 0.18);
          color: #fff;
          text-decoration: none;
        }
        .sb-label {
          margin: 12px 12px 4px;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--mute);
        }
        .sb-foot {
          padding: 12px 16px;
          border-top: 1px solid var(--line);
          font-size: 12px;
          color: var(--mute);
        }

        /* CLEAR HIDE BUTTON */
        .sb-hide-btn {
          margin: 0 12px 14px;
          width: calc(100% - 24px);
          padding: 12px 14px;
          border-radius: 11px;
          border: 1px solid rgba(251, 113, 133, 0.45);
          background: rgba(251, 113, 133, 0.12);
          color: #fb7185;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
          text-align: center;
        }
        .sb-hide-btn:hover {
          background: rgba(251, 113, 133, 0.25);
          border-color: #fb7185;
          transform: translateY(-1px);
        }
        .sb-hide-btn:active {
          transform: scale(0.98);
        }

        /* CLEAR UNHIDE BUTTON */
        .sb-unhide-btn {
          position: fixed;
          top: 68px;
          left: 12px;
          z-index: 40;
          padding: 11px 16px;
          border-radius: 12px;
          border: 1px solid rgba(124, 92, 255, 0.5);
          background: rgba(14, 15, 26, 0.95);
          color: #c4b5fd;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(12px);
          transition: 0.25s, opacity 0.2s, visibility 0.2s;
        }
        .sb-unhide-btn.hidden {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }
        .sb-unhide-btn:hover {
          background: rgba(124, 92, 255, 0.25);
          border-color: var(--accent);
          color: #fff;
          transform: translateY(-2px);
        }

        /* ---------- SCENE ---------- */
        .float-scene {
          flex: 1;
          position: relative;
          min-height: calc(100vh - 58px);
          overflow: hidden;
          perspective: 1200px;
        }
        .scene-floor {
          position: absolute;
          inset: 45% -30% -20%;
          background: radial-gradient(ellipse at center, rgba(124, 92, 255, 0.1) 0%, transparent 65%);
          transform: rotateX(65deg);
          pointer-events: none;
        }
        .particle {
          position: absolute;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: var(--accent2);
          opacity: 0.3;
          left: calc(10% + var(--i) * 8%);
          top: calc(20% + var(--i) * 6%);
          animation: particleFloat 7s ease-in-out infinite;
          animation-delay: calc(var(--i) * -0.5s);
          box-shadow: 0 0 8px var(--accent2);
        }
        @keyframes particleFloat {
          0%, 100% { transform: translateY(0); opacity: 0.2; }
          50% { transform: translateY(-30px); opacity: 0.5; }
        }

        /* ---------- FLOATING WINDOW ---------- */
        .float-window {
          position: absolute;
          width: min(500px, 92vw);
          transform-style: preserve-3d;
          animation: windowFloat 5.5s ease-in-out infinite;
          cursor: grab;
          z-index: 10;
          border-radius: 16px;
          background: rgba(14, 16, 28, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow:
            0 24px 70px rgba(0, 0, 0, 0.55),
            0 0 0 1px rgba(124, 92, 255, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(20px);
          overflow: hidden;
        }
        .float-window.dragging {
          cursor: grabbing;
          animation: none;
          box-shadow: 0 36px 100px rgba(0, 0, 0, 0.65), 0 0 40px rgba(124, 92, 255, 0.3);
        }
        .float-window.minimized {
          width: 260px;
          animation: none;
        }
        @keyframes windowFloat {
          0%, 100% { transform: translateY(0) rotateX(1.5deg) rotateY(-2deg); }
          50% { transform: translateY(-12px) rotateX(-1deg) rotateY(1.5deg); }
        }

        .win-titlebar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: rgba(0, 0, 0, 0.4);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          user-select: none;
        }
        .win-dots { display: flex; gap: 6px; }
        .win-btn {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          padding: 0;
        }
        .win-btn.close { background: #ff5f57; }
        .win-btn.min { background: #febc2e; }
        .win-btn.max { background: #28c840; }
        .win-title {
          flex: 1;
          text-align: center;
          font-size: 12px;
          color: var(--mute);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .win-spacer { width: 40px; }

        .win-content {
          padding: 14px;
          max-height: min(68vh, 620px);
          overflow-y: auto;
          cursor: default;
        }

        /* ---------- PRODUCT DEMO (custom, no external video) ---------- */
        .demo-3d {
          position: relative;
          margin-bottom: 16px;
          perspective: 900px;
        }
        .demo-screen {
          position: relative;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(124, 92, 255, 0.4);
          background: linear-gradient(160deg, #0c0e1a 0%, #12152a 100%);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
          transform: rotateX(4deg) rotateY(-3deg);
          animation: demoTilt 7s ease-in-out infinite;
          transform-style: preserve-3d;
        }
        @keyframes demoTilt {
          0%, 100% { transform: rotateX(4deg) rotateY(-4deg); }
          50% { transform: rotateX(-2deg) rotateY(3deg); }
        }
        .demo-glow {
          position: absolute;
          inset: -20%;
          background: radial-gradient(circle at 50% 40%, rgba(124, 92, 255, 0.25), transparent 60%);
          pointer-events: none;
          z-index: -1;
          animation: glowPulse 4s ease-in-out infinite;
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        .demo-topbar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.45);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .demo-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .demo-dot.red { background: #ff5f57; }
        .demo-dot.yellow { background: #febc2e; }
        .demo-dot.green { background: #28c840; }
        .demo-url {
          margin-left: 8px;
          font-size: 11px;
          color: var(--mute);
          font-family: ui-monospace, monospace;
        }

        .demo-body {
          position: relative;
          height: 168px;
          padding: 16px 18px 8px;
          overflow: hidden;
        }
        .demo-slide {
          position: absolute;
          inset: 16px 18px 40px;
          opacity: 0;
          transform: translateY(12px) scale(0.97);
          transition: opacity 0.45s, transform 0.45s;
          pointer-events: none;
        }
        .demo-slide.active {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        .demo-tag {
          display: inline-block;
          font-size: 10px;
          letter-spacing: 0.08em;
          padding: 3px 8px;
          border-radius: 99px;
          background: rgba(124, 92, 255, 0.25);
          color: #c4b5fd;
          margin-bottom: 8px;
        }
        .demo-slide h2 {
          margin: 0 0 4px;
          font-size: 20px;
          line-height: 1.2;
        }
        .demo-sub {
          margin: 0 0 8px;
          font-size: 13px;
          color: var(--accent2);
          font-weight: 500;
        }
        .demo-body-text {
          margin: 0;
          font-size: 12px;
          color: var(--mute);
          white-space: pre-line;
          font-family: ui-monospace, Menlo, monospace;
          line-height: 1.45;
          background: none;
          border: none;
          padding: 0;
        }

        .demo-code {
          position: absolute;
          bottom: 36px;
          left: 18px;
          right: 18px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .demo-code code {
          font-size: 11px;
          padding: 5px 8px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.06);
          font-family: ui-monospace, monospace;
        }
        .c-key { color: #a78bfa; }
        .c-val { color: #67e8f9; }

        .demo-progress {
          display: flex;
          justify-content: center;
          gap: 6px;
          padding: 0 0 12px;
        }
        .demo-dot-btn {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          cursor: pointer;
          padding: 0;
          transition: 0.2s;
        }
        .demo-dot-btn.on {
          background: var(--accent);
          box-shadow: 0 0 8px var(--accent);
          width: 18px;
          border-radius: 99px;
        }

        /* Details */
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
          margin-bottom: 14px;
        }
        @media (max-width: 420px) {
          .details-grid { grid-template-columns: 1fr; }
        }
        .detail-card {
          padding: 11px;
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid var(--line);
          transition: 0.2s;
        }
        .detail-card:hover {
          border-color: rgba(124, 92, 255, 0.4);
          transform: translateY(-2px);
        }
        .detail-icon { font-size: 18px; display: block; margin-bottom: 3px; }
        .detail-card h3 { margin: 0 0 3px; font-size: 13px; }
        .detail-card p {
          margin: 0;
          font-size: 11px;
          color: var(--mute);
          line-height: 1.4;
        }
        .detail-card code {
          font-size: 10px;
          background: rgba(0, 0, 0, 0.3);
          padding: 1px 4px;
          border-radius: 3px;
        }

        .win-cta {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        .win-cta .btn {
          flex: 1;
          text-align: center;
          font-size: 13px;
          padding: 9px 12px;
        }
        .win-footer {
          text-align: center;
          font-size: 11px;
          color: var(--mute);
          margin: 0;
        }

        .float-dock {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 20px;
          border-radius: 99px;
          border: 1px solid var(--line);
          background: rgba(14, 15, 26, 0.92);
          color: var(--text);
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          z-index: 12;
          box-shadow: 0 10px 32px rgba(0, 0, 0, 0.45);
        }
        .float-dock:hover {
          border-color: var(--accent);
          transform: translateX(-50%) translateY(-2px);
        }

        /* Mobile */
        @media (max-width: 700px) {
          .float-sidebar {
            position: fixed;
            top: 58px;
            left: 0;
            bottom: 0;
            height: auto;
            z-index: 50;
            box-shadow: 8px 0 40px rgba(0, 0, 0, 0.5);
          }
          .float-sidebar.closed {
            margin-right: 0;
          }
          .float-window {
            width: min(94vw, 420px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .float-window,
          .demo-screen,
          .particle,
          .demo-glow {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
