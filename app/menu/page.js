import Link from 'next/link';

export const metadata = { title: 'Menu | AI Gateway' };

const items = [
  ['/dashboard', 'D', 'Dashboard', 'Usage and requests'],
  ['/servers', 'V', 'Servers', 'Chat and voice like Discord'],
  ['/bots', 'T', 'Bots', 'Create, host and invite bots'],
  ['/docs/bots', 'H', 'Bot Hosting Guide', 'VPS, Docker, Node.js, Python'],
  ['/gateway-keys', 'G', 'AI Gateway keys', 'Call AI models'],
  ['/playground/ai', 'P', 'AI Playground', 'Chat with real models'],
  ['/backend-keys', 'B', 'Backend keys', 'Store your app data'],
  ['/playground/backend', 'X', 'Backend Playground', 'Browse and edit real data'],
  ['/docs', 'A', 'AI API Docs', 'Endpoints and examples'],
  ['/docs/backend', 'E', 'Backend Docs', 'Data endpoints and examples'],
  ['/models', 'M', 'Models', 'Browse all models'],
  ['/account', 'C', 'Verification', 'Email and security'],
  ['/profile', 'U', 'Profile', 'Your details'],
  ['/settings', 'S', 'Settings', 'Password and sessions'],
];

export default function Menu() {
  return (
    <div className="wrap">
      <h1>Menu</h1>
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
