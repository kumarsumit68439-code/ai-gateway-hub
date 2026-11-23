import ServerView from '@/components/ServerView';

export const metadata = { title: 'Server | AI Gateway' };

export default function ServerPage({ params }) {
  return <ServerView id={params.id} />;
}
