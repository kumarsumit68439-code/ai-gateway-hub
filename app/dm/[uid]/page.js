import DMView from '@/components/DMView';

export const metadata = { title: 'Messages | AI Gateway' };

export default function DMUserPage({ params }) {
  return <DMView uid={params.uid} />;
}
