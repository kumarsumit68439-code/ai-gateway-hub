import ServerShell from '@/components/ServerShell';

export const metadata = { title: 'Server | AI Gateway' };

export default function ServerPage({ params }) {
  return <ServerShell id={params.id} />;
}
