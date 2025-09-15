'use client';

import { useAuth } from '@/contexts/AuthContext';
import useSWR from 'swr';
import LoadingState from '@/components/ui/LoadingState';
import { parseISO, isBefore } from 'date-fns';

interface GameDate {
  id: number;
  dateNumber: number;
  scheduledDate: string;
  status: string;
}

interface Tournament {
  id: number;
  name: string;
  gameDates: GameDate[];
}

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  
  const { data, isLoading, error } = useSWR<{tournament: Tournament}>(
    user?.role === 'Comision' ? '/api/tournaments/active' : null,
    {
      refreshInterval: 60000
    }
  );

  if (authLoading || isLoading) {
    return <LoadingState />;
  }

  if (!user || user.role !== 'Comision') {
    return null;
  }

  if (error || !data?.tournament) {
    return null;
  }

  const today = new Date();
  const gameDates = data.tournament.gameDates || [];

  const getDateStatus = (scheduledDate: string, status: string) => {
    const dateObj = parseISO(scheduledDate);
    const isPast = isBefore(dateObj, today);
    
    if (status === 'completed') return 'completed';
    if (status === 'in_progress') return 'in_progress';
    if (status === 'CREATED') return 'created';
    if (isPast) return 'past';
    return 'future';
  };

  const getBorderClass = (status: string) => {
    switch (status) {
      case 'completed': 
        return 'border-green-500/40';
      case 'in_progress': 
        return 'border-orange-500/60';
      case 'created': 
        return 'border-blue-500/40';
      case 'past': 
        return 'border-gray-500/40';
      default: 
        return 'border-poker-red/40';
    }
  };

  const getHoverBorderClass = (status: string) => {
    switch (status) {
      case 'completed': 
        return 'hover:border-green-500/60';
      case 'in_progress': 
        return 'hover:border-orange-500/80';
      case 'created': 
        return 'hover:border-blue-500/60';
      case 'past': 
        return 'hover:border-gray-500/60';
      default: 
        return 'hover:border-poker-red/60';
    }
  };

  return (
    <div className="min-h-screen bg-poker-dark p-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          {gameDates.map((gameDate) => {
            const dateObj = parseISO(gameDate.scheduledDate);
            const status = getDateStatus(gameDate.scheduledDate, gameDate.status);
            
            return (
              <div
                key={gameDate.id}
                className={`bg-poker-card border-2 ${getBorderClass(status)} rounded-xl p-4 ${getHoverBorderClass(status)} transition-all duration-200 hover:shadow-lg hover:shadow-poker-red/10`}
              >
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-xs text-poker-muted font-medium">
                      Fecha {gameDate.dateNumber}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl sm:text-3xl font-bold text-white">
                      {dateObj.getDate()}
                    </div>
                    <div className="text-lg sm:text-xl font-semibold text-orange-400">
                      {dateObj.toLocaleDateString('es-ES', { 
                        month: 'short'
                      }).toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}