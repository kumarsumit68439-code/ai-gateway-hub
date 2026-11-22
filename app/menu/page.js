import Link from 'next/link';

export const metadata = { title: 'Menu | AI Gateway' };

const items = [
  ['/dashboard', 'D', 'Dashboard', 'Usage and requests'],
  ['/gateway-keys', 'G', 'AI Gateway keys', 'Call AI models'],
  ['/backend-keys', 'B', 'Backend keys', 'Store your app data'],
  ['/docs', 'A', 'AI API Docs', 'Endpoints and examples'],
  ['/docs/backend', 'E', 'Backend Docs', 'Data endpoints and examples'],
  ['/models', 'M', 'Models', 'Browse all models'],
  ['/floating', 'F', 'Floating Window', '3D floating preview with animations'],
  ['/account', 'C', 'Verification', 'Email and security'],
  ['/profile', 'P', 'Profile', 'Your details'],
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
