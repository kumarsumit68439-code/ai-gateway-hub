import ServerCheck from '@/components/ServerCheck';

export const metadata = { title: 'Server check | AI Gateway' };

export default function ServerCheckPage({ params }) {
  return <ServerCheck id={params.id} />;
}
