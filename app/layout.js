import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'AI Gateway Hub',
  description: 'One API key for Groq, OpenRouter, Gemini and OpenAI models.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <b>AI Gateway Hub</b>
          <Link href="/">Home</Link>
          <Link href="/models">Models</Link>
          <Link href="/docs">API Docs</Link>
          <Link href="/dashboard">API Keys</Link>
          <Link href="/login">Login</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
