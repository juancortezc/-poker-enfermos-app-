'use client';

import { useAuth } from '@/contexts/AuthContext';
import LoadingState from '@/components/ui/LoadingState';

export default function RegulationsPage() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return <LoadingState />;
  }

  if (!user || user.role !== 'Comision') {
    return null;
  }

  return (
    <div className="min-h-screen bg-poker-dark p-4">
      <div className="max-w-6xl mx-auto">
        <iframe
          src="https://storage.googleapis.com/poker-enfermos/REGLAMENTO%20POKER%20DE%20ENFERMOS.pdf"
          className="w-full h-screen border-0 rounded-lg"
          style={{ minHeight: 'calc(100vh - 2rem)' }}
        />
      </div>
    </div>
  );
}