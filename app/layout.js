import './globals.css';
import './extra.css';
import { Inter, Space_Grotesk } from 'next/font/google';
import Nav from '@/components/Nav';

const inter = Inter({ subsets: ['latin'], variable: '--f-body', display: 'swap' });
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--f-head', display: 'swap' });

export const metadata = {
  title: 'AI Gateway | Jilowa',
  description: 'One API key for Groq, OpenRouter, Gemini and OpenAI models. Provided by Jilowa.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <body>
        <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
        <div className="gridbg" aria-hidden="true" />
        <Nav />
        <main>{children}</main>
        <footer className="foot">Provided by <span className="grad">Jilowa</span></footer>
      </body>
    </html>
  );
}
