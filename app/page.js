import { redirect } from 'next/navigation';

// The middleware sends logged-in users to /dashboard; everyone else sees /login first.
export default function Home() {
  redirect('/login');
}
