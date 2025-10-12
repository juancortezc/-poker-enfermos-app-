'use client';

import { useAuth } from '@/contexts/AuthContext';
import LoadingState from '@/components/ui/LoadingState';

export default function RegulationsPage() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return <LoadingState />;
  }

  if (!user || !['Comision', 'Enfermo', 'Invitado'].includes(user.role)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-poker-dark p-4">
      <div className="max-w-6xl mx-auto">
        <iframe
          src="https://storage.googleapis.com/poker-enfermos/RT29.pdf"
          className="w-full border-0 rounded-lg"
          style={{ height: 'calc(100vh - 140px)' }}
        />
      </div>
    </div>
  );
}