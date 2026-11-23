import InviteServer from '@/components/InviteServer';

export const metadata = { title: 'Invite | AI Gateway' };

export default function InvitePage({ params }) {
  return (
    <div className="wrap" style={{ maxWidth: 520 }}>
      <h1>Server invite</h1>
      <InviteServer code={params.code} />
    </div>
  );
}
