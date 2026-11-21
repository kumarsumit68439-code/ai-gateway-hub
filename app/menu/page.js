import Link from 'next/link';

export const metadata = { title: 'Menu | AI Gateway' };

const items = [
  ['/dashboard', 'D', 'Dashboard', 'Usage overview and your recent requests'],
  ['/settings#keys', 'K', 'Backend API keys', 'Create, regenerate, restrict and revoke keys'],
  ['/docs', 'A', 'API Docs', 'Endpoints, examples and security rules'],
  ['/models', 'M', 'Live models', 'Free models from Groq, OpenRouter, Gemini and OpenAI'],
  ['/account', 'C', 'Account check', 'Security score and account details'],
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
