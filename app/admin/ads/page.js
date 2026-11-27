import AdminAds from '@/components/AdminAds';

export const metadata = { title: 'Manage ads | AI Gateway' };

export default function AdminAdsPage() {
  return (
    <div className="wrap">
      <h1>Manage ads</h1>
      <AdminAds />
    </div>
  );
}
