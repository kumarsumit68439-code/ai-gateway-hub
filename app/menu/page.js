import Link from 'next/link';

export const metadata = { title: 'Menu | AI Gateway' };

const items = [
  ['/dashboard', 'D', 'Dashboard', 'Usage overview and your recent requests'],
  ['/gateway-keys', 'G', 'AI Gateway keys', 'Create sk-gw keys to call AI models'],
  ['/backend-keys', 'B', 'Backend keys', 'Create bk-live keys for your website data (Supabase or MongoDB)'],
  ['/docs', 'A', 'AI API Docs', 'AI endpoints, examples and security rules'],
  ['/docs/backend', 'E', 'Backend Docs', 'Data store endpoints, examples and limits'],
  ['/models', 'M', 'Live models', 'Free models from Groq, OpenRouter, Gemini and OpenAI'],
  ['/account', 'C', 'Account verification', 'Verify your email, security score and account details'],
  ['/profile', 'P', 'Profile', 'Your name, company and bio'],
  ['/settings', 'S', 'Settings', 'Change password and manage sessions'],
];

export default function Menu() {
  return (
    <div className="wrap">
      <h1>Menu</h1>
      <p className="mute">Everything in one place.</p>
      <div className="grid">
        {items.map(([href, letter, title, desc]) => (
          <Link key={href} href={href} className="tile">
            <em>{letter}</em>
            <b>{title}</b>
            <span>{desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
