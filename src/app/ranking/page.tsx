'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ResumenTable from '@/components/tables/ResumenTable';
import TotalTable from '@/components/tables/TotalTable';
import FechasTable from '@/components/tables/FechasTable';
import { useActiveTournament } from '@/hooks/useActiveTournament';
import { NoirButton } from '@/components/noir/NoirButton';
import { cn } from '@/lib/utils';

type TabType = 'resumen' | 'total' | 'fechas';

export default function RankingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('resumen');

  // Use SWR hook for active tournament with PIN authentication
  const {
    tournament: activeTournament,
    isLoading: tournamentLoading,
    isNotFound
  } = useActiveTournament({
    refreshInterval: 60000 // 1 minute refresh
  });

  if (tournamentLoading || authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="paper px-8 py-10 text-center">
          <p className="font-heading text-lg uppercase tracking-[0.24em] text-[#e0b66c]">
            Cargando tabla
          </p>
          <p className="mt-2 text-sm text-[#d7c59a]">
            Estamos preparando los números del torneo actual.
          </p>
          <div className="mx-auto mt-6 h-12 w-12 animate-spin rounded-full border-4 border-[#e0b66c] border-t-transparent" />
        </div>
      </div>
    );
  }

  // Verificar autenticación
  if (!user) {
    return (
      <div className="py-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <div className="flex items-center gap-3">
            <NoirButton
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="gap-2 px-3 py-2 text-[10px]"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </NoirButton>
            <h1 className="font-heading text-xl uppercase tracking-[0.22em] text-[#f3e6c5]">
              Tabla general
            </h1>
          </div>

          <div className="paper px-6 py-10 text-center space-y-4">
            <p className="text-[#d7c59a] text-lg">Acceso no autorizado</p>
            <p className="text-sm text-[#d7c59a]/70">
              Debes iniciar sesión para consultar la clasificación completa del torneo.
            </p>
            <div className="flex justify-center">
              <NoirButton onClick={() => router.push('/login')}>
                Iniciar sesión
              </NoirButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!activeTournament) {
    return (
      <div className="py-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <div className="flex items-center gap-3">
            <NoirButton
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="gap-2 px-3 py-2 text-[10px]"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </NoirButton>
            <h1 className="font-heading text-xl uppercase tracking-[0.22em] text-[#f3e6c5]">
              Tabla general
            </h1>
          </div>

          <div className="paper px-6 py-10 text-center space-y-4">
            <p className="text-lg text-[#d7c59a]">
              {isNotFound ? 'No hay torneo activo' : 'Error al cargar el torneo'}
            </p>
            <p className="text-sm text-[#d7c59a]/70">
              {isNotFound
                ? 'La clasificación se mostrará apenas iniciemos un nuevo torneo.'
                : 'Verifica tu conexión y vuelve a intentarlo en unos segundos.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="py-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <NoirButton
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="gap-2 px-3 py-2 text-[10px]"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </NoirButton>
            <div>
              <p className="text-[11px] uppercase tracking-[0.26em] text-[#d7c59a]/70">
                Torneo #{activeTournament.number} · {activeTournament.name}
              </p>
              <h1 className="font-heading text-2xl uppercase tracking-[0.22em] text-[#f3e6c5]">
                Tabla general
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] uppercase tracking-[0.22em] text-[#d7c59a]/65">
            {typeof activeTournament.participantCount === 'number' && (
              <span>{activeTournament.participantCount} jugadores</span>
            )}
            {typeof activeTournament.completedDates === 'number' && typeof activeTournament.totalDates === 'number' && (
              <span>
                {activeTournament.completedDates}/{activeTournament.totalDates} fechas
              </span>
            )}
          </div>
        </div>

        <div className="paper space-y-6 px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-center gap-3 border-b border-[#e0b66c]/15 pb-3">
            {(
              [
                { id: 'resumen', label: 'Última' },
                { id: 'total', label: 'Total' },
                { id: 'fechas', label: 'Eliminaciones' }
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-2 text-[11px] uppercase tracking-[0.24em] transition-colors',
                  activeTab === tab.id
                    ? 'text-[#e0b66c] border-b-2 border-[#e0b66c]'
                    : 'text-[#d7c59a]/65 hover:text-[#f3e6c5]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {activeTab === 'resumen' && (
              <ResumenTable
                tournamentId={activeTournament.id}
                userPin={user?.pin}
              />
            )}

            {activeTab === 'total' && (
              <TotalTable
                tournamentId={activeTournament.id}
                userPin={user?.pin}
              />
            )}

            {activeTab === 'fechas' && (
              <FechasTable
                tournamentId={activeTournament.id}
                userPin={user?.pin}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
